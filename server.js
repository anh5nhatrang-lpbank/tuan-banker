'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { marked } = require('marked');

const store = require('./lib/store');
const { CATS, LISTING_TYPES } = require('./lib/config');
const { uniqueSlug, fmtDate, clip, paginate } = require('./lib/util');

const PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (PROD ? '' : 'admin123');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!ADMIN_PASSWORD) console.warn('[CẢNH BÁO] Chưa đặt ADMIN_PASSWORD, không thể đăng nhập trang quản trị.');
if (!process.env.SESSION_SECRET) console.warn('[CẢNH BÁO] Chưa đặt SESSION_SECRET, đăng nhập sẽ mất mỗi lần khởi động lại.');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.google.com'],
        formAction: ["'self'"],
        upgradeInsecureRequests: PROD ? [] : null,
      },
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(
  cookieSession({
    name: 'tb_sess',
    keys: [SESSION_SECRET],
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: 'lax',
    secure: PROD,
  })
);

const UPLOAD_DIR = path.join(store.DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: PROD ? '1d' : 0 }));

// ---------- helpers dùng chung cho view ----------
app.use((req, res, next) => {
  res.locals.s = store.db.settings;
  res.locals.cats = CATS;
  res.locals.listingTypes = LISTING_TYPES;
  res.locals.path = req.path;
  res.locals.siteUrl = SITE_URL;
  res.locals.fmtDate = fmtDate;
  res.locals.md = (t) => marked.parse(String(t || ''));
  res.locals.isAdmin = !!req.session.admin;
  res.locals.flash = req.session.flash || null;
  res.locals.title = '';
  res.locals.desc = '';
  res.locals.ogImage = '';
  req.session.flash = null;
  res.locals.imgOf = (x) => (x && x.image ? x.image : '/img/placeholder.svg');
  next();
});

const db = () => store.db;
const flash = (req, type, msg) => (req.session.flash = { type, msg });
const publishedPosts = () =>
  db().posts.filter((p) => p.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const activeListings = () =>
  db().listings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ---------- trang công khai ----------
app.get('/', (req, res) => {
  const all = publishedPosts();
  const byCat = {};
  Object.keys(CATS).forEach((k) => (byCat[k] = all.filter((p) => p.category === k).slice(0, 3)));
  res.render('index', {
    title: db().settings.siteName,
    desc: db().settings.heroSub,
    latest: all.slice(0, 6),
    byCat,
    featured: activeListings().filter((l) => l.featured).slice(0, 3),
    questions: db().questions.filter((q) => q.approved).slice(-3).reverse(),
  });
});

Object.values(CATS).forEach((cat) => {
  app.get('/' + cat.key, (req, res) => {
    const q = clip(req.query.q, 80).toLowerCase();
    let list = publishedPosts().filter((p) => p.category === cat.key);
    if (q) list = list.filter((p) => (p.title + ' ' + p.excerpt).toLowerCase().includes(q));
    const pg = paginate(list, req.query.page, 9);
    res.render('category', { cat, ...pg, q, title: cat.name, desc: cat.desc });
  });
});

app.get('/bai-viet/:slug', (req, res, next) => {
  const post = db().posts.find((p) => p.slug === req.params.slug && p.published);
  if (!post) return next();
  post.views = (post.views || 0) + 1;
  store.save();
  const related = publishedPosts().filter((p) => p.category === post.category && p.id !== post.id).slice(0, 3);
  res.render('post', {
    post,
    related,
    title: post.title,
    desc: post.excerpt,
    ogImage: post.image,
  });
});

app.get('/san-pham-bds', (req, res) => {
  const type = req.query.loai || '';
  let list = activeListings();
  if (type) list = list.filter((l) => l.type === type);
  const pg = paginate(list, req.query.page, 9);
  res.render('listings', { ...pg, type, title: 'Sản phẩm bất động sản', desc: 'Danh sách bất động sản đang bán, hỗ trợ vay ngân hàng.' });
});

app.get('/san-pham-bds/:slug', (req, res, next) => {
  const item = db().listings.find((l) => l.slug === req.params.slug);
  if (!item) return next();
  res.render('listing', {
    item,
    title: item.title,
    desc: `${item.type} ${item.area}m² - ${item.price} - ${item.address}`,
    ogImage: item.images[0] || '',
  });
});

app.get('/gioi-thieu', (req, res) =>
  res.render('about', { title: 'Giới thiệu', desc: db().settings.aboutText.slice(0, 150) })
);

// Giới hạn gửi form công khai
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    flash(req, 'error', 'Bạn gửi quá nhiều lần, vui lòng thử lại sau.');
    res.redirect(req.get('referer') || '/');
  },
});

app.get('/cong-dong', (req, res) => {
  res.render('community', {
    title: 'Cộng đồng',
    desc: 'Hỏi đáp và kết nối cộng đồng tài chính - bất động sản - công nghệ.',
    questions: db().questions.filter((q) => q.approved).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
});

app.post('/cong-dong', formLimiter, (req, res) => {
  if (req.body.website) return res.redirect('/cong-dong'); // honeypot chống spam
  const name = clip(req.body.name, 60);
  const message = clip(req.body.message, 1000);
  if (!name || message.length < 10) {
    flash(req, 'error', 'Vui lòng nhập tên và nội dung tối thiểu 10 ký tự.');
    return res.redirect('/cong-dong');
  }
  db().questions.push({
    id: store.nextId('questions'),
    name,
    message,
    answer: '',
    approved: false,
    createdAt: new Date().toISOString(),
  });
  store.save();
  flash(req, 'ok', 'Cảm ơn bạn! Câu hỏi sẽ hiển thị sau khi được duyệt.');
  res.redirect('/cong-dong');
});

app.get('/lien-he', (req, res) =>
  res.render('contact', { title: 'Liên hệ', desc: 'Liên hệ tư vấn vay vốn và bất động sản.', ref: clip(req.query.ref, 120) })
);

app.post('/lien-he', formLimiter, (req, res) => {
  if (req.body.website) return res.redirect('/lien-he');
  const name = clip(req.body.name, 60);
  const phone = clip(req.body.phone, 20);
  const message = clip(req.body.message, 1500);
  const ref = clip(req.body.ref, 120);
  if (!name || !/^[0-9+\s.()-]{8,20}$/.test(phone)) {
    flash(req, 'error', 'Vui lòng nhập họ tên và số điện thoại hợp lệ.');
    return res.redirect('/lien-he' + (ref ? '?ref=' + encodeURIComponent(ref) : ''));
  }
  db().messages.push({
    id: store.nextId('messages'),
    name,
    phone,
    message,
    ref,
    read: false,
    createdAt: new Date().toISOString(),
  });
  store.save();
  flash(req, 'ok', 'Đã gửi thông tin. Tôi sẽ liên hệ lại với bạn sớm nhất!');
  res.redirect('/lien-he');
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\n${SITE_URL ? 'Sitemap: ' + SITE_URL + '/sitemap.xml\n' : ''}`);
});

app.get('/sitemap.xml', (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get('host')}`;
  const urls = ['/', ...Object.keys(CATS).map((k) => '/' + k), '/san-pham-bds', '/cong-dong', '/gioi-thieu', '/lien-he']
    .concat(publishedPosts().map((p) => '/bai-viet/' + p.slug))
    .concat(db().listings.map((l) => '/san-pham-bds/' + l.slug));
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map((u) => `<url><loc>${base}${u}</loc></url>`).join('\n') +
        `\n</urlset>`
    );
});

// ---------- quản trị ----------
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => cb(null, !!EXT[file.mimetype]),
});

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).send('Quá nhiều lần thử. Vui lòng quay lại sau 15 phút.'),
});

const admin = express.Router();
admin.use((req, res, next) => {
  res.locals.layoutAdmin = true;
  res.set('Cache-Control', 'no-store');
  next();
});

admin.get('/login', (req, res) => res.render('admin/login', { title: 'Đăng nhập' }));
admin.post('/login', loginLimiter, (req, res) => {
  const ok =
    ADMIN_PASSWORD &&
    safeEqual(req.body.user || '', ADMIN_USER) &&
    safeEqual(req.body.password || '', ADMIN_PASSWORD);
  if (!ok) {
    flash(req, 'error', 'Sai tài khoản hoặc mật khẩu.');
    return res.redirect('/admin/login');
  }
  req.session.admin = true;
  res.redirect('/admin');
});
admin.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/admin/login');
});

// Mọi route bên dưới cần đăng nhập
admin.use((req, res, next) => (req.session.admin ? next() : res.redirect('/admin/login')));

admin.get('/', (req, res) => {
  const d = db();
  res.render('admin/dashboard', {
    title: 'Tổng quan',
    stats: {
      posts: d.posts.length,
      listings: d.listings.length,
      pending: d.questions.filter((q) => !q.approved).length,
      unread: d.messages.filter((m) => !m.read).length,
    },
  });
});

function removeFile(url) {
  if (url && url.startsWith('/uploads/')) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
  }
}
const fileUrl = (f) => '/uploads/' + f.filename;
const emptyPost = { id: 0, title: '', category: 'tai-chinh-ngan-hang', excerpt: '', content: '', image: '', published: true };

// Bài viết
admin.get('/posts', (req, res) =>
  res.render('admin/posts', { title: 'Bài viết', posts: db().posts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
);
admin.get('/posts/new', (req, res) => res.render('admin/post_form', { title: 'Bài viết mới', post: emptyPost }));
admin.get('/posts/:id/edit', (req, res, next) => {
  const post = db().posts.find((p) => p.id === +req.params.id);
  if (!post) return next();
  res.render('admin/post_form', { title: 'Sửa bài viết', post });
});
admin.post('/posts/save', upload.single('image'), (req, res) => {
  const b = req.body;
  const id = +b.id || 0;
  const title = clip(b.title, 200);
  if (!title || !CATS[b.category]) {
    flash(req, 'error', 'Thiếu tiêu đề hoặc chuyên mục.');
    return res.redirect(id ? `/admin/posts/${id}/edit` : '/admin/posts/new');
  }
  let post = db().posts.find((p) => p.id === id);
  if (!post) {
    post = { id: store.nextId('posts'), views: 0, image: '', createdAt: new Date().toISOString() };
    db().posts.push(post);
    post.slug = uniqueSlug(title, db().posts, post.id);
  }
  Object.assign(post, {
    title,
    category: b.category,
    excerpt: clip(b.excerpt, 300),
    content: clip(b.content, 100000),
    published: b.published === 'on',
  });
  if (req.file) {
    removeFile(post.image);
    post.image = fileUrl(req.file);
  } else if (b.removeImage === 'on') {
    removeFile(post.image);
    post.image = '';
  }
  store.save();
  flash(req, 'ok', 'Đã lưu bài viết.');
  res.redirect('/admin/posts');
});
admin.post('/posts/:id/delete', (req, res) => {
  const i = db().posts.findIndex((p) => p.id === +req.params.id);
  if (i >= 0) {
    removeFile(db().posts[i].image);
    db().posts.splice(i, 1);
    store.save();
  }
  flash(req, 'ok', 'Đã xóa bài viết.');
  res.redirect('/admin/posts');
});

// Sản phẩm BĐS
const emptyListing = {
  id: 0, title: '', type: 'Nhà phố', price: '', area: '', bedrooms: 0, address: '', legal: '',
  bankSupport: true, status: 'dang-ban', featured: false, images: [], description: '',
};
admin.get('/listings', (req, res) => res.render('admin/listings', { title: 'Sản phẩm BĐS', items: activeListings() }));
admin.get('/listings/new', (req, res) => res.render('admin/listing_form', { title: 'Thêm sản phẩm', item: emptyListing }));
admin.get('/listings/:id/edit', (req, res, next) => {
  const item = db().listings.find((l) => l.id === +req.params.id);
  if (!item) return next();
  res.render('admin/listing_form', { title: 'Sửa sản phẩm', item });
});
admin.post('/listings/save', upload.array('images', 6), (req, res) => {
  const b = req.body;
  const id = +b.id || 0;
  const title = clip(b.title, 200);
  if (!title) {
    flash(req, 'error', 'Thiếu tiêu đề.');
    return res.redirect(id ? `/admin/listings/${id}/edit` : '/admin/listings/new');
  }
  let item = db().listings.find((l) => l.id === id);
  if (!item) {
    item = { id: store.nextId('listings'), images: [], createdAt: new Date().toISOString() };
    db().listings.push(item);
    item.slug = uniqueSlug(title, db().listings, item.id);
  }
  Object.assign(item, {
    title,
    type: LISTING_TYPES.includes(b.type) ? b.type : 'Khác',
    price: clip(b.price, 40),
    area: Math.max(0, parseFloat(b.area) || 0),
    bedrooms: Math.max(0, parseInt(b.bedrooms, 10) || 0),
    address: clip(b.address, 200),
    legal: clip(b.legal, 100),
    bankSupport: b.bankSupport === 'on',
    featured: b.featured === 'on',
    status: b.status === 'da-ban' ? 'da-ban' : 'dang-ban',
    description: clip(b.description, 20000),
  });
  const remove = [].concat(b.removeImg || []);
  item.images = item.images.filter((u) => {
    if (remove.includes(u)) { removeFile(u); return false; }
    return true;
  });
  (req.files || []).forEach((f) => item.images.push(fileUrl(f)));
  item.images = item.images.slice(0, 8);
  store.save();
  flash(req, 'ok', 'Đã lưu sản phẩm.');
  res.redirect('/admin/listings');
});
admin.post('/listings/:id/delete', (req, res) => {
  const i = db().listings.findIndex((l) => l.id === +req.params.id);
  if (i >= 0) {
    db().listings[i].images.forEach(removeFile);
    db().listings.splice(i, 1);
    store.save();
  }
  flash(req, 'ok', 'Đã xóa sản phẩm.');
  res.redirect('/admin/listings');
});

// Cộng đồng
admin.get('/community', (req, res) =>
  res.render('admin/community', { title: 'Cộng đồng', items: db().questions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
);
admin.post('/community/:id', (req, res) => {
  const q = db().questions.find((x) => x.id === +req.params.id);
  if (q) {
    if (req.body.action === 'delete') db().questions.splice(db().questions.indexOf(q), 1);
    else {
      q.answer = clip(req.body.answer, 2000);
      q.approved = req.body.action === 'approve' ? true : req.body.action === 'hide' ? false : q.approved;
    }
    store.save();
    flash(req, 'ok', 'Đã cập nhật.');
  }
  res.redirect('/admin/community');
});

// Tin nhắn liên hệ
admin.get('/messages', (req, res) => {
  const items = db().messages.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.render('admin/messages', { title: 'Tin nhắn liên hệ', items });
  db().messages.forEach((m) => (m.read = true));
  store.save();
});
admin.post('/messages/:id/delete', (req, res) => {
  const i = db().messages.findIndex((m) => m.id === +req.params.id);
  if (i >= 0) { db().messages.splice(i, 1); store.save(); }
  res.redirect('/admin/messages');
});

// Cài đặt
const SETTING_KEYS = Object.keys(require('./lib/seed').defaultSettings);
admin.get('/settings', (req, res) => res.render('admin/settings', { title: 'Cài đặt website', keys: SETTING_KEYS }));
admin.post('/settings', (req, res) => {
  SETTING_KEYS.forEach((k) => {
    if (typeof req.body[k] === 'string') db().settings[k] = clip(req.body[k], 3000);
  });
  store.save();
  flash(req, 'ok', 'Đã lưu cài đặt.');
  res.redirect('/admin/settings');
});

app.use('/admin', admin);

// ---------- lỗi ----------
app.use((req, res) => res.status(404).render('404', { title: 'Không tìm thấy trang', desc: '' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (req.originalUrl.startsWith('/admin')) {
    flash(req, 'error', err instanceof multer.MulterError ? 'Lỗi tải ảnh: ' + err.message : 'Có lỗi xảy ra.');
    return res.redirect(req.get('referer') || '/admin');
  }
  res.status(500).send('Có lỗi xảy ra, vui lòng thử lại sau.');
});

app.listen(PORT, () => console.log(`TUẤN BANKER chạy tại http://localhost:${PORT}`));

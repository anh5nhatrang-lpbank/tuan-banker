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
const mailer = require('./lib/mailer');
const mailtpl = require('./lib/mailtpl');
const telegram = require('./lib/telegram');

// Báo tức thì về Telegram (lỗi Telegram không ảnh hưởng người gửi form).
// Link Zalo của người gửi (bấm là mở chat); bỏ qua nếu số không hợp lệ.
function zaloLine(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 9 ? `Zalo: https://zalo.me/${d}` : null;
}
function pushTelegram(text) {
  telegram.sendTelegram(text).catch((e) => console.error('[TELEGRAM] Gửi thất bại:', e.message, e.cause ? (e.cause.code || e.cause.message) : ''));
}
const { CATS, LISTING_TYPES } = require('./lib/config');
const geo = require('./lib/geo');
const { LOANS, COMMON } = require('./lib/loans');
const { uniqueSlug, fmtDate, clip, paginate } = require('./lib/util');

const EXT_IMG = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (PROD ? '' : 'admin123');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!ADMIN_PASSWORD) console.warn('[CẢNH BÁO] Chưa đặt ADMIN_PASSWORD, không thể đăng nhập trang quản trị.');
if (!process.env.SESSION_SECRET) console.warn('[CẢNH BÁO] Chưa đặt SESSION_SECRET, đăng nhập sẽ mất mỗi lần khởi động lại.');

// Đổi mỗi lần khởi động lại: ép trình duyệt tải CSS/JS mới sau khi deploy
const ASSET_V = Date.now().toString(36);
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // Cần gửi Referer cho máy chủ ảnh bản đồ (OpenStreetMap từ chối khi không có Referer)
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // unpkg.com: thư viện bản đồ Leaflet (có kiểm tra SRI trong view)
        scriptSrc: ["'self'", 'https://unpkg.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
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
  res.locals.areas = geo.AREAS;
  res.locals.assetV = ASSET_V;
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
  // Số điện thoại dạng quốc tế (84905491125) để tạo link WhatsApp/Viber/Telegram
  res.locals.intl = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? '84' + d.slice(1) : d; };
  res.locals.emails = (e) => String(e || '').split(',').map((x) => x.trim()).filter(Boolean);
  res.locals.imgOf = (x) => (x && x.image ? x.image : '/img/placeholder.svg');
  next();
});

const db = () => store.db;
const flash = (req, type, msg) => (req.session.flash = { type, msg });
const publishedPosts = () =>
  db().posts.filter((p) => p.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const allListings = () =>
  db().listings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
// Tin khách gửi có approved=false cho tới khi admin duyệt; tin cũ (không có trường này) vẫn hiện.
const isVisible = (l) => l.approved !== false;
const activeListings = () => allListings().filter(isVisible);

// Dữ liệu cho "Bản đồ giá": chỉ tin đang bán, đã hiện công khai và đã có tọa độ.
function mapData() {
  const pins = activeListings()
    .filter((l) => l.status !== 'da-ban' && isFinite(l.lat) && isFinite(l.lng) && l.lat !== null && l.lng !== null)
    .map((l) => {
      const v = geo.parsePrice(l.price);
      return {
        id: l.id,
        slug: l.slug,
        title: l.title,
        type: l.type,
        price: l.price || '',
        vnd: v || 0,
        label: geo.priceLabel(v),
        tier: geo.tierOf(v),
        area: l.area || 0,
        address: l.address || '',
        ward: l.ward || geo.guessArea(l.address) || geo.NO_AREA,
        img: (l.images || [])[0] || '',
        bank: !!l.bankSupport,
        lat: +l.lat,
        lng: +l.lng,
      };
    });
  const priced = pins.filter((p) => p.vnd);
  return {
    pins,
    tiers: geo.TIERS.map((t) => ({ key: t.key, label: t.label })),
    wards: geo.AREAS.filter((w) => geo.NHA_TRANG_WARDS.includes(w) || pins.some((p) => p.ward === w)),
    min: priced.length ? geo.priceLabel(Math.min(...priced.map((p) => p.vnd))) : '',
    max: priced.length ? geo.priceLabel(Math.max(...priced.map((p) => p.vnd))) : '',
  };
}

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
    // Chuyên mục BĐS: kèm các tin Sản phẩm BĐS để trang không bị trống khi chưa có bài viết.
    const listings = cat.key === 'bat-dong-san' && !q && pg.page === 1 ? activeListings().slice(0, 6) : [];
    const pmap = cat.key === 'bat-dong-san' && !q && pg.page === 1 ? mapData() : null;
    res.render('category', { cat, ...pg, q, listings, pmap, title: cat.name, desc: cat.desc });
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

// ---------- Hình ảnh (timeline) ----------
const GALLERY_KINDS = ['Tập thể', 'Cá nhân', 'Khác'];
const sortedGallery = () =>
  db().gallery.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);

app.get('/hinh-anh', (req, res) => {
  const kind = GALLERY_KINDS.includes(req.query.loai) ? req.query.loai : '';
  let list = sortedGallery();
  if (kind) list = list.filter((g) => g.kind === kind);
  const pg = paginate(list, req.query.page, 10);
  const years = [];
  pg.items.forEach((g) => {
    const y = (g.date || '').slice(0, 4) || 'Khác';
    let grp = years.find((x) => x.year === y);
    if (!grp) years.push((grp = { year: y, items: [] }));
    grp.items.push(g);
  });
  res.render('gallery', {
    ...pg,
    years,
    kind,
    kinds: GALLERY_KINDS,
    title: 'Hình ảnh',
    desc: 'Hình ảnh các buổi sinh hoạt tập thể và hoạt động cá nhân của TUẤN BANKER theo dòng thời gian.',
    ogImage: ((list[0] || {}).images || [])[0] || '',
  });
});

app.get('/san-pham-bds', (req, res) => {
  const type = req.query.loai || '';
  let list = activeListings();
  if (type) list = list.filter((l) => l.type === type);
  const pg = paginate(list, req.query.page, 9);
  res.render('listings', { ...pg, type, pmap: pg.page === 1 && !type ? mapData() : null, title: 'Sản phẩm bất động sản', desc: 'Danh sách bất động sản đang bán, hỗ trợ vay ngân hàng.' });
});

app.get('/san-pham-bds/:slug', (req, res, next) => {
  const item = db().listings.find((l) => l.slug === req.params.slug);
  if (!item || !isVisible(item)) return next();
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
  pushTelegram([
    '❓ Câu hỏi cộng đồng mới chờ duyệt',
    `Người hỏi: ${name}`,
    `Nội dung: ${message}`,
    SITE_URL ? `Duyệt: ${SITE_URL}/admin/community` : null,
  ].filter(Boolean).join('\n'));
  mailer.sendMail({
    to: process.env.NOTIFY_EMAIL || 'anh5nhatrang@gmail.com',
    subject: `[TUẤN BANKER] Câu hỏi cộng đồng mới từ ${name}`,
    text: [
      'Có câu hỏi cộng đồng mới trên tuanbanker.com, đang chờ duyệt.',
      '',
      `Người hỏi: ${name}`,
      `Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
      '',
      'Nội dung:',
      message,
      '',
      SITE_URL ? `Duyệt tại: ${SITE_URL}/admin/community` : '',
    ].join('\n'),
  }).catch((e) => console.error('[MAIL] Gửi thất bại:', e.message));
  flash(req, 'ok', 'Cảm ơn bạn! Câu hỏi sẽ hiển thị sau khi được duyệt.');
  res.redirect('/cong-dong');
});

// Gửi mail báo cho chủ website mỗi khi có tin nhắn liên hệ mới (lỗi mail không ảnh hưởng người gửi form).
// extra: [[nhãn, giá trị]] các trường chi tiết (form vay vốn).
const nowVN = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
function notifyNewMessage({ name, phone, message, ref, extra }) {
  const isLoan = !!(extra && extra.length);
  pushTelegram([
    isLoan ? '🏦 Khách đăng ký tư vấn vay mới' : '📩 Tin nhắn liên hệ mới',
    `Họ tên: ${name}`,
    `SĐT: ${phone}`,
    zaloLine(phone),
    ref ? `Liên quan: ${ref}` : null,
    message ? `Nội dung: ${message}` : null,
    SITE_URL ? `Xem: ${SITE_URL}/admin/messages` : null,
  ].filter(Boolean).join('\n'));
  if (!mailer.enabled()) return console.warn('[MAIL] Chưa cấu hình SMTP, bỏ qua email báo tin nhắn mới.');
  const to = process.env.NOTIFY_EMAIL || 'anh5nhatrang@gmail.com';
  const d = String(phone || '').replace(/\D/g, '');
  const mail = mailtpl.build({
    heading: isLoan ? 'Khách hàng đăng ký tư vấn vay' : 'Tin nhắn liên hệ mới',
    intro: 'Ghi nhận từ tuanbanker.com lúc ' + nowVN(),
    rows: [
      ['Họ và tên', name],
      ['Số điện thoại', phone, { href: 'tel:' + String(phone).replace(/\s/g, '') }],
      d.length >= 9 ? ['Zalo', 'Mở chat Zalo', { href: 'https://zalo.me/' + d }] : null,
      ...(isLoan ? extra : [['Liên quan tới', ref], ['Nội dung', message || '(không có)']]),
    ],
    link: SITE_URL ? SITE_URL + '/admin/messages' : '',
    linkText: 'Xem trong trang quản trị',
    footer: 'Vui lòng liên hệ khách hàng sớm.',
  });
  mailer.sendMail({ to, subject: `${isLoan ? '[VAY VỐN]' : '[TUẤN BANKER]'} ${name} - ${phone}`, text: mail.text, html: mail.html, replyTo: undefined })
    .catch((e) => console.error('[MAIL] Gửi thất bại:', e.message));
}

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
  notifyNewMessage({ name, phone, message, ref });
  flash(req, 'ok', 'Đã gửi thông tin. Tôi sẽ liên hệ lại với bạn sớm nhất!');
  res.redirect('/lien-he');
});


// ---------- khay sản phẩm vay bán lẻ + form để lại thông tin ----------
app.get('/san-pham-vay', (req, res) =>
  res.render('loans', {
    title: 'Sản phẩm vay bán lẻ LPBank',
    desc: 'Vay mua nhà, mua ô tô, tiêu dùng, kinh doanh tại LPBank: điều kiện, giấy tờ, thời gian vay. Để lại thông tin nhận tư vấn lãi suất.',
    loans: LOANS,
    common: COMMON,
    sel: clip(req.query.sp, 20),
  })
);

const pick = (v, list) => (list.includes(v) ? v : '');
const LOAN_AMOUNTS = ['Dưới 500 triệu', '500 triệu - 1 tỷ', '1 - 2 tỷ', '2 - 5 tỷ', 'Trên 5 tỷ'];
const LOAN_INCOMES = ['Dưới 10 triệu', '10 - 20 triệu', '20 - 50 triệu', 'Trên 50 triệu'];
const LOAN_INCOME_TYPES = ['Chuyển khoản', 'Tiền mặt / Tự doanh'];
const LOAN_TIMES = ['Sáng (8h00 - 12h00)', 'Chiều (13h30 - 17h00)', 'Tối (sau 18h00)', 'Bất cứ lúc nào'];

app.post('/san-pham-vay', formLimiter, (req, res) => {
  if (req.body.website) return res.redirect('/san-pham-vay'); // honeypot
  const b = req.body;
  const name = clip(b.name, 60);
  const phone = clip(b.phone, 20);
  if (!name || !/^[0-9+\s.()-]{8,20}$/.test(phone)) {
    flash(req, 'error', 'Vui lòng nhập họ tên và số điện thoại hợp lệ.');
    return res.redirect('/san-pham-vay#dang-ky');
  }
  const loan = LOANS.find((l) => l.key === b.product);
  const product = loan ? loan.name : 'Chưa rõ, cần tư vấn';
  const ref = 'Đăng ký vay: ' + product;
  const area = clip(b.area, 80);
  const amount = pick(b.amount, LOAN_AMOUNTS);
  const term = clip(b.term, 40);
  const income = pick(b.income, LOAN_INCOMES);
  const incomeType = pick(b.incomeType, LOAN_INCOME_TYPES);
  const contactTime = pick(b.contactTime, LOAN_TIMES);
  const note = clip(b.note, 800);
  const extra = [
    ['Dịch vụ quan tâm', product],
    ['Khu vực', area],
    ['Số tiền cần vay', amount],
    ['Thời gian vay', term],
    ['Thu nhập', income ? income + (incomeType ? ` (${incomeType})` : '') : incomeType],
    ['Giờ tiện liên lạc', contactTime],
    ['Ghi chú thêm', note],
  ].filter((r) => r[1]);
  const message = extra.slice(1).map(([k, v]) => `${k}: ${v}`).join('\n');
  db().messages.push({
    id: store.nextId('messages'), name, phone, message, ref, read: false, createdAt: new Date().toISOString(),
  });
  store.save();
  notifyNewMessage({ name, phone, message, ref, extra });
  flash(req, 'ok', 'Đã gửi thông tin. Tôi sẽ liên hệ lại với bạn sớm nhất!');
  res.redirect('/san-pham-vay');
});

// ---------- khách tự đăng tin BĐS (chờ admin duyệt mới hiện) ----------
const listingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 4,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    flash(req, 'error', 'Bạn đăng tin quá nhiều lần, vui lòng thử lại sau.');
    res.redirect('/dang-tin');
  },
});

// Kiểm tra đúng định dạng ảnh qua chữ ký đầu tệp (không tin mimetype do trình duyệt gửi).
function isRealImage(file) {
  try {
    const fd = fs.openSync(file.path, 'r');
    const b = Buffer.alloc(12);
    fs.readSync(fd, b, 0, 12, 0);
    fs.closeSync(fd);
    return (
      (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
      b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
      (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP')
    );
  } catch (e) {
    return false;
  }
}
const dropFiles = (files) => (files || []).forEach((f) => fs.unlink(f.path, () => {}));

function notifyNewListing(item) {
  pushTelegram([
    '🏠 Tin BĐS mới chờ duyệt',
    `Tiêu đề: ${item.title}`,
    `Giá: ${item.price || '(không ghi)'} - ${item.area} m² - ${item.address}`,
    `Người đăng: ${item.contactName} - ${item.contactPhone}`,
    zaloLine(item.contactPhone),
    `Số ảnh: ${(item.images || []).length}`,
    SITE_URL ? `Duyệt: ${SITE_URL}/admin/listings` : null,
  ].filter(Boolean).join('\n'));
  const to = process.env.NOTIFY_EMAIL || 'anh5nhatrang@gmail.com';
  const d = String(item.contactPhone || '').replace(/\D/g, '');
  const mail = mailtpl.build({
    heading: 'Tin BĐS mới chờ duyệt',
    intro: 'Khách vừa đăng tin trên tuanbanker.com lúc ' + nowVN(),
    rows: [
      ['Tiêu đề', item.title],
      ['Loại hình', item.type],
      ['Giá', item.price || '(không ghi)'],
      ['Diện tích', item.area + ' m²'],
      ['Địa chỉ', item.address],
      ['Pháp lý', item.legal],
      ['Mô tả', clip(item.description, 600)],
      ['Số ảnh', String((item.images || []).length)],
      ['Người đăng', item.contactName],
      ['Số điện thoại', item.contactPhone, { href: 'tel:' + String(item.contactPhone).replace(/\s/g, '') }],
      d.length >= 9 ? ['Zalo', 'Mở chat Zalo', { href: 'https://zalo.me/' + d }] : null,
    ],
    link: SITE_URL ? SITE_URL + '/admin/listings' : '',
    linkText: 'Duyệt tin',
  });
  mailer.sendMail({ to, subject: `[TIN BĐS] Chờ duyệt: ${item.title}`, text: mail.text, html: mail.html })
    .catch((e) => console.error('[MAIL] Gửi thất bại:', e.message));
}

app.get('/dang-tin', (req, res) =>
  res.render('submit_listing', {
    title: 'Đăng tin bất động sản',
    desc: 'Gửi tin bán bất động sản của bạn lên TUẤN BANKER, kèm hình ảnh. Tin được duyệt trước khi hiển thị.',
  })
);

app.post(
  '/dang-tin',
  listingLimiter,
  (req, res, next) => {
    require('./lib/pubupload')(UPLOAD_DIR, EXT_IMG)(req, res, (err) => {
      if (err) {
        flash(req, 'error', err.code === 'LIMIT_FILE_SIZE' ? 'Mỗi ảnh tối đa 5MB.' : 'Không tải được ảnh (tối đa 6 ảnh, mỗi ảnh ≤ 5MB).');
        return res.redirect('/dang-tin');
      }
      next();
    });
  },
  (req, res) => {
    const files = req.files || [];
    const b = req.body;
    if (b.website) { dropFiles(files); return res.redirect('/san-pham-bds'); } // honeypot
    const title = clip(b.title, 200);
    const contactName = clip(b.contactName, 60);
    const contactPhone = clip(b.contactPhone, 20);
    const description = clip(b.description, 5000);
    const area = Math.max(0, parseFloat(b.area) || 0);
    const bad =
      title.length < 10 || !contactName || !/^[0-9+\s.()-]{8,20}$/.test(contactPhone) ||
      description.length < 20 || !area || !clip(b.address, 200) || b.agree !== 'on';
    if (bad) {
      dropFiles(files);
      flash(req, 'error', 'Vui lòng nhập đủ: tiêu đề (≥10 ký tự), địa chỉ, diện tích, mô tả (≥20 ký tự), họ tên, số điện thoại hợp lệ và tích đồng ý.');
      return res.redirect('/dang-tin');
    }
    const good = files.filter(isRealImage);
    dropFiles(files.filter((f) => !good.includes(f)));
    const item = {
      id: store.nextId('listings'),
      images: good.map((f) => '/uploads/' + f.filename),
      createdAt: new Date().toISOString(),
      title,
      type: LISTING_TYPES.includes(b.type) ? b.type : 'Khác',
      price: clip(b.price, 40),
      area,
      bedrooms: Math.max(0, parseInt(b.bedrooms, 10) || 0),
      address: clip(b.address, 200),
      legal: clip(b.legal, 100),
      bankSupport: b.bankSupport === 'on',
      featured: false,
      status: 'dang-ban',
      description,
      plain: true, // mô tả của khách hiển thị dạng văn bản thuần, không render Markdown/HTML
      approved: false,
      source: 'khach',
      contactName,
      contactPhone,
    };
    db().listings.push(item);
    item.slug = uniqueSlug(title, db().listings, item.id);
    store.save();
    notifyNewListing(item);
    flash(req, 'ok', 'Cảm ơn bạn! Tin đã được gửi và sẽ hiển thị sau khi được duyệt.');
    res.redirect('/san-pham-bds');
  }
);

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\n${SITE_URL ? 'Sitemap: ' + SITE_URL + '/sitemap.xml\n' : ''}`);
});

app.get('/sitemap.xml', (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get('host')}`;
  const urls = ['/', ...Object.keys(CATS).map((k) => '/' + k), '/hinh-anh', '/san-pham-bds', '/san-pham-vay', '/cong-dong', '/gioi-thieu', '/lien-he']
    .concat(publishedPosts().map((p) => '/bai-viet/' + p.slug))
    .concat(activeListings().map((l) => '/san-pham-bds/' + l.slug));
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
      gallery: d.gallery.length,
      pendingListings: d.listings.filter((l) => l.approved === false).length,
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
  ward: '', lat: null, lng: null,
};
admin.get('/listings', (req, res) => res.render('admin/listings', { title: 'Sản phẩm BĐS', items: allListings() }));
admin.get('/listings/new', (req, res) => res.render('admin/listing_form', { title: 'Thêm sản phẩm', item: emptyListing }));
admin.get('/listings/:id/edit', (req, res, next) => {
  const item = db().listings.find((l) => l.id === +req.params.id);
  if (!item) return next();
  res.render('admin/listing_form', { title: 'Sửa sản phẩm', item });
});
admin.post('/listings/save', upload.array('images', 6), async (req, res) => {
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
    ward: geo.AREAS.includes(b.ward) ? b.ward : '',
  });
  // Vị trí trên bản đồ: tọa độ hoặc link Google Maps. Để trống = gỡ khỏi bản đồ.
  let geoWarn = '';
  const mapInput = clip(b.mapInput, 600);
  if (!mapInput) {
    delete item.lat;
    delete item.lng;
  } else {
    const g = await geo.resolveMapInput(mapInput);
    if (g) { item.lat = g.lat; item.lng = g.lng; }
    else geoWarn = ' Chưa đọc được vị trí trên bản đồ: hãy dán tọa độ dạng 12.2388, 109.1967 (hoặc link Google Maps đầy đủ).';
  }
  const remove = [].concat(b.removeImg || []);
  item.images = item.images.filter((u) => {
    if (remove.includes(u)) { removeFile(u); return false; }
    return true;
  });
  (req.files || []).forEach((f) => item.images.push(fileUrl(f)));
  item.images = item.images.slice(0, 8);
  store.save();
  flash(req, geoWarn ? 'error' : 'ok', 'Đã lưu sản phẩm.' + geoWarn);
  res.redirect('/admin/listings');
});
admin.post('/listings/:id/approve', (req, res) => {
  const item = db().listings.find((l) => l.id === +req.params.id);
  if (item) {
    item.approved = true;
    store.save();
    flash(req, 'ok', 'Đã duyệt, tin đã hiển thị công khai.');
  }
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

// Gửi thử thông báo Telegram và hiện kết quả/lỗi (không hiện token)
admin.get('/test-notify', async (req, res) => {
  const lines = [
    `TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'đã cấu hình' : 'CHƯA CÓ'}`,
    `TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? 'đã cấu hình' : 'CHƯA CÓ'}`,
    `Node: ${process.version}`,
  ];
  try {
    await telegram.sendTelegram('🔔 Gửi thử từ trang quản trị tuanbanker.com: thông báo Telegram hoạt động.');
    lines.push('Kết quả: ĐÃ GỬI, hãy kiểm tra Telegram.');
  } catch (e) {
    lines.push('Kết quả: LỖI - ' + e.message + (e.cause ? ' | ' + (e.cause.code || e.cause.message) : ''));
  }
  // Thử gửi email báo tin
  lines.push('', `SMTP_HOST: ${process.env.SMTP_HOST || '(trống, dùng máy chủ mail nội bộ)'}`, `SMTP_USER: ${process.env.SMTP_USER ? 'đã cấu hình' : 'CHƯA CÓ'}`, `SMTP_PASS: ${process.env.SMTP_PASS ? 'đã cấu hình' : 'CHƯA CÓ'}`);
  try {
    const to = process.env.NOTIFY_EMAIL || 'anh5nhatrang@gmail.com';
    await mailer.sendMail({ to, subject: '[TUẤN BANKER] Gửi thử email từ trang quản trị', text: 'Nếu bạn đọc được thư này thì email báo tin trên tuanbanker.com đã hoạt động.' });
    lines.push('Email: ĐÃ GỬI tới ' + to + ', hãy kiểm tra hộp thư (và Thư rác).');
  } catch (e) {
    lines.push('Email: LỖI - ' + e.message + (e.cause ? ' | ' + (e.cause.code || e.cause.message) : ''));
  }
  res.type('text/plain; charset=utf-8').send(lines.join('\n'));
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

// Hình ảnh (timeline)
const galleryUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => cb(null, !!EXT[file.mimetype]),
});
const todayStr = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // giờ Việt Nam (UTC+7)
const emptyGallery = { id: 0, title: '', date: todayStr(), kind: 'Tập thể', caption: '', link: '', linkText: '', images: [] };
admin.get('/gallery', (req, res) => res.render('admin/gallery', { title: 'Hình ảnh', items: sortedGallery() }));
admin.get('/gallery/new', (req, res) => res.render('admin/gallery_form', { title: 'Thêm hình ảnh', item: emptyGallery, kinds: GALLERY_KINDS }));
admin.get('/gallery/:id/edit', (req, res, next) => {
  const item = db().gallery.find((g) => g.id === +req.params.id);
  if (!item) return next();
  res.render('admin/gallery_form', { title: 'Sửa hình ảnh', item, kinds: GALLERY_KINDS });
});
admin.post('/gallery/save', galleryUpload.array('images', 12), (req, res) => {
  const b = req.body;
  const id = +b.id || 0;
  const title = clip(b.title, 200);
  const files = req.files || [];
  if (!title) {
    files.forEach((f) => removeFile(fileUrl(f)));
    flash(req, 'error', 'Thiếu tiêu đề.');
    return res.redirect(id ? `/admin/gallery/${id}/edit` : '/admin/gallery/new');
  }
  let item = db().gallery.find((g) => g.id === id);
  if (!item) {
    item = { id: store.nextId('gallery'), images: [], createdAt: new Date().toISOString() };
    db().gallery.push(item);
  }
  Object.assign(item, {
    title,
    date: /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : todayStr(),
    kind: GALLERY_KINDS.includes(b.kind) ? b.kind : 'Khác',
    caption: clip(b.caption, 5000),
    link: /^https?:\/\/\S+$/i.test(clip(b.link, 500)) ? clip(b.link, 500) : '',
    linkText: clip(b.linkText, 80),
  });
  const remove = [].concat(b.removeImg || []);
  item.images = item.images.filter((u) => {
    if (remove.includes(u)) { removeFile(u); return false; }
    return true;
  });
  files.forEach((f) => item.images.push(fileUrl(f)));
  if (item.images.length > 60) {
    item.images.slice(60).forEach(removeFile);
    item.images = item.images.slice(0, 60);
  }
  store.save();
  flash(req, 'ok', 'Đã lưu hình ảnh.');
  res.redirect('/admin/gallery');
});
admin.post('/gallery/:id/delete', (req, res) => {
  const i = db().gallery.findIndex((g) => g.id === +req.params.id);
  if (i >= 0) {
    db().gallery[i].images.forEach(removeFile);
    db().gallery.splice(i, 1);
    store.save();
    flash(req, 'ok', 'Đã xóa.');
  }
  res.redirect('/admin/gallery');
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

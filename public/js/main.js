(function () {
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('mainNav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var main = document.getElementById('mainImg');
  var srcs = [];
  document.querySelectorAll('.thumbs button').forEach(function (b) {
    srcs.push(b.dataset.src);
    b.addEventListener('click', function () { if (main) main.src = b.dataset.src; });
  });
  if (main && !srcs.length) srcs.push(main.getAttribute('src'));

  // Phóng to ảnh (lightbox) + tải ảnh gốc
  if (!main || !srcs.length || /placeholder/.test(srcs[0])) return;
  var cur = 0, box = null;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function fileName(u) { return u.split('/').pop().split('?')[0]; }
  function show(i) {
    cur = (i + srcs.length) % srcs.length;
    box.img.src = srcs[cur];
    box.dl.href = srcs[cur];
    box.dl.setAttribute('download', fileName(srcs[cur]));
    box.count.textContent = (cur + 1) + ' / ' + srcs.length;
  }
  function close() { if (box) { box.root.classList.remove('open'); document.body.classList.remove('lb-open'); } }
  function build() {
    var root = el('div', 'lb'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    var img = el('img', 'lb-img'); img.alt = '';
    var bar = el('div', 'lb-bar');
    var count = el('span', 'lb-count');
    var dl = el('a', 'lb-btn', '⬇ Tải ảnh gốc');
    var all = el('button', 'lb-btn', 'Tải tất cả ảnh');
    all.type = 'button';
    all.addEventListener('click', function () {
      srcs.forEach(function (u, k) {
        setTimeout(function () {
          var a = document.createElement('a'); a.href = u; a.setAttribute('download', fileName(u));
          document.body.appendChild(a); a.click(); a.remove();
        }, k * 400);
      });
    });
    var x = el('button', 'lb-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Đóng'); x.addEventListener('click', close);
    var prev = el('button', 'lb-nav lb-prev', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', 'Ảnh trước'); prev.addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
    var next = el('button', 'lb-nav lb-next', '›'); next.type = 'button'; next.setAttribute('aria-label', 'Ảnh sau'); next.addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });
    bar.appendChild(count); bar.appendChild(dl); if (srcs.length > 1) bar.appendChild(all);
    root.appendChild(img); root.appendChild(bar); root.appendChild(x);
    if (srcs.length > 1) { root.appendChild(prev); root.appendChild(next); }
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    document.body.appendChild(root);
    box = { root: root, img: img, dl: dl, count: count };
  }
  function open(i) {
    if (!box) build();
    show(i);
    box.root.classList.add('open');
    document.body.classList.add('lb-open');
  }
  main.classList.add('zoomable');
  main.addEventListener('click', function () { var i = srcs.indexOf(main.getAttribute('src')); open(i < 0 ? 0 : i); });
  document.addEventListener('keydown', function (e) {
    if (!box || !box.root.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
})();

// Xem trước ảnh khi khách chọn ảnh ở trang đăng tin
(function () {
  var input = document.getElementById('subImages');
  var box = document.getElementById('subPreview');
  if (!input || !box) return;
  input.addEventListener('change', function () {
    box.innerHTML = '';
    Array.prototype.slice.call(input.files, 0, 6).forEach(function (f) {
      var img = document.createElement('img');
      img.className = 'preview';
      img.alt = '';
      img.src = URL.createObjectURL(f);
      box.appendChild(img);
    });
  });
})();

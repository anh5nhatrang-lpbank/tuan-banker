// Phóng to ảnh trong timeline: bấm ảnh để xem, ‹ › hoặc phím mũi tên để chuyển, Esc để đóng.
(function () {
  var srcs = [], cur = 0, box = null;
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
    var x = el('button', 'lb-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Đóng'); x.addEventListener('click', close);
    var prev = el('button', 'lb-nav lb-prev', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', 'Ảnh trước'); prev.addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
    var next = el('button', 'lb-nav lb-next', '›'); next.type = 'button'; next.setAttribute('aria-label', 'Ảnh sau'); next.addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });
    bar.appendChild(count); bar.appendChild(dl);
    root.appendChild(img); root.appendChild(bar); root.appendChild(x); root.appendChild(prev); root.appendChild(next);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    document.body.appendChild(root);
    box = { root: root, img: img, dl: dl, count: count, prev: prev, next: next };
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.tl-photo') : null;
    if (!btn) return;
    var group = btn.closest('[data-gallery]');
    var list = Array.prototype.slice.call(group.querySelectorAll('.tl-photo'));
    srcs = list.map(function (b) { return b.dataset.src; });
    if (!box) build();
    box.prev.style.display = box.next.style.display = srcs.length > 1 ? '' : 'none';
    show(list.indexOf(btn));
    box.root.classList.add('open');
    document.body.classList.add('lb-open');
  });
  document.addEventListener('keydown', function (e) {
    if (!box || !box.root.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
})();

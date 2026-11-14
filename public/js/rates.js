// Chuyển nhóm khách hàng (Priority / Thường) cho bảng lãi suất tiết kiệm; đồng bộ với máy tính tiền gửi.
(function () {
  var block = document.getElementById('tiet-kiem');
  if (!block) return;
  var btns = block.querySelectorAll('[data-seg-btn]');
  function show(seg) {
    block.setAttribute('data-seg', seg);
    btns.forEach(function (b) {
      var on = b.getAttribute('data-seg-btn') === seg;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    block.querySelectorAll('[data-seg-show]').forEach(function (el) {
      el.hidden = el.getAttribute('data-seg-show') !== seg;
    });
    var d = document.getElementById('dSegment');
    if (d && d.value !== seg) { d.value = seg; d.dispatchEvent(new Event('change')); }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-seg-btn')); }); });
  var d = document.getElementById('dSegment');
  if (d) d.addEventListener('change', function () {
    if (block.getAttribute('data-seg') !== d.value) show(d.value);
  });
})();

// Công cụ tính nhanh số gốc hằng tháng cho trang Cho vay Hưu trí (chưa gồm lãi)
(function () {
  var A = document.getElementById('rA'), G = document.getElementById('rG'), M = document.getElementById('rM');
  if (!A || !G || !M) return;
  function fmt(n) { return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 }); }
  function upd() {
    var age = +G.value;
    // tối đa 84 tháng và tuổi khi kết thúc khoản vay không quá 75
    var cap = Math.min(84, Math.floor((75 - age) * 12 / 6) * 6);
    if (cap < 12) cap = Math.max(6, (75 - age) * 12);
    M.max = cap;
    if (+M.value > cap) M.value = cap;
    var a = +A.value, m = +M.value;
    document.getElementById('vA').textContent = a + ' triệu';
    document.getElementById('vG').textContent = age + ' tuổi';
    document.getElementById('vM').textContent = m + ' tháng';
    document.getElementById('out').textContent = fmt(a / m) + ' triệu';
    document.getElementById('cap').textContent = 'Với tuổi ' + age + ', thời gian vay tối đa khoảng ' + cap + ' tháng (không quá 84 tháng, tuổi kết thúc không quá 75).';
  }
  [A, G, M].forEach(function (e) { e.addEventListener('input', upd); e.addEventListener('change', upd); });
  upd();
})();

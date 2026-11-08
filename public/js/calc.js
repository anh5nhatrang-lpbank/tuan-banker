(function () {
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (m) {
    // m: triệu đồng
    if (!isFinite(m)) return '-';
    if (m >= 1000) return (m / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
    return m.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu';
  };
  function calc() {
    var P = parseFloat($('cAmount').value);
    var r = parseFloat($('cRate').value) / 100 / 12;
    var n = Math.round(parseFloat($('cYears').value) * 12);
    if (!(P > 0) || !(n > 0) || !(r >= 0)) {
      $('rFirst').textContent = $('rInterest').textContent = $('rTotal').textContent = '-';
      return;
    }
    var first, interest;
    if ($('cMethod').value === 'giam-dan') {
      var principal = P / n;
      first = principal + P * r;
      interest = r * P * (n + 1) / 2;
    } else {
      var pmt = r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
      first = pmt;
      interest = pmt * n - P;
    }
    $('rFirst').textContent = fmt(first);
    $('rInterest').textContent = fmt(interest);
    $('rTotal').textContent = fmt(P + interest);
  }
  ['cAmount', 'cRate', 'cYears', 'cMethod'].forEach(function (id) {
    $(id).addEventListener('input', calc);
    $(id).addEventListener('change', calc);
  });
  $('calcForm').addEventListener('submit', function (e) { e.preventDefault(); });
  calc();
})();

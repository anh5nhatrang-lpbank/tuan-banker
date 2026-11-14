(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$('calcForm')) return;
  var fmt = function (m) {
    // m: triệu đồng
    if (!isFinite(m)) return '-';
    if (m >= 1000) return (m / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
    return m.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu';
  };

  // ===== Lãi suất ưu đãi theo gói vay: đọc từ bảng lãi suất ưu đãi (cùng nguồn lib/rates.js) =====
  var data = null;
  try { data = JSON.parse($('loanRateData').textContent); } catch (e) {}
  var sel = $('cPurpose');

  function autoRate() {
    if (!data || !sel || sel.value === 'tu-nhap') return;
    var o = data.options.filter(function (x) { return x.key === sel.value; })[0];
    if (o) $('cRate').value = o.rate;
  }
  if (data && sel) {
    data.options.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.key; opt.textContent = p.name;
      sel.appendChild(opt);
    });
    var custom = document.createElement('option');
    custom.value = 'tu-nhap'; custom.textContent = 'Tự nhập lãi suất';
    sel.appendChild(custom);
    sel.value = 'nha-dat-1';
    autoRate();
  } else if (sel) {
    sel.parentNode.style.display = 'none';
  }

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

  if (sel) sel.addEventListener('change', function () { autoRate(); calc(); });
  $('cYears').addEventListener('input', calc);
  $('cRate').addEventListener('input', function () { if (sel) sel.value = 'tu-nhap'; calc(); });
  ['cAmount', 'cMethod'].forEach(function (id) {
    $(id).addEventListener('input', calc);
    $(id).addEventListener('change', calc);
  });
  $('calcForm').addEventListener('submit', function (e) { e.preventDefault(); });
  calc();
})();

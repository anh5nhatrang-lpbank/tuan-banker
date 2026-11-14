(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$('calcForm')) return;
  var fmt = function (m) {
    // m: triệu đồng
    if (!isFinite(m)) return '-';
    if (m >= 1000) return (m / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
    return m.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu';
  };

  // ===== Lãi suất theo mục đích vay: đọc từ bảng lãi suất cho vay (cùng nguồn với bảng trên trang) =====
  var data = null;
  try { data = JSON.parse($('loanRateData').textContent); } catch (e) {}
  var sel = $('cPurpose');

  // Nhóm thời hạn: <3 | 3-<6 | 6-12 | >12-60 | >60 (tháng)
  function bracket(months) {
    if (months < 3) return 0;
    if (months < 6) return 1;
    if (months <= 12) return 2;
    if (months <= 60) return 3;
    return 4;
  }
  function autoRate() {
    if (!data || !sel || sel.value === 'tu-nhap') return;
    var p = data.purposes.filter(function (x) { return x.key === sel.value; })[0];
    var years = parseFloat($('cYears').value);
    if (!p || !(years > 0)) return;
    $('cRate').value = p.rates[bracket(Math.round(years * 12))];
  }
  if (data && sel) {
    data.purposes.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.key; o.textContent = p.name;
      sel.appendChild(o);
    });
    var custom = document.createElement('option');
    custom.value = 'tu-nhap'; custom.textContent = 'Tự nhập lãi suất';
    sel.appendChild(custom);
    sel.value = 'nha-dat';
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
  $('cYears').addEventListener('input', function () { autoRate(); calc(); });
  $('cRate').addEventListener('input', function () { if (sel) sel.value = 'tu-nhap'; calc(); });
  ['cAmount', 'cMethod'].forEach(function (id) {
    $(id).addEventListener('input', calc);
    $(id).addEventListener('change', calc);
  });
  $('calcForm').addEventListener('submit', function (e) { e.preventDefault(); });
  calc();
})();

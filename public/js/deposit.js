(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$('depForm')) return;

  // ===== BIỂU LÃI SUẤT (%/năm) - hiệu lực từ 02/11/2026 =====
  // Cập nhật lãi suất: chỉ cần sửa các số trong hai bảng dưới đây.
  var RATES_DATE = '02/11/2026';

  // Tiết kiệm thường tại quầy: kỳ hạn (tháng) -> [Trả trước, Hàng tháng, Hàng quý]; null = không áp dụng
  var COUNTER = {
    priority: {
      6:  [8.00, 8.15, 8.20],
      7:  [7.90, 8.15, null],
      8:  [7.85, 8.10, null],
      9:  [7.90, 8.10, 8.20],
      10: [7.85, 8.15, null],
      11: [7.80, 8.10, null],
      12: [7.85, 8.20, 8.25]
    },
    mass: {
      6:  [7.90, 8.05, 8.10],
      7:  [7.80, 8.05, null],
      8:  [7.75, 8.00, null],
      9:  [7.80, 8.00, 8.10],
      10: [7.75, 8.05, null],
      11: [7.70, 8.01, null],
      12: [7.75, 8.10, 8.15]
    }
  };

  // Lãi cuối kỳ của KH Priority theo số tiền: kỳ hạn -> [từ 2 tỷ, 500tr-<2 tỷ, 100tr-<500tr]
  // KH Mass = Priority - 0,1%
  var END = {
    1:  [4.75, 4.75, 4.75],
    2:  [4.75, 4.75, 4.75],
    3:  [4.75, 4.75, 4.75],
    4:  [4.75, 4.75, 4.75],
    5:  [4.75, 4.75, 4.75],
    6:  [8.20, 8.10, 8.00],
    7:  [8.20, 8.10, 8.00],
    8:  [8.20, 8.10, 8.00],
    9:  [8.20, 8.10, 8.00],
    10: [8.20, 8.10, 8.00],
    11: [8.20, 8.10, 8.00],
    12: [8.30, 8.20, 8.10],
    13: [8.00, 7.90, 7.80],
    15: [8.00, 7.90, 7.80],
    16: [8.00, 7.90, 7.80],
    18: [8.00, 7.90, 7.80],
    24: [8.10, 8.00, 7.90],
    25: [8.10, 8.00, 7.90],
    36: [7.70, 7.60, 7.50]
  };
  // ==========================================================

  var METHOD_COL = { 'tra-truoc': 0, 'hang-thang': 1, 'hang-quy': 2 };

  function money(vnd) {
    if (!isFinite(vnd)) return '-';
    return Math.round(vnd).toLocaleString('vi-VN') + ' đồng';
  }
  function pct(r) { return r.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%/năm'; }

  function termsFor(method, segment) {
    var out = [];
    if (method === 'cuoi-ky') {
      Object.keys(END).forEach(function (k) { out.push(+k); });
    } else {
      var col = METHOD_COL[method];
      var t = COUNTER[segment];
      Object.keys(t).forEach(function (k) { if (t[k][col] != null) out.push(+k); });
    }
    return out.sort(function (a, b) { return a - b; });
  }

  function fillTerms() {
    var sel = $('dTerm');
    var keep = sel.value;
    var list = termsFor($('dMethod').value, $('dSegment').value);
    sel.innerHTML = '';
    list.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m + ' tháng';
      sel.appendChild(o);
    });
    if (list.indexOf(+keep) >= 0) sel.value = keep;
    else if (list.indexOf(12) >= 0) sel.value = 12;
  }

  function getRate(method, segment, term, amountMillion) {
    if (method === 'cuoi-ky') {
      var row = END[term];
      if (!row || amountMillion < 100) return null;
      var tier = amountMillion >= 2000 ? 0 : (amountMillion >= 500 ? 1 : 2);
      var r = row[tier];
      return segment === 'mass' ? Math.round((r - 0.1) * 100) / 100 : r;
    }
    var rr = COUNTER[segment][term];
    return rr ? rr[METHOD_COL[method]] : null;
  }

  function reset(msg) {
    ['dRate', 'dPer', 'dInterest', 'dTotal'].forEach(function (id) { $(id).textContent = '-'; });
    $('dNote').textContent = msg || '';
  }

  function calc() {
    var method = $('dMethod').value, segment = $('dSegment').value;
    var term = parseInt($('dTerm').value, 10);
    var amountM = parseFloat($('dAmount').value);
    var P = amountM * 1e6;
    var general = 'Lãi suất tại quầy theo biểu lãi hiệu lực từ ' + RATES_DATE + ', chỉ mang tính tham khảo và có thể thay đổi. Vui lòng liên hệ để được tư vấn mức lãi suất và điều kiện áp dụng tại thời điểm gửi.';

    if (!(amountM > 0) || !(term > 0)) return reset(general);
    var r = getRate(method, segment, term, amountM);
    if (r == null) {
      return reset(method === 'cuoi-ky' && amountM < 100
        ? 'Lãi cuối kỳ áp dụng cho số tiền từ 100 triệu đồng. Với số tiền nhỏ hơn, vui lòng liên hệ để được tư vấn.'
        : general);
    }

    var total = P * (r / 100) * term / 12;
    var per, perLabel;
    if (method === 'cuoi-ky') { per = total; perLabel = 'Tiền lãi nhận khi đến hạn'; }
    else if (method === 'tra-truoc') { per = total; perLabel = 'Tiền lãi nhận ngay khi gửi'; }
    else if (method === 'hang-thang') { per = P * (r / 100) / 12; perLabel = 'Lãi nhận mỗi tháng'; }
    else { per = P * (r / 100) / 4; perLabel = 'Lãi nhận mỗi quý'; }

    $('dRate').textContent = pct(r);
    $('dPerLabel').textContent = perLabel;
    $('dPer').textContent = money(per);
    $('dInterest').textContent = money(total);
    $('dTotal').textContent = money(P + total);
    var extra = method === 'tra-truoc'
      ? ' Lãi trả trước được tạm tính đơn giản theo số tiền × lãi suất × kỳ hạn/12.'
      : '';
    $('dNote').textContent = general + extra;
  }

  ['dMethod', 'dSegment'].forEach(function (id) {
    $(id).addEventListener('change', function () { fillTerms(); calc(); });
  });
  ['dAmount', 'dTerm'].forEach(function (id) {
    $(id).addEventListener('input', calc);
    $(id).addEventListener('change', calc);
  });
  $('depForm').addEventListener('submit', function (e) { e.preventDefault(); });
  fillTerms();
  calc();
})();

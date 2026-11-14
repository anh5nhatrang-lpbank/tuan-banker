(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$('depForm')) return;

  // ===== BIỂU LÃI SUẤT: cùng nguồn dữ liệu với bảng lãi suất tiết kiệm trên website (lib/rates.js) =====
  var DATA;
  try { DATA = JSON.parse($('depositRateData').textContent); } catch (e) { return; }
  // rows: [kỳ hạn, Cuối kỳ, Hàng tháng, Hàng quý, Trả trước, Rút 1 lần]
  var COL = { 'cuoi-ky': 1, 'hang-thang': 2, 'hang-quy': 3, 'tra-truoc': 4 };
  var ROWS = {};
  DATA.rows.forEach(function (r) { ROWS[r[0]] = r; });
  // ==========================================================

  function money(vnd) {
    if (!isFinite(vnd)) return '-';
    return Math.round(vnd).toLocaleString('vi-VN') + ' đồng';
  }
  function pct(r) { return r.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%/năm'; }

  function termsFor(method) {
    var out = [];
    DATA.rows.forEach(function (r) { if (r[COL[method]] != null) out.push(r[0]); });
    return out;
  }

  function fillTerms() {
    var sel = $('dTerm');
    var keep = sel.value;
    var list = termsFor($('dMethod').value);
    sel.innerHTML = '';
    list.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m + ' tháng';
      sel.appendChild(o);
    });
    if (list.indexOf(+keep) >= 0) sel.value = keep;
    else if (list.indexOf(12) >= 0) sel.value = 12;
  }

  function reset(msg) {
    ['dRate', 'dPer', 'dInterest', 'dTotal'].forEach(function (id) { $(id).textContent = '-'; });
    $('dNote').textContent = msg || '';
  }

  function calc() {
    var method = $('dMethod').value;
    var term = parseInt($('dTerm').value, 10);
    var amountM = parseFloat($('dAmount').value);
    var P = amountM * 1e6;
    var general = 'Lãi suất theo biểu niêm yết của LPBank hiệu lực từ ' + DATA.date + ', chỉ mang tính tham khảo và có thể thay đổi. Khách hàng Ưu tiên hoặc gửi mới có thể được lãi suất cao hơn; vui lòng liên hệ để được tư vấn mức lãi suất và điều kiện áp dụng tại thời điểm gửi.';

    if (!(amountM > 0) || !(term > 0) || !ROWS[term]) return reset(general);
    var r = ROWS[term][COL[method]];
    if (r == null) return reset(general);

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

  $('dMethod').addEventListener('change', function () { fillTerms(); calc(); });
  ['dAmount', 'dTerm'].forEach(function (id) {
    $(id).addEventListener('input', calc);
    $(id).addEventListener('change', calc);
  });
  $('depForm').addEventListener('submit', function (e) { e.preventDefault(); });
  fillTerms();
  calc();
})();

'use strict';
// ============================================================================
// DỮ LIỆU LÃI SUẤT DÙNG CHUNG (bảng lãi suất + máy tính trên website đều đọc từ đây).
// Cập nhật lãi suất: chỉ cần sửa các số trong file này, rồi deploy.
// ============================================================================

// ---------------------------------------------------------------------------
// 1) LÃI SUẤT HUY ĐỘNG (tiết kiệm VND tại quầy, %/năm)
// ---------------------------------------------------------------------------
const DEPOSIT = {
  date: '02/11/2026',
  // Tiết kiệm lĩnh lãi trả trước / hàng tháng / hàng quý: kỳ hạn (tháng) -> [Trả trước, Hàng tháng, Hàng quý]; null = không áp dụng
  counter: {
    priority: {
      6:  [8.00, 8.15, 8.20],
      7:  [7.90, 8.15, null],
      8:  [7.85, 8.10, null],
      9:  [7.90, 8.10, 8.20],
      10: [7.85, 8.15, null],
      11: [7.80, 8.10, null],
      12: [7.85, 8.20, 8.25],
    },
    mass: {
      6:  [7.90, 8.05, 8.10],
      7:  [7.80, 8.05, null],
      8:  [7.75, 8.00, null],
      9:  [7.80, 8.00, 8.10],
      10: [7.75, 8.05, null],
      11: [7.70, 8.01, null],
      12: [7.75, 8.10, 8.15],
    },
  },
  // Lãi cuối kỳ của KH Priority theo số tiền: kỳ hạn -> [từ 2 tỷ, 500 triệu - dưới 2 tỷ, 100 triệu - dưới 500 triệu]
  end: {
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
    36: [7.70, 7.60, 7.50],
  },
  massDelta: -0.1, // KH thường (Mass) = Priority - 0,1% đối với lãi cuối kỳ
  tiers: ['Từ 2 tỷ', '500 triệu – dưới 2 tỷ', '100 triệu – dưới 500 triệu'], // thứ tự khớp mảng trong "end"
};

// ---------------------------------------------------------------------------
// 2) LÃI SUẤT CHO VAY (VND, %/năm) - áp dụng từ 17/11/2026
// Lãi suất hiển thị = Lãi suất cơ sở + Biên độ (đã cộng sẵn, khách chỉ xem một mức).
// Mức "từ": lãi suất thấp nhất cho khách hàng thông thường; mức cụ thể tùy hồ sơ.
// ---------------------------------------------------------------------------
const LOAN = {
  date: '17/11/2026',
  baseShort: 9.5,  // Lãi suất cơ sở ngắn hạn (vay đến 12 tháng)
  baseLong: 10.0,  // Lãi suất cơ sở trung - dài hạn (vay trên 12 tháng)
  // Các nhóm thời hạn vay. short = true: dùng lãi suất cơ sở ngắn hạn
  brackets: [
    { key: 'b1', label: 'Dưới 3 tháng', sub: '', short: true, minMonths: 0, maxMonths: 3 },
    { key: 'b2', label: '3 – dưới 6 tháng', sub: '', short: true, minMonths: 3, maxMonths: 6 },
    { key: 'b3', label: '6 – 12 tháng', sub: '', short: true, minMonths: 6, maxMonths: 12 },
    { key: 'b4', label: 'Trên 12 – 60 tháng', sub: '(1 – 5 năm)', short: false, minMonths: 12, maxMonths: 60 },
    { key: 'b5', label: 'Trên 60 tháng', sub: '(trên 5 năm)', short: false, minMonths: 60, maxMonths: Infinity },
  ],
  // Biên độ theo từng nhóm thời hạn (cùng thứ tự với brackets)
  purposes: [
    { key: 'sxkd',        icon: '🏪', name: 'Vay sản xuất kinh doanh',                     note: 'Vốn lưu động, đầu tư mở rộng kinh doanh',       margins: [2.3, 3.2, 3.8, 3.9, 4.1] },
    { key: 'nha-dat',     icon: '🏠', name: 'Vay mua nhà đất, nhà dự án',                  note: 'Mua nhà đất, căn hộ, nhà dự án',                margins: [4.0, 4.0, 4.0, 4.1, 4.3] },
    { key: 'tieu-dung',   icon: '💳', name: 'Vay tiêu dùng có tài sản bảo đảm',            note: 'Nhu cầu đời sống, thế chấp tài sản',            margins: [3.0, 3.9, 4.5, 4.4, 4.6] },
    { key: 'tsbd-khac',   icon: '🔐', name: 'Vay mục đích khác có tài sản bảo đảm',        note: 'Vay món hoặc thấu chi có tài sản bảo đảm khác', margins: [3.5, 4.4, 5.0, 4.9, 5.1] },
    { key: 'cam-co',      icon: '📜', name: 'Vay cầm cố giấy tờ có giá do TCTD khác phát hành', note: 'Cầm cố giấy tờ có giá ngân hàng/TCTD khác', margins: [2.0, 2.9, 3.5, 3.6, 3.8] },
    { key: 'khong-tsbd',  icon: '🪪', name: 'Vay tiêu dùng không tài sản bảo đảm',         note: 'Vay món hoặc thấu chi, không cần tài sản',      margins: [5.5, 6.4, 7.0, 7.1, 7.3] },
  ],
};

// Lãi suất vay đã cộng sẵn, làm tròn 1 chữ số thập phân
function loanRate(purpose, bracketIdx) {
  const b = LOAN.brackets[bracketIdx];
  const base = b.short ? LOAN.baseShort : LOAN.baseLong;
  return Math.round((base + purpose.margins[bracketIdx]) * 10) / 10;
}

// Bảng lãi suất vay hoàn chỉnh: [{...purpose, rates:[...], min, max}]
function loanTable() {
  const rows = LOAN.purposes.map((p) => {
    const rates = LOAN.brackets.map((_, i) => loanRate(p, i));
    return Object.assign({}, p, { rates, min: Math.min.apply(null, rates), max: Math.max.apply(null, rates) });
  });
  const all = rows.reduce((a, r) => a.concat(r.rates), []);
  return { rows, min: Math.min.apply(null, all), max: Math.max.apply(null, all) };
}

// ---------------------------------------------------------------------------
// Hàm hỗ trợ hiển thị (server)
// ---------------------------------------------------------------------------
const r2 = (x) => Math.round(x * 100) / 100;

// 8.2 -> "8,20%" (2 số lẻ) ; digits=1 -> "13,5%"
function pct(n, digits) {
  if (n == null) return '–';
  return n.toFixed(digits == null ? 2 : digits).replace('.', ',') + '%';
}

// [1,2,3,4,5] -> "1–5 tháng" ; [13,15,16,18] -> "13, 15, 16, 18 tháng" ; [12] -> "12 tháng"
function termLabel(list) {
  if (list.length === 1) return list[0] + ' tháng';
  const consecutive = list.every((v, i) => i === 0 || v === list[i - 1] + 1);
  return (consecutive ? list[0] + '–' + list[list.length - 1] : list.join(', ')) + ' tháng';
}

// Lãi cuối kỳ theo nhóm kỳ hạn có cùng mức lãi: [{terms:[...], label, rates:[3 mức theo số tiền]}]
function endGroups(segment) {
  const delta = segment === 'mass' ? DEPOSIT.massDelta : 0;
  const terms = Object.keys(DEPOSIT.end).map(Number).sort((a, b) => a - b);
  const groups = [];
  terms.forEach((t) => {
    const rates = DEPOSIT.end[t].map((x) => r2(x + delta));
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.rates) === JSON.stringify(rates)) last.terms.push(t);
    else groups.push({ terms: [t], rates });
  });
  groups.forEach((g) => { g.label = termLabel(g.terms); });
  return groups;
}

// 3 thẻ nổi bật cho từng nhóm khách hàng (lãi cuối kỳ)
function depositHighlights(segment) {
  const groups = endGroups(segment);
  const best = (list) => list.reduce((m, g) => {
    const v = Math.max.apply(null, g.rates);
    return v > m.v ? { v, g } : m;
  }, { v: -1, g: null });
  const all = best(groups);
  const mid = best(groups.filter((g) => g.terms[0] >= 6 && g.terms[g.terms.length - 1] <= 11));
  const long = best(groups.filter((g) => g.terms[0] > 12));
  return [
    { value: all.v, title: 'Cao nhất', sub: 'Kỳ hạn ' + all.g.label + ', số tiền từ 2 tỷ' },
    { value: mid.v, title: 'Kỳ hạn 6 – 11 tháng', sub: 'Mức cao nhất theo số tiền gửi' },
    { value: long.v, title: 'Kỳ hạn trên 12 tháng', sub: 'Mức cao nhất theo số tiền gửi' },
  ];
}

// Dữ liệu gửi xuống trình duyệt cho máy tính (không chứa gì ngoài số liệu công khai)
function clientDeposit() {
  return JSON.stringify(DEPOSIT).replace(/</g, '\\u003c');
}
function clientLoan() {
  const t = loanTable();
  return JSON.stringify({
    date: LOAN.date,
    brackets: LOAN.brackets.map((b) => ({ label: b.label, minMonths: b.minMonths, maxMonths: b.maxMonths === Infinity ? null : b.maxMonths })),
    purposes: t.rows.map((r) => ({ key: r.key, name: r.name, rates: r.rates })),
  }).replace(/</g, '\\u003c');
}

module.exports = { DEPOSIT, LOAN, loanRate, loanTable, pct, termLabel, endGroups, depositHighlights, clientDeposit, clientLoan };

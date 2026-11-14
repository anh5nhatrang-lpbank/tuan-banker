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
// ---------------------------------------------------------------------------
// 3) LÃI SUẤT CHO VAY ƯU ĐÃI (công khai trên website) - TB 21627/2026/TB-LPBank.PDS
// Hiệu lực từ 06/11/2026. Mức lãi suất là mức "từ" (tối thiểu); mức cụ thể tùy hồ sơ.
// Bảng LOAN ở trên (lãi suất thông thường) CHỈ hiển thị cho admin.
// ---------------------------------------------------------------------------
const PROMO = {
  from: '06/11/2026',
  until: '31/12/2026', // tên file/ô review ghi 31/12/2026, nội dung thông báo ghi 31/01/2027 hoặc hết hạn mức -> hiển thị thận trọng
  // Vay SXKD ngắn hạn (đến 12 tháng), lãi suất cố định (%/năm) theo thời gian vay
  short: [
    { label: 'Đến 3 tháng', rate: null },
    { label: 'Trên 3 – 6 tháng', rate: 10.8 },
    { label: 'Trên 6 – 9 tháng', rate: 10.88 },
    { label: 'Trên 9 – 12 tháng', rate: 11.68 },
  ],
  // Vay trung - dài hạn: lãi suất cố định kỳ đầu + biên độ kỳ tiếp theo
  long: [
    { key: 'nha-du-an', icon: '🏙️', name: 'Mua nhà dự án', note: 'Căn hộ, nhà dự án', options: [
      { opt: 'Lựa chọn 1', fixed: 12, rate: 11.38, margin: 3.8, minTerm: 'Từ 60 tháng', fee: 'Năm 1–3: 2,5% · Năm 4: 2,0% · Năm 5: 1,0% · Từ năm 6: miễn phí' },
      { opt: 'Lựa chọn 2', fixed: 24, rate: 11.98, margin: 3.8, minTerm: 'Từ 120 tháng', fee: 'Năm 1–3: 2,5% · Năm 4: 2,0% · Năm 5: 1,0% · Từ năm 6: miễn phí' },
      { opt: 'Lựa chọn 3', fixed: 24, rate: 12.98, margin: 3.8, minTerm: 'Trên 24 tháng', fee: 'Miễn phí' },
    ] },
    { key: 'nha-dat', icon: '🏠', name: 'Mua nhà đất, tiêu dùng có tài sản bảo đảm, SXKD', note: 'Thế chấp nhà đất, tài sản', options: [
      { opt: 'Lựa chọn 1', fixed: 12, rate: 11.68, margin: 3.8, minTerm: 'Từ 36 tháng', fee: 'Năm 1–3: 2,5% · Năm 4: 2,0% · Năm 5: 1,0% · Từ năm 6: miễn phí' },
      { opt: 'Lựa chọn 2', fixed: 24, rate: 12.18, margin: 3.8, minTerm: 'Từ 60 tháng', fee: 'Năm 1–3: 2,5% · Năm 4: 2,0% · Năm 5: 1,0% · Từ năm 6: miễn phí' },
      { opt: 'Lựa chọn 3', fixed: 24, rate: 13.18, margin: 3.8, minTerm: 'Trên 24 tháng', fee: 'Miễn phí' },
    ] },
    { key: 'huu-tri', icon: '🧓', name: 'Tín dụng hưu trí, tiêu dùng không tài sản bảo đảm', note: 'Vay không cần tài sản', options: [
      { opt: 'Lựa chọn 1', fixed: 12, rate: 13.88, margin: 4.5, minTerm: 'Từ 24 tháng', fee: 'Theo quy định của LPBank từng thời kỳ' },
    ] },
  ],
  conditions: [
    'Khoản vay VND giải ngân mới trong thời gian chương trình hiệu lực.',
    'Khách hàng dùng tối thiểu 2 trong 3 sản phẩm/dịch vụ của LPBank: tài khoản thanh toán, ứng dụng LPBank, thẻ tín dụng.',
    'Đồng thời đáp ứng ít nhất một trong các lựa chọn: mua sản phẩm gắn kết (doanh số tối thiểu 1% số tiền giải ngân); hoặc mua tài khoản số đẹp/sản phẩm thu phí khác (tối thiểu 0,5%); hoặc gửi và phong tỏa tối thiểu 3% số tiền giải ngân trong thời gian vay (tối đa 12 tháng); hoặc dùng combo Lộc Phát của LPBank.',
  ],
};

// Lãi suất ưu đãi thấp nhất theo nhóm sản phẩm vay (dùng cho thẻ sản phẩm)
function promoMin(key) {
  const shortMin = Math.min.apply(null, PROMO.short.filter((x) => x.rate != null).map((x) => x.rate));
  const pick = (k) => Math.min.apply(null, PROMO.long.filter((g) => g.key === k)[0].options.map((o) => o.rate));
  if (key === 'sxkd') return shortMin;
  if (key === 'nha-dat') return pick('nha-du-an');
  if (key === 'tieu-dung') return pick('nha-dat');
  return null;
}

// Các lựa chọn cho máy tính vay (lãi suất cố định kỳ đầu)
function calcOptions() {
  const out = [];
  PROMO.short.filter((x) => x.rate != null).forEach((x) => out.push({ key: 'sxkd-' + out.length, name: 'Vay SXKD ngắn hạn · ' + x.label.toLowerCase(), rate: x.rate, years: 1 }));
  PROMO.long.forEach((g) => g.options.forEach((o, i) => out.push({
    key: g.key + '-' + (i + 1), name: g.name + ' · ' + o.opt.toLowerCase() + ' (cố định ' + o.fixed + ' tháng)', rate: o.rate, years: 20,
  })));
  return out;
}
function clientLoan() {
  return JSON.stringify({ from: PROMO.from, options: calcOptions() }).replace(/</g, '\\u003c');
}

module.exports = { DEPOSIT, LOAN, PROMO, promoMin, loanRate, loanTable, pct, termLabel, endGroups, depositHighlights, clientDeposit, clientLoan };

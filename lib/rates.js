'use strict';
// ============================================================================
// DỮ LIỆU LÃI SUẤT DÙNG CHUNG (bảng lãi suất + máy tính trên website đều đọc từ đây).
// Cập nhật lãi suất: chỉ cần sửa các số trong file này, rồi deploy.
// ============================================================================

// ---------------------------------------------------------------------------
// 1) LÃI SUẤT HUY ĐỘNG (tiết kiệm VND có kỳ hạn, %/năm)
// Nguồn: biểu lãi suất huy động công bố trên https://lpbank.com.vn/ca-nhan/lai-suat
// (mục "Có kỳ hạn", áp dụng tại các Chi nhánh/PGD Ngân hàng). null = không có hình thức này.
// ---------------------------------------------------------------------------
const DEPOSIT = {
  date: '19/10/2026',
  checked: '14/11/2026', // ngày đối chiếu với website LPBank
  // [kỳ hạn (tháng), Cuối kỳ, Hàng tháng, Hàng quý, Trả trước, Rút 1 lần (chuyển đổi từ rút gốc linh hoạt)]
  rows: [
    [1, 4.20, null, null, 4.18, 4.12],
    [2, 4.20, 4.19, null, 4.17, 4.12],
    [3, 4.20, 4.19, null, 4.15, 4.12],
    [4, 4.40, 4.38, null, 4.33, 4.31],
    [5, 4.40, 4.37, null, 4.32, 4.31],
    [6, 6.00, 5.93, 5.96, 5.82, 5.88],
    [7, 6.00, 5.91, null, 5.79, 5.88],
    [8, 6.00, 5.90, null, 5.76, 5.88],
    [9, 6.20, 6.08, 6.11, 5.92, 6.08],
    [10, 6.20, 6.06, null, 5.89, 6.08],
    [11, 6.20, 6.05, null, 5.86, 6.08],
    [12, 6.40, 6.22, 6.25, 6.01, 6.27],
    [13, 6.50, 6.30, null, 6.07, 6.37],
    [15, 6.60, 6.36, 6.39, 6.09, 6.47],
    [16, 6.60, 6.34, null, 6.06, 6.47],
    [18, 6.60, 6.31, 6.34, 6.00, 6.47],
    [24, 6.70, 6.30, 6.34, 5.90, 6.57],
    [25, 6.70, 6.29, null, 5.87, 6.57],
    [36, 6.00, 5.53, 5.56, 5.08, 5.88],
    [48, 6.00, 5.39, 5.41, 4.83, 5.88],
    [60, 6.00, 5.26, 5.28, 4.61, 5.88],
  ],
  columns: ['Cuối kỳ', 'Hàng tháng', 'Hàng quý', 'Trả trước', 'Rút 1 lần (chuyển đổi từ rút gốc linh hoạt)'],
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
// 8.2 -> "8,20%" (2 số lẻ) ; digits=1 -> "13,5%"
function pct(n, digits) {
  if (n == null) return '–';
  return n.toFixed(digits == null ? 2 : digits).replace('.', ',') + '%';
}

// 3 thẻ nổi bật: mức cao nhất theo từng nhóm kỳ hạn (lãi cuối kỳ)
function depositHighlights() {
  const rows = DEPOSIT.rows;
  const best = (list) => list.reduce((m, r) => (r[1] > m[1] ? r : m), list[0]);
  const all = best(rows);
  const y1 = rows.filter((r) => r[0] === 12)[0];
  const m6 = rows.filter((r) => r[0] === 6)[0];
  return [
    { value: all[1], title: 'Cao nhất', sub: 'Kỳ hạn ' + all[0] + ' tháng, lãi cuối kỳ' },
    { value: y1[1], title: 'Kỳ hạn 12 tháng', sub: 'Lãi cuối kỳ' },
    { value: m6[1], title: 'Kỳ hạn 6 tháng', sub: 'Lãi cuối kỳ' },
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
function clientLoan(isAdmin) {
  // Khách thường không nhận bảng lãi suất; chỉ admin có gói lãi suất tự điền
  return JSON.stringify({ options: isAdmin ? calcOptions() : [] }).replace(/</g, '\\u003c');
}

module.exports = { DEPOSIT, LOAN, PROMO, promoMin, loanRate, loanTable, pct, depositHighlights, clientDeposit, clientLoan };

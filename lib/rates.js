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
// 2) LÃI SUẤT CHO VAY (thông thường + ưu đãi): DỮ LIỆU NỘI BỘ, KHÔNG nằm trong mã nguồn/GitHub.
// Lưu trong thư mục dữ liệu riêng (DATA_DIR/loan-rates.json, quyền 0600), nhập qua Quản trị → Lãi suất vay.
// Chỉ admin đăng nhập mới xem được trên website.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const store = require('./store');
const PRIV_FILE = path.join(store.DATA_DIR, 'loan-rates.json');
const EMPTY_LOAN = { date: '', baseShort: 0, baseLong: 0, brackets: [], purposes: [] };
const EMPTY_PROMO = { from: '', until: '', short: [], long: [], conditions: [] };
let PRIV = { LOAN: null, PROMO: null };

const isNum = (x) => typeof x === 'number' && isFinite(x);
function validatePrivate(j) {
  if (!j || typeof j !== 'object') throw new Error('Dữ liệu phải là một đối tượng JSON.');
  const L = j.LOAN, P = j.PROMO;
  if (L) {
    if (!isNum(L.baseShort) || !isNum(L.baseLong) || !Array.isArray(L.brackets) || !Array.isArray(L.purposes)) throw new Error('LOAN thiếu baseShort/baseLong/brackets/purposes.');
    L.purposes.forEach((x) => {
      if (!Array.isArray(x.margins) || x.margins.length !== L.brackets.length || !x.margins.every(isNum)) throw new Error('LOAN: "margins" của "' + x.name + '" phải có đúng ' + L.brackets.length + ' số.');
    });
  }
  if (P) {
    if (!Array.isArray(P.short) || !Array.isArray(P.long)) throw new Error('PROMO thiếu short/long.');
    P.long.forEach((g) => (g.options || []).forEach((o) => { if (!isNum(o.rate) || !isNum(o.margin)) throw new Error('PROMO: lãi suất/biên độ phải là số.'); }));
  }
  return { LOAN: L || null, PROMO: P || null };
}
function loadPrivate() {
  try { PRIV = validatePrivate(JSON.parse(fs.readFileSync(PRIV_FILE, 'utf8'))); } catch (e) { PRIV = { LOAN: null, PROMO: null }; }
}
// Lưu dữ liệu nội bộ (admin nhập). Ghi nguyên tử, quyền chỉ chủ tài khoản hosting đọc được.
function savePrivate(text) {
  const j = validatePrivate(JSON.parse(text));
  const tmp = PRIV_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(j, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, PRIV_FILE);
  loadPrivate();
}
function privateText() {
  return JSON.stringify({ LOAN: PRIV.LOAN, PROMO: PRIV.PROMO }, null, 2);
}
loadPrivate();
const hasLoan = () => !!(PRIV.LOAN && PRIV.LOAN.purposes.length);
const hasPromo = () => !!(PRIV.PROMO && PRIV.PROMO.long.length);
const getLOAN = () => PRIV.LOAN || EMPTY_LOAN;
const getPROMO = () => PRIV.PROMO || EMPTY_PROMO;

// Lãi suất vay đã cộng sẵn, làm tròn 1 chữ số thập phân
function loanRate(purpose, bracketIdx) {
  const LOAN = getLOAN();
  const b = LOAN.brackets[bracketIdx];
  const base = b.short ? LOAN.baseShort : LOAN.baseLong;
  return Math.round((base + purpose.margins[bracketIdx]) * 10) / 10;
}

// Bảng lãi suất vay hoàn chỉnh: [{...purpose, rates:[...], min, max}]
function loanTable() {
  const LOAN = getLOAN();
  if (!LOAN.purposes.length) return { rows: [], min: 0, max: 0 };
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
// Lãi suất ưu đãi thấp nhất theo nhóm sản phẩm vay (dùng cho thẻ sản phẩm)
function promoMin(key) {
  const PROMO = getPROMO();
  const shortRates = PROMO.short.filter((x) => x.rate != null).map((x) => x.rate);
  const pick = (k) => { const g = PROMO.long.filter((x) => x.key === k)[0]; return g ? Math.min.apply(null, g.options.map((o) => o.rate)) : null; };
  if (key === 'sxkd') return shortRates.length ? Math.min.apply(null, shortRates) : null;
  if (key === 'nha-dat') return pick('nha-du-an');
  if (key === 'tieu-dung') return pick('nha-dat');
  return null;
}

// Các lựa chọn cho máy tính vay (lãi suất cố định kỳ đầu); chỉ dùng cho admin
function calcOptions() {
  const PROMO = getPROMO();
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

module.exports = {
  DEPOSIT, pct, depositHighlights, clientDeposit, clientLoan,
  loanRate, loanTable, promoMin, hasLoan, hasPromo, savePrivate, privateText,
  get LOAN() { return getLOAN(); },
  get PROMO() { return getPROMO(); },
};

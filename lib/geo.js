'use strict';
// Hỗ trợ "Bản đồ giá": đọc giá từ chữ, chia phân khúc, nhận diện phường, đọc tọa độ từ link Google Maps.

// Phân khúc giá (đơn vị: đồng). Biên trên không tính vào nhóm sau: [min, max)
// Riêng nhóm 5–10 tỷ gồm cả đúng 10 tỷ.
const TIERS = [
  { key: 'lt2', label: 'Dưới 2 tỷ', test: (v) => v < 2e9 },
  { key: '2-5', label: '2 – 5 tỷ', test: (v) => v >= 2e9 && v < 5e9 },
  { key: '5-10', label: '5 – 10 tỷ', test: (v) => v >= 5e9 && v <= 10e9 },
  { key: 'gt10', label: 'Trên 10 tỷ', test: (v) => v > 10e9 },
];

// Khu vực (phường/xã). 4 phường đầu là Nha Trang sau sắp xếp 2025.
const NHA_TRANG_WARDS = ['Nha Trang', 'Bắc Nha Trang', 'Tây Nha Trang', 'Nam Nha Trang'];
const OTHER_AREAS = ['Diên Khánh', 'Cam Lâm', 'Cam Ranh', 'Khu vực khác'];
const AREAS = NHA_TRANG_WARDS.concat(OTHER_AREAS);
const NO_AREA = 'Khu vực khác';

const strip = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// "5,9 tỷ (thương lượng)" -> 5900000000 ; "850 triệu" -> 850000000 ; "1 tỷ 200 triệu" -> 1200000000
function parsePrice(text) {
  const t = strip(text).replace(/\s+/g, ' ');
  if (!t) return null;
  const num = (s, unit) => {
    s = s.trim();
    // "1.200 trieu": dấu chấm ngăn nghìn
    if (unit === 'trieu' && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return parseFloat(s.replace(',', '.'));
  };
  let total = 0;
  let found = false;
  const ty = t.match(/(\d+(?:[.,]\d+)?)\s*(?:ty|ti)\b/);
  if (ty) { total += num(ty[1], 'ty') * 1e9; found = true; }
  const tr = t.match(/(\d+(?:[.,]\d+)*)\s*(?:trieu|tr)\b/);
  if (tr) { total += num(tr[1], 'trieu') * 1e6; found = true; }
  if (!found) return null;
  return isFinite(total) && total > 0 ? Math.round(total) : null;
}

// 5900000000 -> "5,9 tỷ" ; 850000000 -> "850 tr"
function priceLabel(v) {
  if (!v) return 'Liên hệ';
  if (v >= 1e9) {
    const s = String(Math.round((v / 1e9) * 100) / 100).replace('.', ',');
    return s + ' tỷ';
  }
  return Math.round(v / 1e6) + ' tr';
}

function tierOf(v) {
  if (!v) return '';
  const t = TIERS.find((x) => x.test(v));
  return t ? t.key : '';
}

// Đoán phường từ địa chỉ khi chưa chọn.
function guessArea(address) {
  const a = strip(address);
  if (/bac nha trang/.test(a)) return 'Bắc Nha Trang';
  if (/tay nha trang/.test(a)) return 'Tây Nha Trang';
  if (/nam nha trang/.test(a)) return 'Nam Nha Trang';
  if (/phuong nha trang/.test(a)) return 'Nha Trang';
  if (/dien khanh/.test(a)) return 'Diên Khánh';
  if (/cam lam/.test(a)) return 'Cam Lâm';
  if (/cam ranh/.test(a)) return 'Cam Ranh';
  return '';
}

const inRange = (lat, lng) => lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
const mk = (a, b) => {
  const lat = parseFloat(a);
  const lng = parseFloat(b);
  return isFinite(lat) && isFinite(lng) && inRange(lat, lng) ? { lat, lng } : null;
};

// Tìm tọa độ trong chữ hoặc URL Google Maps.
function parseLatLng(text) {
  const s = String(text || '');
  let m;
  if ((m = s.match(/^\s*(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{2,3}\.\d+)\s*$/))) return mk(m[1], m[2]);
  if ((m = s.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{2,3}\.\d+)/))) return mk(m[1], m[2]);
  if ((m = s.match(/@(-?\d{1,2}\.\d+),(-?\d{2,3}\.\d+)/))) return mk(m[1], m[2]);
  if ((m = s.match(/[?&](?:q|ll|query|center)=(-?\d{1,2}\.\d+)(?:,|%2C)(-?\d{2,3}\.\d+)/i))) return mk(m[1], m[2]);
  if ((m = s.match(/\/place\/(-?\d{1,2}\.\d+),(-?\d{2,3}\.\d+)/))) return mk(m[1], m[2]);
  return null;
}

const GOOGLE_HOST = /(^|\.)(google\.com|google\.com\.vn|goo\.gl|g\.co)$/i;

// Nhận tọa độ "12.2388, 109.1967" hoặc link Google Maps (kể cả link rút gọn maps.app.goo.gl).
async function resolveMapInput(input) {
  const direct = parseLatLng(input);
  if (direct) return direct;
  let url;
  try { url = new URL(String(input || '').trim()); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || !GOOGLE_HOST.test(url.hostname)) return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 7000);
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TuanBankerBot/1.0)', 'Accept-Language': 'vi' },
    });
    clearTimeout(timer);
    let finalUrl;
    try { finalUrl = new URL(res.url); } catch { return null; }
    if (!GOOGLE_HOST.test(finalUrl.hostname)) return null;
    const fromUrl = parseLatLng(decodeURIComponent(res.url));
    if (fromUrl) return fromUrl;
    const body = (await res.text()).slice(0, 600000);
    return parseLatLng(body);
  } catch {
    return null;
  }
}

module.exports = {
  TIERS, AREAS, NHA_TRANG_WARDS, NO_AREA,
  parsePrice, priceLabel, tierOf, guessArea, parseLatLng, resolveMapInput,
};

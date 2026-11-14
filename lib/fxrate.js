'use strict';
// Bảng tỷ giá ngoại tệ LPBank: đọc từ API công khai mà trang lpbank.com.vn/ca-nhan/ty-gia đang dùng.
// Lưu đệm 10 phút; nếu LPBank tạm không trả lời thì dùng lại bản gần nhất (rồi tới bản dự phòng bên dưới).
const URL_API = 'https://lpbank.com.vn/api/content-service/public/customer/exchange-rate?date=';
const TTL = 10 * 60 * 1000;

// Bản dự phòng (chụp ngày 13/11/2026), chỉ dùng khi chưa từng đọc được từ LPBank.
const FALLBACK = {
  updatedAt: '2026-11-13T08:10:00.000Z',
  source: 'snapshot',
  rows: [
    ['USD ≥ 50', 'US Dollar', 25460, 25490, 25870, 25870],
    ['USD <50', 'US Dollar', 25455, 0, 0, 0],
    ['EUR', 'Euro', 27776, 27916, 29270, 29270],
    ['JPY', 'Japanese Yen', 155.75, 157.75, 167.88, 165.88],
    ['GBP', 'British Pounds', 0, 33486, 0, 34583],
    ['CHF', 'Swiss France', 0, 30262, 0, 32005],
    ['AUD', 'Australian Dollar', 17163, 17263, 18037, 17837],
    ['CAD', 'Canadian Dollar', 0, 17768, 0, 18378],
    ['HKD', 'Hong Kong Dollar', 0, 3124, 0, 3427],
    ['SGD', 'Singapore Dollar', 0, 19662, 0, 20345],
    ['CNY', 'Chinese Yuan', 0, 3700, 0, 4153],
    ['NZD', 'New Zealand Dollar', 0, 14033, 0, 14602],
    ['KRW', 'South Korean Won', 0, 17.74, 0, 21.26],
  ].map((r) => ({ code: r[0], name: r[1], buyTm: r[2], buyCk: r[3], sellTm: r[4], sellCk: r[5] })),
};

const VI_NAME = {
  USD: 'Đô la Mỹ', EUR: 'Euro', JPY: 'Yên Nhật', GBP: 'Bảng Anh', CHF: 'Franc Thụy Sĩ', AUD: 'Đô la Úc',
  CAD: 'Đô la Canada', HKD: 'Đô la Hồng Kông', SGD: 'Đô la Singapore', CNY: 'Nhân dân tệ', NZD: 'Đô la New Zealand', KRW: 'Won Hàn Quốc',
};

let cache = null; // { at, data }

async function load() {
  const res = await fetch(URL_API, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const list = Array.isArray(j && j.data) ? j.data.filter((d) => d && d.isActive !== false && d.code) : [];
  if (!list.length) throw new Error('empty');
  let latest = '';
  const rows = list.map((d) => {
    const t = d.updatedDate || d.createdDate || '';
    if (t > latest) latest = t;
    return { code: String(d.code), name: String(d.name || ''), buyTm: +d.buyTm || 0, buyCk: +d.buyCk || 0, sellTm: +d.sellTm || 0, sellCk: +d.sellCk || 0 };
  });
  return { updatedAt: latest ? new Date(latest).toISOString() : '', source: 'lpbank', rows };
}

async function getRates() {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return cache.data;
  try {
    const data = await load();
    cache = { at: now, data };
  } catch (e) {
    console.error('Không đọc được tỷ giá LPBank:', e.message);
    // Thử lại sau 1 phút, trong lúc đó dùng bản cũ hoặc bản dự phòng.
    cache = { at: now - TTL + 60 * 1000, data: cache ? cache.data : FALLBACK };
  }
  return cache.data;
}

// 25460 -> "25.460" ; 155.75 -> "155,75" ; 0 -> "–"
function fmt(n) {
  if (!n) return '–';
  const [i, d] = (Math.round(n * 100) / 100).toString().split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '');
}

// "15:10 ngày 13/11/2026" theo giờ Việt Nam
function stamp(iso) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  if (isNaN(d)) return '';
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} ngày ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function viName(code, fallback) {
  return VI_NAME[String(code).slice(0, 3)] || fallback;
}

module.exports = { getRates, fmt, stamp, viName };

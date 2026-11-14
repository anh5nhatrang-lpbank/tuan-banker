'use strict';
// Lưu trữ dữ liệu bằng 1 file JSON (không cần cài database).
// Đặt biến môi trường DATA_DIR để dữ liệu nằm ngoài thư mục code,
// tránh bị mất khi deploy lại từ GitHub.
// An toàn dữ liệu: ghi nguyên tử, sao lưu mỗi ngày (giữ 14 bản) trong DATA_DIR/backups,
// tự khôi phục từ bản sao lưu gần nhất nếu db.json bị hỏng.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const KEEP = 14;

fs.mkdirSync(DATA_DIR, { recursive: true });
try { fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 }); } catch (e) { /* bỏ qua */ }

function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  } catch (e) { return []; }
}

function loadDb() {
  if (!fs.existsSync(FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    console.error('[DATA] db.json bị hỏng:', e.message, '- thử khôi phục từ bản sao lưu.');
    try { fs.copyFileSync(FILE, FILE + '.corrupt-' + Date.now()); } catch (e2) { /* bỏ qua */ }
    const list = listBackups().reverse();
    for (const f of list) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
        console.error('[DATA] Đã khôi phục từ', f);
        return j;
      } catch (e3) { /* thử bản kế tiếp */ }
    }
    throw new Error('db.json hỏng và không có bản sao lưu hợp lệ. Không khởi động để tránh ghi đè mất dữ liệu.');
  }
}

let lastBackupDay = '';
let db = loadDb();
if (!db) {
  db = require('./seed')();
  save();
}
db.seq = db.seq || {};
['posts', 'listings', 'questions', 'messages', 'gallery'].forEach((k) => (db[k] = db[k] || []));
db.settings = Object.assign({}, require('./seed').defaultSettings, db.settings || {});

function backupIfNeeded() {
  const day = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (day === lastBackupDay) return;
  lastBackupDay = day;
  try {
    const target = path.join(BACKUP_DIR, 'db-' + day + '.json');
    if (!fs.existsSync(target) && fs.existsSync(FILE)) {
      fs.copyFileSync(FILE, target);
      try { fs.chmodSync(target, 0o600); } catch (e) { /* bỏ qua */ }
    }
    listBackups().slice(0, -KEEP).forEach((f) => fs.unlink(path.join(BACKUP_DIR, f), () => {}));
  } catch (e) {
    console.error('[DATA] Sao lưu thất bại:', e.message);
  }
}

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
  backupIfNeeded();
}
backupIfNeeded();

function nextId(coll) {
  db.seq[coll] = (db.seq[coll] || db[coll].reduce((m, x) => Math.max(m, x.id), 0)) + 1;
  return db.seq[coll];
}

module.exports = { DATA_DIR, BACKUP_DIR, FILE, listBackups, get db() { return db; }, save, nextId };

'use strict';
// Lưu trữ dữ liệu bằng 1 file JSON (không cần cài database).
// Đặt biến môi trường DATA_DIR để dữ liệu nằm ngoài thư mục code,
// tránh bị mất khi deploy lại từ GitHub.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let db;
if (fs.existsSync(FILE)) {
  db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} else {
  db = require('./seed')();
  save();
}
db.seq = db.seq || {};
['posts', 'listings', 'questions', 'messages'].forEach((k) => (db[k] = db[k] || []));
db.settings = Object.assign({}, require('./seed').defaultSettings, db.settings || {});

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

function nextId(coll) {
  db.seq[coll] = (db.seq[coll] || db[coll].reduce((m, x) => Math.max(m, x.id), 0)) + 1;
  return db.seq[coll];
}

module.exports = { DATA_DIR, get db() { return db; }, save, nextId };

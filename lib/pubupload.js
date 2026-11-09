'use strict';
// Upload ảnh cho khách đăng tin: tối đa 6 ảnh, mỗi ảnh ≤ 5MB, chỉ JPEG/PNG/WebP.
const multer = require('multer');
const crypto = require('crypto');

module.exports = (dir, ext) =>
  multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + ext[file.mimetype]),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 6, fields: 20, fieldSize: 20000 },
    fileFilter: (req, file, cb) => cb(null, !!ext[file.mimetype]),
  }).array('images', 6);

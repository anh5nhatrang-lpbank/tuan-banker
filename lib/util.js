'use strict';

function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'bai-viet';
}

function uniqueSlug(base, list, ignoreId) {
  let slug = slugify(base);
  let i = 2;
  const taken = (s) => list.some((x) => x.slug === s && x.id !== ignoreId);
  const root = slug;
  while (taken(slug)) slug = `${root}-${i++}`;
  return slug;
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function clip(s, n) {
  s = String(s || '').trim();
  return s.length > n ? s.slice(0, n) : s;
}

function paginate(arr, page, per) {
  const total = arr.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const p = Math.min(Math.max(parseInt(page, 10) || 1, 1), pages);
  return { items: arr.slice((p - 1) * per, p * per), page: p, pages, total };
}

module.exports = { slugify, uniqueSlug, fmtDate, clip, paginate };

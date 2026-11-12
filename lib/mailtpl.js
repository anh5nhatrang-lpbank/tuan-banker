'use strict';
// Dựng nội dung email báo tin (HTML + chữ thuần) từ danh sách [nhãn, giá trị].
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// rows: [[label, value, opts?]]; opts.href = đặt link cho giá trị (vd tel:, zalo)
function build({ heading, intro, rows, link, linkText, footer }) {
  const list = rows.filter((r) => r && r[1] !== '' && r[1] != null);
  const text = [
    intro || heading,
    '',
    ...list.map(([k, v]) => `${k}: ${v}`),
    '',
    link ? `${linkText || 'Xem chi tiết'}: ${link}` : '',
    footer || '',
  ].join('\n');
  const tr = list.map(([k, v, o]) => {
    const val = o && o.href ? `<a href="${esc(o.href)}" style="color:#0b5cad;font-weight:600">${esc(v)}</a>` : esc(v).replace(/\n/g, '<br>');
    return `<tr><td style="padding:9px 0;border-bottom:1px dashed #cfd8e3;color:#5b6675;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px dashed #cfd8e3;color:#16202b;vertical-align:top">${val}</td></tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f0f4f8;font-family:Segoe UI,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:16px">
<div style="background:#fff;border-radius:12px;border-top:5px solid #b8862b;padding:22px 20px;box-shadow:0 2px 10px rgba(0,0,0,.08)">
<h2 style="margin:0 0 6px;font-size:19px;color:#16202b;text-transform:uppercase">${esc(heading)}</h2>
${intro ? `<p style="margin:0 0 14px;color:#5b6675;font-size:14px">${esc(intro)}</p>` : ''}
<table style="width:100%;border-collapse:collapse;font-size:15px">${tr}</table>
${link ? `<p style="margin:18px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#0b5cad;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600">${esc(linkText || 'Xem chi tiết')}</a></p>` : ''}
${footer ? `<p style="margin:16px 0 0;padding:10px 12px;background:#fff4dc;border-left:4px solid #e0a82e;color:#7a5a12;font-size:14px"><i>${esc(footer)}</i></p>` : ''}
</div></div></body></html>`;
  return { text, html };
}
module.exports = { build };

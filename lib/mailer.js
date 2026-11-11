'use strict';
// Gửi email qua SMTP, không cần cài thêm thư viện (chỉ dùng module có sẵn của Node).
// Biến môi trường: SMTP_HOST, SMTP_PORT (465 hoặc 587), SMTP_USER, SMTP_PASS, SMTP_FROM, NOTIFY_EMAIL.
const net = require('net');
const tls = require('tls');

const TIMEOUT = 20000;

// Không cấu hình SMTP thì gửi qua máy chủ mail của hosting (localhost:25, như hàm mail() của PHP).
function enabled() {
  return true;
}

function b64(s) {
  return Buffer.from(s, 'utf8').toString('base64');
}

// Đọc phản hồi SMTP (có thể nhiều dòng "250-..." kết thúc bằng "250 ...").
function makeReader(getSock) {
  let buf = '';
  let waiting = null;
  const tryResolve = () => {
    if (!waiting) return;
    const lines = buf.split('\r\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\d{3} /.test(lines[i])) {
        const text = lines.slice(0, i + 1).join('\n');
        buf = lines.slice(i + 1).join('\r\n');
        const w = waiting;
        waiting = null;
        return w.resolve({ code: +lines[i].slice(0, 3), text });
      }
    }
  };
  return {
    attach(sock) {
      sock.on('data', (d) => { buf += d.toString('utf8'); tryResolve(); });
      sock.on('error', (e) => { if (waiting) { const w = waiting; waiting = null; w.reject(e); } });
      sock.on('close', () => { if (waiting) { const w = waiting; waiting = null; w.reject(new Error('SMTP: kết nối bị đóng')); } });
    },
    read() {
      return new Promise((resolve, reject) => {
        waiting = { resolve, reject };
        tryResolve();
      });
    },
  };
}

async function sendMail({ to, subject, text, replyTo }) {
  const host = process.env.SMTP_HOST || '127.0.0.1';
  const port = +(process.env.SMTP_PORT || (process.env.SMTP_HOST ? 465 : 25));
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const local = !process.env.SMTP_HOST;
  let domain = 'tuanbanker.com';
  try { domain = new URL(process.env.SITE_URL).hostname || domain; } catch (e) {}
  const from = process.env.SMTP_FROM || user || `TUẤN BANKER <no-reply@${domain}>`;
  const fromAddr = (from.match(/<([^>]+)>/) || [null, from])[1];

  let sock = port === 465
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  sock.setTimeout(TIMEOUT, () => sock.destroy(new Error('SMTP: quá thời gian chờ')));

  const reader = makeReader();
  reader.attach(sock);

  const expect = async (ok, label) => {
    const r = await reader.read();
    if (!ok.includes(r.code)) throw new Error(`SMTP ${label} lỗi: ${r.text}`);
    return r;
  };
  const cmd = async (line, ok, label) => {
    sock.write(line + '\r\n');
    return expect(ok, label || line.split(' ')[0]);
  };

  try {
    await expect([220], 'chào');
    await cmd('EHLO tuanbanker.com', [250], 'EHLO');
    if (port !== 465 && !local) {
      await cmd('STARTTLS', [220], 'STARTTLS');
      const plain = sock;
      plain.removeAllListeners('data');
      sock = tls.connect({ socket: plain, servername: host });
      sock.setTimeout(TIMEOUT, () => sock.destroy(new Error('SMTP: quá thời gian chờ')));
      reader.attach(sock);
      await cmd('EHLO tuanbanker.com', [250], 'EHLO');
    }
    if (user && pass) {
      await cmd('AUTH LOGIN', [334], 'AUTH');
      await cmd(b64(user), [334], 'AUTH user');
      await cmd(b64(pass), [235], 'AUTH pass');
    }
    await cmd(`MAIL FROM:<${fromAddr}>`, [250], 'MAIL FROM');
    await cmd(`RCPT TO:<${to}>`, [250, 251], 'RCPT TO');
    await cmd('DATA', [354], 'DATA');

    const clean = (s) => String(s || '').replace(/[\r\n]+/g, ' ');
    const headers = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${b64(clean(subject))}?=`,
      replyTo ? `Reply-To: ${clean(replyTo)}` : null,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${require('crypto').randomBytes(16).toString('hex')}@${fromAddr.split('@')[1] || 'tuanbanker.com'}>`, // Gmail từ chối thư thiếu Message-ID
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ].filter(Boolean).join('\r\n');
    const body = b64(text).replace(/(.{76})/g, '$1\r\n');
    sock.write(headers + '\r\n\r\n' + body + '\r\n.\r\n');
    await expect([250], 'gửi nội dung');
    sock.write('QUIT\r\n');
  } finally {
    sock.end();
  }
}

module.exports = { sendMail, enabled };

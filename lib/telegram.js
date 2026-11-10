'use strict';
// Gửi thông báo tức thì về Telegram của chủ website (dùng fetch có sẵn của Node 18+, không cần cài thêm thư viện).
// Biến môi trường: TELEGRAM_BOT_TOKEN (lấy từ @BotFather), TELEGRAM_CHAT_ID (ID cuộc trò chuyện của bạn với bot).
// Không cấu hình thì bỏ qua, không ảnh hưởng gì tới website.

function enabled() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function sendTelegram(text) {
  if (!enabled()) return;
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: String(text).slice(0, 4000), // giới hạn của Telegram là 4096 ký tự
        disable_web_page_preview: true,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Không in token ra log, chỉ in mã lỗi và phản hồi của Telegram.
      throw new Error(`Telegram HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendTelegram, enabled };

# TUẤN BANKER - Website cá nhân (Node.js + Express)

Chuyên mục: Tài chính - Ngân hàng, Bất động sản, Công nghệ (Hitech), Sản phẩm BĐS, Cộng đồng, Giới thiệu, Liên hệ.
Có trang quản trị `/admin` (đăng nhập) để viết bài, đăng sản phẩm BĐS, duyệt câu hỏi cộng đồng, xem tin nhắn liên hệ.

## Chạy thử trên máy
```bash
npm install
npm start        # mở http://localhost:3000  (admin / admin123 khi chưa đặt biến môi trường)
```

## Biến môi trường (bắt buộc khi chạy thật)
Xem `.env.example`: `NODE_ENV=production`, `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `SITE_URL`, `DATA_DIR`.

## Đẩy lên GitHub
```bash
git remote add origin https://github.com/<tai-khoan>/tuan-banker.git
git branch -M main
git push -u origin main
```

## Deploy lên Hostinger (gói Business/Cloud, Node.js Web App)
1. hPanel -> Websites -> Add website -> chọn **Node.js Apps** -> **Import Git Repository**, cấp quyền GitHub và chọn repo.
2. Cấu hình: Node 18+ (nên 20/22), Build command `npm install`, Start command `npm start` (entry file `server.js`).
3. Mục Environment variables: nhập các biến ở trên. `DATA_DIR` nên trỏ ra ngoài thư mục code, để bài viết và ảnh không bị mất khi deploy lại.
4. Deploy, rồi trỏ tên miền và bật SSL.
5. Vào `https://tenmien/admin` đăng nhập, sửa **Cài đặt** (số điện thoại, Zalo, link mạng xã hội) và xóa bài/sản phẩm MẪU.

Lưu ý: tên các nút/menu trên hPanel có thể khác chút theo thời điểm.

## Sao lưu
Toàn bộ dữ liệu nằm trong `DATA_DIR/db.json` và `DATA_DIR/uploads/`. Hãy tải về định kỳ.

'use strict';

// Các chuyên mục bài viết. key lưu trong dữ liệu, slug dùng trên URL.
const CATS = {
  'tai-chinh-ngan-hang': {
    key: 'tai-chinh-ngan-hang',
    name: 'Tài chính - Ngân hàng',
    short: 'Tài chính',
    icon: '🏦',
    desc: 'Kiến thức vay vốn, lãi suất, tiết kiệm và quản lý tài chính cá nhân từ góc nhìn của người làm ngân hàng.',
  },
  'bat-dong-san': {
    key: 'bat-dong-san',
    name: 'Bất động sản',
    short: 'Bất động sản',
    icon: '🏠',
    desc: 'Phân tích thị trường, bất động sản thứ cấp, pháp lý và kinh nghiệm mua bán thực tế.',
  },
  'cong-nghe': {
    key: 'cong-nghe',
    name: 'Công nghệ (Hitech)',
    short: 'Hitech',
    icon: '🤖',
    desc: 'AI, fintech và công cụ số giúp người làm ngân hàng, môi giới làm việc nhanh và hiệu quả hơn.',
  },
};

const LISTING_TYPES = ['Nhà phố', 'Đất nền', 'Căn hộ', 'Biệt thự', 'Nhà cấp 4', 'Khác'];

module.exports = { CATS, LISTING_TYPES };

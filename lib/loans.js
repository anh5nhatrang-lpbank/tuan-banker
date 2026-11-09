'use strict';
// Khay sản phẩm vay bán lẻ LPBank (thông tin tóm tắt cho khách hàng).
// Không công bố lãi suất: khách liên hệ để được báo mức lãi suất hiện hành.
const LOANS = [
  {
    key: 'nha-dat',
    icon: '🏠',
    name: 'Vay mua nhà đất, nhà dự án',
    tag: 'Thế chấp bất động sản',
    summary: 'Vốn mua nhà đất, căn hộ, nhà dự án; xây dựng, sửa chữa nhà; hoặc vay bù đắp phần vốn tự có đã thanh toán.',
    purposes: ['Mua/nhận chuyển nhượng nhà đất, nhà ở dự án, căn hộ', 'Xây dựng, sửa chữa nhà', 'Thanh toán tiền sử dụng đất khi chuyển mục đích', 'Vay bù đắp tài chính (đã thanh toán trước bằng vốn tự có)'],
    term: 'Tối đa 35 năm (tùy mục đích, loại tài sản và khả năng trả nợ)',
    limit: 'Theo nhu cầu vốn, giá trị tài sản bảo đảm và khả năng trả nợ',
    collateral: 'Chính bất động sản mua/đang sở hữu (sổ đỏ/sổ hồng) hoặc tài sản hợp pháp khác',
    docs: [
      'Hợp đồng đặt cọc/mua bán/chuyển nhượng nhà đất, nhà dự án',
      'Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở (của bên bán hoặc của bạn)',
      'Chứng từ đã nộp tiền cọc/thanh toán vốn tự có (nếu có)',
      'Vay xây/sửa nhà: giấy phép xây dựng hoặc giấy tờ cấp phép tương đương, dự toán/hợp đồng thi công',
      'Vay bù đắp: chứng từ thanh toán và giấy tờ chứng minh quan hệ nếu mua cho người thân',
    ],
  },
  {
    key: 'o-to',
    icon: '🚗',
    name: 'Vay mua ô tô',
    tag: 'Xe mới / xe đã qua sử dụng',
    summary: 'Vay mua xe ô tô đi lại hoặc phục vụ kinh doanh, thế chấp bằng chính chiếc xe mua hoặc tài sản khác.',
    purposes: ['Mua xe ô tô mới', 'Mua xe ô tô đã qua sử dụng', 'Vay bù đắp tài chính sau khi đã mua xe', 'Xe phục vụ hoạt động sản xuất, kinh doanh'],
    term: 'Xe mới: tối đa 8 năm; xe đã qua sử dụng: tối đa 5 năm; thế chấp tài sản khác: tối đa 10 năm (tùy phương án)',
    limit: 'Theo giá trị định giá xe/tài sản bảo đảm và khả năng trả nợ',
    collateral: 'Chính chiếc xe hình thành từ vốn vay (có mua bảo hiểm vật chất xe) hoặc tài sản khác',
    docs: [
      'Hợp đồng mua bán xe/đặt cọc với showroom hoặc bên bán',
      'Giấy tờ xe: đăng ký, đăng kiểm (xe đã qua sử dụng)',
      'Chứng từ chứng minh nguồn thu nhập và khả năng trả nợ',
      'Vay bù đắp: chứng từ đã thanh toán tiền mua xe, đăng ký xe sau sang tên',
    ],
  },
  {
    key: 'tieu-dung',
    icon: '💳',
    name: 'Vay tiêu dùng có tài sản bảo đảm',
    tag: 'Phục vụ nhu cầu đời sống',
    summary: 'Vay cho nhu cầu đời sống của bạn và gia đình (sửa nhà, học tập, du lịch, chữa bệnh, mua sắm...), có tài sản bảo đảm.',
    purposes: ['Nhu cầu đời sống của khách hàng và gia đình', 'Thấu chi bảo đảm bằng sổ tiết kiệm/giấy tờ có giá do LPBank phát hành'],
    term: 'Tài sản bảo đảm là bất động sản: tối đa 15 năm; tài sản khác: tối đa 10 năm; hạn mức thấu chi: tối đa 1 năm',
    limit: 'Theo giá trị tài sản bảo đảm và nguồn thu nhập trả nợ',
    collateral: 'Bất động sản, ô tô, sổ tiết kiệm/giấy tờ có giá LPBank hoặc tài sản hợp pháp khác',
    docs: [
      'Giấy tờ tài sản bảo đảm (sổ đỏ/sổ hồng, đăng ký xe, sổ tiết kiệm...)',
      'Giấy tờ chứng minh nguồn thu nhập: lương, kinh doanh, cho thuê, tài sản tích lũy',
      'Phương án sử dụng vốn/mục đích vay',
    ],
  },
  {
    key: 'sxkd',
    icon: '🏪',
    name: 'Vay sản xuất kinh doanh (cá nhân, hộ kinh doanh)',
    tag: 'Vốn lưu động / đầu tư tài sản',
    summary: 'Bổ sung vốn lưu động (nhập hàng, trả lương, điện nước...) hoặc đầu tư mở rộng cơ sở, máy móc, phương tiện.',
    purposes: ['Bổ sung vốn ngắn hạn: vay từng lần hoặc theo hạn mức', 'Đầu tư tài sản cố định/mở rộng kinh doanh (địa điểm kinh doanh, máy móc, phương tiện vận tải)'],
    term: 'Vốn ngắn hạn: tối đa 1 năm. Đầu tư: mua BĐS làm địa điểm kinh doanh tối đa 20 năm; xây/sửa tối đa 15 năm; xe ô tô mới tối đa 7 năm; mục đích khác tối đa 5 năm. Có thể ân hạn gốc tối đa 6 tháng (khi đầu tư tài sản cố định)',
    limit: 'Theo phương án kinh doanh, nhu cầu vốn và tài sản bảo đảm',
    collateral: 'Bất động sản hoặc tài sản hợp pháp khác theo quy định',
    docs: [
      'Giấy đăng ký kinh doanh/giấy phép kinh doanh (ngành có điều kiện: thêm giấy phép, chứng chỉ hành nghề)',
      'Hoặc xác nhận của chính quyền địa phương/Ban quản lý chợ/Trung tâm thương mại về hoạt động kinh doanh',
      'Giấy tờ chứng minh địa điểm kinh doanh: sở hữu hoặc hợp đồng thuê còn hạn tối thiểu 6 tháng',
      'Chứng từ doanh thu, chi phí nhập hàng tối thiểu 3 tháng gần nhất (kinh doanh mùa vụ: tối thiểu 6 tháng)',
      'Phương án vay vốn, giấy tờ tài sản bảo đảm',
    ],
  },
];

const COMMON = {
  who: [
    'Công dân Việt Nam từ đủ 18 tuổi, có năng lực hành vi dân sự đầy đủ; độ tuổi và thời hạn vay được ngân hàng xem xét phù hợp khi thẩm định',
    'Có mục đích vay vốn hợp pháp và phương án sử dụng vốn rõ ràng',
    'Có nguồn thu nhập ổn định để trả nợ (lương, kinh doanh, cho thuê, tài sản tích lũy...)',
    'Có lịch sử tín dụng tốt, không có nợ xấu',
    'Có tài sản bảo đảm hợp pháp (các sản phẩm bên dưới)',
  ],
  docs: [
    'CCCD/hộ chiếu của người vay (và vợ/chồng hoặc người đồng vay nếu có)',
    'Giấy tờ chứng minh nơi cư trú và tình trạng hôn nhân',
    'Giấy tờ chứng minh nguồn thu nhập và khả năng trả nợ',
    'Giấy tờ tài sản bảo đảm và chứng từ liên quan đến mục đích vay',
  ],
};

module.exports = { LOANS, COMMON };

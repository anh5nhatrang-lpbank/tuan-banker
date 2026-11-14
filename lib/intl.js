'use strict';
// Danh mục "Chuyển tiền quốc tế & ngoại tệ" LPBank (thông tin tóm tắt, nguồn: lpbank.com.vn/ca-nhan/chuyen-tien-quoc-te).
// Không công bố tỷ giá/phí cụ thể: khách liên hệ để được báo mức hiện hành.
// flag: 'hot' = dịch vụ đặc thù được nhấn mạnh.
const SERVICES = [
  {
    key: 'du-hoc',
    example: 'Chị Lan ở Nha Trang có con đang học đại học tại Úc, mỗi học kỳ cần gửi học phí và sinh hoạt phí bằng AUD. Chị để lại số điện thoại, được hướng dẫn hồ sơ, báo tỷ giá hiện hành rồi làm lệnh chuyển tiền tại quầy; không tốn thời gian tự tìm hiểu thủ tục.',
    icon: '🎓',
    name: 'Chuyển tiền du học',
    tag: 'Học phí & sinh hoạt phí',
    flag: 'hot',
    summary: 'Chuyển học phí, sinh hoạt phí cho con em đang học tập ở nước ngoài. Tỷ giá cạnh tranh, lệnh chuyển tiền miễn phí.',
    perks: ['Tỷ giá hấp dẫn, cạnh tranh', 'Lệnh chuyển tiền miễn phí'],
  },
  {
    key: 'kham-chua-benh',
    example: 'Anh Hùng có mẹ cần điều trị ở bệnh viện tại Singapore, bệnh viện yêu cầu thanh toán viện phí bằng ngoại tệ. Anh gọi trước để biết cần chuẩn bị giấy tờ gì, nhờ vậy chuyển tiền kịp thời gian điều trị.',
    icon: '🏥',
    name: 'Chuyển tiền khám chữa bệnh',
    tag: 'Chữa bệnh ở nước ngoài',
    flag: 'hot',
    summary: 'Chuyển viện phí, chi phí điều trị cho người thân khám chữa bệnh ở nước ngoài, nhanh chóng và bảo mật.',
    perks: ['Tỷ giá hấp dẫn, cạnh tranh', 'Lệnh chuyển tiền miễn phí'],
  },
  {
    key: 'ngoai-te-du-lich',
    example: 'Gia đình chị Mai đi du lịch Hàn Quốc 5 ngày, muốn mang theo một ít ngoại tệ tiền mặt để chi tiêu. Chị liên hệ để hỏi loại ngoại tệ, thủ tục, hạn mức và tỷ giá hiện hành, rồi hẹn ngày nhận tại quầy.',
    icon: '✈️',
    name: 'Mua ngoại tệ tiền mặt đi du lịch',
    tag: 'Du lịch, công tác nước ngoài',
    flag: 'hot',
    summary: 'Chuẩn bị ngoại tệ tiền mặt cho chuyến du lịch, công tác nước ngoài. Liên hệ để được tư vấn loại ngoại tệ, thủ tục, hạn mức và tỷ giá hiện hành.',
    perks: ['Tư vấn đúng nhu cầu chuyến đi', 'Báo tỷ giá hiện hành khi liên hệ'],
  },
  {
    key: 'tro-cap',
    example: 'Ông Bình hằng tháng gửi tiền hỗ trợ cho con gái đang sống ở Mỹ. Ông được hướng dẫn mở tài khoản và làm lệnh chuyển tiền định kỳ cho thuận tiện.',
    icon: '👪',
    name: 'Chuyển tiền trợ cấp cho người thân ở nước ngoài',
    tag: 'Hỗ trợ người thân',
    summary: 'Gửi tiền trợ cấp định kỳ cho người thân đang ở nước ngoài.',
    perks: ['Mở tài khoản miễn phí', 'Lệnh chuyển tiền miễn phí'],
  },
  {
    key: 'dinh-cu',
    example: 'Vợ chồng anh Dũng chuẩn bị định cư ở Canada, cần chuyển một khoản tiền sang tài khoản tại nước sở tại. Anh nhờ tư vấn trước về hồ sơ và đồng tiền chuyển để không bị vướng khi làm thủ tục.',
    icon: '🌏',
    name: 'Chuyển tiền định cư',
    tag: 'Định cư nước ngoài',
    summary: 'Chuyển tiền phục vụ nhu cầu định cư nước ngoài.',
    perks: ['Tỷ giá hấp dẫn, cạnh tranh', 'Lệnh chuyển tiền miễn phí'],
  },
  {
    key: 'thua-ke',
    example: 'Chị Thu được hưởng thừa kế từ người thân ở nước ngoài, hoặc cần chuyển phần thừa kế cho người thụ hưởng ở nước ngoài. Cán bộ tư vấn sẽ hướng dẫn giấy tờ pháp lý cần có theo từng trường hợp.',
    icon: '📜',
    name: 'Chuyển tiền thừa kế',
    tag: 'Thừa kế',
    summary: 'Chuyển tiền thừa kế cho người thụ hưởng ở nước ngoài.',
    perks: ['Tỷ giá hấp dẫn, cạnh tranh', 'Lệnh chuyển tiền miễn phí'],
  },
  {
    key: 'thu-nhap',
    example: 'Anh Nam có thu nhập hợp pháp (ví dụ cho thuê nhà, lương) cần chuyển một phần ra nước ngoài theo quy định. Anh được tư vấn chứng từ chứng minh nguồn thu nhập trước khi làm lệnh chuyển.',
    icon: '💼',
    name: 'Chuyển thu nhập hợp pháp ra nước ngoài',
    tag: 'Thu nhập hợp pháp',
    summary: 'Chuyển thu nhập hợp pháp của cá nhân ra nước ngoài theo quy định.',
    perks: ['Tỷ giá hấp dẫn, cạnh tranh', 'Lệnh chuyển tiền miễn phí'],
  },
  {
    key: 'nhan-tien',
    example: 'Bà Hoa nhận tiền con gái ở Nhật gửi về hằng tháng. Bà để lại số điện thoại để được hướng dẫn cung cấp thông tin nhận tiền cho con và nhận tiền vào tài khoản tại LPBank.',
    icon: '📥',
    name: 'Nhận tiền về từ nước ngoài',
    tag: 'Kiều hối',
    summary: 'Nhận tiền người thân, bạn bè, đối tác chuyển từ nước ngoài về tài khoản tại LPBank.',
    perks: ['Giải pháp đa dạng', 'Nhanh chóng, bảo mật'],
  },
];

const WHY = [
  ['💸', 'Phí chuyển tiền thấp', 'Lệnh chuyển tiền miễn phí ở nhiều dịch vụ.'],
  ['🧩', 'Giải pháp đa dạng', 'Du học, chữa bệnh, định cư, thừa kế, trợ cấp, nhận kiều hối.'],
  ['🔒', 'Nhanh chóng, bảo mật', 'Được hướng dẫn hồ sơ và theo dõi giao dịch đến khi hoàn tất.'],
];

module.exports = { SERVICES, WHY };

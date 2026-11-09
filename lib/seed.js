'use strict';
// Nội dung MẪU để xem trước giao diện. Hãy xóa/sửa trong trang /admin.

const defaultSettings = {
  siteName: 'TUẤN BANKER',
  tagline: 'Tài chính · Bất động sản · Công nghệ',
  heroTitle: 'Đồng hành cùng bạn trên hành trình an cư và tài chính vững vàng',
  heroSub:
    'Chia sẻ kiến thức ngân hàng, bất động sản thứ cấp và công nghệ từ người trực tiếp làm nghề.',
  phone: '0905 491 125',
  zalo: '0905491125',
  email: 'anh5nhatrang@gmail.com, tuanna25@lpbank.com.vn',
  address: 'Diên Khánh, Khánh Hòa',
  facebook: '',
  tiktok: '',
  youtube: '',
  zaloGroup: '',
  facebookGroup: '',
  aboutTitle: 'Xin chào, tôi là Tuấn',
  aboutText:
    'Tôi làm việc trong lĩnh vực tài chính ngân hàng và bất động sản bán lẻ, chuyên về bất động sản thứ cấp. Website này là nơi tôi chia sẻ kinh nghiệm thực tế, giúp khách hàng hiểu rõ phương án vay vốn, kiểm tra pháp lý và ra quyết định an toàn hơn.\n\nNgoài ra, tôi quan tâm đến công nghệ và AI như một công cụ giúp làm nghề hiệu quả hơn.',
  disclaimer:
    'Nội dung trên website là chia sẻ cá nhân, mang tính tham khảo, không phải lời khuyên đầu tư và không đại diện phát ngôn chính thức của bất kỳ tổ chức nào. Lãi suất, điều kiện vay có thể thay đổi, vui lòng liên hệ trực tiếp để được tư vấn chính xác.',
};

function seed() {
  const now = Date.now();
  const day = 86400000;
  const post = (id, n, category, title, excerpt, content) => ({
    id,
    slug: n,
    category,
    title,
    excerpt,
    content,
    image: '',
    published: true,
    views: 0,
    createdAt: new Date(now - id * day).toISOString(),
  });

  const posts = [
    post(
      1,
      'chuan-bi-truoc-khi-vay-mua-nha',
      'tai-chinh-ngan-hang',
      '5 điều cần chuẩn bị trước khi vay mua nhà',
      'Hồ sơ, thu nhập, tài sản bảo đảm, vốn đối ứng và kế hoạch trả nợ: 5 việc nên làm trước khi nộp hồ sơ vay.',
      `Vay mua nhà là quyết định tài chính lớn. Chuẩn bị tốt giúp hồ sơ được duyệt nhanh hơn và bạn chủ động hơn.

## 1. Chứng minh thu nhập rõ ràng
Ngân hàng đánh giá khả năng trả nợ dựa trên thu nhập ổn định. Hãy chuẩn bị hợp đồng lao động, sao kê lương hoặc chứng từ kinh doanh.

## 2. Xác định vốn đối ứng
Thông thường bạn cần có một phần vốn tự có. Hãy tính trước để không bị động khi đặt cọc.

## 3. Kiểm tra pháp lý tài sản
Tài sản cần đủ điều kiện thế chấp: sổ đỏ/sổ hồng hợp lệ, không tranh chấp, không bị kê biên.

## 4. Tính khả năng trả nợ hằng tháng
Một nguyên tắc tham khảo là tiền trả nợ hằng tháng không nên vượt quá khoảng một nửa thu nhập ròng. Dùng **máy tính khoản vay** trên website để ước tính.

## 5. Kiểm tra lịch sử tín dụng
Nợ xấu hoặc trả chậm có thể ảnh hưởng hồ sơ. Hãy kiểm tra và xử lý trước khi nộp.

> Đây là chia sẻ chung. Điều kiện cụ thể phụ thuộc chính sách từng ngân hàng tại thời điểm vay.`
    ),
    post(
      2,
      'lai-suat-co-dinh-hay-tha-noi',
      'tai-chinh-ngan-hang',
      'Lãi suất cố định hay thả nổi: nên chọn gì?',
      'Hiểu đúng cách tính lãi suất sau giai đoạn ưu đãi để tránh bất ngờ khi tiền trả nợ tăng.',
      `Nhiều khoản vay có **giai đoạn ưu đãi** (cố định trong một thời gian), sau đó chuyển sang **lãi suất thả nổi**.

## Lãi suất cố định
- Ưu điểm: dễ dự đoán khoản trả hằng tháng.
- Nhược điểm: thường cao hơn một chút so với lãi suất thả nổi ở thời điểm đầu.

## Lãi suất thả nổi
- Ưu điểm: có thể thấp hơn khi mặt bằng lãi suất đi xuống.
- Nhược điểm: khoản trả có thể tăng khi lãi suất thị trường tăng.

## Cần hỏi ngân hàng
1. Thời gian ưu đãi là bao lâu?
2. Sau ưu đãi, lãi suất tính theo công thức nào (lãi suất cơ sở + biên độ)?
3. Phí trả nợ trước hạn là bao nhiêu?

Hãy yêu cầu ghi rõ các điều khoản này trong hợp đồng trước khi ký.`
    ),
    post(
      3,
      'bat-dong-san-thu-cap-la-gi',
      'bat-dong-san',
      'Bất động sản thứ cấp là gì? Lợi thế và lưu ý khi mua',
      'Mua lại từ chủ sở hữu cũ thường có pháp lý rõ và nhận nhà ngay, nhưng cần kiểm tra kỹ vài điểm.',
      `**Bất động sản thứ cấp** là bất động sản được mua bán lại giữa các chủ sở hữu, không phải mua trực tiếp từ chủ đầu tư.

## Lợi thế
- Nhìn thấy sản phẩm thật, khu dân cư đã hình thành.
- Thường đã có sổ, có thể sang tên nhanh.
- Dễ thương lượng giá.

## Lưu ý
- Kiểm tra đúng chủ sở hữu và tình trạng thế chấp.
- Đối chiếu diện tích thực tế với giấy tờ.
- Hỏi rõ quy hoạch, lộ giới tại địa phương.
- Thống nhất ai chịu thuế, phí chuyển nhượng.

Nếu cần vay mua, hãy hỏi ngân hàng về giá trị định giá tài sản trước khi đặt cọc.`
    ),
    post(
      4,
      'checklist-phap-ly-truoc-khi-dat-coc',
      'bat-dong-san',
      'Checklist pháp lý trước khi đặt cọc mua nhà đất',
      'Danh sách việc cần kiểm tra để tránh rủi ro tranh chấp, quy hoạch hoặc tài sản đang thế chấp.',
      `Trước khi đặt cọc, hãy kiểm tra:

1. **Giấy chứng nhận**: bản gốc, đúng tên người bán, thông tin khớp CCCD.
2. **Tình trạng thế chấp/kê biên**: hỏi cơ quan đăng ký đất đai hoặc văn phòng đăng ký.
3. **Quy hoạch**: xem thông tin tại địa phương, tránh đất vướng quy hoạch.
4. **Hiện trạng**: diện tích, ranh giới, lối đi, công trình xây dựng.
5. **Hợp đồng đặt cọc**: ghi rõ giá, thời hạn công chứng, điều khoản phạt cọc.

Không chuyển tiền cọc khi chưa kiểm tra những mục trên. Nên công chứng hoặc có người chứng kiến khi ký cọc.`
    ),
    post(
      5,
      'ai-giup-nguoi-lam-ngan-hang-moi-gioi',
      'cong-nghe',
      'AI giúp người làm ngân hàng và môi giới tiết kiệm thời gian thế nào',
      'Soạn nội dung, tóm tắt tài liệu, phân tích số liệu và chăm sóc khách hàng nhanh hơn với các công cụ AI.',
      `AI không thay thế chuyên môn, nhưng giúp bớt những việc lặp lại.

## Ứng dụng thực tế
- **Viết nội dung**: bài đăng, kịch bản video ngắn, email chăm sóc khách hàng.
- **Tóm tắt tài liệu**: văn bản, báo cáo thị trường dài thành vài ý chính.
- **Phân tích số liệu**: đọc bảng Excel, tìm xu hướng, lập báo cáo.
- **Chuẩn bị họp**: dàn ý, câu hỏi dự kiến, slide.

## Lưu ý
- Luôn kiểm tra lại số liệu và pháp lý do AI đưa ra.
- Không nhập thông tin cá nhân khách hàng hay dữ liệu mật vào công cụ công khai.`
    ),
    post(
      6,
      'thuong-hieu-ca-nhan-tiktok-reels',
      'cong-nghe',
      'Xây dựng thương hiệu cá nhân trên TikTok/Reels cho người làm tài chính - BĐS',
      'Video ngắn giúp bạn được biết đến: chọn chủ đề, cách quay đơn giản và lịch đăng đều đặn.',
      `Video ngắn là kênh tiếp cận khách hàng hiệu quả cho người làm nghề tư vấn.

## Ý tưởng nội dung
- Giải đáp một câu hỏi khách hay hỏi trong 30-60 giây.
- "Sai lầm thường gặp khi vay mua nhà".
- Một bất động sản thực tế: ưu điểm, điểm cần lưu ý.

## Cách làm gọn
1. Quay bằng điện thoại, ánh sáng tự nhiên, âm thanh rõ.
2. Câu đầu tiên phải gây tò mò.
3. Đăng đều 3-4 video mỗi tuần, cùng khung giờ.
4. Cuối video mời xem website hoặc nhắn Zalo.

Luôn tuân thủ quy định quảng cáo của đơn vị công tác và pháp luật.`
    ),
  ];

  const listings = [
    {
      id: 1,
      slug: 'nha-pho-mau-dien-khanh',
      title: '[MẪU] Nhà phố 2 tầng gần trung tâm Diên Khánh',
      type: 'Nhà phố',
      price: '2,8 tỷ',
      area: 80,
      bedrooms: 3,
      address: 'Thị trấn Diên Khánh, Khánh Hòa',
      legal: 'Sổ hồng riêng',
      bankSupport: true,
      status: 'dang-ban',
      featured: true,
      images: [],
      description:
        'Đây là tin **mẫu** để xem giao diện. Hãy xóa và đăng sản phẩm thật trong trang quản trị.\n\n- Vị trí: gần chợ, trường học\n- Hỗ trợ vay ngân hàng',
      createdAt: new Date(now - 1 * day).toISOString(),
    },
    {
      id: 2,
      slug: 'dat-nen-mau-dien-khanh',
      title: '[MẪU] Đất nền thổ cư đường ô tô',
      type: 'Đất nền',
      price: '1,5 tỷ',
      area: 100,
      bedrooms: 0,
      address: 'Xã Diên Khánh, Khánh Hòa',
      legal: 'Sổ đỏ chính chủ',
      bankSupport: true,
      status: 'dang-ban',
      featured: true,
      images: [],
      description: 'Tin **mẫu**. Hãy thay bằng sản phẩm thật.',
      createdAt: new Date(now - 2 * day).toISOString(),
    },
  ];

  return {
    seq: {},
    settings: { ...defaultSettings },
    posts,
    listings,
    questions: [
      {
        id: 1,
        name: 'Tuấn Banker',
        message:
          'Chào mừng bạn đến với cộng đồng! Hãy đặt câu hỏi về vay vốn, bất động sản hoặc công nghệ, tôi sẽ trả lời sớm nhất.',
        answer: '',
        approved: true,
        createdAt: new Date(now).toISOString(),
      },
    ],
    messages: [],
  };
}

module.exports = seed;
module.exports.defaultSettings = defaultSettings;

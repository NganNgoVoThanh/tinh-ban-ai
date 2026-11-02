# ADR 0007: Giao diện đỏ son – vàng kim; trang Các gói hiện gói của máy và giá dự kiến

Ngày: 2026-10-31. Trạng thái: đang dùng, chờ bạn duyệt giá dự kiến và quyền lợi từng gói. Phần nền `son`, `starfield`, nút `gold` và tờ lịch dải đỏ đã được thay bằng [ADR 0008](0008-nen-lua-nga-dat-vang-va-bo-chi-tiet-ky-thuat.md).

## Bối cảnh

Bạn nhận xét giao diện theo Technical Plan mục 13 (chàm trên giấy ấm, ít trang trí) chưa đủ cuốn hút để giữ người dùng, muốn đổi tông chủ đạo (gợi ý đỏ), có hiệu ứng, vẫn tinh tế, và không theo giao diện ICC. App cũng chưa có chỗ nào cho người dùng biết mình đang ở gói nào và các gói khác có gì; bảng "Quan tâm bản trả phí" (mục 14) chỉ là danh sách ba ô đánh dấu.

## Quyết định

**Giao diện**

- Đỏ son (`#A3171F` sáng, `#F4917F` tối) là màu nhấn chính, vàng kim là điểm sáng, nền giấy ngà (`#FBF7F1`) ban ngày và đêm ấm (`#1A1214`, đen pha nâu đỏ, không đen kịt) ban đêm. Token ở `packages/ui/src/tokens.css`.
- Ba kiểu nền trong `globals.css`, đều sáng và ấm (bản đầu dùng tấm đỏ chuyển về đen, bạn thấy tối và nặng nên đã bỏ):
  - `son`: đỏ son tươi chuyển sang đỏ rượu, ánh vàng nhẹ ở góc, viền chỉ vàng, chấm vàng lấp lánh (`starfield`). Tự mang token chữ riêng (ngà, hồng nhạt, vàng nhạt). Chỉ dùng cho mảng nhỏ cần nổi: thẻ Gói của bạn, thẻ Plus, khối giá ở trang giới thiệu, dải trên tờ lịch.
  - `blush`: nền ngà ửng hồng và vàng rất nhẹ: màn trống, khối mở đầu ở Hỏi, đầu trang Tri thức.
  - `aurora`: hai quầng đỏ son và vàng mờ trôi chậm ở góc, cho đầu trang giới thiệu (nền sáng, lá số mẫu theo sáng/tối của máy).
- Tờ lịch ở Hôm nay làm theo kiểu lịch bloc: dải đỏ son có lỗ ghim, thân giấy, ngày dương lớn màu son.
- Hóa Quyền có màu riêng (`--quyen`, tím) thay vì màu nhấn chính, để không lẫn với đỏ son và sao hành Hỏa.
- Ô cung đang chọn trộn 11% đỏ son (trước là 14% chàm) để chữ vàng, hợp, xung trên nền này vẫn đạt 4,5:1.
- Thêm chữ trình bày Playfair Display (có tiếng Việt) cho tiêu đề lớn, ngày lớn, tên gói. Be Vietnam Pro và Noto Serif giữ nguyên vai trò.
- Hiệu ứng: biểu tượng 12 cung xoay rất chậm, sao lấp lánh, vệt sáng lướt trên nút chính, thẻ nhấc nhẹ khi rê chuột, khối hiện dần khi mở trang. Tất cả tắt khi máy bật giảm chuyển động.
- Nút trên nền `son` dùng biến thể `gold` (nút đỏ chìm vào nền đỏ). Nút chính ở chế độ tối là đỏ son đậm chữ trắng thay cho san hô chữ tối.
- Icon app, màn hình chờ iOS, thẻ chia sẻ đổi sang nền sơn mài (`scripts/make-icons.mjs`, `lib/share-card.ts`).

Mọi cặp chữ/nền mới đã tính tương phản, đều từ 4,5:1, gồm mọi nấc màu của nền `son` (ánh vàng giữ ≤ 7% để chữ phụ vẫn đạt) và đỉnh quầng của `aurora`. E2E vẫn quét axe ở cả sáng và tối.

**Trang Các gói (`/goi`)**

- Ba gói: Miễn phí, Tinh Bàn Plus (tháng hoặc năm), Gói lượt hỏi. Dữ liệu ở `lib/plans.ts`, một chỗ cho mọi màn.
- Đầu trang là thẻ "Gói của bạn": tên gói và số câu hỏi tự do còn lại hôm nay. P0 chưa thu tiền và chưa có tài khoản, nên `CURRENT_PLAN` luôn là `free`; khi mở bán, server cấp quyền lợi theo `install_id`.
- Hiện giá dự kiến (Plus 59.000đ/tháng hoặc 499.000đ/năm, gói lượt hỏi 29.000đ cho 20 câu), ghi rõ "giá dự kiến" và "chưa thu tiền". Khác đề xuất ở mục 22 việc 9 ("P0 chưa hiện giá"): giá dự kiến giúp đo mức sẵn lòng trả. Bỏ `expectedPrice` thì trang ghi "Giá công bố khi mở bán".
- Nút "Báo tôi khi mở bán" mở bảng Quan tâm bản trả phí với gói tương ứng đánh dấu sẵn (gói năm hoặc gói tháng theo công tắc). Sự kiện mới `plans_viewed`.
- Lối vào: thẻ Gói của bạn ở đầu tab Hồ sơ, chip gói cạnh dòng lượt hỏi ở tab Hỏi, mục "Bản trả phí" trong menu Hỏi và trong Cài đặt, trang giới thiệu. Dòng "Đã hết lượt · Xem các gói" vẫn mở thẳng bảng quan tâm.

Tham khảo thị trường: các app chiêm tinh phổ biến (Co–Star, The Pattern, Nebula, CHANI) đều theo mô hình phần lõi miễn phí, gói Plus theo tháng hoặc năm (gói năm rẻ hơn khoảng 30–50%), cộng gói lẻ hoặc lượt đọc riêng. Lời phàn nàn hay gặp là dùng thử tự gia hạn và giá khó tìm, nên trang Các gói để giá và quyền lợi ngay trên một màn.

## Hệ quả

- Technical Plan mục 13 (bảng màu chàm) không còn đúng; ADR này thay phần màu và hiệu ứng. Nhãn nội dung giữ nguyên bốn hình thức (Diễn giải Tử Vi đổi viền trái sang đỏ son).
- Quyền lợi của Plus (30 câu mỗi ngày, nhận định chuyên gia duyệt, vận tháng, 12 khả năng giờ) là bản nháp, một số là tính năng P1 chưa làm. Cần chốt theo đặc tả v1.0 trước khi công khai trang.
- Thêm một font (Playfair Display, bản biến thiên) vào bundle.

## Khi nào xem lại

Khi chốt quyền lợi và giá (mục 22 việc 9), khi có thanh toán thật (thay `CURRENT_PLAN` bằng quyền lợi do server cấp), hoặc khi số liệu `plans_viewed` và `interest_clicked` cho thấy cần đổi cách trình bày.

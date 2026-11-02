# ADR 0010: Bố cục bản web trên máy tính

Ngày: 2026-11-02. Trạng thái: đang dùng. Bổ sung ADR 0007–0009 (không đổi màu sắc, chỉ đổi bố cục).

## Bối cảnh

App làm cho điện thoại trước: mọi màn trong app là một cột rộng 560 px (`max-w-140`). Mở bằng trình duyệt trên máy tính thì cột này nằm giữa, hai bên trống rất rộng. Bạn muốn bản web trên máy tính dùng hết bề ngang, không còn khoảng trống hai bên.

## Quyết định

Mốc "máy tính" là `lg` (từ 1024 px). Dưới mốc này giao diện giữ nguyên như điện thoại (thanh tab dưới đáy) và máy tính bảng (thanh icon 80 px bên trái).

**Thanh bên**

- Từ `lg`, thanh icon thành thanh bên 240 px: biểu tượng và chữ "Tinh Bàn" ở đầu, mỗi tab một hàng icon + chữ như menu web, tab đang mở nền đỏ son nhạt 10% với chấm vàng ở cuối hàng (chữ đỏ son trên nền này 5,88:1 sáng, 6,88:1 tối).
- Chân thanh bên là ô "Gói của bạn" trên tấm đỏ son (ADR 0009), dẫn sang Các gói. Ẩn ở tab Hồ sơ vì đầu trang đã có thẻ gói.

**Từng màn**

- `<main>` các màn tab (Hôm nay, Lá số, Hỏi, Hồ sơ) trải hết vùng nội dung tới 1792 px (`lg:max-w-448`), lề trong 32 px; máy tính bảng rộng tới 768 px (`md:max-w-3xl`). Thanh trên tràn tới hai mép màn hình ở mọi trang (`bleed-bar` trong globals.css: nền và đường kẻ dưới kéo ra bằng border-image, không làm trang cuộn ngang), kể cả trang form có cột ở giữa.
- Hôm nay: trái là tờ lịch và lịch tháng mở sẵn (chọn ngày ngay, không cần bảng kéo lên; ngày ở thanh trên chỉ là chữ), phải là Dữ kiện, Xem ngày, Cả nhà; từ `2xl` (1536 px) các khối này chia hai cột theo thứ tự đọc, thành ba cột.
- Lá số: lưới lá số lớn hơn; khi lưới rộng từ 672 px thì ô cao hơn và chữ to hơn một bậc, từ 896 px thêm một bậc nữa để lưới không dẹt (container query trong `packages/ui`, nên lá số mẫu ở trang giới thiệu không đổi). Khung chi tiết cung bên phải đứng yên khi cuộn, rộng 480 px từ `2xl`. Vận hạn: lưới thấy đủ 12 đại vận thay cho hàng kéo ngang; từ 1280 px, năm đang xem và dòng thời gian của đại vận nằm cạnh nhau.
- Hỏi: trái là lịch sử và ô hỏi, phải là cột Câu hỏi gợi ý đứng yên khi cuộn (448 px từ `2xl`).
- Hồ sơ: trái là thẻ gói và Cả nhà, phải là Cài đặt.
- Hồ sơ mới: tấm dát vàng giới thiệu bên trái, form bên phải. Sửa hồ sơ: form bên trái, mã hồ sơ và nút xóa bên phải. Khôi phục: "Từ mã hồ sơ" và "Từ file sao lưu" là hai thẻ cạnh nhau.
- Bắt đầu, Tri thức Tử Vi nới rộng vừa phải; trang đọc giữ cột hẹp cho dễ đọc. Trang giới thiệu và Các gói đã dàn rộng từ trước, không đổi.

**Bảng nổi và ô chọn**

Bảng kéo lên từ đáy chỉ dùng trên điện thoại. Từ `md` (768 px, `useWide`):

- Bảng có nội dung (chi tiết cung, chia sẻ thẻ năm, Giữ lá số an toàn, Báo tôi khi có) là hộp thoại giữa màn hình rộng 512 px, có nút đóng: dùng `Sheet` trong `components/sheet.tsx` thay cho Drawer.
- Ô chọn là ô nổi ngay dưới nút mở, không phủ màn hình: lịch tháng ở Hôm nay (máy tính bảng; bấm vào ngày trên thanh trên), danh sách nơi sinh ở form hồ sơ (rộng bằng ô nhập, có ô tìm).

Phần chỉ có trên máy tính mà lặp nội dung của bản điện thoại (lịch tháng mở sẵn, cột câu gợi ý) chỉ dựng khi màn hình khớp `lg` (`useDesktop` trong `lib/use-media-query.ts`), để trên điện thoại không có hai bản trùng nhau trong trang.

## Hệ quả

- E2E vẫn chạy ở khung 375 px nên không thấy bố cục máy tính; khi đổi các màn trên, cần xem thêm ở 1024, 1440 và 1920 px.
- Màn tab chỉ còn lề hai bên khi vùng nội dung rộng hơn 1792 px (màn 2K trở lên ở tỉ lệ 100%); thanh trên vẫn tràn hai mép. Trang form, trang đọc giữ cột ở giữa cho dễ điền, dễ đọc.
- Bảng kéo lên mới phải dùng `Sheet` (hoặc ô nổi nếu là ô chọn), không dùng Drawer trực tiếp.

## Khi nào xem lại

Khi thêm tab hoặc màn mới trong app: theo cùng khuôn hai cột từ `lg`.

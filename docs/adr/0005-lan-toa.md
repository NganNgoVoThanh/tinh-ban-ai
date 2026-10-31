# ADR 0005: Thẻ chia sẻ vẽ bằng SVG trên máy, trang tri thức suy tiêu đề từ điều kiện, Web Push qua Vercel Cron

Ngày: 2026-10-30. Trạng thái: đang dùng.

## Bối cảnh

Technical Plan mục 14 và Bước 7: thẻ chia sẻ không lộ ngày giờ sinh; trang `/tri-thuc/[slug]` sinh tĩnh từ đơn vị `public: true` từ L1; Web Push cho PWA đã cài. Schema đơn vị kho (mục 7) không có trường slug hay tiêu đề trang. Chưa có Postgres (Bước 8).

## Quyết định

- **Thẻ "Năm nay của tôi":** dựng SVG bằng chuỗi (`lib/share-card.ts`), vẽ lên canvas thành PNG 1080×1350 ngay trên máy, chia sẻ bằng `navigator.share({ files })`, không hỗ trợ thì tải ảnh. Thẻ chỉ có năm âm, can chi năm, cung hạn, Tứ hóa năm, chủ đề năm từ kho (nếu có), phái, link `/?ref=card&door=A|B`. Không có ngày giờ sinh, tuổi, can chi năm sinh, tên, mã hồ sơ. Thiếu giờ sinh thì không có thẻ. Font trong ảnh là font hệ thống (ảnh SVG không dùng được font web của trang).
- **Trang tri thức:** tiêu đề và slug suy ra từ điều kiện của đơn vị (`publicPages` trong `packages/kb`): "Sao [độ sáng] tại cung X", "Cung X vô chính diệu", nếu không suy được thì dùng câu tầng 1. Trùng slug thì thêm `-2`, `-3` theo thứ tự `rule_id`, nên slug ổn định khi thêm đơn vị mới có `rule_id` lớn hơn. Câu tầng 1, 2 điền bằng `renderGeneric` (sao, cung, độ sáng lấy từ điều kiện, không cần lá số). Kho chưa có trang nào thì `generateStaticParams` trả một tham số giữ chỗ, trang đó trả 404 (để route vẫn được build tĩnh khi bật `cacheComponents`).
- **Web Push:** đăng ký lưu trong Redis (`push:<install_id>` và tập `push:all`) tới Bước 8; Vercel Cron gọi `/api/cron/push` lúc 00:00 UTC (07:00 giờ Việt Nam) với `CRON_SECRET`; gửi bằng `web-push` (VAPID). Nội dung chung "Xem ngày hôm nay", bấm mở `/hom-nay`. Endpoint trả 404/410 thì xóa đăng ký. "Xóa toàn bộ dữ liệu" hủy đăng ký ở máy và xóa trên server. Thiếu khóa VAPID thì tính năng tắt, không báo lỗi. iPhone chưa cài app thì Cài đặt hướng dẫn cài lên màn hình chính.

## Hệ quả

- Đổi điều kiện của một đơn vị public có thể đổi slug của trang đó; khi kho có trang thật, cần giữ chuyển hướng cho slug cũ (chưa làm).
- Tạm thời mọi người nhận push cùng một giờ; giờ nhắc theo người dùng để sau, cần thêm trường vào đăng ký.
- Điểm hiếm chưa làm: cần bộ an sao riêng chạy nhanh và các đơn vị `kind: pattern` trong kho.

## Khi nào xem lại

Khi có Postgres (Bước 8) và khi kho có trang công khai đầu tiên.

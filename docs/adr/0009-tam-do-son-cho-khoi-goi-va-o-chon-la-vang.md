# ADR 0009: Khối gói dùng lại tấm đỏ son với nút lá vàng; ô đang chọn là lá vàng

Ngày: 2026-11-02. Trạng thái: đang dùng. Thay một phần ADR 0008 (tấm dát vàng ở khối gói, kiểu ô đang chọn).

## Bối cảnh

Sau ADR 0008, bạn nhận xét:

1. Nút chọn (ví dụ Giao diện: Theo máy · Sáng · Tối) vẫn chưa đẹp. Bản ADR 0008 chỉ đổi gạch đỏ dưới chân thành viền chỉ vàng, vẫn là rãnh nền xám với viên nổi.
2. Các khung giới thiệu gói (ví dụ khối "Miễn phí cho những điều cốt lõi" ở trang giới thiệu) cần quay lại nền đỏ, nút vàng sang trọng như bản trước (ADR 0007).

## Quyết định

**Tấm đỏ son `son` cho khối gói**

- Dựng lại tiện ích `son` trong `globals.css`: đỏ son tươi chuyển sang đỏ rượu (`#b42330` → `#a01d29` → `#82162a`, cùng dải với thẻ chia sẻ), ánh vàng ≤ 7% ở góc trên, khung chỉ vàng đôi và kim nhũ vàng lấp lánh như tấm dát vàng. Tấm tự mang token chữ: ngà `#fffaf3`, chữ phụ hồng nhạt `#fbe1d6`, vàng nhạt `#ffe3a3`, nên chữ bên trong không cần lớp màu riêng. Giống nhau ở chế độ sáng và tối.
- Dùng ở: khối Các gói ở trang giới thiệu, thẻ Gói của bạn (Hồ sơ, Các gói), thẻ Plus ở trang Các gói.
- Nút trên tấm đỏ dùng biến thể nút `gold` (lá vàng, chữ nâu sơn mài), có vệt sáng lướt qua ở nút chính của khối. Nhãn "Các gói" trên thẻ Gói của bạn cũng là viên lá vàng.
- Tờ lịch ở Hôm nay giữ tấm dát vàng (ADR 0008) vì không phải khối gói.

**Ô đang chọn là lá vàng (`gold-leaf`)**

- Bỏ hẳn kiểu rãnh nền với viên nổi. Nút chọn (`Segmented`) là các ô rời nhau cách 8 px, nền ngà, viền mảnh, chữ phụ; ô đang chọn là lá vàng: vàng kim sáng chuyển chéo sang vàng đậm (`#ffe8b3` → `#e8c06a`, chéo để mép dưới không sẫm như nút nổi), ánh trắng ở mép trên, viền chỉ vàng, chữ nâu đậm. Phẳng, không đổ bóng, không gạch dưới. Khi thiếu lựa chọn bắt buộc, viền các ô chuyển màu cảnh báo.
- Cùng lá vàng cho ô giờ âm ở form hồ sơ và ngày đang chọn trong lịch tháng (trước là tô đỏ đặc). Vàng là "đang chọn", đỏ son là "hành động" (nút chính), nên ô chọn không lẫn với nút.
- Thẻ đại vận đang chọn ở Vận hạn và ô cung đang chọn trên lưới lá số giữ kiểu riêng (tô sáng dữ liệu, không phải nút chọn).

Tương phản đã tính trên mọi nấc của dải: trên tấm đỏ son chữ ngà 5,83:1, chữ phụ 4,86:1, vàng nhạt 4,84:1; trên lá vàng chữ 8,26:1, chữ phụ 5,42:1.

## Hệ quả

- Lời ở ADR 0008 về tấm dát vàng cho thẻ gói và khối Các gói, và về kiểu ô đang chọn, không còn đúng; phần nền lụa ngà, tờ lịch dát vàng và việc bỏ chi tiết kỹ thuật giữ nguyên.

## Khi nào xem lại

Khi đổi icon app và thẻ chia sẻ, hoặc khi thêm kiểu chọn mới (ví dụ chọn nhiều): dùng lại `gold-leaf` cho thống nhất.

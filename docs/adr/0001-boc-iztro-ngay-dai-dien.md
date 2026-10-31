# ADR 0001: Bọc iztro bằng "ngày đại diện"

Ngày: 2026-10-29. Trạng thái: đang dùng, có giới hạn đã biết.

## Bối cảnh

iztro 2.6.2 tự đổi dương sang âm bằng lunar-lite (lịch Trung Quốc, UTC+8) và không nhận ngày âm từ ngoài. Lịch Việt Nam (UTC+7) khác lịch Trung Quốc ở 167 tháng trong 1901–2099, ví dụ Tết 1985 lệch cả tháng.

## Quyết định

Bộ tính tự tính ngày âm Việt Nam (`packages/calendar`), rồi tìm một ngày dương mà lịch Trung Quốc cho cùng số tháng, số ngày âm, trong năm cùng can chi (cùng năm hoặc cách 60 năm, tháng thường hoặc tháng nhuận cùng số). iztro được gọi với `fixLeap = false`; quy ước tháng nhuận do trường phái quyết định trước bước này. Lá số gốc chỉ phụ thuộc can chi năm, số tháng, số ngày âm, giờ và giới tính, nên ngày đại diện cho cùng kết quả an sao. Bộ tính kiểm lại ngày âm iztro nhận được và báo lỗi nếu lệch.

## Hệ quả

- Vị trí 14 chính tinh, Mệnh, Thân, đại hạn khớp lasotuvi 100% trên bộ ca chuẩn.
- 19 ngày 30 âm lịch trong 1901–2099 không có ngày đại diện (ví dụ 30/11/1974, 30/7/1989, 30/12/1997, 30/11/2008, 30/6 nhuận 2017). Bộ tính trả lá số không có 12 cung, kèm cảnh báo `UNSUPPORTED_DAY30` để giao diện báo "Chưa hỗ trợ ngày này" (trước 30/10/2026 là lỗi `UnsupportedDateError`).
- iztro mất 35–70 ms mỗi lá số: đủ cho app, quá chậm cho công cụ điểm hiếm (khoảng 440 nghìn lá số).
- Các chỗ iztro theo lối Trung Quốc (Tứ hóa năm Canh và Nhâm, độ sáng 7 mức, Hỏa Linh, Khôi Việt) được ghi đè theo trường phái, xem [ADR 0002](0002-quy-uoc-an-sao-viet-nam.md).

## Khi nào xem lại

Nếu cần ghi đè nhiều hơn Tứ hóa và độ sáng, hoặc khi làm công cụ điểm hiếm: tự viết phần an sao lá số gốc, dùng iztro và lasotuvi làm hai nguồn đối chiếu. Cách đó cũng hết giới hạn 19 ngày ở trên.

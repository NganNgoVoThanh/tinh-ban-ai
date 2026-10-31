# ADR 0002: An sao theo quy ước Việt Nam cho cả hai phái

Ngày: 2026-10-30. Trạng thái: đang dùng tạm, chờ duyệt (Technical Plan v1.2, mục 22, việc 1).

## Bối cảnh

Biên bản đối chiếu 29/10 ([docs/golden](../golden/2026-10-29-lasotuvi.md)) cho thấy iztro theo lối Trung Quốc, lasotuvi theo lối Việt Nam, và hai bên khác nhau ở bốn điểm: Tứ hóa năm Canh và Nhâm, thang độ sáng (7 hay 5 mức), vị trí Hỏa Tinh và Linh Tinh, vị trí Thiên Khôi và Thiên Việt. v1.2 có hai phái (Nam phái, Bắc phái), an sao lá số gốc giống nhau, chỉ khác cách đọc.

## Quyết định

- Cả hai phái an sao theo quy ước Việt Nam như lasotuvi 0.1.2, thang độ sáng 5 mức. Dữ liệu nằm ở `packages/chart-engine/src/conventions.ts`, mỗi phái chọn bảng qua `SchoolPolicy` (`school.ts`).
- Bộ tính vẫn dùng iztro để an sao, rồi ghi đè trên kết quả: dời Hỏa Linh, Khôi Việt; gán lại Tứ hóa theo `mutagenTable`; gán lại độ sáng. Không dùng `astro.config` của iztro vì đó là trạng thái toàn cục, không hợp khi hai phái có thể dùng bảng khác nhau trong cùng một lần chạy.
- Bắc phái hiện dùng cùng bảng Tứ hóa với Nam phái. Nếu sách tham chiếu của Bắc phái dùng bảng khác, chỉ cần đổi `mutagenTable` của Bắc phái và chạy lại golden test.
- Độ sáng Thiên Phủ: lasotuvi không có, tạm lấy bảng của iztro (chỉ dùng Miếu, Vượng, Đắc).

## Hệ quả

- Golden test khớp lasotuvi 100% ở mọi nhóm (cung, chính tinh, phụ tinh, Tứ hóa, độ sáng, đại hạn, Tuần Triệt) cho cả hai phái ([biên bản 30/10](../golden/2026-10-30-lasotuvi.md)).
- Đổi quy ước của một phái là sửa dữ liệu; quy tắc an sao phụ tinh chọn theo mã (`ENG.STAR.HOA_LINH_VN`, `ENG.STAR.KHOI_VIET_VN`, hoặc bản `_IZTRO` để giữ vị trí của iztro).
- Bắc phái chưa có nguồn đối chiếu độc lập; phi hóa (`getFlyingMutagens`) mới được kiểm bằng bất biến.

## Khi nào xem lại

Khi chốt sách tham chiếu cho từng phái, hoặc khi chọn được công cụ đối chiếu cho Bắc phái.

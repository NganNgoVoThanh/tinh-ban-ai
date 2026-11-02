# ADR 0008: Nền lụa ngà, tấm dát vàng thay tấm đỏ son; không hiện chi tiết kỹ thuật cho người dùng

Ngày: 2026-10-31. Trạng thái: đang dùng. Thay một phần ADR 0007 (kiểu nền `son`, `starfield`, nút `gold`). Phần tấm cho khối gói và kiểu ô đang chọn đã được thay bằng [ADR 0009](0009-tam-do-son-cho-khoi-goi-va-o-chon-la-vang.md).

## Bối cảnh

Sau ADR 0007, bạn nhận xét:

1. Mục đang chọn của nút chọn (ví dụ "Gốc" ở Lá số) có gạch đỏ dưới chân trông như nút nổi, không hợp; các chỗ tương tự cần kiểu hiển thị khác.
2. Lớp `[animation-fill-mode:both]` có thể viết gọn (gợi ý của Tailwind IntelliSense).
3. Màu nền app cần sang trọng hơn.
4. App chỉ cần hiện thông tin người dùng cần, không hiện thông tin hay chi tiết kỹ thuật.
5. Các tấm nền đỏ đậm (tờ lịch, thẻ gói) vẫn tối, sậm.

## Quyết định

**Nền và bề mặt**

- Nền trang là lụa ngà `#f7f2e9`, sẫm hơn thẻ (`#fffdf8`) một chút để thẻ nổi như giấy dày. Trên nền có ánh sáng dịu ở giữa mép trên, quầng vàng kim rất nhẹ ở góc và hoa văn đồng tiền (các vòng tròn đan nhau) bằng chỉ vàng mờ 8% (`--brocade`, `--sheen` trong `globals.css`). Bỏ quầng đỏ son ở mép trên. Nền cuộn theo trang, không `background-attachment: fixed` (nặng với Safari).
- Viền, nền phụ, ô nhập ngả vàng nhẹ (`--border #e8dccb`, `--muted #f2eadf`, `--input #d9c8b4`, `--folk-bg #f6ecdc`).
- Chế độ tối giữ nền `#1a1214`, thêm hoa văn chỉ vàng mờ 4,5%.

**Tấm dát vàng `gilded` thay tấm đỏ son `son` và `starfield`**

- Lụa ngà chuyển sang vàng sâm panh (`#fffaf0` → `#faf0de` → `#f4e4c6`), ánh sáng ở góc trên, khung chỉ vàng đôi (viền ngoài và một khung lùi vào 5 px), kim nhũ vàng lấp lánh. Chế độ tối: tấm nâu trầm `#3a2a25` → `#281c1a`, sáng hơn nền, cùng khung vàng.
- Dùng token thường (không ghi đè màu chữ như `son`), nên chữ mực, chữ phụ, đỏ son, vàng kim giữ nguyên; nút chính trên tấm là nút đỏ son. Bỏ biến thể nút `gold`.
- Dùng ở: tờ lịch Hôm nay, thẻ Gói của bạn (Hồ sơ, Các gói), thẻ Plus, khối Các gói ở trang giới thiệu.
- Tờ lịch: đầu tờ ghi tháng (chữ son) và tiết khí (chữ vàng), ngăn với thân bằng chỉ vàng; ngày dương lớn chữ son chuyển sắc. Bỏ dải đỏ và hai lỗ ghim.
- `blush` đổi từ ngà ửng hồng sang ngà ánh vàng; `aurora` hạ quầng đỏ từ 14% xuống 8%.

**Trạng thái chọn và bóng**

- Nút chọn (`Segmented`): mục đang chọn là viên nền thẻ, viền chỉ vàng, chữ đỏ son đậm, bóng rất nhẹ; bỏ gạch đỏ dưới chân. (Đã thay bằng ô lá vàng ở ADR 0009.)
- Bỏ bóng đỏ dưới nút chính, dưới ngày đang chọn trong lịch tháng, khi rê chuột thẻ cửa và quanh lá số mẫu; thay bằng bóng ấm trung tính hoặc viền vàng. Ô biểu tượng ở thẻ cửa đổi từ khối đỏ đậm sang nền sáng chữ son.
- Lớp hiệu ứng hiện dần dùng tiện ích của tw-animate-css: `delay-80 fill-mode-both` thay cho `[animation-delay:80ms] [animation-fill-mode:both]`.

**Không hiện chi tiết kỹ thuật**

- Bỏ mục "Chi tiết kỹ thuật" ở Lá số (giờ UTC, trace quy tắc, phiên bản bộ tính, tz_policy) và ở bảng chi tiết cung (phiên bản, hash kho, mã quy tắc).
- Bỏ "bảng tra phiên bản …" ở khối Xem ngày, "Kho {phiên bản}" ở mục Nguồn của câu trả lời (giữ tên phái).
- Lỗi nội bộ của bộ tính không còn hiện nguyên văn; chỉ lỗi đầu vào (đã viết cho người dùng) được hiện, còn lại là "Không lập được lá số: hãy xem lại ngày giờ sinh trong Sửa hồ sơ."
- Lời lẽ thay từ chuyên môn: "offline" → "không có mạng", "kho tri thức", "đơn vị tri thức đã truy xuất", "bộ nhớ đệm", "bộ tính" → "tri thức Tử Vi đã duyệt", "Tinh Bàn"; bỏ "(IndexedDB)" ở trang Quyền riêng tư. Gồm cả dòng giải thích giờ dùng để an sao ở form hồ sơ, câu "chưa có nhận định" ở Vận hạn và câu từ chối cho hồ sơ dưới 16 tuổi.
- Dữ liệu kỹ thuật vẫn nằm trong snapshot và lịch sử hỏi (để đối chiếu, gỡ lỗi), chỉ không hiện ra màn hình.

Mọi cặp chữ/nền mới đã tính tương phản, đều từ 4,5:1, gồm nấc sẫm nhất của tấm dát vàng (thấp nhất: chữ "hợp" 4,61:1) và ô cung đang chọn trên thẻ mới.

## Hệ quả

- Technical Plan mục 7 (tầng 3: "Mã quy tắc nằm trong mục Chi tiết kỹ thuật"), mục 12 (bảng chi tiết cung có "Chi tiết kỹ thuật") và bảng linh kiện `Accordion` ở mục 13 không còn đúng phần này.
- E2E đợi lá số tính xong bằng nút chọn "Gốc" thay cho nút "Chi tiết kỹ thuật".
- Thẻ chia sẻ và icon app vẫn nền đỏ son (ADR 0007); chưa đổi theo tấm dát vàng.

## Khi nào xem lại

Khi cần cho chuyên gia hoặc người dùng nâng cao xem căn cứ kỹ thuật (có thể làm trang riêng ẩn sau Cài đặt), hoặc khi đổi thẻ chia sẻ và icon theo kiểu dát vàng.

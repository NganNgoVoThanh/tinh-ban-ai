# ADR 0003: Trang theo hồ sơ dùng tham số trên trang tĩnh; service worker qua Serwist

Ngày: 2026-10-30. Trạng thái: đang dùng.

## Bối cảnh

Technical Plan mục 12 đặt lá số ở `/la-so/[profileId]` và sửa hồ sơ ở `/ho-so/[profileId]`. Mục 11 yêu cầu lá số, vận hạn, Hôm nay và lịch sử hỏi vẫn chạy khi offline, kể cả khi tải lại trang (luồng E2E số 8). Mọi dữ liệu nằm trong IndexedDB; server chỉ trả khung trang.

Với đường dẫn động, mỗi hồ sơ là một URL riêng: service worker chỉ có khung trang của những URL đã mở khi còn mạng, nên hồ sơ mới tạo hoặc chưa mở lần nào sẽ không tải lại được khi offline.

Việc còn mở số 6 (Serwist hay tự viết service worker): `@serwist/turbopack` phục vụ service worker qua một route handler có `dynamic = "force-static"` và `revalidate`, hai cấu hình bị cấm khi bật `cacheComponents`.

## Quyết định

- Trang theo hồ sơ là trang tĩnh, hồ sơ đi trong tham số: `/la-so?ho-so=<id>&xem=goc|van-han`, `/ho-so/sua?ho-so=<id>`. Không có tham số thì `/la-so` mở hồ sơ đang chọn. Đường dẫn vẫn chỉ chứa mã hồ sơ ngẫu nhiên, không chứa ngày sinh hay tên.
- Đổi hồ sơ trên màn lá số bằng `history.pushState` (Next đồng bộ `useSearchParams`), không gọi mạng.
- Dùng Serwist (`@serwist/turbopack`) nhưng tự viết route `app/serwist/[path]/route.ts`, chỉ lấy `GET` và `generateStaticParams` từ `createSerwistRoute`, để giữ `cacheComponents` và Partial Prefetching (chuyển trang mềm khi offline dùng được khung trang đã prefetch).
- Service worker (`sw/sw.ts`): precache JS, CSS, font của bản build; khi cài thì lưu sẵn khung các trang tĩnh; mở trang thì ưu tiên mạng, mất mạng thì dùng khung đã lưu, khóa theo đường dẫn không kèm tham số. HTML không đưa vào precache, vì khớp bỏ tham số sẽ trả nhầm HTML cho yêu cầu RSC (`?_rsc=`). Không lưu `/api/*` và `/admin`. Bản mới chờ sẵn, giao diện hiện "Có bản mới · Tải lại".

## Hệ quả

- Đường dẫn khác bảng ở mục 12; phần còn lại của bảng giữ nguyên.
- Thêm trang tĩnh mới thì phải thêm vào danh sách `SHELLS` trong `sw/sw.ts`.
- iztro tự đọc giờ hiện tại, nên mọi chỗ lập lá số phải chạy sau khi hydrate (không chạy lúc prerender).

## Khi nào xem lại

Khi Serwist có bản hỗ trợ `cacheComponents` chính thức, hoặc khi Next bỏ hẳn các route segment config.

# ADR 0006: CSP cho phép script inline của Next; CI tự viết script kiểm phụ thuộc và quét bundle

Ngày: 2026-10-30. Trạng thái: đang dùng, chờ bạn duyệt phần CSP.

## Bối cảnh

Technical Plan mục 16 muốn CSP chặt: chỉ script của app, Turnstile, Sentry và hash của script chọn sáng/tối. Mục 19 liệt kê các bước CI: quy tắc phụ thuộc, quét bundle client, chặn eval.

Trang tĩnh của Next 16 (App Router) có khoảng chục script inline mỗi trang: dữ liệu RSC (`self.__next_f.push(...)`), script chọn sáng/tối của next-themes, script khởi động. Nội dung các script này khác nhau theo từng trang và từng bản build. Nonce chỉ dùng được khi render động mọi trang, trái với trang tĩnh chạy offline (ADR 0003).

## Quyết định

- CSP chỉ bật ở production, gửi bằng `headers()` trong `next.config.ts`:
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`; `connect-src` thêm Turnstile và Sentry; `frame-src` chỉ Turnstile; `img-src 'self' data: blob:` (thẻ chia sẻ); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
  Kèm `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` chỉ cho camera (quét mã QR).
- Như vậy script từ nguồn lạ vẫn bị chặn, nhưng script inline bị chèn vào trang thì không. React tự thoát nội dung, app không dùng `dangerouslySetInnerHTML` cho dữ liệu người dùng (chỉ cho JSON-LD do app tạo).
- Quy tắc phụ thuộc kiểm bằng `tools/ci/check-deps.mjs` (không thêm dependency-cruiser): packages không import app; mã chạy trên trình duyệt không import `packages/ai`, `lib/server`, SDK AI, `web-push`; bộ tính, lịch, kho, lời giải thích không gọi AI; bộ tính và lịch không phụ thuộc kho.
- Quét bundle bằng `tools/ci/scan-bundle.mjs`: `.next/static`, service worker, `public/`; giải mã `\xHH`, `\uHHHH` trước khi dò khóa API, tên biến bí mật, địa chỉ API AI, chuỗi prompt hệ thống.
- Chặn eval bằng `tools/ci/check-eval.mjs`: PR sửa `packages/ai/src/prompts/`, `config.ts`, `providers/` hoặc `packages/kb/content/` phải có nhãn `eval` và báo cáo E-01 mới trong `tools/eval/reports/` đạt ngưỡng, đúng `prompt_version` và hash kho hiện tại.
- E2E chạy trong CI trên `next start` của chính job, chưa chạy trên bản xem trước của Vercel.

## Hệ quả

- CSP yếu hơn kế hoạch ở đúng một điểm: script inline. Muốn chặt hơn thì phải render động (nonce) hoặc tự tính hash cho từng trang sau mỗi bản build và gửi CSP theo trang.
- Thêm nguồn bên ngoài (ví dụ dịch vụ phân tích) thì phải sửa CSP, nếu không trình duyệt chặn.

## Khi nào xem lại

Khi Next hỗ trợ hash tự động cho script inline của trang tĩnh, hoặc khi chuyển sang render động.

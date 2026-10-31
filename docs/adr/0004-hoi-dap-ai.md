# ADR 0004: Hỏi đáp AI chạy qua cổng trung lập, lưu trạng thái trong Redis, tạm ghi vết ra log

Ngày: 2026-10-30. Trạng thái: đang dùng, chờ eval E-01 để chốt model.

## Bối cảnh

Technical Plan mục 10 và 15 đặt ra luồng hỏi tự do: cổng vào (lượt, ngân sách, phạm vi, PII) → cache → model nhỏ + validator → sửa một lần → model mạnh → lùi về kho. Model chưa chốt: ứng viên GPT-6 Luna / GPT-6.1 Terra, đối chứng Claude Haiku 5.5 / Sonnet 5.5; chọn bằng eval E-01. Bước 8 mới có Postgres (bảng `answer_trace`, `interest`).

## Quyết định

- `packages/ai` có cổng trung lập (`AiProvider`): adapter Claude (`@anthropic-ai/sdk`), adapter OpenAI (Responses API, `openai`), và AI giả lập cho local, test. Chọn bằng `AI_PROVIDER`. Production thiếu cấu hình thì `/api/ask` trả lời bằng kho, không báo lỗi.
- Cả hai adapter dùng đầu ra JSON theo schema của nhà cung cấp; validator chạy bằng code, không tốn tiền AI.
- Adapter Claude: prompt hệ thống cố định đặt đầu tiên, có `cache_control`; mặc định `claude-haiku-5-5` (nhỏ), `claude-sonnet-5-5` (mạnh), effort `low`. Với Sonnet 5.5, bật fallback phía server (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`): khi bộ lọc an toàn từ chối, Anthropic tự chạy lại bằng model dự phòng; chi phí tính theo model thực sự trả lời (lấy từ `msg.model`, model lạ tính theo giá cao nhất). Haiku 5.5 không có cơ chế này; câu bị từ chối đi tiếp xuống tầng sau.
- OpenAI chưa có bảng giá đáng tin trong repo: bắt buộc khai `AI_PRICES_JSON`.
- Trạng thái server (lượt theo ngày, giới hạn IP, ngân sách ngày/tháng, cache câu trả lời, đăng ký quan tâm) nằm trong Upstash Redis qua REST; thiếu cấu hình thì dùng bộ nhớ của tiến trình (chỉ hợp cho local, test).
- `AnswerTrace` tạm ghi ra log có cấu trúc (`type: "answer_trace"`), không có câu hỏi hay fact; chuyển sang Postgres ở Bước 8.
- Client gửi lên chỉ câu hỏi, `question_type`, fact tối thiểu của các cung liên quan và tam phương tứ chính (`questionFacts` trong `packages/narrative`, dùng chung định dạng với server), `kb_version`, `school_id`, `install_id`.
- Câu gợi ý về năm nay và hôm nay trả lời trên máy từ dữ kiện của bộ tính và lịch dân gian, chỉ có nhãn Dữ kiện và Dân gian; diễn giải Tử Vi chỉ đến từ kho đã duyệt.
- E2E chạy server với `AI_ENABLED=false` (luồng 11 đi đường thật); luồng 7 giả lập câu trả lời AI bằng `page.route`, vì khi kho chưa đủ 2 đơn vị khớp thì server không gọi AI.

## Hệ quả

- Đổi nhà cung cấp chỉ cần đổi biến môi trường; eval E-01 chạy được trên cả hai adapter.
- Khi kho chưa có nội dung đã duyệt, câu tự do luôn được trả lời bằng kho (thường là "chưa có căn cứ"), không tốn tiền AI.
- Log production có `answer_trace` cho tới khi có Postgres; cần giữ log đủ lâu để xem chi phí.

## Khi nào xem lại

Sau eval E-01 (chốt model, effort, giá); khi có Postgres (Bước 8); khi Haiku có fallback phía server.

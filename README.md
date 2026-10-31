# Tinh Bàn AI

App Tử Vi trên điện thoại (PWA). Kế hoạch kỹ thuật: [Technical Plan v1.2](docs/technical-plan-v1.2.md) (thay cho [v1.1](https://claude.ai/artifact/TRphecbvTkE5JFTvFHNvm2)); mục 20 là lộ trình làm dần, mục 23 là kiểu dữ liệu và giao diện hàm.

## Đang ở đâu

| Bước | Trạng thái |
|---|---|
| 1. Bộ tính | Xong. Bộ ca chuẩn 283 ca khớp lasotuvi 100% cho cả hai phái ([biên bản](docs/golden/2026-10-30-lasotuvi.md)); trang nhập, lưới lá số, công tắc phái, sáng/tối |
| 2. Khung app | Xong phần code: PWA (Serwist), IndexedDB, mã hồ sơ TB2, sao lưu bằng file, trang giới thiệu, chọn cửa, khung tab, Khôi phục, Cài đặt |
| 3. Giải thích | Xong phần máy: `kb build`, bộ xét điều kiện, giải thích 3 tầng, bảng chi tiết cung, đo độ phủ. Kho chưa có nội dung đã duyệt (cần bạn soạn và duyệt mức L1) |
| 4. Hôm nay | Xong: lịch âm, can chi, tiết khí, hoàng đạo, trực, giờ tốt, hợp/xung tuổi cả nhà, lịch tháng, nhắc bằng file .ics. Nhị thập bát tú chờ sách đối chiếu |
| 5. Vận hạn | Xong: dải đại vận, thẻ năm (cung hạn, Tứ hóa năm, phi hóa đại vận cho Bắc phái), dòng thời gian, chế độ Cả nhà |
| 6. Hỏi đáp AI | Xong phần code: `packages/ai` (cổng trung lập Claude/OpenAI/giả lập, validator, cache, lượt, ngân sách, Turnstile), `/api/ask`, tab Hỏi, lịch sử trên máy, bảng quan tâm bản trả phí, bộ chạy eval E-01 ([ADR 0004](docs/adr/0004-hoi-dap-ai.md)). Chưa chạy E-01 với model thật: cần khóa API và kho có nội dung |
| 7. Lan tỏa | Xong phần code: thẻ chia sẻ "Năm nay của tôi" (PNG vẽ trên máy), trang `/tri-thuc` sinh từ đơn vị public, sitemap, robots, Web Push qua Vercel Cron ([ADR 0005](docs/adr/0005-lan-toa.md)). Chưa có trang nào vì kho chưa có đơn vị public; điểm hiếm chưa làm (cần bộ an sao nhanh và đơn vị cách cục) |
| 8. Mở công khai | Đang làm. Đã có: bản nháp `/quyen-rieng-tu` (chờ rà soát pháp lý), CSP và header bảo mật ([ADR 0006](docs/adr/0006-bao-mat-va-ci.md)), CI GitHub Actions, Dependabot, bộ lọc báo lỗi cho Sentry. Chưa có: Postgres, `/admin`, dashboard, cảnh báo, tích hợp Sentry (cần tài khoản) |

Giao diện theo [ADR 0007](docs/adr/0007-giao-dien-son-mai-va-trang-cac-goi.md): tông đỏ son – vàng kim trên giấy ngà (thay bảng chàm của mục 13), trang Các gói `/goi` hiện gói của máy (P0 luôn là Miễn phí) và giá dự kiến chờ duyệt. Quyền lợi và giá sửa ở `apps/web/lib/plans.ts`.

Đang dùng đề xuất chờ duyệt (Technical Plan mục 22): quy ước an sao Việt Nam cho cả hai phái ([ADR 0002](docs/adr/0002-quy-uoc-an-sao-viet-nam.md)), giờ âm không quy đổi múi giờ, người sinh ở nước ngoài dùng giờ chuẩn nơi sinh (bỏ giờ mùa hè). Đường dẫn theo hồ sơ dùng tham số trên trang tĩnh ([ADR 0003](docs/adr/0003-duong-dan-tinh-va-service-worker.md)).

## Chạy

Cần Node 22 và pnpm 10.

```sh
pnpm install
pnpm test                          # test của mọi package, gồm golden test cho cả hai phái
pnpm typecheck
pnpm --filter @tinhban/web build   # kb build rồi next build
pnpm --filter @tinhban/web start   # http://localhost:3000
pnpm --filter @tinhban/web e2e     # Playwright, Android + iPhone, sau khi build
```

Kho tri thức: viết đơn vị vào `packages/kb/content/*.yaml` (schema ở Technical Plan mục 7), nguồn vào `content/sources.yaml`, rồi `pnpm --filter @tinhban/kb build:kb`. Đo độ phủ: `pnpm --filter @tinhban/sample-charts gen` (một lần cho mỗi phiên bản bộ tính) rồi `pnpm --filter @tinhban/sample-charts coverage`.

Đối chiếu chéo với lasotuvi: xem [tools/golden/README.md](tools/golden/README.md).

Kiểm như CI ([ADR 0006](docs/adr/0006-bao-mat-va-ci.md), workflow ở `.github/workflows/ci.yml`): `node tools/ci/check-deps.mjs` (quy tắc phụ thuộc), `node tools/ci/scan-bundle.mjs apps/web` (sau khi build: bundle client không có khóa API hay `packages/ai`), `node tools/ci/check-eval.mjs origin/main --labels eval` (chặn eval khi sửa prompt, model, kho).

Hỏi đáp AI: biến môi trường ở đầu [packages/ai/src/config.ts](packages/ai/src/config.ts). Local không cần khóa (AI giả lập); production cần `AI_PROVIDER` và khóa, nếu thiếu thì câu tự do được trả lời bằng kho. Eval E-01: `AI_PROVIDER=anthropic ANTHROPIC_API_KEY=… pnpm --filter @tinhban/eval e01` (tốn tiền mỗi lần chạy; thêm `--gate` để chặn khi trượt ngưỡng).

## Cấu trúc

```
apps/web/               Next.js 16: giao diện, API routes, service worker (sw/), e2e/
packages/shared/        kiểu dữ liệu dùng chung (mục 23 của kế hoạch)
packages/calendar/      âm lịch Việt Nam, can chi, tz_policy, múi giờ nước ngoài, 63 tỉnh, chuẩn hóa giờ sinh
packages/chart-engine/  an sao qua iztro, quy ước theo phái (SchoolPolicy), phi hóa, tam phương tứ chính
packages/kb/            từ điển sao/cung, điều kiện, kb build (build/), nội dung (content/)
packages/narrative/     giải thích 3 tầng, câu hỏi gợi ý, khớp ý định, fact gửi lên server; không gọi AI
packages/ai/            hỏi đáp AI phía server: cổng vào, truy xuất, model, validator, lượt, ngân sách
packages/folk-calendar/ xem ngày dân gian: hoàng đạo, trực, giờ tốt, hợp/xung tuổi
packages/profile-code/  mã hồ sơ TB2: Base32 Crockford + CRC-10
packages/ui/            token màu, lưới lá số, nhãn nội dung
tools/golden/           bộ ca chuẩn, golden test, script đối chiếu với lasotuvi
tools/sample-charts/    10.000 lá số mẫu, đo độ phủ kho
tools/eval/             eval E-01: 120 câu trên 20 lá số, chấm bằng code
docs/adr/               quyết định kỹ thuật
docs/golden/            biên bản đối chiếu theo ngày
```

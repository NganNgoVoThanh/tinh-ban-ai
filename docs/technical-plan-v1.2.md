# Tinh Bàn AI — Technical Plan v1.2

Phiên bản 1.2 · 29/10/2026 · thay cho [v1.1 trên Claude Docs](https://claude.ai/artifact/TRphecbvTkE5JFTvFHNvm2)

Bản này giữ nguyên các quyết định của v1.1. Phần mới gồm:

- hai trường phái Nam phái và Bắc phái;
- toàn bộ giao diện: cấu trúc màn hình, điều hướng, hệ thống thiết kế;
- vận hạn, lịch sử hỏi đáp, sao lưu;
- bảo vệ trang admin;
- giờ sinh theo canh;
- vá 15 lỗ hổng tìm thấy khi rà v1.1.

Các điểm còn chờ quyết định gom ở mục 22.

## 0. Thay đổi so với v1.1

Cột "Nguồn" ghi rõ ai quyết định từng thay đổi:

- **Bạn chốt:** bạn đã trả lời trực tiếp.
- **Bạn giao:** bạn để Claude chọn phương án tối ưu.
- **Vá lỗ hổng:** chỗ v1.1 còn thiếu hoặc mâu thuẫn.

| Mục | Thay đổi | Nguồn |
|---|---|---|
| 1, 6 | Có cả Nam phái và Bắc phái trong P0; mặc định Nam phái; chọn phái ở 3 chỗ; bấm công tắc trên lá số là đổi luôn phái của hồ sơ | Bạn chốt |
| 6 | Kho tri thức dùng chung, đơn vị nào chỉ đúng với một phái thì gắn nhãn phái | Bạn chốt |
| 12 | Có trang giới thiệu riêng ở `/` | Bạn chốt |
| 13 | Chế độ tối có trong P0 | Bạn chốt |
| 8 | Màn Hôm nay cho chọn ngày khác | Bạn chốt |
| 10, 11 | Lưu lịch sử hỏi đáp trên máy | Bạn chốt |
| 14 | Quan tâm bản trả phí gồm gói tháng, gói năm, gói lượt hỏi | Bạn chốt |
| 12 | Cửa A và cửa B khác nhau ở tab mở đầu và thứ tự các khối | Bạn giao |
| 13 | Màu chàm và vàng đồng; tên sao tô màu theo ngũ hành | Bạn giao |
| 9 | Nội dung dòng thời gian và bảng năm của cả nhà | Bạn giao |
| 15 | Trang admin đăng nhập bằng GitHub, chỉ tài khoản trong danh sách cho phép mới vào được | Bạn giao |
| 5 | Nhập giờ theo canh hoặc giờ âm; giờ Tý tách trước và sau nửa đêm | Bạn giao |
| 5, 11 | Hồ sơ và mã hồ sơ lưu thêm giờ chỉnh tay, tỉnh sinh và phái | Vá lỗ hổng |
| 5 | Có cách xử lý cho người sinh ở nước ngoài | Vá lỗ hổng |
| 7 | Đo độ phủ kho bằng `tools/sample-charts` từ Bước 3, không chờ công cụ điểm hiếm; thống nhất một cách đo | Vá lỗ hổng |
| 7 | Tứ hóa năm viết theo can năm, làm mới trước mỗi Tết | Vá lỗ hổng |
| 10 | Chỉ trừ lượt hỏi khi câu hỏi gửi lên server; có tiêu chí bật Turnstile | Vá lỗ hổng |
| 11 | Thêm sao lưu và nhập lại bằng file | Vá lỗ hổng |
| 15, 16 | Bảng `interest` gắn `install_id`; liệt kê đủ dữ liệu đi ra ngoài (IP, push, Sentry) | Vá lỗ hổng |
| 17 | Định nghĩa lại "tỷ lệ đăng ký"; thêm sự kiện mới | Vá lỗ hổng |
| 19 | CI chặn PR đổi prompt hoặc kho nếu chưa chạy eval | Vá lỗ hổng |
| 4 | Ghi đủ quy tắc phụ thuộc giữa các package | Vá lỗ hổng |

## 1. Mục tiêu, phạm vi và nguyên tắc

Bản P0 là web app tối ưu cho điện thoại, cài được như app (PWA) và miễn phí. App được làm dần, không chạy theo mốc ngày: bước nào xong cũng ra một bản dùng được. App chỉ mở công khai khi qua đủ điều kiện ở mục 20. Kế hoạch dựa trên đặc tả sản phẩm v1.0 (29/10/2026), các sửa đổi v1.1 và các quyết định v1.2.

**Trong phạm vi P0**

- Lập lá số theo **Nam phái hoặc Bắc phái**: 12 cung, đại vận, vận năm, dòng thời gian, bảng năm của cả nhà.
- Giải thích 3 tầng và câu hỏi gợi ý, lấy từ kho tri thức đã duyệt (mức L1 trở lên).
- Màn Hôm nay:
  - âm lịch, xem ngày dân gian (gắn nhãn riêng);
  - ngày hợp hay xung với tuổi từng người;
  - chọn được ngày khác;
  - nhắc nhở do người dùng tự bật.
- Lưu nhiều hồ sơ trên máy. Khôi phục bằng mã hồ sơ hoặc file sao lưu.
- Hỏi đáp tự do: giới hạn lượt, kiểm tra từng câu trả lời, có trần ngân sách, lưu lịch sử trên máy.
- Trang giới thiệu, thẻ chia sẻ, trang tri thức công khai.
- Chế độ sáng và tối.
- Nút "quan tâm bản trả phí" và phân tích hành vi ẩn danh.
- Dashboard admin nội bộ.

**Ngoài phạm vi P0:** app iOS/Android gốc, tài khoản người dùng và đồng bộ máy chủ, thanh toán, luận lưu nhật, trí nhớ và quan hệ, diễn tập tình huống, giọng nói, chế độ "xem 12 khả năng giờ".

**Nguyên tắc kỹ thuật**

| Nguyên tắc | Cụ thể |
|---|---|
| Dữ liệu sinh nằm trên máy | Tên, ngày giờ sinh, nơi sinh chỉ lưu trong trình duyệt của người dùng. Máy chủ không bao giờ nhận các thông tin này |
| Tính toán xác định | Sao, cung, lịch do bộ tính quyết định. AI không bao giờ tự an sao hay tự đổi lịch |
| Trường phái là dữ liệu | Khác biệt giữa hai phái nằm trong cấu hình `SchoolPolicy` và nhãn của kho, không rải `if` khắp code |
| Dùng kho trước, AI sau | Nội dung lấy từ kho đã duyệt. AI chỉ diễn đạt lại và nối các đơn vị đã lấy ra từ kho |
| Chỉ gọi AI khi thật cần | Chỉ gọi AI cho câu hỏi tự do mà kho chưa trả lời được |
| Mọi thứ có phiên bản | Bộ tính, kho, bảng dân gian, prompt đều có phiên bản. Câu trả lời nào cũng truy được nguồn gốc |
| Hỏng mà vẫn chạy | Khi tắt AI hoặc hết ngân sách, app vẫn trả lời bằng kho và không báo lỗi |

## 2. Quyết định kỹ thuật chính

Stack được chọn để một người làm được, chi phí vận hành gần 0 khi chưa có doanh thu, và ngày giờ sinh luôn nằm trên máy người dùng.

| Mã | Chủ đề | Quyết định | Lý do |
|---|---|---|---|
| ADR-01 | Ứng dụng | Next.js 16 (App Router), TypeScript strict, Tailwind, shadcn/ui | Stack bạn đã quen. Có SSG cho trang giới thiệu và tri thức, có API routes cho phần server nhỏ |
| ADR-02 | Nơi chạy bộ tính | Trong trình duyệt. Cùng một package TypeScript dùng cho client, server và test | Ngày giờ sinh không rời máy, không tốn máy chủ, chạy được khi offline |
| ADR-03 | Lưu trên máy | IndexedDB qua Dexie | API gọn, có migration theo phiên bản schema |
| ADR-04 | PWA | Web App Manifest và service worker (Serwist hoặc tự viết) | Cài lên màn hình chính, chạy offline, nhận Web Push |
| ADR-05 | Thư viện Tử Vi | Bọc iztro sau interface `ChartEngine`. Âm lịch Việt Nam do package `calendar` tự tính ([ADR 0001](adr/0001-boc-iztro-ngay-dai-dien.md)) | Làm nguyên mẫu nhanh mà không phụ thuộc lịch Trung Quốc. Nếu golden test không qua thì thay được |
| ADR-06 | Kho tri thức | File YAML trong repo, biên dịch thành bundle JSON có phiên bản | Git giữ lịch sử duyệt, không cần CMS, CI kiểm tra schema |
| ADR-07 | AI | ai-gateway không gắn với nhà cung cấp nào. Mỗi hãng một adapter dùng SDK chính thức. Chọn model bằng eval | v1.0 mặc định dùng OpenAI. Chốt cuối theo chi phí trên mỗi câu trả lời đạt chuẩn |
| ADR-08 | Dữ liệu server | Postgres (Neon) qua Prisma. Upstash Redis cho giới hạn lượt và ngân sách | Gói miễn phí đủ cho beta. Redis đếm chính xác và tự hết hạn theo thời gian |
| ADR-09 | Chống bot | Cloudflare Turnstile, giới hạn lượt theo `install_id` và IP | Miễn phí, thường không bắt người dùng giải hình |
| ADR-10 | Hosting | Vercel (bản xem trước cho mỗi PR, có Cron) | Ít việc vận hành nhất. Gói Hobby không dùng cho mục đích thương mại, nên chuyển Pro khi bán |
| ADR-11 | Kiểm thử | Vitest, fast-check, Playwright, axe-core | Golden test, kiểm bất biến của lịch, E2E trên khung điện thoại, kiểm tra tiếp cận |
| ADR-12 | Giám sát lỗi | Sentry, lọc dữ liệu cá nhân trước khi gửi | Bắt lỗi production mà không lộ ngày sinh |
| ADR-13 | Bảo vệ admin | Auth.js v5 + GitHub OAuth, chỉ GitHub ID trong `ADMIN_GITHUB_IDS` được vào. Chặn ở `proxy.ts` (tên mới của middleware trong Next.js 16) | Không phải tự giữ mật khẩu. Có xác thực hai lớp của GitHub. Miễn phí. Người dùng thường vẫn không cần tài khoản |
| ADR-14 | Trường phái | `SchoolPolicy` theo `school_id` (`nam`, `bac`): ranh giới giờ Tý, tháng nhuận, bảng Tứ hóa, thang độ sáng, cách an một số phụ tinh | Thêm hay sửa một phái chỉ là sửa dữ liệu và chạy lại golden test |
| ADR-15 | Font chữ | Be Vietnam Pro và Noto Serif qua `next/font`, tự host | Chạy offline, hợp với CSP chặt, không gọi Google Fonts lúc chạy |

## 3. Kiến trúc tổng thể

Mọi tính toán chạy trong trình duyệt. Server chỉ là lớp mỏng, phục vụ hỏi đáp AI, nhận sự kiện ẩn danh, phục vụ cấu hình và trang admin.

```text
┌─ Trên máy người dùng (web/PWA): ngày giờ sinh chỉ nằm ở đây ──────────────┐
│  Giao diện          Bộ tính             Kho tri thức        Xem ngày      │
│  3 tầng, gợi ý      lịch, múi giờ,      bundle có phiên     bảng tra      │
│  lịch sử hỏi        an sao, vận hạn     bản, ghép lời       dân gian      │
│                     IndexedDB           Service worker                    │
│                     hồ sơ, lịch sử      offline, Web Push                 │
└──────┬──────────────────────────────────────────────────────┬─────────────┘
       │ câu hỏi tự do + fact tối thiểu                       │ sự kiện ẩn danh
┌──────▼─ Server (Vercel): không nhận ngày giờ sinh ──────────▼─────────────┐
│  /api/ask ──► ai-gateway ──► Nhà cung cấp AI (prompt + đơn vị kho)        │
│  Upstash Redis: giới hạn lượt, ngân sách, công tắc AI                     │
│  Postgres: cache, AnswerTrace, sự kiện, quan tâm, push                    │
│  API phụ: events, interest, config, push   Vercel Cron   /admin (GitHub)  │
└───────────────────────────────────────────────────────────────────────────┘
```

Câu hỏi tự do là đường duy nhất đưa dữ liệu lá số ra khỏi máy. Nó chỉ mang các fact tối thiểu, không có tên hay ngày giờ sinh.

**Các luồng chính**

1. **Lập lá số (chạy được khi offline):**
   1. Người dùng nhập dữ liệu sinh và chọn phái.
   2. `calendar` chuẩn hóa giờ và đổi lịch.
   3. `chart-engine` an sao theo `SchoolPolicy`.
   4. `LocalProfile` và `ChartSnapshot` được lưu vào IndexedDB.
   5. `narrative` ghép giải thích 3 tầng từ kho.
2. **Đổi phái:**
   1. Người dùng bấm công tắc trên lá số.
   2. Phái mới được ghi vào `LocalProfile.schoolId`.
   3. Bộ tính tính lại snapshot (35–70 ms).
   4. Kho lọc lại các đơn vị theo phái mới.
3. **Câu hỏi gợi ý (chạy được khi offline):** `narrative` chọn đơn vị khớp và trả lời ngay, không gọi mạng. Câu trả lời được ghi vào lịch sử.
4. **Câu hỏi tự do:** khớp ý định ngay trên máy. Chỉ khi kho chưa đủ mới gửi lên `/api/ask` (mục 10). Câu trả lời được ghi vào lịch sử.
5. **Quay lại hằng ngày:** nhận nhắc nhở (file .ics hoặc Web Push) → mở `/hom-nay` → `folk-calendar` tính ngay trên máy.

## 4. Cấu trúc mã nguồn

Repo là một pnpm monorepo. App web chỉ là lớp mỏng. Logic Tử Vi nằm trong các package độc lập, để test riêng và dùng lại cho app gốc về sau.

```text
tinh-ban-ai/
├─ apps/web/              Next.js: giao diện, API routes, service worker, /admin
├─ packages/
│  ├─ shared/             kiểu dữ liệu, quy ước ID, phiên bản, lỗi chuẩn
│  ├─ calendar/           âm lịch Việt Nam, can chi, tiết khí, chính sách múi giờ
│  ├─ chart-engine/       an sao, SchoolPolicy, đại vận, vận năm, phi hóa, dấu vết
│  ├─ folk-calendar/      xem ngày dân gian: hoàng đạo, trực, xung hợp
│  ├─ kb/                 content/*.yaml, schema, bộ biên dịch, bộ xét điều kiện
│  ├─ narrative/          ghép giải thích 3 tầng, khớp ý định; không gọi AI
│  ├─ ai/                 gateway, adapter, prompt, validator, ngân sách (chỉ server)
│  ├─ profile-code/       mã hồ sơ: mã hóa, giải mã, checksum
│  └─ ui/                 token màu, font, linh kiện dùng chung (lá số, nhãn)
├─ tools/
│  ├─ golden/             bộ ca chuẩn và script đối chiếu chéo
│  ├─ sample-charts/      sinh 10.000 lá số mẫu để đo độ phủ kho (từ Bước 3)
│  ├─ rarity/             đếm độ hiếm của cách cục (Bước 7)
│  ├─ kb-draft/           AI soạn nháp đơn vị tri thức qua Batch API
│  └─ eval/               bộ câu thử AI, script chạy, báo cáo
└─ docs/
   ├─ adr/                các ADR
   └─ golden/             biên bản đối chiếu theo ngày
```

**Quy tắc phụ thuộc** (CI kiểm bằng dependency-cruiser)

| Package | Được phụ thuộc vào |
|---|---|
| `shared` | không gì cả |
| `calendar` | không gì cả (v1.1); chỉ dùng kiểu từ `shared` |
| `chart-engine` | `shared`, `calendar` |
| `folk-calendar` | `shared`, `calendar` |
| `kb` | `shared` |
| `narrative` | `shared`, `kb`, kiểu của `chart-engine` |
| `profile-code` | `shared` |
| `ai` | `shared`, `kb`, `narrative`. Import `server-only` |
| `ui` | `shared` |
| `apps/web` | tất cả. `ai` chỉ được import trong route handler và server component |

- CI báo lỗi nếu bundle client chứa `packages/ai` hoặc bất kỳ khóa API nào.
- Giao diện không chứa logic an sao. Prompt không chứa quy tắc an sao.
- Mỗi package có test riêng. CI chạy test theo đồ thị phụ thuộc.

## 5. Lịch pháp và bộ tính Tử Vi

Bộ tính nhận dữ liệu sinh cùng phái, trả về lá số kèm dấu vết của từng quy tắc đã áp dụng. Cùng đầu vào, cùng phái và cùng phiên bản thì kết quả luôn giống nhau.

**Đầu vào (`BirthInput`, kiểu đầy đủ ở mục 23)**

- **Ngày sinh và loại lịch:** dương hoặc âm. Nếu là âm lịch thì có cờ tháng nhuận. Ô "Tháng nhuận" chỉ hiện khi năm âm đó có tháng nhuận.
- **Giờ sinh, chọn một trong ba cách:**

  | Cách | Người dùng biết | Lưu |
  |---|---|---|
  | `exact` | Giờ phút trên giấy tờ | `time` = HH:mm |
  | `canh` | Chỉ biết giờ âm (Tý … Hợi) hoặc canh đêm | `timeBranch` = 0–11; giờ Tý thêm `tyPart` |
  | `unknown` | Không biết | — |

- **Nơi sinh:** chọn trong danh mục 63 tỉnh trước 07/2025, hoặc chọn "Nước ngoài".
  - Dùng danh mục cũ vì nơi sinh là dữ liệu lịch sử. Một số tỉnh mới sau sáp nhập nằm vắt qua ranh giới Bắc–Nam giai đoạn 1954–1975.
  - Vùng (`region`) được suy ra từ tỉnh.
  - Riêng Quảng Trị, nếu sinh trong 1954–1975 thì hỏi thêm: bờ Bắc hay bờ Nam sông Bến Hải.
  - Nơi sinh bắt buộc với người sinh trước 01/01/1976, theo hằng số `REGION_IRRELEVANT_FROM` trong code. v1.1 ghi 13/06/1975, nhưng mốc đó chỉ tính phần giờ đồng hồ, chưa tính phần lịch âm.
- **Giới tính:** bắt buộc, vì quyết định đại vận đi thuận hay nghịch.
- **Giờ chuẩn do người dùng tự sửa (`stdTimeOverride`):** lưu trong hồ sơ và trong mã hồ sơ. Nhờ vậy khôi phục bằng mã vẫn ra đúng lá số đã sửa.
- **Phái và phiên bản:** phái (`schoolId`) nằm trong `LocalProfile`; cùng với `engine_version`, đó là hai tham số bộ tính nhận thêm.

**Nhập theo canh**

- Đêm có 5 canh, mỗi canh trùng đúng một giờ âm:

  | Canh | Giờ âm | Giờ đồng hồ |
  |---|---|---|
  | 1 | Tuất | 19–21 |
  | 2 | Hợi | 21–23 |
  | 3 | Tý | 23–01 |
  | 4 | Sửu | 01–03 |
  | 5 | Dần | 03–05 |

  Vì vậy màn nhập chỉ có một lưới 12 giờ âm, bên cạnh mỗi ô ghi khung giờ đồng hồ. Có một dòng phụ "Biết theo canh?" để đổi từ canh sang giờ âm.
- **Giờ Tý cần hỏi thêm** "trước nửa đêm (23–24 giờ)" hay "sau nửa đêm (0–1 giờ)". Lý do: trường phái có thể tính 23–24 giờ là sang ngày hôm sau, nên cùng một "giờ Tý" có thể ứng với hai ngày khác nhau.
- **Không quy đổi múi giờ cho giờ âm** (đề xuất, chờ duyệt):
  - Một giờ âm dài 2 tiếng. Nếu dịch đi 1 tiếng theo múi giờ lịch sử, nó sẽ vắt qua hai giờ âm và không còn đổi được về một giờ duy nhất.
  - Vì vậy bộ tính dùng thẳng giờ âm người dùng chọn.
  - Nếu ca sinh rơi vào giai đoạn có múi giờ lệch (ví dụ miền Nam 1960–1975), app hiện cảnh báo `TIME_APPROX` để người dùng tự kiểm.

**Chuỗi xử lý**

1. **Chuẩn hóa giờ:** giờ trên giấy tờ được đổi sang UTC theo `tz_policy` (vùng × khoảng thời gian), rồi quy về giờ chuẩn dùng để an sao, mặc định UTC+7. Nếu có `stdTimeOverride` thì dùng giá trị đó và ghi quy tắc `ENG.TZ.USER_OVERRIDE`.
2. **Đổi lịch:** dương sang âm theo thuật toán Hồ Ngọc Đức, dùng múi giờ của lịch đang hiệu lực tại thời điểm và nơi sinh.
3. **Tính can chi năm, tháng, ngày, giờ.** Ranh giới năm và ranh giới giờ Tý lấy theo `SchoolPolicy`.
4. **An sao** qua `ChartEngine`. Bên trong là iztro được bọc lại: nhận ngày âm đã tính sẵn, ghi đè theo `SchoolPolicy` (Tứ hóa, độ sáng, Hỏa Linh, Khôi Việt).
5. **Xuất `ChartSnapshot`**, gồm fact có ID, thiên can của từng cung, cảnh báo và dấu vết.

**Chính sách múi giờ (`tz_policy`)**

- Là một bảng có phiên bản: vùng (Bắc, Nam, nước ngoài) × khoảng ngày → độ lệch so với UTC. Bảng dựng từ dữ liệu IANA (Asia/Ho_Chi_Minh) và tài liệu lịch sử.
- Người dùng xem được giờ đã quy đổi và chỉnh tay được, có cảnh báo khi chỉnh.
- Lịch âm miền Bắc và miền Nam từng tính khác nhau (Tết Mậu Thân 1968 lệch một ngày), nên bộ đổi lịch nhận thêm vùng làm tham số.
- **Sinh ở nước ngoài** (đề xuất, chờ duyệt):
  - Người dùng chọn múi giờ IANA của nơi sinh.
  - Giờ an sao là giờ chuẩn địa phương nơi sinh, không đổi sang giờ Việt Nam.
  - Ngày âm tính theo lịch Việt Nam.
  - App luôn hiện cảnh báo `REGION_ABROAD`.
- Giờ mặt trời thật: để đến P1.

**Khi thiếu giờ sinh**

- Không dựng 12 cung. Chỉ hiện các sao an theo năm (theo địa chi, không gán tên cung), kèm nhãn "thiếu giờ sinh".
- P1: chế độ "xem 12 khả năng giờ" để người dùng tự đối chiếu.

**Dấu vết và ID**

- Mỗi fact có một ID ổn định, ví dụ `palace:quan_loc|star:thai_duong|state:mieu`.
- Mỗi bước tính ghi lại mã quy tắc, ví dụ `ENG.TZ.SOUTH_UTC8` hay `ENG.STAR.TU_VI_POS`. Mã này dùng cho tầng "vì sao" và để gỡ lỗi.

**Giới hạn đã biết:** 19 ngày 30 âm lịch trong 1901–2099 chưa an sao được ([ADR 0001](adr/0001-boc-iztro-ngay-dai-dien.md)). Giao diện báo rõ "Chưa hỗ trợ ngày này", không đoán.

**Điều kiện xong Bước 1: bộ tính đạt chuẩn**

- Bộ ca chuẩn có ít nhất 150 ca (hiện có 247 ca), gồm:
  - ca ngẫu nhiên, tháng nhuận, ngày quanh Tết, giờ quanh 23:00–01:00;
  - các năm 1968 và 1985;
  - người sinh ở miền Nam giai đoạn 1960–1975;
  - ca thiếu giờ, ca nhập theo giờ âm, ca sinh ở nước ngoài.
- Mỗi ca chạy với **cả hai phái**.
- Đối chiếu chéo tự động:
  - Nam phái với lasotuvi;
  - Bắc phái với một công cụ chọn sau (mục 22).
  
  Chỗ nào lệch cũng phải có biên bản ghi nguyên nhân: do trường phái, do lịch, do giờ hay do lỗi.
- Kiểm bất biến bằng fast-check:
  - đổi dương → âm → dương phải ra lại đúng ngày ban đầu;
  - lá số luôn đủ 14 chính tinh;
  - mỗi cung ứng đúng một địa chi;
  - đổi phái không làm đổi vị trí 14 chính tinh;
  - mã hồ sơ mã hóa rồi giải mã phải ra lại đúng đầu vào.
- Chưa qua 100% bộ ca chuẩn thì lá số chỉ để tự kiểm, chưa đưa cho người khác dùng.

## 6. Trường phái: Nam phái và Bắc phái

App theo thuật ngữ thông dụng trong Tử Vi:

- **Nam phái** là Tam Hợp phái: luận theo tính chất và tổ hợp sao trong tam phương tứ chính.
- **Bắc phái** là Phi Tinh, hay Tứ Hóa phái: luận theo thiên can của cung và đường đi của Tứ hóa.

Hai phái **an sao lá số gốc giống nhau**, chỉ khác cách đọc. Mặc định là Nam phái.

**Khác biệt trên giao diện**

| Phần | Nam phái | Bắc phái |
|---|---|---|
| Lá số gốc | 12 cung, 14 chính tinh, phụ tinh: chung | Chung |
| Ô cung | Chính tinh và độ sáng, Tứ hóa năm sinh, phụ tinh, vòng Tràng sinh | Như Nam phái, thêm thiên can của cung |
| Chạm vào một cung | Sáng tam phương tứ chính (cung đó, hai cung tam hợp, cung xung chiếu) | Vẽ 4 mũi tên phi hóa Lộc, Quyền, Khoa, Kỵ từ can của cung tới cung đích; đánh dấu tự hóa |
| Vận hạn | Đại vận, tiểu hạn, lưu niên | Đại vận, lưu niên, Tứ hóa theo can đại vận và can năm |
| Kho tri thức | Đơn vị chung và đơn vị `schools: [nam]` | Đơn vị chung và đơn vị `schools: [bac]` |

**Chọn phái ở ba chỗ**

1. **Cài đặt → Phái mặc định:** dùng cho hồ sơ mới. Giá trị ban đầu là Nam phái.
2. **Màn nhập hồ sơ:** trường "Phái" được điền sẵn theo mặc định, đổi được.
3. **Công tắc trên lá số:** bấm là đổi luôn phái của hồ sơ đó và lưu lại. Lá số được tính lại ngay. Vận hạn, Hỏi và mã hồ sơ đều theo phái mới. App ghi sự kiện `school_switched`.

Giao diện luôn viết đầy đủ "Nam phái" hoặc "Bắc phái", không rút gọn thành "Nam" hay "Bắc", để không nhầm với giới tính Nam ngay trên cùng form.

**Quy ước an sao: tách khỏi chuyện chọn phái**

Biên bản đối chiếu ngày 29/10/2026 ([docs/golden](golden/2026-10-29-lasotuvi.md)) cho thấy iztro theo lối Trung Quốc và lasotuvi theo lối Việt Nam khác nhau ở bốn điểm:

- Tứ hóa năm Canh và năm Nhâm;
- thang độ sáng: 7 mức hay 5 mức;
- vị trí Hỏa Tinh, Linh Tinh;
- vị trí Thiên Khôi, Thiên Việt.

**Đề xuất (chờ duyệt, mục 22):** cả hai phái an sao theo quy ước Việt Nam như lasotuvi, dùng thang độ sáng 5 mức. Bảng Tứ hóa đặt trong `SchoolPolicy` để Bắc phái dùng bảng riêng nếu sách tham chiếu của Bắc phái khác.

**Kho và cache**

- Đơn vị tri thức có trường `schools`. Bỏ trống nghĩa là dùng chung cho cả hai phái.
- Giao diện chỉ hiện nhãn "Nam phái" hoặc "Bắc phái" khi đơn vị đó chỉ thuộc một phái.
- Khóa cache câu trả lời đã có sẵn `school_id`, nên không cần đổi.

## 7. Kho tri thức và giải thích 3 tầng

Kho tri thức quyết định chất lượng nội dung. Mỗi đơn vị là một file YAML, có điều kiện áp dụng, phái, nguồn và mức kiểm định. Chỉ đơn vị từ mức L1 trở lên mới vào bản phát hành.

**Schema một đơn vị**

```yaml
rule_id: TV.QL.THAI_DUONG.MIEU.001
schools: [nam, bac]         # bỏ trống = cả hai phái; [nam] hoặc [bac] = chỉ một phái
version: 3
kind: interpretation        # interpretation | pattern | folk | year
topic: career
conditions:
  all:
    - { palace: quan_loc, has_star: thai_duong }
    - { star: thai_duong, state_in: [mieu, vuong] }
exclusions:
  - { palace: quan_loc, has_star: hoa_ky }
headline: "Câu đời thường (tầng 1)"
because: "Quan Lộc có {star} {state}"   # tầng 2, chèn fact thật
detail: "Đoạn diễn giải đã duyệt"
citations:
  - { source_id: TVDS-TB, edition: "...", page: 123 }
review: { level: L1, by: owner, date: 2026-11-20, sources_checked: 2 }
priority: 50
public: true                # được dùng cho trang tri thức công khai
tests:
  positive: [golden/case-017]
  negative: [golden/case-042]
```

**Mức kiểm định**

| Mức | Ai làm | Được dùng ở đâu |
|---|---|---|
| L0 | AI soạn nháp (`tools/kb-draft`) | Chỉ nội bộ. Bị loại khỏi bundle phát hành |
| L1 | Bạn đối chiếu với ít nhất 2 nguồn | Bản miễn phí, có nhãn "Chưa qua chuyên gia" |
| L2 | Chuyên gia duyệt | Bắt buộc với mọi nội dung trả phí |

**Bộ biên dịch (`kb build`)**

1. Kiểm schema bằng zod. `rule_id` không trùng. Mọi citation phải có trong `sources.yaml`. `schools` chỉ nhận `nam` hoặc `bac`.
2. Điều kiện chỉ được dùng sao, cung, trạng thái có trong từ điển. Từ điển cũng ghi hành của từng sao, dùng để tô màu ngũ hành.
3. Chạy các ca test khớp và không khớp của từng đơn vị qua bộ xét điều kiện.
4. Báo lỗi khi hai đơn vị cùng điều kiện, cùng phái mà kết luận trái nhau.
5. Kiểm lỗi nội dung: cụm từ bị cấm, nhãn bắt buộc, độ dài.
6. Xuất `kb-<semver>.json` kèm hash nội dung, cùng báo cáo độ phủ cho từng phái.

**Độ phủ: chỉ số chính của kho**

- `tools/sample-charts` sinh 10.000 lá số mẫu: ngày ngẫu nhiên trong 1930–2030 × 12 giờ × 2 giới tính, cố định hạt giống ngẫu nhiên. Công cụ này làm từ Bước 3, không phải chờ `tools/rarity` ở Bước 7.
- **Cách đo thống nhất:** với mỗi lá số, tính tỷ lệ fact trọng yếu có ít nhất một đơn vị từ L1 trở lên khớp. Lấy trung vị trên 10.000 lá số, tính riêng cho từng phái.
- Fact trọng yếu chia hai phạm vi:
  - **Phạm vi gốc** (đo từ Bước 3): chính tinh và Tứ hóa ở cung Mệnh và ở 5 cung được hỏi nhiều nhất.
  - **Phạm vi năm** (đo từ Bước 5): thêm các fact của năm đang xem.
- 5 cung được hỏi nhiều nhất dự kiến là Quan Lộc, Tài Bạch, Phu Thê, Phúc Đức, Thiên Di. Danh sách chốt lại theo câu hỏi thật của người dùng thử.
- Mục tiêu P0: trung vị đạt từ 90% trở lên, với Nam phái trước. Bắc phái đạt mức này trước khi mở công khai.
- Bộ lõi dự kiến 400–600 đơn vị:
  - chính tinh theo từng trạng thái;
  - ý nghĩa 12 cung;
  - Tứ hóa theo từng cung;
  - lục cát, lục sát theo từng cung;
  - Tứ hóa năm theo can năm.
- **Tứ hóa năm theo can năm:** viết theo 10 can, không viết theo từng năm. P0 phải đủ can của năm âm hiện tại (Bính, năm 2026) và năm sau (Đinh, năm 2027). Trước mỗi Tết, việc trong lộ trình là bổ sung can của năm tới.

**Quy trình soạn kho**

1. `tools/kb-draft` gửi danh sách tổ hợp kèm đoạn trích nguồn (bạn nhập) cho model mạnh qua Batch API. Kết quả là bản nháp L0 có citation.
2. Bạn đối chiếu với ít nhất 2 nguồn và viết lại bằng lời của mình, nâng lên L1. Chỉ trích ngắn từ sách, có ghi nguồn.
3. Khi có chuyên gia: duyệt theo lô, nâng lên L2.
4. Mỗi lần thay đổi: tăng version, chạy lại golden và eval, so sánh khác biệt đầu ra.

**Giải thích 3 tầng (`narrative`)**

- **Cách hiển thị:**
  - Tầng 1 là `headline`.
  - Tầng 2 là `because`, chèn fact thật của lá số.
  - Tầng 3 là citation (sách, trang). Mã quy tắc nằm trong mục "Chi tiết kỹ thuật".
- **Cách chọn đơn vị:**
  1. Lọc theo phái của hồ sơ.
  2. Lấy các đơn vị khớp điều kiện.
  3. Loại theo `exclusions`.
  4. Xếp theo `priority`.
  
  Mỗi cung tối đa 3 nhận định.
- Câu hỏi gợi ý của từng cung được sinh từ các đơn vị khớp và trả lời ngay trên máy.
- Bắt buộc có các nhãn: Dữ kiện, Diễn giải Tử Vi, Dân gian, Gợi ý tham khảo. Hình thức từng nhãn ở mục 13.

## 8. Hôm nay và xem ngày dân gian

Màn Hôm nay chạy hoàn toàn trên máy và không gọi AI. Màn này mặc định hiện ngày hôm nay và **cho chọn ngày khác**.

| Khối | Nguồn | Nhãn |
|---|---|---|
| Ngày âm; can chi ngày, tháng, năm; tiết khí | `calendar` | Dữ kiện |
| Hoàng đạo/hắc đạo, trực, nhị thập bát tú, giờ hoàng đạo | `folk-calendar` | Dân gian (ghi nguồn bảng tra) |
| Ngày hợp hay xung với tuổi từng hồ sơ (lục xung, lục hợp, tam hợp) | `folk-calendar` + hồ sơ | Dân gian |
| Một dòng về vận tháng (lưu nguyệt) | `chart-engine` + kho | Diễn giải Tử Vi. Chỉ hiện khi có đơn vị L1; P1 |
| Lối tắt "Hỏi về hôm nay" | Câu hỏi gợi ý | — |

**Chọn ngày**

- Thanh tiêu đề hiện ngày đang xem, hai bên có nút ‹ ›. Vuốt ngang cũng đổi ngày.
- Chạm vào ngày → mở lịch tháng dạng bảng kéo lên từ đáy. Mỗi ô có ngày dương (chữ lớn), ngày âm (chữ nhỏ) và chấm hoàng đạo.
- Khi đang xem ngày khác hôm nay, hiện chip "Về hôm nay".
- URL `/hom-nay?ngay=YYYY-MM-DD` để quay lại đúng ngày. Nhắc nhở luôn mở ngày hôm nay.
- Phạm vi chọn: từ 01/01 năm trước đến 31/12 năm sau.

**Thứ tự khối theo cửa vào** (chi tiết ở mục 12)

- Cửa A: Dữ kiện → Dân gian → Cả nhà.
- Cửa B: Cả nhà → Dữ kiện → Dân gian.

**Module `folk-calendar`**

- Bảng tra cố định theo một bộ sách tham chiếu chọn trước Bước 4 (ghi `source_id`), có phiên bản riêng `folk_version`.
- Không trộn với Tử Vi Đẩu Số. Kết quả mang `kind: folk`. Giao diện tách thành khối riêng, có nhãn riêng.
- Xem ngày không phụ thuộc phái, nên màn Hôm nay không có công tắc phái.
- Câu chữ lấy từ các đơn vị `kind: folk` trong kho, không sinh văn bản riêng cho từng người.
- Kiểm thử: đối chiếu mọi ngày trong phạm vi chọn được (3 năm) với lịch in của nguồn đã chọn.

**Cá nhân hóa có chừng mực:** chỉ nói "ngày này xung/hợp với tuổi X theo quan niệm dân gian". Không khuyên hủy việc, không dùng các từ như "đại kỵ" hay "tuyệt đối tránh". Chữ "xung" dùng màu hổ phách, không dùng màu đỏ.

## 9. Vận hạn: đại vận, dòng thời gian, bảng năm của cả nhà

Vận hạn là chế độ xem thứ hai trong tab Lá số, bấm nút chuyển `[Gốc | Vận hạn]`. Có hai cách xem: **Một người** và **Cả nhà**. Không có điểm số tốt/xấu cho từng năm, vì Plan cấm khẳng định quá mạnh. Chỉ hiện dữ kiện và nhận định có căn cứ.

**Một người**

1. **Dải đại vận:** gồm các đoạn 10 năm, cuộn ngang. Mỗi đoạn ghi:
   - khoảng tuổi và năm dương từ–đến;
   - cung đại vận và chính tinh của cung đó;
   - riêng Bắc phái: thêm 4 chip Tứ hóa theo can đại vận, rơi vào cung nào.
   
   Đoạn hiện tại được làm nổi bật.
2. **Thẻ năm đang xem:** mặc định là năm âm hiện tại, có nút ‹ › để chuyển năm. Thẻ gồm:
   - can chi năm, tuổi âm;
   - cung hạn của năm theo phái (Nam phái: tiểu hạn và lưu niên; Bắc phái: cung lưu niên);
   - Tứ hóa theo can năm rơi vào cung nào của lá số (4 dòng);
   - chủ đề năm lấy từ kho (tối đa 3 nhận định 3 tầng, chỉ đơn vị L1 trở lên);
   - câu hỏi gợi ý về năm.
3. **Dòng thời gian:** 10 năm của đại vận đang chọn, xếp dọc. Mỗi dòng ghi năm, can chi, tuổi, cung hạn năm và chấm đánh dấu các năm có Hóa Lộc hoặc Hóa Kỵ rơi vào cung Mệnh hay 5 cung hay hỏi. Chạm vào một dòng thì thẻ năm chuyển sang năm đó.

**Cả nhà** (bảng năm của cả nhà)

- Mỗi hồ sơ là một thẻ, xếp dọc. Trên máy tính thì hiện thành bảng.
- Mỗi thẻ ghi:
  - tên, tuổi âm năm nay;
  - đại vận hiện tại (cung, khoảng tuổi);
  - cung hạn năm;
  - Hóa Lộc và Hóa Kỵ của năm rơi vào cung nào;
  - tuổi với năm theo dân gian (hợp, xung), có nhãn Dân gian.
- Mỗi người đọc theo phái của hồ sơ người đó. Nếu phái khác phái mặc định, thẻ có chip phái.
- Hồ sơ thiếu giờ sinh chỉ hiện các dòng không cần cung Mệnh, các dòng còn lại ghi "Cần giờ sinh".
- Chạm vào thẻ → mở chế độ Một người của hồ sơ đó.
- Cửa B mặc định mở chế độ Cả nhà, cửa A mặc định mở Một người.

**Hàm mới trong `chart-engine`:** `getYearView(snapshot, lunarYear)` và `getFlyingMutagens(snapshot, palaceKey)` (mục 23). Fact của năm và của đại vận đi qua golden test như lá số gốc.

## 10. Hỏi đáp AI

Phần lớn câu hỏi được trả lời ngay trên máy từ kho. Chỉ câu hỏi tự do mà kho chưa trả lời được mới gửi qua `/api/ask`. Ở đó dùng model nhỏ, code kiểm tra từng câu, và luôn có đường lùi về kho.

**Luồng 7 tầng (2 tầng tốn phí)**

```text
Câu hỏi gợi ý ──────────── narrative trả lời từ kho · trên máy · 0đ ──┐
  │ câu tự do                                                         │
Khớp ý định trên máy ───── đủ đơn vị trong kho · 0đ ──────────────────┤
  │ chưa đủ kho                                                       │
Cổng vào server ────────── giới hạn lượt, ngân sách, phạm vi, PII ────┤  Hiển thị 3 tầng
  │ hợp lệ                                                            │  ghi AnswerTrace
Cache câu trả lời ──────── loại câu, rule_ids, phiên bản, phái · 0đ ──┤  cập nhật ngân sách
  │ chưa có                                                           │  ghi lịch sử trên máy
Model nhỏ + validator ──── sửa một lần kèm lỗi nếu trượt ─────────────┤
  │ vẫn trượt                                                         │
Model mạnh + validator ─── chỉ khi đủ nguồn mà câu chữ chưa đạt ──────┤
  │ vẫn trượt                                                         │
Lùi về kho ─────────────── narrative từ các đơn vị khớp · 0đ ─────────┘
```

Khi hết ngân sách hoặc `AI_ENABLED=false`, cổng vào đưa câu hỏi thẳng xuống tầng cuối: trả lời bằng kho.

**Thứ tự xử lý một câu hỏi**

1. **Trên máy:**
   - Câu hỏi gợi ý: `narrative` trả lời ngay.
   - Câu tự do: đi qua bộ khớp ý định (từ khóa + từ điển sao/cung). Nếu khớp một loại câu hỏi đã có đủ đơn vị trong kho thì trả lời từ kho, không gọi server, **không trừ lượt**.
2. **Gửi lên server (chỉ khi cần),** gồm:
   - câu hỏi (tối đa 300 ký tự) và `question_type` nếu có;
   - các fact tối thiểu của những cung liên quan, không có tên, không có ngày giờ sinh;
   - `kb_version`, `school_id`, `install_id`;
   - token Turnstile khi server yêu cầu.
3. **Cổng vào:**
   - Giới hạn lượt theo `install_id` và IP; kiểm tra ngân sách.
   - Câu hỏi ngoài phạm vi (y tế, pháp luật, đầu tư, chính trị, lập trình…) nhận câu từ chối soạn sẵn.
   - Xóa số điện thoại, email, tên riêng nếu có trong câu hỏi.
4. **Truy xuất:** server dùng cùng bundle kho với client, lọc theo phái, lấy tối đa 5 đơn vị khớp với fact và chủ đề.
5. **Cache:**
   - Khóa = hash(`question_type`, danh sách `rule_ids` đã sắp xếp, `school_id`, `kb_version`, `prompt_version`).
   - Chỉ dùng cache khi `question_type` thuộc danh mục cố định. Khóa không chứa dữ liệu cá nhân.
6. **Gọi model nhỏ:**
   - Prompt hệ thống cố định, đặt đầu tiên để được prompt caching.
   - Fact viết dạng mã gọn, kèm các đơn vị đã truy xuất.
   - Đầu ra là JSON theo schema, dùng tính năng structured outputs của nhà cung cấp.
   - Validator kiểm tra bằng code, không tốn tiền AI.
7. **Khi trượt kiểm tra:**
   1. Gọi lại model nhỏ một lần, kèm danh sách lỗi.
   2. Vẫn trượt thì gọi model mạnh hơn.
   3. Vẫn trượt nữa thì trả lời bằng `narrative` từ kho.
8. **Kết thúc:**
   - ghi `AnswerTrace` và cập nhật ngân sách;
   - trả câu trả lời kèm `rule_ids`, cùng header `X-Quota-Remaining`;
   - client ghi câu trả lời vào lịch sử.

**Schema đầu ra**

```json
{
  "sentences": [
    {
      "text": "...",
      "rule_ids": ["TV.QL.THAI_DUONG.MIEU.001"],
      "fact_ids": ["palace:quan_loc|star:thai_duong|state:mieu"],
      "label": "interpretation"
    }
  ],
  "followups": ["..."],
  "out_of_scope": false
}
```

**Validator**

| Kiểm tra | Trượt khi |
|---|---|
| Định dạng | JSON sai schema, nhiều hơn 6 câu, hoặc dài hơn 120 từ |
| Căn cứ | Câu không có `rule_id`, hoặc `rule_id` nằm ngoài nhóm vừa truy xuất |
| Dữ kiện | `fact_id` không có trong các fact đã gửi; hoặc văn bản nhắc tên sao/cung không có trong lá số (quét theo từ điển) |
| Khẳng định | Có cụm từ bị cấm: "chắc chắn", "sẽ bị", "không nên cưới", "đại kỵ"… |
| Nhãn | Câu diễn giải thiếu nhãn, hoặc nội dung dân gian bị gắn nhãn Tử Vi |
| Phái | Câu dựa trên đơn vị không thuộc phái của hồ sơ |
| Riêng tư | Nhắc lại dữ liệu cá nhân có trong câu hỏi |

Câu không qua kiểm tra căn cứ sẽ bị cắt. Nếu còn dưới 2 câu hợp lệ thì tính là trượt.

**Hạn mức và chống bot**

- **Bản miễn phí:** câu gợi ý không giới hạn. Câu tự do được 3 câu mỗi ngày trên mỗi thiết bị, **chỉ tính các câu gửi lên server**. Ngày tính theo giờ Việt Nam, đổi lúc 00:00.
- **Turnstile bắt buộc** khi có một trong các dấu hiệu sau:
  - `install_id` tạo chưa tới 24 giờ và đây là câu đầu tiên;
  - IP gửi quá 20 câu trong 1 giờ;
  - đã chạm giới hạn lượt trong 1 giờ qua;
  - ngân sách ngày đã dùng quá 80%.
  
  Các ngưỡng này nằm trong `/api/config`, chỉnh được mà không cần deploy.
- **Hồ sơ dưới 16 tuổi:** câu tự do vẫn được thử trả lời bằng kho trên máy nhưng không gửi lên server. Ô nhập ghi rõ lý do.

**Lịch sử hỏi đáp (trên máy)**

- Bảng `qa_history` trong IndexedDB, mỗi câu hỏi một bản ghi gồm: câu hỏi, câu trả lời 3 tầng, nguồn trả lời, phái, `kb_version`, thời điểm.
- Tối đa 500 câu cho mỗi hồ sơ. Quá thì xóa bản cũ nhất.
- Tab Hỏi hiện lịch sử của hồ sơ đang chọn, nhóm theo ngày, mới nhất ở trên. Chạm để mở đủ 3 tầng.
- Xóa được từng câu, hoặc dùng "Xóa lịch sử của hồ sơ này".
- Lịch sử không bao giờ gửi đi. Lịch sử có trong file sao lưu và bị xóa khi "Xóa toàn bộ dữ liệu".

**Chọn model và kiểm soát chi phí**

- Ứng viên theo v1.0: OpenAI GPT-6 Luna (mặc định) và GPT-6.1 Terra (khi cần nâng cấp). Đối chứng: Claude Haiku 5.5 và Sonnet 5.5. Tên và giá model cần kiểm lại khi chốt.
- Chọn bằng eval E-01 (mục 18): lấy model rẻ nhất có tỷ lệ qua validator từ 95% trở lên và không bịa sao/cung lần nào.
- Chỉ nâng lên model mạnh khi đã đủ nguồn mà câu chữ chưa đạt. Không dùng model mạnh để bù cho phần kho còn thiếu.
- Chọn mức suy nghĩ thấp nhất vẫn đạt eval. Câu trả lời mặc định dài 3–5 câu.
- Prompt nằm trong `packages/ai/prompts/` và có `prompt_version`. Đổi prompt thì phải chạy lại E-01 (CI chặn, mục 19).
- **Ngân sách:**
  - trần theo ngày và theo tháng, lưu trong Redis;
  - cảnh báo khi dùng tới 50% và 80%;
  - khi chạm trần hoặc `AI_ENABLED=false`, app chỉ trả lời từ kho.
- Ước tính theo v1.0: khoảng 60–190 nghìn đồng mỗi tháng cho 1.000 người dùng hoạt động, khi 70–90% câu hỏi được trả lời không cần AI. Con số này chưa tính token suy luận.

## 11. Lưu trữ trên máy, mã hồ sơ, sao lưu và PWA

Hồ sơ nằm trong IndexedDB trên máy. Bộ tính luôn cho cùng kết quả với cùng đầu vào, nên chỉ cần giữ đầu vào là khôi phục được toàn bộ lá số.

**IndexedDB (Dexie, cơ sở dữ liệu `tinhban`, schema v1)**

| Bảng | Nội dung | Ghi chú |
|---|---|---|
| `profiles` | `LocalProfile`, có `schoolId` | Tên hiển thị chỉ lưu trên máy |
| `snapshots` | `ChartSnapshot` theo hồ sơ, phái và `engine_version` | Tính lại khi bộ tính đổi phiên bản hoặc đổi phái |
| `qa_history` | `QaHistoryItem` | Tối đa 500 câu mỗi hồ sơ |
| `settings` | Cửa vào, giao diện sáng/tối, phái mặc định, nhắc nhở, đồng ý phân tích, hồ sơ đang chọn | |
| `notes` | Ghi chú tháng | P1 |
| `meta` | `install_id`, `schema_version` | `install_id` là UUID ngẫu nhiên, không liên quan đến ngày sinh |

**Mã hồ sơ (`profile-code`, phiên bản mã 2)**

- **Nội dung:** các trường đầu vào được gói thành chuỗi bit:
  - ngày, loại lịch, cờ nhuận;
  - cách nhập giờ, kèm giờ phút hoặc giờ âm (và phần trước/sau nửa đêm của giờ Tý);
  - mã tỉnh, bờ sông Bến Hải, múi giờ nước ngoài;
  - giờ chỉnh tay;
  - giới tính, phái, phiên bản mã.
- **Định dạng:** chuỗi bit viết bằng Base32 Crockford kèm checksum, dạng `TB2-7KQ2-M9XD-4H8P-Q` (khoảng 16–20 ký tự). Mã không chứa tên.
- Mã phiên bản 1 (`TB1`) vẫn giải được: mặc định Nam phái, không có giờ chỉnh tay.
- Có mã QR và nút "Gửi cho chính mình" qua Web Share.
- Cảnh báo rõ: ai có mã cũng dựng được lá số. P1: cho đặt mã PIN để mã hóa (AES-GCM, khóa sinh bằng PBKDF2).
- Checksum sai thì báo lỗi rõ ràng, không tự đoán.

**Sao lưu bằng file**

- `exportBackup()` tạo file `tinhban-saoluu-YYYYMMDD.json`, gồm hồ sơ (có tên), cài đặt và lịch sử hỏi đáp. File không chứa snapshot, vì lá số tính lại được.
- Trước khi tải file, app cảnh báo: "File chứa ngày giờ sinh, chưa được mã hóa". P1: mã hóa bằng PIN như mã hồ sơ.
- `importBackup(file)` nằm ở màn Khôi phục: thêm các hồ sơ chưa có, bỏ qua hồ sơ trùng `profileId`.
- Mã hồ sơ khôi phục được **một** hồ sơ. File sao lưu khôi phục được **cả nhà** cùng lịch sử.

**Giữ dữ liệu không bị mất**

- Safari có thể xóa dữ liệu của trang không được mở trong 7 ngày, nếu trang chưa được cài lên màn hình chính.
- Sau khi lưu hồ sơ đầu tiên:
  - gọi `navigator.storage.persist()` nếu trình duyệt hỗ trợ;
  - mở bảng "Giữ lá số an toàn": mã hồ sơ, QR, hướng dẫn cài app.
- Khi mở app ở chế độ đã cài (standalone) mà không còn hồ sơ: màn khôi phục hiện trước, vì nhiều khả năng đây là người dùng cũ bị mất dữ liệu.

**PWA và offline**

- **Manifest:**
  - tên, icon (có bản maskable), `display: standalone`;
  - `start_url: /app`, `scope: /`;
  - `theme_color` theo chế độ sáng/tối.
- **iOS:** có `apple-touch-icon` và màn hình chờ.
- **Service worker lưu sẵn:** khung app, bundle bộ tính, kho, bảng dân gian, font. Không lưu `/admin` và `/api/*`.
- **Khi offline:** lá số, vận hạn, Hôm nay, giải thích 3 tầng và lịch sử hỏi vẫn chạy. Chỉ hỏi tự do là cần mạng.
- **Cập nhật:** service worker mới chờ sẵn, hiện toast "Có bản mới · Tải lại". Kho mới tải ngầm.

**Nhắc nhở (người dùng tự bật)**

- **Cách 1, dùng được trên mọi máy:** tải file .ics có sự kiện lặp hằng ngày (`RRULE:FREQ=DAILY`), bấm vào sẽ mở `/hom-nay`. Không cần máy chủ.
- **Cách 2, cho PWA đã cài (iOS 16.4 trở lên và Android):** Web Push với VAPID.
  - Nội dung thông báo chung chung, ví dụ "Xem ngày hôm nay", không chứa dữ liệu cá nhân.
  - Phần cá nhân hóa chỉ được tính khi người dùng mở app.

## 12. Giao diện: cấu trúc màn hình và điều hướng

**Sơ đồ đường dẫn**

| Đường dẫn | Màn hình | Cách render | Bước |
|---|---|---|---|
| `/` | Trang giới thiệu | SSG | 2 |
| `/app` | Điểm vào của PWA, tự chuyển tới tab mở đầu | Client | 2 |
| `/bat-dau` | Chọn cửa vào | Client | 2 |
| `/ho-so/moi` | Nhập hồ sơ | Client | 1 |
| `/khoi-phuc` | Khôi phục bằng mã, QR hoặc file | Client | 2 |
| `/hom-nay?ngay=` | Hôm nay | Client | 4 |
| `/la-so/[profileId]?xem=goc\|van-han` | Lá số: Gốc hoặc Vận hạn | Client | 1, 5 |
| `/hoi` | Hỏi và lịch sử | Client | 6 |
| `/ho-so` | Cả nhà và Cài đặt | Client | 2 |
| `/ho-so/[profileId]` | Sửa hồ sơ, mã hồ sơ, xóa | Client | 2 |
| `/tri-thuc`, `/tri-thuc/[slug]` | Trang tri thức | SSG | 7 |
| `/quyen-rieng-tu` | Thông báo quyền riêng tư | SSG | 8 |
| `/admin` | Dashboard vận hành | Server, cần đăng nhập | 8 |

- Đường dẫn không bao giờ chứa ngày sinh hay tên, chỉ chứa mã hồ sơ ngẫu nhiên trên máy.
- Ở Bước 1, khi chưa có IndexedDB, lá số giữ tạm trong `sessionStorage`. Các đường dẫn đặt giống bản cuối để sau này không phải đổi.

**`/app` quyết định mở màn nào**

1. Không có hồ sơ:
   - nếu đang chạy dạng app đã cài thì mở `/khoi-phuc`;
   - nếu không thì mở `/bat-dau`.
2. Có hồ sơ: mở tab mở đầu theo cửa vào. Cửa A mở Lá số, cửa B mở Hôm nay.

**Điều hướng**

| Thành phần | Điện thoại (< 768 px) | Máy tính bảng / máy tính |
|---|---|---|
| Điều hướng chính | Thanh 4 tab ở dưới: Hôm nay · Lá số · Hỏi · Hồ sơ. Icon và chữ, tab đang chọn tô màu chàm | Thanh dọc bên trái, cùng 4 mục |
| Thanh trên | Trái: chọn hồ sơ (`Minh ▾`). Phải: chip phái (ở Lá số và Hỏi) và menu `⋯` | Như điện thoại |
| Lớp chi tiết | Bảng kéo lên từ đáy: chi tiết cung, đổi hồ sơ, lịch tháng, chia sẻ, nhắc nhở, quan tâm bản trả phí | Lá số chia 2 cột (≥ 1024 px): lưới bên trái, chi tiết bên phải |
| Form | Trang toàn màn, nút chính dính ở đáy | Khung giữa, rộng tối đa 560 px |
| Quay lại | Mũi tên ← trên mọi trang con, vì PWA trên iOS không có nút Back. Vuốt xuống để đóng bảng kéo lên | Như điện thoại |

- Thứ tự 4 tab giống nhau cho mọi người. Cửa vào chỉ đổi tab mở đầu và thứ tự khối, để thói quen dùng và số liệu A/B so sánh được.
- **Thanh tab lớn dần theo lộ trình:**
  - Bước 1: trang nhập và trang lá số.
  - Bước 2: thêm khung tab với Lá số và Hồ sơ.
  - Bước 4: thêm Hôm nay.
  - Bước 6: thêm Hỏi.

**Cửa A và cửa B**

| | Cửa A: Hiểu lá số của tôi | Cửa B: Việc của cả nhà |
|---|---|---|
| Thẻ trên trang giới thiệu và màn chọn cửa | "Hiểu lá số của tôi" | "Việc của cả nhà" |
| Tab mở đầu | Lá số | Hôm nay |
| Sau khi lập lá số đầu tiên | Gợi ý chạm vào cung Mệnh và mở "Vì sao?" | Gợi ý "Thêm người thân" |
| Thứ tự khối ở Hôm nay | Dữ kiện → Dân gian → Cả nhà | Cả nhà → Dữ kiện → Dân gian |
| Vận hạn mặc định | Một người | Cả nhà |
| Câu hỏi gợi ý đầu tiên ở Hỏi | Về lá số của mình | Về năm nay của cả nhà |

Cửa vào chọn một lần và không hiện trong Cài đặt ở P0, để số liệu A/B không bị lẫn. Người dùng vẫn đi được mọi tab.

**Trang giới thiệu (`/`)**

- Sinh tĩnh, có thẻ meta, ảnh Open Graph và dữ liệu có cấu trúc.
- Gồm 5 khối:
  1. **Hero:** tên app, một câu giá trị, ảnh lá số mẫu ở chế độ tối có điểm vàng đồng.
  2. **Hai thẻ cửa A và B:** đây là nút bắt đầu.
  3. **Ba điểm khác biệt,** mỗi điểm một dòng:
     - tính trên máy, ngày sinh không rời máy;
     - mỗi nhận định có căn cứ và nguồn;
     - xem ngày cho cả nhà.
  4. **Tri thức nổi bật:** 6 bài.
  5. **Chân trang:** quyền riêng tư, "Đã có mã hồ sơ".
- Nếu máy đã có hồ sơ, khối hero thay bằng nút "Mở Tinh Bàn".
- Không hứa "chính xác 100%". Câu chữ chốt ở Bước 2, theo quy tắc gọn chữ ở mục 13.

**Luồng lần đầu**

1. Trang giới thiệu hoặc `/bat-dau` → chọn cửa.
2. Nhập hồ sơ: phái điền sẵn Nam phái.
3. Lá số.
4. Bảng "Giữ lá số an toàn": mã, QR, cài app.
5. Bước tiếp theo theo cửa: cửa A chạm vào cung Mệnh, cửa B thêm người thân.

**Danh sách màn hình**

| Nhóm | Màn hình | Thành phần chính | Bước |
|---|---|---|---|
| Bắt đầu | Trang giới thiệu | Như trên | 2 |
| | Chọn cửa | 2 thẻ lớn A/B, link "Đã có mã hồ sơ" | 2 |
| | Nhập hồ sơ | Tên (icon khóa: chỉ lưu trên máy); lịch Dương/Âm; ngày 3 ô; giờ: Giờ phút / Giờ âm / Không rõ; nơi sinh (ô tìm tỉnh); giới tính; phái; dòng thu gọn "Giờ dùng để an sao · Sửa"; cảnh báo hồ sơ dưới 16 tuổi | 1 |
| | Giữ lá số an toàn | Mã hồ sơ, QR, "Gửi cho chính mình", hướng dẫn cài app riêng cho iOS và Android | 2 |
| | Khôi phục | Ô nhập mã có định dạng sẵn, nút quét QR, nút nhập file sao lưu, lỗi checksum báo ngay dưới ô | 2 |
| Tab | Hôm nay | Thanh ngày ‹ › và chip "Về hôm nay"; 3 khối nội dung; lối tắt "Hỏi về hôm nay" | 4 |
| | Lá số · Gốc | Lưới 12 cung 4×4, ô giữa ghi tên, ngày âm, can chi, Cục, Mệnh chủ, Thân chủ. Ô Mệnh và ô Thân viền vàng đồng. Chạm vào cung → tam phương tứ chính (Nam phái) hoặc mũi tên phi hóa (Bắc phái). Nút "Toàn bộ sao" mở lá số đầy đủ khi xoay ngang | 1 |
| | Bảng chi tiết cung | Chính tinh và độ sáng, Tứ hóa, phụ tinh theo nhóm; tối đa 3 nhận định 3 tầng ("Vì sao?", "Nguồn"); câu hỏi gợi ý; "Chi tiết kỹ thuật" | 3 |
| | Lá số · Vận hạn | Dải đại vận, thẻ năm, dòng thời gian; nút chuyển Một người / Cả nhà (mục 9) | 5 |
| | Hỏi | Nút câu gợi ý; ô nhập 0/300 ký tự; "Còn n/3 câu hôm nay"; lịch sử theo ngày; thẻ trả lời 3 tầng | 6 |
| | Hồ sơ | Danh sách cả nhà (thêm, sửa, xóa, mã hồ sơ); Cài đặt | 2 |
| Cài đặt | Giao diện | Theo máy / Sáng / Tối | 1 |
| | Phái mặc định | Nam phái / Bắc phái | 1 |
| | Dữ liệu | Sao lưu ra file, nhập file, Xóa toàn bộ dữ liệu | 2 |
| | Nhắc nhở | .ics hoặc Web Push | 4, 7 |
| | Phân tích ẩn danh | Bật/tắt | 2 |
| | Bản trả phí | Mở bảng "Quan tâm bản trả phí" (mục 14) | 6 |
| | Quyền riêng tư | Link `/quyen-rieng-tu` | 8 |
| Lớp phủ | Thẻ chia sẻ | Xem trước tỷ lệ 4:5, nút Chia sẻ / Tải ảnh | 7 |
| | Xóa toàn bộ | Hộp xác nhận, liệt kê những gì bị xóa, nhắc lưu mã hoặc file sao lưu trước | 2 |
| | Hệ thống | Toast "Có bản mới · Tải lại"; hỏi đồng ý phân tích, hai nút ngang hàng | 2 |
| Công khai | Tri thức | Bài viết rộng tối đa 680 px: tầng 1 và 2, nguồn; nút "Lập lá số" dính đáy trên điện thoại | 7 |
| Nội bộ | Admin | 5 khối theo mục 17 | 8 |

**Phác thảo (khung 375 px; tên sao và ngày chỉ là ví dụ)**

```text
Trang giới thiệu                    Nhập hồ sơ
┌───────────────────────────────┐   ┌─ ← Hồ sơ mới ─────────────────┐
│ Tinh Bàn                 Mở ▸ │   │ Tên  [Minh          ] khóa    │
│                               │   │ Lịch      [ Dương | Âm ]      │
│  [ảnh lá số mẫu, nền đêm]     │   │ Ngày sinh [12] [08] [1990]    │
│  Một câu giá trị              │   │ Giờ [Giờ phút|Giờ âm|Không rõ]│
│ ┌───────────┐ ┌───────────┐   │   │           [21:30]             │
│ │ Hiểu lá số│ │ Việc của  │   │   │ Nơi sinh  [TP. Hồ Chí Minh ▾] │
│ │ của tôi  ▸│ │ cả nhà   ▸│   │   │ Giới tính [ Nam | Nữ ]        │
│ └───────────┘ └───────────┘   │   │ Phái [ Nam phái | Bắc phái ]  │
│ · Tính trên máy               │   │ Giờ dùng để an sao 21:30 ⓘ Sửa│
│ · Có căn cứ và nguồn          │   │                               │
│ · Xem ngày cho cả nhà         │   │ [        Lập lá số          ] │
└───────────────────────────────┘   └───────────────────────────────┘

Hôm nay (cửa B)                     Lá số + bảng chi tiết cung
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ ‹  Thứ Năm 29/10/2026  ›      │   │ Minh ▾            Nam phái ▾ ⋯│
│    [ngày âm] · [can chi ngày] │   │ [ Gốc ]  Vận hạn              │
│ Cả nhà hôm nay       Dân gian │   │ ┌─────┬─────┬─────┬─────┐     │
│ Minh   ● hợp · tam hợp        │   │ │ Tỵ  │ Ngọ │ Mùi │ Thân│     │
│ Lan    ● xung · lục xung      │   │ ├─────┼─────┴─────┼─────┤     │
│ Dữ kiện: tiết [..], tháng [..]│   │ │ Thìn│ Tên · Cục │ Dậu │     │
│ Xem ngày             Dân gian │   │ ╭─ Quan Lộc · Mùi ────── ✕ ─╮ │
│ Hoàng đạo · Trực .. · Sao ..  │   │ │ Thái Dương (Miếu) · Lộc   │ │
│ Giờ tốt  Tý  Sửu  Mão  Ngọ    │   │ │ Diễn giải Tử Vi           │ │
│ [ Hỏi về hôm nay ]            │   │ │ ▸ [nhận định tầng 1]      │ │
├───────────────────────────────┤   │ │   Vì sao? · Nguồn         │ │
│ Hôm nay  Lá số  Hỏi  Hồ sơ    │   │ ╰───────────────────────────╯ │
└───────────────────────────────┘   └───────────────────────────────┘

Vận hạn · Một người                 Hỏi
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ Gốc  [ Vận hạn ]  Một | Cả nhà│   │ Minh ▾            Nam phái ▾ ⋯│
│ ◂ 23–32 [33–42] 43–52 53–62 ▸ │   │ [câu gợi ý 1] [câu gợi ý 2]   │
│ ┌ Năm 2026 · Bính Ngọ · 37t ┐ │   │ Hôm nay                       │
│ │ Cung hạn: [..]            │ │   │ ┌ Diễn giải Tử Vi ──────────┐ │
│ │ Lộc → [cung]  Kỵ → [cung] │ │   │ │ 3–5 câu trả lời           │ │
│ │ Chủ đề năm · Vì sao?      │ │   │ │ Vì sao? ▾   Nguồn ▾       │ │
│ └───────────────────────────┘ │   │ └───────────────────────────┘ │
│ 2024 Giáp Thìn  ·  [cung]     │   │ Hôm qua · 2 câu            ▸  │
│ 2025 Ất Tỵ      ·  [cung]  ●  │   │ [Hỏi điều bạn muốn...   ] (↑) │
│ 2026 Bính Ngọ   ·  [cung]  ◆  │   │ Còn 2/3 câu hôm nay    0/300  │
└───────────────────────────────┘   └───────────────────────────────┘
```

## 13. Giao diện: hệ thống thiết kế

**Tinh thần:** gọn và chính xác như một cuốn lịch tốt, sang trọng mà không "huyền bí". Ban ngày dùng nền giấy ấm, ban đêm dùng nền trời đêm. Màu chàm là màu nhấn chính, vàng đồng là điểm sáng. Ít trang trí, chữ rõ, khoảng thở rộng.

**Màu**

Mọi màu chữ dưới đây đã được tính độ tương phản trên cả nền và bề mặt; tất cả đều đạt chuẩn WCAG AA (từ 4,5:1).

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `bg` | `#F7F5F0` giấy ấm | `#0E1220` đêm | Nền app |
| `surface` | `#FFFFFF` | `#171C2E` | Thẻ, bảng kéo lên |
| `text` | `#1A1C24` | `#E8E9F1` | Chữ chính (15,6:1 / 15,4:1) |
| `text-2` | `#5C606E` | `#A2A7BB` | Chữ phụ (5,8:1 / 7,1:1) |
| `primary` (chàm) | `#33449A` | `#A8B4FF` | Nút chính, tab đang chọn, nhãn Diễn giải Tử Vi (7,9:1 / 8,6:1) |
| `on-primary` | `#FFFFFF` | `#0E1220` | Chữ trên nút chính (8,6:1 / 9,5:1) |
| `accent` (vàng đồng) | `#8A6218` | `#E0B65E` | Viền ô Mệnh và Thân, năm hiện tại, điểm nhấn trên trang giới thiệu (5,0:1 / 8,9:1) |
| `folk` | Chữ `#7A4E1E` trên nền `#F5ECDF` | Chữ `#D8B062` trên nền `#211C14` | Khối Dân gian |
| `hop` / `xung` | `#2B7A4B` / `#8F5A00` | `#7ACF98` / `#E8B04A` | Chấm và chip hợp/xung. Xung dùng hổ phách, không đỏ |
| `danger` | `#B42318` | `#FF8A80` | Chỉ dùng cho nút xóa |

**Màu ngũ hành của tên sao** (có trong P0)

- Hành của từng sao lấy từ từ điển của kho.
- Màu chỉ để phụ trợ, tên sao luôn là chữ. Chú giải nằm trong ⓘ.
- Tông màu dịu, đạt chuẩn AA:

  | Hành | Sáng | Tối |
  |---|---|---|
  | Kim | `#5E6573` | `#C3C8D3` |
  | Mộc | `#2B7A4B` | `#7ACF98` |
  | Thủy | `#1E5AA0` | `#86B6F2` |
  | Hỏa | `#B3261E` | `#F28B82` |
  | Thổ | `#86601A` | `#D8B062` |

**Chế độ tối** (có trong P0)

- Cài đặt có 3 lựa chọn: Theo máy / Sáng / Tối. Mặc định là Theo máy.
- Một đoạn script nhỏ trong `<head>` gắn class trước khi trang hiện ra, để không bị lóe trắng. Script này được cho phép trong CSP bằng hash.
- Thẻ chia sẻ luôn dùng nền đêm và chữ vàng đồng, không đổi theo chế độ.

**Chữ**

- **Be Vietnam Pro** cho giao diện.
- **Noto Serif** cho chữ trang trọng: ngày lớn ở Hôm nay, tên cung trong bảng chi tiết, tiêu đề trang giới thiệu.
- Cả hai tự host qua `next/font`.
- **Cỡ chữ (px):**

  | Cấp | Cỡ |
  |---|---|
  | Hiển thị | 28 |
  | Tiêu đề trang | 22 |
  | Tiêu đề khối | 18 |
  | Chữ thường | 16 |
  | Chữ phụ | 14 |
  | Chú thích | 12 |

  Chữ trong ô cung là 11–12 px, đây là chỗ duy nhất dưới 12 px. Ô nhập luôn 16 px để iOS không tự phóng to.
- Ngày tháng, tuổi, số lượt dùng số tabular để các cột thẳng hàng.

**Bố cục và chi tiết**

- Khoảng cách theo bội số 4 px, lề trang 16 px.
- Bo góc: thẻ 12, ô nhập 10, chip bo tròn hẳn.
- Phân lớp bằng viền 1 px. Chỉ bảng kéo lên có đổ bóng.
- Icon Lucide 20 px, nét 1,75.
- Chuyển động 150–250 ms; bảng kéo lên có độ nảy nhẹ. Tắt toàn bộ khi máy bật chế độ giảm chuyển động.

**Nhãn nội dung**

Bốn nhãn bắt buộc, mỗi nhãn một hình thức riêng, không chỉ khác màu:

| Nhãn | Hình thức |
|---|---|
| Dữ kiện | Chip xám |
| Diễn giải Tử Vi | Viền trái màu chàm |
| Dân gian | Khối nền màu đất |
| Gợi ý tham khảo | Viền đứt |

Nhãn phụ:

- "Chưa qua chuyên gia": cho đơn vị L1.
- "Nam phái" / "Bắc phái": chỉ cho đơn vị thuộc một phái.

**Linh kiện shadcn/ui**

| Linh kiện | Dùng cho |
|---|---|
| `Tabs`, `ToggleGroup` | Gốc/Vận hạn, lịch Dương/Âm, giới tính, phái, Một người/Cả nhà |
| `Drawer` | Bảng kéo lên |
| `AlertDialog` | Hộp xác nhận xóa |
| `Accordion` | "Vì sao?", "Nguồn", "Chi tiết kỹ thuật" |
| `Badge` | Các nhãn nội dung |
| `Sonner` | Toast |
| `Command` | Tìm tỉnh, chọn múi giờ |
| `InputOTP` | Nhập mã hồ sơ |
| `Calendar` | Lịch tháng ở Hôm nay, có thêm dòng ngày âm |

Lưới lá số và thẻ chia sẻ là linh kiện tự viết, đặt trong `packages/ui`.

**Gọn chữ**

- Không đặt câu mô tả dưới tiêu đề, không banner thường trực.
- Giải thích để trong ⓘ hoặc "Chi tiết".
- Thông báo chỉ hiện khi người dùng cần bấm gì đó, gói trong một dòng kèm nút.
- Toast ngắn, gộp kết quả.

**Trạng thái phải thiết kế sẵn**

| Trạng thái | Cách hiện |
|---|---|
| Thiếu giờ sinh | Chỉ hiện sao theo năm, nhãn "Thiếu giờ sinh"; các ô cần giờ ghi "Cần giờ sinh" |
| Ngày 30 chưa hỗ trợ | "Chưa hỗ trợ ngày này", không đoán |
| Mã hồ sơ sai | Báo lỗi ngay dưới ô, không tự sửa |
| Hết lượt hỏi | "Đã hết 3 câu hôm nay · Xem các gói", khóa ô nhập |
| Câu ngoài phạm vi | Câu từ chối soạn sẵn |
| AI tắt hoặc hết ngân sách | Vẫn trả lời bằng kho, không báo lỗi |
| Hồ sơ dưới 16 tuổi | Ô hỏi tự do ghi rõ lý do không gửi |
| Offline | Chỉ khóa ô hỏi tự do |
| Lịch sử trống | Thay bằng các câu hỏi gợi ý |

Lá số tính trên máy mất 35–70 ms, nên không cần vòng xoay chờ hay khung chờ.

**Tiếp cận**

- Nút cao từ 44 px. Viền focus nhìn rõ. Không truyền thông tin chỉ bằng màu.
- Lưới 12 cung có chế độ xem dạng danh sách cho trình đọc màn hình.
- Playwright chạy axe-core trên mọi màn, ở cả chế độ sáng và tối.

**Chi tiết riêng cho PWA**

- Chừa vùng an toàn của iPhone (`env(safe-area-inset-*)`).
- Màu thanh trạng thái đổi theo sáng/tối.
- Tắt kéo-để-tải-lại (`overscroll-behavior`) để tránh kéo nhầm.

## 14. Tăng trưởng: thẻ chia sẻ, trang tri thức, điểm hiếm, bản trả phí

Mọi kênh thu hút người dùng đều chạy bằng dữ liệu có sẵn, không tốn tiền AI và không lộ ngày giờ sinh. Trang giới thiệu đã mô tả ở mục 12.

**Thẻ chia sẻ (P0)**

- Hai loại thẻ:
  - "Năm nay của tôi": chủ đề năm lấy từ kho.
  - "Điểm hiếm": có từ Bước 7.
- Thẻ được vẽ ngay trên máy: SVG → canvas → ảnh PNG 1080×1350, phong cách cố định nền đêm và vàng đồng.
- Chia sẻ qua `navigator.share({ files })`. Trình duyệt không hỗ trợ thì cho tải ảnh về.
- Thẻ không chứa ngày giờ sinh, tên hay mã hồ sơ.
- Link trên thẻ kèm `?ref=card&door=A` hoặc `door=B`. Link mở trang giới thiệu với cửa tương ứng chọn sẵn, không chứa ID người dùng.

**Trang tri thức công khai (P0, cho SEO)**

- Route `/tri-thuc/[slug]`, sinh tĩnh từ các đơn vị từ L1 trở lên có `public: true`.
- Mỗi trang gồm:
  - tiêu đề kiểu "Thái Âm tại cung Mệnh";
  - nội dung tầng 1 và 2, nguồn;
  - nhãn phái nếu đơn vị chỉ thuộc một phái;
  - nút "Lập lá số của bạn".
- Có `sitemap.xml`, thẻ meta và dữ liệu có cấu trúc kiểu Article.
- Nội dung viết bằng lời của bạn. Chỉ trích ngắn từ sách, có ghi nguồn.
- Mục tiêu ban đầu: 30–50 trang cho các tổ hợp được tìm kiếm nhiều.

**Điểm hiếm (Bước 7)**

- `tools/rarity` cho bộ tính chạy qua mọi ngày × 12 giờ trong 1930–2030, khoảng 440.000 lá số. Giới tính không làm đổi vị trí sao nên không cần nhân đôi.
- Bộ tính qua iztro mất 35–70 ms mỗi lá số, quá chậm cho việc này (ADR 0001). Phần an sao lá số gốc cho công cụ này cần tự viết, dùng iztro và lasotuvi để đối chiếu.
- Đếm tần suất của từng cách cục (các đơn vị `kind: pattern` trong kho), xuất `rarity-<kb_version>.json` đi kèm bundle. Nếu một cách cục khác nhau giữa hai phái thì tính riêng cho từng phái.
- Hiển thị kiểu: "Cách cục X có ở khoảng 2,1% lá số (tính trên mọi ngày giờ sinh 1930–2030)". Đây là số liệu thống kê, không phải lời đoán.

**Quan tâm bản trả phí (P0 chưa thu tiền)**

- Bảng kéo lên có 3 thẻ:

  | Thẻ | Mã sản phẩm |
  |---|---|
  | Gói tháng | `sub_month` |
  | Gói năm | `sub_year` |
  | Gói lượt hỏi (theo câu hoặc theo ngày) | `qa_pack` |

  Người dùng chọn một hoặc nhiều thẻ, bấm "Báo tôi khi có". Email không bắt buộc, phải đánh dấu đồng ý và qua Turnstile.
- P0 không hiện giá. Quyền lợi của từng gói lấy theo đặc tả v1.0 (mục 22).
- Mở bảng này từ hai chỗ:
  - dòng báo hết lượt hỏi;
  - Hồ sơ → Cài đặt → Bản trả phí.
- Mỗi lần bấm ghi sự kiện `interest_clicked` kèm `product`.

## 15. Máy chủ, API và dữ liệu phía server

Máy chủ chỉ làm bảy việc:

1. hỏi đáp AI;
2. nhận sự kiện ẩn danh;
3. ghi và hủy đăng ký quan tâm;
4. quản lý đăng ký nhắc nhở;
5. phục vụ cấu hình;
6. xóa dữ liệu;
7. phục vụ trang admin.

Máy chủ không bao giờ nhận ngày giờ sinh.

**Endpoints**

| Method | Path | Việc | Bảo vệ |
|---|---|---|---|
| POST | `/api/ask` | Hỏi đáp tự do (mục 10) | Turnstile theo tiêu chí, giới hạn lượt, ngân sách |
| POST | `/api/events` | Nhận từng lô sự kiện ẩn danh | Giới hạn lượt, giới hạn kích thước |
| POST, DELETE | `/api/interest` | Đăng ký hoặc hủy quan tâm bản trả phí (theo `install_id`) | Turnstile (khi đăng ký), đồng ý rõ ràng |
| POST, DELETE | `/api/push/subscription` | Lưu hoặc xóa đăng ký Web Push | Giới hạn lượt |
| DELETE | `/api/install/{install_id}` | Xóa mọi dữ liệu server gắn với `install_id` khi người dùng bấm "Xóa toàn bộ" | Giới hạn lượt |
| GET | `/api/config` | Cờ tính năng, `kb_version` tối thiểu, `AI_ENABLED`, ngưỡng Turnstile | Cache CDN 5 phút |
| GET | `/api/cron/*` | Gửi push hằng ngày, gộp số liệu, dọn dữ liệu | Chỉ Vercel Cron gọi được (có secret) |
| GET | `/admin` | Dashboard: server component đọc thẳng Postgres, không có API công khai | Auth.js + GitHub, danh sách cho phép (ADR-13) |

**Dữ liệu trong Postgres**

| Bảng | Trường chính | Giữ bao lâu |
|---|---|---|
| `answer_cache` | `cache_key`, `answer_json`, `rule_ids`, `school_id`, `kb_version`, `created_at` | Đến khi `kb_version` đổi |
| `answer_trace` | `question_type`, `rule_ids`, `school_id`, `model_id`, `tokens_in`, `tokens_out`, `cost_usd`, `validator_result`, `source`, `latency_ms`, `day` | 13 tháng |
| `events` | `install_id`, `event`, props đã lọc, `day` | 13 tháng, sau đó chỉ giữ bản gộp |
| `daily_rollup` | `day`, `metric`, `door`, `school_id`, `value` | Lâu dài |
| `interest` | `install_id`, `email` (nếu có), `products[]`, `door`, `consent_at` | Đến khi người dùng hủy hoặc xóa toàn bộ |
| `push_subscription` | `install_id`, `endpoint`, `keys`, `created_at` | Đến khi hủy hoặc endpoint hết hạn |

**Redis (Upstash)**

- `rl:{install_id}` và `rl:ip:{ip}`: giới hạn lượt theo cửa sổ trượt, tự hết hạn sau 24 giờ.
- `quota:{install_id}:{yyyymmdd}`: số câu tự do đã dùng trong ngày.
- `budget:day:{date}` và `budget:month:{yyyymm}`: số USD đã dùng.
- `ai:enabled`: công tắc tắt AI khẩn cấp.

Server không lưu nguyên văn câu hỏi. P1: thêm tùy chọn "Gửi câu hỏi để cải thiện app", có đồng ý riêng.

**Trang admin (ADR-13)**

- **Đăng nhập:** Auth.js v5 với GitHub OAuth. Chỉ GitHub ID có trong biến môi trường `ADMIN_GITHUB_IDS` mới vào được.
- **Chặn truy cập:** `proxy.ts` chặn `/admin/:path*`.
- **Phiên đăng nhập:** JWT 8 giờ, cookie `Secure`, `HttpOnly`, `SameSite=Lax`.
- **Phạm vi:**
  - Chỉ bật ở production và máy local. Bản xem trước không bật, vì URL đổi theo từng PR.
  - Chỉ đọc. Công tắc AI vẫn bật/tắt qua Redis như v1.1.
  - Gắn `noindex`, không nằm trong service worker.
  - Dữ liệu hiển thị đều đã gộp, không có dữ liệu cá nhân.

## 16. Quyền riêng tư, bảo mật và tuân thủ

Ngày giờ sinh luôn nằm trên máy; ra ngoài chỉ có các fact tối thiểu của lá số. Dù vậy, trước khi mở công khai vẫn cần rà soát Luật 91/2025/QH15 (hiệu lực từ 01/01/2026) với người hiểu luật.

**Dữ liệu cá nhân đi đâu**

| Dữ liệu | Lưu ở đâu | Có đi ra ngoài không |
|---|---|---|
| Tên, ngày giờ sinh, nơi sinh, giới tính, phái | IndexedDB trên máy | Không |
| Lịch sử hỏi đáp | IndexedDB trên máy | Không |
| File sao lưu | Máy của người dùng, nơi họ lưu file | Không, trừ khi người dùng tự gửi |
| Fact lá số của các cung liên quan | Gửi lên `/api/ask` khi hỏi tự do | Có: tới nhà cung cấp AI, có thể ở nước ngoài |
| Câu hỏi tự do (đã lọc thông tin cá nhân) | `/api/ask` | Có: tới nhà cung cấp AI. Server không lưu nguyên văn |
| Địa chỉ IP | Redis (giới hạn lượt, 24 giờ), log của Vercel, Cloudflare Turnstile | Tới hosting và Cloudflare |
| `install_id` và sự kiện | `/api/events` | Chỉ tới server của app |
| Email đăng ký quan tâm | `/api/interest` | Chỉ tới server của app |
| Đăng ký Web Push | `push_subscription` | Tới dịch vụ push của trình duyệt (Apple, Google, Mozilla) |
| Báo lỗi | Sentry, đã xóa ngày, giờ, nơi sinh, câu hỏi | Tới Sentry |

**Việc bắt buộc trước khi mở công khai (Bước 8)**

- Thông báo quyền riêng tư bằng tiếng Việt tại `/quyen-rieng-tu`: thu dữ liệu gì, để làm gì, gửi cho ai (nhà cung cấp AI, hosting, Cloudflare, Sentry), giữ bao lâu, xóa bằng cách nào. Dùng đúng bảng trên.
- Đồng ý phân tích tách thành lựa chọn riêng. Người dùng từ chối thì không gửi sự kiện.
- Cấu hình nhà cung cấp AI: không dùng dữ liệu để huấn luyện, thời gian lưu ngắn nhất có thể. Ghi lại cấu hình trong hồ sơ.
- Đánh giá việc chuyển dữ liệu ra nước ngoài theo Luật 91. Fact lá số là dữ liệu suy ra nhưng vẫn có thể được coi là dữ liệu cá nhân.
- **Hồ sơ của trẻ em:**
  - cảnh báo khi phụ huynh nhập hồ sơ cho con;
  - không gửi fact của hồ sơ dưới 16 tuổi lên AI cho đến khi rõ cơ sở pháp lý.

**Bảo mật**

- Khóa API chỉ nằm trong biến môi trường của server. CI quét bundle client để tìm khóa và `packages/ai`.
- Content-Security-Policy chặt: chỉ cho phép script của app, Turnstile, Sentry và hash của script chọn chế độ sáng/tối.
- `beforeSend` của Sentry xóa mọi trường ngày, giờ, nơi sinh và nội dung câu hỏi.
- Mọi endpoint kiểm tra đầu vào bằng zod và giới hạn kích thước body.
- Dependabot và `pnpm audit` chạy trong CI.
- **Nút "Xóa toàn bộ dữ liệu":**
  - xóa IndexedDB, gồm cả lịch sử hỏi;
  - hủy push;
  - xóa dữ liệu server gắn với `install_id`, gồm cả đăng ký quan tâm.

**Giọng văn và an toàn nội dung**

Các quy tắc này được cài vào validator (mục 10) và vào bước kiểm tra nội dung của `kb build`:

- cụm từ bị cấm và nhãn bắt buộc;
- từ chối tư vấn y tế, pháp luật, đầu tư;
- không đánh giá người khác dựa trên ngày sinh.

## 17. Đo lường và giám sát

Mọi chỉ số được đọc riêng theo cửa vào A/B và theo phái, tính từ `install_id` ẩn danh. Không sự kiện nào chứa ngày giờ sinh hay nội dung câu hỏi.

**Các sự kiện ghi nhận**

| Sự kiện | Thuộc tính |
|---|---|
| `landing_viewed` | `ref` (`card`, `kb`, không có) |
| `app_open` | `door`, `is_pwa` |
| `door_selected` | `door` |
| `chart_created` | `time_certainty` (`exact`, `canh`, `unknown`), `profile_index`, `school` |
| `school_switched` | `from`, `to`, `where` (`settings`, `form`, `chart`) |
| `insight_opened` | `level` (1, 2, 3), `palace`, `school` |
| `fortune_opened` | `mode` (`single`, `family`) |
| `suggested_q_tapped` | `question_type` |
| `free_q_asked` | `answered_by` (`kb`, `cache`, `llm`, `fallback`), `counted` (có trừ lượt hay không) |
| `qa_history_opened` | — |
| `today_opened` | — |
| `today_date_changed` | `offset_bucket` (±1, ±7, xa hơn) |
| `profile_added` | `profile_count_bucket` |
| `share_card_created`, `share_card_shared` | `card_type` |
| `kb_page_cta_clicked` | `slug` |
| `interest_clicked` | `product` (`sub_month`, `sub_year`, `qa_pack`) |
| `reminder_enabled` | `type` (`ics`, `push`) |
| `profile_restored` | `via` (`code`, `qr`, `file`) |
| `backup_exported` | — |
| `theme_set` | `value` (`system`, `light`, `dark`) |

**Chỉ số dùng để ra quyết định** (theo v1.0, có định nghĩa lại)

- **Tỷ lệ đăng ký theo từng cửa vào:** tỷ lệ chuyển từ `door_selected` sang `chart_created` với `profile_index = 0`. P0 không có tài khoản, nên "đăng ký" được hiểu là lập xong hồ sơ đầu tiên.
- Tỷ lệ lập xong lá số, tỷ lệ hỏi câu đầu tiên, tỷ lệ thêm hồ sơ thứ hai.
- Tỷ lệ quay lại D1, D7, D30.
- Tỷ lệ mở Hôm nay từ 3 ngày/tuần trở lên, tính trong nhóm đã bật nhắc nhở.
- Tỷ lệ bấm "quan tâm bản trả phí", tách theo gói.
- Tỷ lệ dùng Bắc phái và số lần đổi phái.
- Chi phí API trên mỗi câu trả lời đạt chuẩn.

**Dashboard vận hành** (`/admin`, đọc từ `daily_rollup` và `answer_trace`)

- Chi phí AI theo ngày và phần trăm ngân sách tháng đã dùng.
- Câu trả lời đến từ đâu: kho, cache, model nhỏ, model mạnh hay lùi về kho.
- Tỷ lệ qua validator và các lỗi validator hay gặp.
- Các câu hỏi tự do không tìm được đơn vị khớp, nhóm theo `question_type` và phái. Đây là hàng chờ để bổ sung kho.
- Lỗi từ Sentry, thời gian trả lời p95 của `/api/ask`, số lần chạm giới hạn lượt.

**Cảnh báo qua email**

- Ngân sách dùng tới 50%, 80% và 100%.
- Tỷ lệ qua validator trong ngày dưới 90%.
- Lỗi 5xx vượt 2%.
- Số lần chạm giới hạn lượt tăng đột biến, dấu hiệu có bot.

## 18. Kiểm thử và đánh giá chất lượng

Có sáu lớp kiểm thử, mỗi lớp chặn một loại lỗi. Không lớp nào dùng AI để tự chấm xem nội dung Tử Vi đúng hay sai.

| Lớp | Công cụ | Chặn lỗi gì | Khi nào chạy |
|---|---|---|---|
| Golden lá số | Vitest + `tools/golden` | Sai lịch, sai giờ, sai vị trí sao, sai vận hạn; chạy cho cả hai phái | Mỗi commit |
| Bất biến | fast-check | Lỗi ở các ca biên: tháng nhuận, Tết, giờ Tý; mã hồ sơ mã hóa rồi giải mã | Mỗi commit |
| Test từng đơn vị kho | `kb build` | Điều kiện sai, hai đơn vị mâu thuẫn nhau, sai phái | Mỗi lần sửa kho |
| Eval AI (E-01) | `tools/eval` | Bịa nội dung, sai nhãn, sai phái, khẳng định quá mạnh, chi phí | Khi đổi model, prompt hoặc kho (CI chặn, mục 19) |
| E2E | Playwright (khung 375×812, Android và WebKit) | Luồng chính bị hỏng | Mỗi PR, chạy trên bản xem trước |
| Tiếp cận | axe-core trong Playwright | Tương phản, nhãn, focus, ở cả chế độ sáng và tối | Mỗi PR |

**Eval E-01**

- Bộ thử gồm 120 câu hỏi tự do trên 20 lá số mẫu (10 Nam phái, 10 Bắc phái):
  - 80 câu trong phạm vi;
  - 20 câu thiếu nguồn, phải từ chối hoặc chỉ trả lời giới hạn;
  - 20 câu ngoài phạm vi.
- Chấm bằng code:
  - tỷ lệ qua validator;
  - số lần bịa sao/cung (phải bằng 0);
  - tỷ lệ từ chối đúng;
  - độ dài câu trả lời;
  - chi phí trung bình trên mỗi câu trả lời đạt chuẩn.
- Độ trôi chảy của tiếng Việt:
  - mỗi lần chạy, bạn đọc mẫu 20 câu;
  - có thể nhờ model mạnh chấm văn phong, nhưng không chấm nội dung Tử Vi.
- Ngưỡng để một model được chọn:
  - qua validator từ 95% trở lên;
  - không bịa lần nào;
  - từ chối đúng từ 90% trở lên.

  Trong các model đạt ngưỡng, chọn model có chi phí thấp nhất.

**Các luồng E2E bắt buộc**

1. Trang giới thiệu → chọn cửa A → nhập ngày giờ sinh → xem lá số → bấm "Vì sao?" xuống đến tầng 3.
2. Nhập giờ theo giờ âm (giờ Tý, sau nửa đêm) → lá số đúng với ca golden tương ứng.
3. Thiếu giờ sinh → chỉ hiện phần không phụ thuộc giờ, có nhãn.
4. Đổi phái bằng công tắc trên lá số → lá số tính lại, phái được lưu; mã hồ sơ tạo sau đó mang phái mới.
5. Thêm hồ sơ thứ hai → Hôm nay hiện hợp/xung cho cả hai người → Vận hạn chế độ Cả nhà có hai thẻ.
6. Hôm nay: chọn ngày khác bằng lịch tháng → nội dung đổi theo → bấm "Về hôm nay".
7. Hỏi một câu gợi ý (không gọi mạng) và một câu tự do (AI được giả lập) → tải lại trang → cả hai còn trong lịch sử.
8. Tắt mạng → lá số, Vận hạn, Hôm nay và lịch sử vẫn chạy.
9. Xóa dữ liệu → khôi phục bằng mã hồ sơ → lá số giống hệt ban đầu, kể cả giờ chỉnh tay và phái.
10. Sao lưu ra file → xóa dữ liệu → nhập file → đủ hồ sơ và lịch sử.
11. Đặt `AI_ENABLED=false` → câu tự do được trả lời từ kho, không báo lỗi.
12. Tạo thẻ chia sẻ → SVG của thẻ không chứa ngày giờ sinh hay tên.
13. Chế độ tối: tải trang không bị lóe trắng; axe không có lỗi tương phản.

## 19. Môi trường, CI/CD và chi phí hạ tầng

Repo dùng một nhánh `main`, mỗi PR có một bản xem trước. Production chỉ được cập nhật khi CI xanh và kết quả golden test, eval không giảm.

**Môi trường**

| Môi trường | Hosting | Cơ sở dữ liệu | AI | Admin |
|---|---|---|---|---|
| local | `pnpm dev` | Postgres chạy Docker hoặc một nhánh Neon | Mặc định dùng AI giả lập; dùng khóa thật khi chạy eval | Bật, dùng GitHub OAuth app riêng cho local |
| preview | Bản xem trước của Vercel | Một nhánh Neon cho mỗi PR | Khóa riêng, trần ngân sách thấp | Tắt |
| production | Vercel | Neon main | Khóa production, trần theo tháng | Bật |

**Các bước CI (GitHub Actions)**

1. Cài đặt, typecheck, lint, kiểm quy tắc phụ thuộc.
2. Unit test, golden test cho cả hai phái, kiểm bất biến.
3. `kb build`: schema, test từng đơn vị, độ phủ theo phái, kiểm tra nội dung.
4. Build app.
5. Quét bundle client tìm khóa API và `packages/ai`.
6. **Chặn eval:** nếu PR sửa `packages/ai/prompts/**`, cấu hình model hoặc `packages/kb/content/**` thì phải gắn nhãn `eval` và có báo cáo E-01 mới trong `tools/eval/reports/`. Báo cáo phải đạt ngưỡng, nếu không CI báo đỏ.
7. Chạy E2E và axe trên bản xem trước.

E-01 tốn tiền nên không chạy tự động trên mọi PR. Bạn chạy tay, hoặc nó chạy khi PR được gắn nhãn `eval`.

**Phát hành, thu hồi và quay lui**

- Bundle kho và bundle bộ tính đều có phiên bản. `/api/config` báo `kb_version` tối thiểu để client biết cần tải lại.
- Thu hồi nội dung sai:
  - sửa đơn vị và tăng `kb_version`;
  - cache câu trả lời cũ tự hết hiệu lực;
  - client nhận bản mới khi người dùng mở app.
- Quay lui: dùng instant rollback của Vercel. Các bundle kho cũ vẫn được giữ trên CDN.

**Chi phí hạ tầng ước tính cho giai đoạn beta** (cần kiểm lại bảng giá khi chốt)

| Hạng mục | Gói | Ước tính |
|---|---|---|
| Tên miền | .vn hoặc .app | Vài trăm nghìn đồng mỗi năm |
| Vercel | Hobby khi thử nghiệm; Pro khi có yếu tố thương mại | 0, sau đó khoảng 20 USD mỗi tháng |
| Neon Postgres | Free | 0 |
| Upstash Redis | Free | 0 |
| Cloudflare Turnstile | Free | 0 |
| Sentry | Developer (free) | 0 |
| GitHub OAuth (admin) | Miễn phí | 0 |
| API AI | Trả theo mức dùng, có trần | Khoảng 60–190 nghìn đồng mỗi tháng với 1.000 người dùng hoạt động |
| Soạn kho qua Batch API | Một lần | Khoảng 1–3 triệu đồng |

## 20. Lộ trình làm dần

Không có mốc ngày. Mỗi bước kết thúc bằng một bản chạy được trên điện thoại, deploy ngay lên Vercel. Thứ tự dưới đây là thứ tự nên làm. Điều kiện cứng duy nhất: Bước 1 phải xong trước khi đưa lá số cho người khác dùng. Kho tri thức được viết dần, song song suốt các bước.

| Bước | Làm gì | Dùng được gì | Xong khi |
|---|---|---|---|
| 1. Bộ tính | Lịch âm Việt Nam, `tz_policy`, lớp bọc iztro, `SchoolPolicy` cho Nam phái và Bắc phái, thiên can cung và phi hóa, nhập giờ âm, 63 tỉnh, bộ ca chuẩn. Giao diện: token màu sáng/tối, trang nhập, lưới lá số, công tắc phái | Trang nhập ngày giờ sinh và xem lá số 12 cung theo hai phái | Qua 100% bộ ca chuẩn cho cả hai phái; chỗ lệch nào cũng có biên bản |
| 2. Khung app | PWA, IndexedDB, mã hồ sơ phiên bản 2, sao lưu bằng file, trang giới thiệu, chọn cửa, khung tab (Lá số, Hồ sơ), Cài đặt | App trên điện thoại, lưu hồ sơ cả nhà | Cài được trên iPhone và Android; khôi phục bằng mã và bằng file ra đúng lá số |
| 3. Giải thích | Kho đợt đầu cho cung Mệnh và 5 cung hay hỏi, `kb build`, `tools/sample-charts`, bảng chi tiết cung, câu hỏi gợi ý | Chạm vào cung để đọc giải thích có căn cứ | Không còn lỗi kiểm tra nội dung; độ phủ phạm vi gốc của Nam phái có trung vị từ 90% |
| 4. Hôm nay | Âm lịch, hợp/xung tuổi, xem ngày dân gian, chọn ngày và lịch tháng, nhắc nhở bằng .ics | Lý do để mở app mỗi ngày | Khớp lịch in của nguồn đã chọn trong cả 3 năm chọn được |
| 5. Vận hạn | Dải đại vận, thẻ năm, dòng thời gian, bảng năm của cả nhà | Xem năm nay của mình và cả nhà | Fact năm và đại vận qua bộ ca chuẩn; kho từ 400 đơn vị L1; độ phủ phạm vi năm có trung vị từ 90% |
| 6. Hỏi đáp AI | ai-gateway, validator, cache, trần ngân sách, Turnstile, chạy E-01 để chọn model, lịch sử hỏi, hạn mức, bảng quan tâm bản trả phí | Hỏi tự do, câu trả lời có căn cứ | E-01 đạt ngưỡng; trần ngân sách và đường lùi về kho chạy thật |
| 7. Lan tỏa | Thẻ chia sẻ, trang tri thức công khai, điểm hiếm, Web Push | Chia sẻ được, tìm thấy qua Google | Thẻ không lộ ngày giờ sinh; trang công khai chỉ dùng đơn vị từ L1 |
| 8. Mở công khai | Thông báo quyền riêng tư, ý kiến pháp lý, `/admin` có đăng nhập, dashboard, cảnh báo, beta 20–30 người | Ai cũng dùng được | Qua 13 luồng E2E và axe; độ phủ Bắc phái đạt mức như Nam phái; không còn lỗi nghiêm trọng; dashboard và cảnh báo đang chạy |

Sau Bước 8 mới quyết định đào sâu cửa A hay cửa B và có thu phí hay không, dựa trên dữ liệu dùng thật theo quy tắc trong đặc tả v1.0.

**Cách làm mỗi bước**

- Chia thành việc nhỏ, mỗi việc một nhánh ngắn, merge vào `main` khi test xanh.
- Tính năng chưa xong để sau cờ tính năng, nên `main` lúc nào cũng deploy được.
- Cuối mỗi bước, tự dùng trên điện thoại vài ngày rồi mới sang bước sau.
- Từ Bước 2, mời vài người quen dùng thử và ghi lại họ quan tâm hiểu lá số (cửa A) hay việc của cả nhà (cửa B).

**Việc không phải code, chạy song song**

- [ ] Phỏng vấn 10 người dùng tiềm năng
- [ ] Tìm người cộng tác đối chiếu Tử Vi
- [ ] Chọn sách tham chiếu cho Nam phái, Bắc phái và xem ngày dân gian; kiểm quyền sử dụng
- [ ] Chọn công cụ đối chiếu cho Bắc phái
- [ ] Chốt quyền lợi từng gói trả phí
- [ ] Soạn thông báo quyền riêng tư
- [ ] Hỏi người hiểu luật về việc chuyển dữ liệu ra nước ngoài
- [ ] Trước mỗi Tết: bổ sung đơn vị Tứ hóa cho can của năm tới

## 21. Rủi ro kỹ thuật

Hai rủi ro lớn nhất là lá số tính sai và kho tri thức phủ không đủ. Có hai phái nên khối lượng việc của cả hai rủi ro này tăng lên. Mỗi rủi ro đều có điều kiện xong bước chặn lại trước khi đưa cho người khác dùng.

| Rủi ro | Mức | Dấu hiệu sớm | Cách ứng phó |
|---|---|---|---|
| iztro không khớp cách an sao của Việt Nam | Cao | Golden test lệch ở một nhóm sao cụ thể | Ghi đè quy tắc trong `SchoolPolicy`. Nếu lệch nhiều, tự viết phần an sao, dùng lasotuvi để đối chiếu |
| Sai lịch hoặc múi giờ ở các ca lịch sử | Cao | Lệch ở các ca 1960–1975, 1968, 1985 | `tz_policy` có phiên bản; cho người dùng xem và chỉnh giờ đã quy đổi |
| Hai phái làm tăng gấp đôi việc kiểm thử và soạn kho | Cao | Độ phủ Bắc phái tụt xa Nam phái | An sao chung, kho chung có nhãn; làm Nam phái trước, Bắc phái đạt chuẩn trước Bước 8 |
| Kho phủ thấp nên phải gọi AI nhiều | Cao | Độ phủ dưới 80%, tỷ lệ lùi về kho cao | Ưu tiên thêm đơn vị theo câu hỏi thật; thu hẹp các màn hình P0 |
| Không có người đối chiếu Tử Vi | Cao | Đến Bước 3 vẫn chưa tìm được ai | Giữ mức L1 có nhãn; chưa bán; tìm người cộng tác theo từng đầu việc |
| Làm một mình nên chậm hoặc bỏ dở | Cao | Một bước kéo dài gấp đôi dự kiến | Chia bước nhỏ hơn; `main` luôn chạy được nên dừng giữa chừng không hỏng gì |
| Hiểu sai nội dung hai phái | Trung bình | Người dùng thử hoặc chuyên gia phản hồi sai thuật ngữ | Chốt bằng sách tham chiếu; mọi khác biệt nằm trong `SchoolPolicy` nên sửa nhanh |
| Safari xóa dữ liệu | Trung bình | Nhiều lượt khôi phục hoặc tạo lại hồ sơ | Mã hồ sơ, file sao lưu, nhắc cài PWA, `storage.persist` |
| Bot làm cạn ngân sách AI | Trung bình | Số lần chạm giới hạn lượt tăng vọt | Turnstile theo tiêu chí, trần theo ngày, công tắc tắt AI |
| Nhà cung cấp AI đổi giá hoặc đổi model | Trung bình | Hóa đơn lệch so với dự báo | Gateway không gắn với hãng nào; chạy lại E-01 và đổi adapter |
| Vướng pháp lý về dữ liệu | Trung bình | Đến Bước 6 vẫn chưa có ý kiến của người hiểu luật | Tắt hỏi tự do (không gửi dữ liệu ra ngoài) cho đến khi rõ |
| Lịch sử hỏi lộ trên máy dùng chung | Thấp | Phản hồi của người dùng | Xóa được từng câu, xóa toàn bộ; P1: khóa bằng PIN |

## 22. Việc còn mở

Bạn đã giao Claude chọn một số điểm. Những điểm dưới đây vẫn cần bạn hoặc người khác quyết định:

| # | Việc | Đề xuất hiện tại | Chặn bước |
|---|---|---|---|
| 1 | Quy ước an sao (Tứ hóa năm Canh và Nhâm, độ sáng 5 hay 7 mức, Hỏa Linh, Khôi Việt, ranh giới giờ Tý, tháng nhuận) cho từng phái, và sách tham chiếu của mỗi phái | Cả hai phái theo quy ước Việt Nam như lasotuvi; bảng Tứ hóa riêng cho Bắc phái nếu sách khác | 1 |
| 2 | Công cụ đối chiếu cho Bắc phái | Chọn khi có sách tham chiếu | 1 |
| 3 | Có quy đổi múi giờ cho giờ nhập theo canh/giờ âm không | Không quy đổi, có cảnh báo (mục 5) | 1 |
| 4 | Người sinh ở nước ngoài | Giờ chuẩn địa phương nơi sinh, ngày âm theo lịch Việt Nam (mục 5) | 1 |
| 5 | 19 ngày 30 âm lịch chưa an sao được | Tạm báo "chưa hỗ trợ"; hết hẳn khi tự viết phần an sao ở Bước 7 | 1 (tạm), 7 |
| 6 | Dùng Serwist hay tự viết service worker | Serwist, trừ khi xung đột với Next.js 16 | 2 |
| 7 | 5 cung hay hỏi | Danh sách dự kiến ở mục 7, chốt theo người dùng thử | 3 |
| 8 | Sách tham chiếu xem ngày dân gian và quyền sử dụng | — | 4 |
| 9 | Quyền lợi từng gói trả phí; có hiện giá dự kiến để đo mức sẵn lòng trả không | Lấy theo đặc tả v1.0; P0 chưa hiện giá | 6 |
| 10 | Tên và giá model | Chọn bằng E-01 | 6 |
| 11 | Ý kiến pháp lý về Luật 91, chuyển dữ liệu ra nước ngoài, hồ sơ dưới 16 tuổi | — | 6, 8 |
| 12 | Chuyên gia duyệt mức L2 | — | Trước khi bán |
| 13 | Tên miền .vn hay .app | — | 8 |

## 23. Phụ lục: kiểu dữ liệu và giao diện hàm

Phần này là hợp đồng giữa các package. Công cụ lập trình phải giữ đúng các chữ ký này và viết test cho từng hàm. So với code hiện có trong `packages/shared`, cần đổi `SchoolId` từ `'vn-01'` thành `'nam' | 'bac'`, đổi `Region 'other'` thành `'abroad'`, và thêm các trường mới của `BirthInput`.

```ts
// packages/shared
type SchoolId = 'nam' | 'bac';          // Nam phái (Tam Hợp), Bắc phái (Phi Tinh / Tứ Hóa)
type TimeCertainty = 'exact' | 'canh' | 'unknown';
type Region = 'north' | 'south' | 'abroad';
type Door = 'A' | 'B';
type FactId = string;                   // 'palace:quan_loc|star:thai_duong|state:mieu'

interface BirthInput {
  calendar: 'solar' | 'lunar';
  date: string;                // YYYY-MM-DD theo lịch đã chọn
  isLeapMonth?: boolean;       // chỉ khi calendar = 'lunar'
  timeCertainty: TimeCertainty;
  time?: string;               // exact: HH:mm theo giờ ghi trên giấy tờ
  timeBranch?: number;         // canh: 0 = Tý … 11 = Hợi
  tyPart?: 'before_midnight' | 'after_midnight'; // chỉ khi timeBranch = 0
  region: Region;              // suy ra từ provinceCode
  provinceCode?: string;       // danh mục 63 tỉnh trước 07/2025; bắt buộc nếu sinh trước 1976
  benHaiSide?: 'north' | 'south'; // chỉ Quảng Trị, sinh 1954–1975
  abroadTz?: string;           // IANA, khi region = 'abroad'
  stdTimeOverride?: string;    // HH:mm giờ chuẩn do người dùng tự sửa
  gender: 'male' | 'female';
}

interface LocalProfile {
  profileId: string;
  displayNameLocal?: string;
  birth: BirthInput;
  schoolId: SchoolId;
  createdAt: string;
  updatedAt: string;
  consentFlags: { analytics: boolean };
}

interface Settings {
  door: Door;
  theme: 'system' | 'light' | 'dark';
  defaultSchool: SchoolId;     // ban đầu 'nam'
  activeProfileId?: string;
  reminders: { ics: boolean; push: boolean };
  analyticsConsent: boolean | null; // null = chưa hỏi
}

interface SchoolPolicy {
  id: SchoolId;
  lateTy: 'next_day' | 'same_day';        // 23:00–23:59 tính sang ngày hôm sau hay không
  leapMonth: 'same_month' | 'split_15';
  mutagenTable: Record<string, [string, string, string, string]>; // can → Lộc, Quyền, Khoa, Kỵ
  brightnessScale: 5 | 7;
  minorStarRules: { hoaLinh: string; khoiViet: string };          // mã quy tắc an sao
  showPalaceStems: boolean;               // Bắc phái: true
  palaceTapMode: 'tam_phuong' | 'phi_hoa';
}

interface ChartSnapshot {
  profileId: string;
  engineVersion: string;
  schoolId: SchoolId;
  tzPolicyVersion: string;
  normalizedTime?: { utc: string; localStd: string; ruleCode: string };
  lunar: {
    year: number; month: number; day: number; isLeap: boolean;
    canChi: { year: string; month: string; day: string; hour?: string };
  };
  facts: FactId[];
  palaces?: PalaceFacts[];     // không có khi thiếu giờ sinh; mỗi cung có stem (thiên can)
  core?: ChartCore;
  yearStars?: BranchStars[];   // chỉ khi thiếu giờ sinh
  warnings: Warning[];         // thêm mã REGION_ABROAD, UNSUPPORTED_DAY30
  trace: TraceStep[];
  generatedAt: string;
}

interface MutagenHit { mutagen: 'loc' | 'quyen' | 'khoa' | 'ky'; starKey: string; palaceKey?: string; self?: boolean }

interface YearView {
  lunarYear: number;
  canChi: string;
  ageLunar: number;
  decade: { palaceKey: string; from: number; to: number; mutagens?: MutagenHit[] }; // mutagens: Bắc phái
  yearPalaceKey?: string;      // cung hạn năm theo phái; không có khi thiếu giờ sinh
  yearMutagens: MutagenHit[];  // Tứ hóa theo can năm
  folkRelation?: 'hop' | 'xung' | 'none'; // tuổi với năm, nhãn Dân gian
  facts: FactId[];
}

interface KnowledgeRule {
  ruleId: string; schools?: SchoolId[]; version: number;
  kind: 'interpretation' | 'pattern' | 'folk' | 'year';
  topic: string;
  conditions: Condition; exclusions?: Condition[];
  headline: string; because: string; detail: string;
  citations: Citation[];
  review: { level: 'L0' | 'L1' | 'L2'; by: string; date: string; sourcesChecked: number };
  priority: number; public?: boolean;
}

interface QaHistoryItem {
  id: string;
  profileId: string;
  createdAt: string;
  question: string;            // chỉ lưu trên máy
  questionType?: string;
  answer: { sentences: AnswerSentence[]; followups: string[] };
  source: 'kb' | 'cache' | 'llm' | 'fallback';
  schoolId: SchoolId;
  kbVersion: string;
}

interface AnswerTrace {
  questionType?: string;
  ruleIds: string[]; factIds: FactId[];
  schoolId: SchoolId;
  source: 'kb' | 'cache' | 'llm_small' | 'llm_strong' | 'fallback';
  modelId?: string; tokensIn?: number; tokensOut?: number; costUsd?: number;
  validator: { passed: boolean; errors: string[] };
  promptVersion?: string; kbVersion: string;
}
```

**Giao diện hàm**

| Hàm | Package | Ghi chú |
|---|---|---|
| `normalizeBirthTime(input, tzPolicy)` | `calendar` | Trả về giờ UTC, giờ chuẩn dùng để an sao và mã quy tắc. Nhận cả ba cách nhập giờ và `stdTimeOverride` |
| `solarToLunar(date, region)`, `lunarToSolar(date, isLeap, region)` | `calendar` | Thuật toán Hồ Ngọc Đức, có tham số vùng |
| `computeChart(input, schoolId, engineVersion)` | `chart-engine` | Thiếu giờ sinh thì trả snapshot không có `palaces` |
| `getYearView(snapshot, lunarYear)` | `chart-engine` | Dữ liệu cho thẻ năm, dòng thời gian, bảng năm của cả nhà |
| `getFlyingMutagens(snapshot, palaceKey)` | `chart-engine` | Bắc phái: Tứ hóa theo can của cung, gồm cả tự hóa |
| `getApplicableRules(snapshot, kb, questionType?)` | `kb` | Lọc theo phái, khớp điều kiện, loại theo `exclusions`, xếp theo `priority` |
| `composeExplanation(ruleIds, snapshot)` | `narrative` | Trả về nhận định 3 tầng, không gọi AI |
| `matchIntent(text, dictionary)` | `narrative` | Khớp câu hỏi tự do với `question_type`, chạy trên máy |
| `answerWithAI(context, rules, budgetPolicy)` | `ai` | Chỉ chạy trên server; gồm cả bước sửa một lần, nâng model, lùi về kho |
| `validateAnswer(answer, facts, ruleIds, schoolId)` | `ai` | Trả về danh sách lỗi, không gọi AI |
| `encodeProfileCode(profile)`, `decodeProfileCode(code)` | `profile-code` | Base32 Crockford kèm checksum; mã phiên bản 2 có phái và giờ chỉnh tay; vẫn giải được mã phiên bản 1 |
| `getDayInfo(date, profiles)` | `folk-calendar` | Dữ liệu cho màn Hôm nay, ngày bất kỳ trong phạm vi chọn được |
| `exportBackup()`, `importBackup(file)` | `web` | File JSON gồm hồ sơ, cài đặt, lịch sử hỏi |
| `deleteAllLocalData()` | `web` | Xóa IndexedDB, hủy push, gọi API xóa dữ liệu server |
| `trackEvent(name, props)` | `web` | Chỉ giữ các thuộc tính nằm trong danh sách cho phép |

**Quy ước ID**

- Đơn vị tri thức: `TV.<CUNG>.<SAO>.<TRẠNG_THÁI>.<số>`; dân gian: `FOLK.<NHÓM>.<số>`; cách cục: `PAT.<TÊN>.<số>`; Tứ hóa năm: `YEAR.<CAN>.<HÓA>.<số>`.
- Fact của lá số gốc: `palace:<cung>|star:<sao>|state:<trạng thái>`.
- Fact của năm: `year:<năm>|palace:<cung>|hoa:<loc, quyen, khoa hoặc ky>`.
- Fact của đại vận (Bắc phái): `decade:<tuổi bắt đầu>|palace:<cung>|hoa:<…>`.
- Fact phi hóa (Bắc phái): `fly:<cung nguồn>|hoa:<…>|to:<cung đích>`.
- Quy tắc của bộ tính: `ENG.<NHÓM>.<TÊN>`.
- Phiên bản: engine, kb, folk, prompt dùng semver; `tz_policy` dùng ngày, ví dụ `2026-11-01`; mã hồ sơ dùng tiền tố `TB1`, `TB2`.

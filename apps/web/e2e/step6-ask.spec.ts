import { expect, test, type Page } from "@playwright/test";
import { createProfile, expectNoA11yViolations, open } from "./helpers";

// Cố định "hôm nay": năm âm 2026 Bính Ngọ.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T09:00:00+07:00"));
});

const MINH = { name: "Minh", day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" } as const;

async function openAsk(page: Page) {
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Hỏi" }).click();
  await page.waitForURL(/\/hoi/);
  await expect(page.getByLabel("Câu hỏi của bạn")).toBeVisible();
}

const history = (page: Page) => page.getByRole("region", { name: "Lịch sử hỏi" });

async function ask(page: Page, question: string) {
  await page.getByLabel("Câu hỏi của bạn").fill(question);
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
}

test.describe("Bước 6: Hỏi", () => {
  // page.route không chặn được request đi qua service worker (giới hạn của Playwright).
  test.use({ serviceWorkers: "block" });

  test("luồng 7: câu gợi ý (không gọi mạng) và câu tự do (AI giả lập) → tải lại → cả hai còn trong lịch sử", async ({ page }) => {
    await createProfile(page, MINH);
    await openAsk(page);
    const bodies: Record<string, unknown>[] = [];
    await page.route("**/api/ask", async (route) => {
      bodies.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        json: {
          kind: "answer",
          outcome: {
            sentences: [{ text: "Câu trả lời do AI giả lập viết.", rule_ids: [], fact_ids: [], label: "interpretation" }],
            followups: [],
            source: "llm_small",
            ruleIds: [],
            outOfScope: false,
            kbVersion: "test",
          },
          quotaRemaining: 2,
        },
      });
    });

    // Lịch sử trống: hiện câu gợi ý. Câu gợi ý trả lời trên máy, không gọi /api/ask.
    await page.getByRole("button", { name: "Năm nay của tôi thế nào?" }).click();
    await expect(history(page).getByText(/^Năm 2026 Bính Ngọ, 27 tuổi âm; đại vận ở cung/)).toBeVisible();
    expect(bodies).toHaveLength(0);

    await ask(page, "Lá số của tôi nói gì về sự nghiệp?");
    await expect(history(page).getByText("Câu trả lời do AI giả lập viết.")).toBeVisible();
    await expect(page.getByText("Còn 2/3 câu hôm nay")).toBeVisible();
    // Gửi lên chỉ có câu hỏi và fact tối thiểu: không tên, không ngày giờ sinh.
    expect(Object.keys(bodies[0]!).sort()).toEqual(["facts", "installId", "kbVersion", "question", "questionType", "schoolId"]);
    expect(bodies[0]!.questionType).toBe("career");
    expect(JSON.stringify(bodies[0]!.facts)).not.toMatch(/Minh|2000|16\/8|03:30/);

    await page.reload();
    await expect(history(page).getByText("Hôm nay · 2 câu")).toBeVisible();
    await expect(history(page).getByRole("button", { name: /^Lá số của tôi nói gì về sự nghiệp\?/ })).toBeVisible();
    // Đồng hồ cố định nên hai câu cùng thời điểm, thứ tự không chắc: chỉ mở câu "Năm nay" nếu đang đóng.
    const yearTrigger = history(page).getByRole("button", { name: /^Năm nay của tôi thế nào\?/ });
    if ((await yearTrigger.getAttribute("aria-expanded")) !== "true") await yearTrigger.click();
    await expect(history(page).getByText(/^Năm 2026 Bính Ngọ, 27 tuổi âm/)).toBeVisible();
    await expect(history(page).getByText(/^Dân gian: tuổi Canh Thìn/)).toBeVisible();

    // Xóa từng câu.
    const yearItem = history(page).locator("[data-slot=accordion-item]", { has: page.getByRole("button", { name: /^Năm nay của tôi thế nào\?/ }) });
    await yearItem.getByRole("button", { name: "Xóa câu này" }).click();
    await expect(history(page).getByText("Hôm nay · 1 câu")).toBeVisible();
    await expect(yearTrigger).toHaveCount(0);
  });

  test("luồng 11: AI tắt → câu tự do vẫn được trả lời bằng kho, không báo lỗi", async ({ page, request }) => {
    const config = await (await request.get("/api/config")).json();
    expect(config.aiEnabled).toBe(false);
    await createProfile(page, MINH);
    await openAsk(page);
    await ask(page, "Công việc nào hợp với tôi?");
    await expect(history(page).getByRole("button", { name: /^Công việc nào hợp với tôi\?/ })).toBeVisible();
    await expect(history(page).getByText(/Chưa có căn cứ đã duyệt/)).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByText("Còn 2/3 câu hôm nay")).toBeVisible();
  });

  test("câu ngoài phạm vi nhận câu từ chối soạn sẵn, không trừ lượt", async ({ page }) => {
    await createProfile(page, MINH);
    await openAsk(page);
    await ask(page, "Tôi có nên mua cổ phiếu không?");
    await expect(page.getByRole("status")).toHaveText(/không tư vấn đầu tư/);
    await expect(page.getByText("Còn 3/3 câu hôm nay")).toBeVisible();
  });

  test("hết lượt: khóa ô hỏi, mở bảng bản trả phí, gửi quan tâm", async ({ page }) => {
    await createProfile(page, MINH);
    await openAsk(page);
    await page.route("**/api/ask", (route) => route.fulfill({ status: 429, json: { kind: "quota_exceeded", quotaRemaining: 0 } }));
    await ask(page, "Lá số của tôi nói gì về tiền bạc?");
    await expect(page.getByText(/Đã hết 3 câu hôm nay/)).toBeVisible();
    await expect(page.getByLabel("Câu hỏi của bạn")).toBeDisabled();
    await page.getByRole("button", { name: "Xem các gói" }).click();
    await page.getByRole("checkbox", { name: "Gói năm" }).click();
    await page.getByRole("checkbox", { name: "Đồng ý lưu lựa chọn" }).click();
    await page.getByRole("button", { name: "Báo tôi khi có" }).click();
    await expect(page.getByText("Đã ghi nhận. Tinh Bàn sẽ báo khi có bản trả phí.")).toBeVisible();
  });

  test("hồ sơ dưới 16 tuổi: ghi rõ lý do, câu tự do không gửi lên server", async ({ page }) => {
    await createProfile(page, { day: "1", month: "3", year: "2015", time: "08:00", gender: "Nữ" });
    await openAsk(page);
    let calls = 0;
    await page.route("**/api/ask", (route) => {
      calls++;
      return route.abort();
    });
    await expect(page.getByText(/Hồ sơ dưới 16 tuổi: câu hỏi tự do chỉ được trả lời ngay trên máy/)).toBeVisible();
    await ask(page, "Tôi hợp học ngành gì?");
    await expect(page.getByRole("status")).toHaveText(/dưới 16 tuổi/);
    expect(calls).toBe(0);
  });

  test("lối tắt Hỏi về hôm nay: trả lời ngay bằng dữ kiện và xem ngày dân gian", async ({ page }) => {
    await createProfile(page, MINH);
    await open(page, "/hom-nay");
    await page.getByRole("link", { name: "Hỏi về hôm nay" }).click();
    await page.waitForURL(/\/hoi\?ho-so=/);
    await expect(history(page).getByText(/^Thứ Sáu, ngày .+ âm lịch/)).toBeVisible();
    await expect(history(page).getByText(/^Dân gian: ngày (hoàng|hắc) đạo/)).toBeVisible();
    expect(new URL(page.url()).searchParams.get("cau")).toBeNull();
  });

  test("axe: Hỏi khi trống và khi có lịch sử", async ({ page }) => {
    test.setTimeout(240_000);
    await createProfile(page, MINH);
    await openAsk(page);
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Năm nay của tôi thế nào?" }).click();
    await expect(history(page)).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("offline", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Service worker trong Playwright chỉ ổn định trên Chromium");

  test("luồng 8 (phần Hỏi): tắt mạng → lịch sử vẫn xem được, chỉ khóa ô hỏi tự do", async ({ page, context }) => {
    await createProfile(page, MINH);
    await openAsk(page);
    await page.getByRole("button", { name: "Năm nay của tôi thế nào?" }).click();
    await expect(history(page)).toBeVisible();
    await expect.poll(async () => page.evaluate(async () => !!(await (await caches.open("pages")).match("/hoi")))).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(history(page).getByRole("button", { name: /^Năm nay của tôi thế nào\?/ })).toBeVisible();
    await expect(page.getByText(/Đang không có mạng: câu hỏi tự do cần mạng/)).toBeVisible();
    await expect(page.getByLabel("Câu hỏi của bạn")).toBeDisabled();
    await context.setOffline(false);
  });
});

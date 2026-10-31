import { expect, test } from "@playwright/test";
import { createProfile, expectNoA11yViolations, open } from "./helpers";

// Cố định "hôm nay" để kết quả không phụ thuộc ngày chạy test.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T09:00:00+07:00"));
});

test.describe("Bước 3: bảng chi tiết cung", () => {
  test("chọn cung → mở chi tiết: sao theo nhóm; kho chưa có nội dung thì nói rõ", async ({ page }) => {
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await page.getByRole("button", { name: /^Mệnh/ }).click();
    await page.getByRole("button", { name: "Chi tiết cung Mệnh" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: /Mệnh · Ngọ/ })).toBeVisible();
    await expect(sheet.getByText("Tử Vi")).toBeVisible();
    await expect(sheet.getByText("Chưa có nhận định đã duyệt cho cung này.")).toBeVisible();
  });
});

test.describe("Bước 4: Hôm nay", () => {
  test("luồng 6: chọn ngày khác bằng lịch tháng → nội dung đổi → Về hôm nay", async ({ page }) => {
    await open(page, "/hom-nay");
    await expect(page.getByRole("button", { name: "Chọn ngày" })).toHaveText("Thứ Sáu 30/10/2026");
    const lunarToday = await page.getByText(/^Âm lịch$/).locator("xpath=following-sibling::dd[1]").textContent();
    await page.getByRole("button", { name: "Lịch tháng" }).click();
    await page.getByRole("button", { name: /^15\/10\/2026/ }).click();
    await expect(page.getByRole("button", { name: "Chọn ngày" })).toHaveText("Thứ Năm 15/10/2026");
    await expect(page).toHaveURL(/\/hom-nay\?ngay=2026-10-15/);
    expect(await page.getByText(/^Âm lịch$/).locator("xpath=following-sibling::dd[1]").textContent()).not.toBe(lunarToday);
    await page.getByRole("button", { name: "Ngày sau" }).click();
    await expect(page.getByRole("button", { name: "Chọn ngày" })).toHaveText("Thứ Sáu 16/10/2026");
    await page.getByRole("button", { name: "Về hôm nay" }).click();
    await expect(page.getByRole("button", { name: "Chọn ngày" })).toHaveText("Thứ Sáu 30/10/2026");
    await expect(page.getByRole("button", { name: "Về hôm nay" })).toHaveCount(0);
  });

  test("luồng 5 (phần Hôm nay): hai hồ sơ → Hôm nay hiện hợp/xung cho cả hai", async ({ page }) => {
    await createProfile(page, { name: "Minh", day: "15", month: "6", year: "1984", time: "08:00", gender: "Nam" });
    await createProfile(page, { name: "Lan", day: "20", month: "9", year: "1990", time: "10:00", gender: "Nữ" });
    await open(page, "/hom-nay");
    const family = page.getByRole("heading", { name: "Cả nhà hôm nay" }).locator("xpath=ancestor::section[1]");
    await expect(family.getByText("Minh")).toBeVisible();
    await expect(family.getByText("Lan")).toBeVisible();
    await expect(family.getByText(/hợp ·|xung ·|không xung, không hợp/)).toHaveCount(2);
  });

  test("cửa B: vào app mở Hôm nay, khối Cả nhà đứng đầu", async ({ page }) => {
    await open(page, "/bat-dau");
    await page.getByRole("button", { name: "Việc của cả nhà" }).click();
    await page.waitForURL(/\/ho-so\/moi/);
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await open(page, "/app");
    await page.waitForURL(/\/hom-nay/);
    await expect(page.getByRole("heading", { name: "Cả nhà hôm nay" })).toBeVisible();
    const headings = await page.locator("main section h3").allTextContents();
    expect(headings[0]).toBe("Cả nhà hôm nay");
  });

  test("axe: Hôm nay và lịch tháng", async ({ page }) => {
    test.setTimeout(180_000);
    await open(page, "/hom-nay");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Lịch tháng" }).click();
    await expectNoA11yViolations(page);
  });
});

test.describe("Bước 5: Vận hạn", () => {
  test("luồng 5 (phần Vận hạn): thẻ năm của một người; chế độ Cả nhà có hai thẻ", async ({ page }) => {
    await createProfile(page, { name: "Minh", day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await createProfile(page, { name: "Lan", day: "20", month: "9", year: "1990", time: "10:00", gender: "Nữ" });
    await page.getByRole("radio", { name: "Vận hạn" }).click();
    await expect(page).toHaveURL(/xem=van-han/);
    await expect(page.getByText(/^Năm 2026 · Bính Ngọ · \d+ tuổi$/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Đại vận" }).getByRole("button")).toHaveCount(12);
    await page.getByRole("radio", { name: "Cả nhà" }).click();
    await expect(page.getByRole("button", { name: /Minh · 27 tuổi/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Lan · 37 tuổi/ })).toBeVisible();
  });
});

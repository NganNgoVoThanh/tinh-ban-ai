import { expect, test } from "@playwright/test";
import { createProfile, expectNoA11yViolations, open, palaceLabels, settleChart } from "./helpers";

test.describe("Bước 1: nhập hồ sơ và xem lá số", () => {
  test("nhập ngày giờ sinh → lá số 12 cung, chạm cung thấy tam phương tứ chính", async ({ page }) => {
    await createProfile(page, { name: "Minh", day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await expect(page.getByRole("button", { name: /Lá số|Minh/ }).first()).toBeVisible();
    expect(await palaceLabels(page)).toHaveLength(12);
    await expect(page.getByRole("button", { name: /^Mệnh.*Tử Vi Miếu/ })).toBeVisible();
    await page.getByRole("button", { name: /^Quan Lộc/ }).click();
    await expect(page.getByText("Tam phương tứ chính của Quan Lộc: tam hợp Tài Bạch, Mệnh; xung chiếu Phu Thê.")).toBeVisible();
  });

  test("luồng 2: giờ âm, giờ Tý sau nửa đêm cho cùng lá số với 00:30", async ({ page }) => {
    await createProfile(page, { day: "16", month: "8", year: "2000", canh: { branch: "Tý", tyPart: "Sau nửa đêm (0–1 giờ)" }, gender: "Nữ" });
    const byCanh = await palaceLabels(page);
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "00:30", gender: "Nữ" });
    expect(await palaceLabels(page)).toEqual(byCanh);
  });

  test("luồng 3: thiếu giờ sinh thì chỉ hiện sao an theo năm, có nhãn", async ({ page }) => {
    await createProfile(page, { day: "16", month: "8", year: "2000", unknownTime: true, gender: "Nam" });
    await expect(page.getByText("Thiếu giờ sinh", { exact: true })).toBeVisible();
    await expect(page.getByText("Cần giờ sinh")).toHaveCount(12);
    expect(await palaceLabels(page)).toHaveLength(0);
  });

  test("luồng 4: đổi phái bằng công tắc → tính lại, có thiên can cung, phái được lưu", async ({ page }) => {
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await page.getByRole("button", { name: /Phái: Nam phái/ }).click();
    await page.getByRole("menuitemradio", { name: "Bắc phái" }).click();
    await expect(page.getByRole("button", { name: /Phái: Bắc phái/ })).toBeVisible();
    await page.getByRole("button", { name: /^Tài Bạch/ }).click();
    await expect(page.getByText(/^Phi hóa từ Tài Bạch \(can Mậu\): Lộc → Thiên Di \(Tham Lang\)/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: /Phái: Bắc phái/ })).toBeVisible();
  });

  test("sinh trước 1976 phải chọn nơi sinh; tìm tỉnh gõ không dấu", async ({ page }) => {
    await open(page, "/ho-so/moi");
    await page.getByLabel("Ngày", { exact: true }).fill("1");
    await page.getByLabel("Tháng", { exact: true }).fill("6");
    await page.getByLabel("Năm", { exact: true }).fill("1965");
    await page.getByLabel("Giờ phút trên giấy tờ").fill("09:30");
    await page.getByRole("radio", { name: "Nam", exact: true }).click();
    await page.getByRole("button", { name: "Lập lá số" }).click();
    await expect(page.getByText("Sinh trước 1976 cần chọn nơi sinh")).toBeVisible();
    await page.getByRole("button", { name: /^Nơi sinh:/ }).click();
    await page.getByPlaceholder(/Tìm tỉnh/).fill("ho chi minh");
    await page.getByRole("option", { name: /TP. Hồ Chí Minh/ }).click();
    // Sài Gòn 1965 dùng UTC+8: 09:30 đồng hồ là 08:30 giờ chuẩn.
    await expect(page.getByText("08:30", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Lập lá số" }).click();
    await settleChart(page);
    expect(await palaceLabels(page)).toHaveLength(12);
  });
});

test.describe("chế độ tối và tiếp cận", () => {
  test("luồng 13: chế độ tối không lóe trắng, axe không có lỗi", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    // Class "dark" phải có ngay trong HTML ban đầu, trước khi React chạy.
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/ho-so/moi");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(26, 18, 20)");
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`axe: form và lá số, chế độ ${scheme === "light" ? "sáng" : "tối"}`, async ({ page }) => {
      // axe-core trên WebKit mất khoảng 15–20 giây mỗi lần quét.
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, "/ho-so/moi");
      await expectNoA11yViolations(page);
      await createProfile(page, { name: "Lan", day: "2", month: "3", year: "1987", time: "17:10", gender: "Nữ", school: "Bắc phái" });
      await expectNoA11yViolations(page);
      await page.getByRole("button", { name: /^Mệnh/ }).click();
      await expectNoA11yViolations(page);
    });
  }
});

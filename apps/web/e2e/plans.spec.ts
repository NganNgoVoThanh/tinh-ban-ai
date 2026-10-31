import { expect, test } from "@playwright/test";
import { createProfile, expectNoA11yViolations, open } from "./helpers";

test.describe("Các gói (ADR 0007)", () => {
  test("Hồ sơ → Các gói: thấy gói hiện tại, mở Plus thì gói năm được chọn sẵn", async ({ page }) => {
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Hồ sơ" }).click();
    await page.getByRole("link", { name: /Gói của bạn/ }).click();
    await page.waitForURL(/\/goi$/);
    const current = page.getByRole("region", { name: "Gói của bạn" });
    await expect(current.getByText("Miễn phí", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gói hiện tại của bạn" })).toBeDisabled();

    const plus = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Tinh Bàn Plus" }) });
    await expect(plus.getByText(/499\.000đ/)).toBeVisible();
    await page.getByRole("radio", { name: /Theo tháng/ }).click();
    await expect(plus.getByText(/59\.000đ/)).toBeVisible();
    await page.getByRole("radio", { name: /Theo năm/ }).click();
    await plus.getByRole("button", { name: "Báo tôi khi mở bán" }).click();
    await expect(page.getByRole("checkbox", { name: "Gói năm" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Gói tháng" })).not.toBeChecked();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Các gói, chế độ ${scheme === "light" ? "sáng" : "tối"}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, "/goi");
      await expectNoA11yViolations(page);
    });
  }
});

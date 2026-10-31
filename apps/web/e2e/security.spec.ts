import { expect, test } from "@playwright/test";
import { createProfile, open } from "./helpers";

test.describe("bảo mật", () => {
  test("header bảo mật có mặt; các màn chính không vi phạm CSP", async ({ page, request }) => {
    const res = await request.get("/");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");

    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) violations.push(m.text());
    });
    await open(page, "/");
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await page.getByRole("radio", { name: "Vận hạn" }).click();
    await page.getByRole("button", { name: /^Chia sẻ năm/ }).click();
    await expect(page.getByTestId("share-card")).toBeVisible();
    await open(page, "/hom-nay");
    await open(page, "/hoi");
    await open(page, "/ho-so");
    await open(page, "/quyen-rieng-tu");
    expect(violations).toEqual([]);
  });
});

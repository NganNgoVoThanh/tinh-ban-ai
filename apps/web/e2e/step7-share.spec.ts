import { expect, test } from "@playwright/test";
import { createProfile } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T09:00:00+07:00"));
});

test.describe("Bước 7: thẻ chia sẻ", () => {
  test("luồng 12: tạo thẻ năm → SVG của thẻ không chứa ngày giờ sinh hay tên", async ({ page }) => {
    await createProfile(page, { name: "Minh Anh", day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await page.getByRole("radio", { name: "Vận hạn" }).click();
    await page.getByRole("button", { name: "Chia sẻ năm 2026" }).click();
    const card = page.getByTestId("share-card");
    await expect(card).toBeVisible();
    const src = (await card.getAttribute("src"))!;
    const svg = decodeURIComponent(src.replace(/^data:image\/svg\+xml;charset=utf-8,/, "")).replace('xmlns="http://www.w3.org/2000/svg"', "");
    expect(svg).toContain("2026 · Bính Ngọ");
    expect(svg).toContain("/?ref=card&amp;door=A");
    for (const secret of ["Minh Anh", "2000", "16/8", "03:30", "Canh Thìn", "27 tuổi"]) expect(svg).not.toContain(secret);
    expect(new URL(page.url()).searchParams.get("ho-so")).not.toBeNull();
    expect(svg).not.toContain(new URL(page.url()).searchParams.get("ho-so")!);
  });
});

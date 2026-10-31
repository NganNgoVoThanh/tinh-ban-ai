import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { answerConsent, createProfile, expectNoA11yViolations, open, palaceLabels } from "./helpers";

async function deleteAll(page: Page) {
  await open(page, "/ho-so");
  await page.getByRole("button", { name: "Xóa toàn bộ dữ liệu" }).click();
  await page.getByRole("button", { name: "Xóa toàn bộ" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

test.describe("Bước 2: khung app", () => {
  test("luồng 1: trang giới thiệu → cửa A → nhập ngày giờ sinh → lá số, có bảng Giữ lá số an toàn", async ({ page }) => {
    await open(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Hiểu lá số của tôi" }).click();
    await page.waitForURL(/\/ho-so\/moi/);
    await createProfile(page, { name: "Minh", day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam", keepSheet: true });
    await expect(page.getByRole("heading", { name: "Giữ lá số an toàn" })).toBeVisible();
    await expect(page.getByTestId("profile-code")).toHaveText(/^TB2-/);
    await page.getByRole("button", { name: "Đã lưu, xem lá số" }).click();
    await expect(page.getByText("Chạm vào cung Mệnh (viền vàng) để bắt đầu đọc lá số.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
  });

  test("luồng 9: xóa dữ liệu → khôi phục bằng mã → lá số giống hệt, kể cả giờ chỉnh tay và phái", async ({ page }) => {
    await createProfile(page, { day: "1", month: "6", year: "1965", time: "09:30", province: "ho chi minh", gender: "Nữ", school: "Bắc phái" });
    // Sửa giờ chuẩn rồi lưu.
    await page.getByRole("button", { name: "Thêm" }).click();
    await page.getByRole("menuitem", { name: "Sửa hồ sơ" }).click();
    await page.locator("form[data-ready]:visible").waitFor();
    await page.getByRole("button", { name: "Sửa", exact: true }).click();
    await page.getByLabel("Giờ chuẩn dùng để an sao").fill("09:10");
    await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
    await page.waitForURL(/\/la-so\?/);
    const before = await palaceLabels(page);
    await page.getByRole("button", { name: "Thêm" }).click();
    await page.getByRole("menuitem", { name: "Sửa hồ sơ" }).click();
    const code = (await page.getByTestId("profile-code").textContent())!;

    await deleteAll(page);
    await open(page, "/khoi-phuc");
    await page.getByLabel("Mã hồ sơ").fill(code);
    await page.getByRole("button", { name: "Khôi phục lá số" }).click();
    await page.waitForURL(/\/la-so\?/);
    await answerConsent(page);
    await expect(page.getByRole("button", { name: /Phái: Bắc phái/ })).toBeVisible();
    expect(await palaceLabels(page)).toEqual(before);
  });

  test("mã hồ sơ sai một ký tự thì báo lỗi ngay dưới ô, không tự sửa", async ({ page }) => {
    await open(page, "/khoi-phuc");
    await page.getByLabel("Mã hồ sơ").fill("TB2-0000-0000-0000-01");
    // Lỗi báo ngay dưới ô (Next còn có vùng role="alert" riêng để thông báo chuyển trang).
    await expect(page.locator("#code-error")).toHaveText(/không khớp/);
    await expect(page.getByRole("button", { name: "Khôi phục lá số" })).toHaveCount(0);
  });

  test("link QR (#ma=…) điền sẵn mã rồi xóa mã khỏi thanh địa chỉ", async ({ page }) => {
    await createProfile(page, { day: "2", month: "3", year: "1987", time: "17:10", gender: "Nữ", keepSheet: true });
    const code = (await page.getByTestId("profile-code").textContent())!;
    await page.goto(`/khoi-phuc#ma=${encodeURIComponent(code)}`);
    await expect(page.getByLabel("Mã hồ sơ")).toHaveValue(code);
    expect(new URL(page.url()).hash).toBe("");
  });

  test("luồng 10: sao lưu ra file → xóa dữ liệu → nhập file → đủ hồ sơ và lịch sử", async ({ page }) => {
    await createProfile(page, { name: "Minh", day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await createProfile(page, { name: "Lan", day: "2", month: "3", year: "1987", time: "17:10", gender: "Nữ", school: "Bắc phái" });
    // Một câu hỏi gợi ý cho hồ sơ đang chọn (Lan), trả lời trên máy.
    await open(page, "/hoi");
    await page.getByRole("button", { name: "Năm nay của tôi thế nào?" }).first().click();
    await expect(page.getByRole("region", { name: "Lịch sử hỏi" })).toBeVisible();
    await open(page, "/ho-so");
    await page.getByRole("button", { name: "Sao lưu ra file" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải file" }).click();
    const file = await (await download).path();
    const backup = JSON.parse(readFileSync(file, "utf8"));
    expect(backup.profiles).toHaveLength(2);
    expect(backup.qaHistory).toHaveLength(1);

    await deleteAll(page);
    await open(page, "/khoi-phuc");
    await page.getByLabel("Chọn file sao lưu").setInputFiles(file);
    await page.waitForURL(/\/la-so/);
    await open(page, "/ho-so");
    await expect(page.getByRole("link", { name: /Minh/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Lan.*Bắc phái/ })).toBeVisible();
    await page.getByRole("link", { name: /Lan.*Bắc phái/ }).click();
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Hỏi" }).click();
    await expect(page.getByRole("region", { name: "Lịch sử hỏi" }).getByRole("button", { name: /^Năm nay của tôi thế nào\?/ })).toBeVisible();
  });

  test("/app: chưa có hồ sơ thì mở Chọn cửa; có hồ sơ thì mở Lá số", async ({ page }) => {
    await open(page, "/app");
    await page.waitForURL(/\/bat-dau/);
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await open(page, "/app");
    await page.waitForURL(/\/la-so/);
    expect(await palaceLabels(page)).toHaveLength(12);
  });

  test("manifest cài được: tên, start_url, icon 192, 512 và maskable", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({ name: "Tinh Bàn", start_url: "/app", display: "standalone" });
    expect(m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`)).toEqual(["192x192/any", "512x512/any", "512x512/maskable"]);
    for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  });

  test("axe: trang giới thiệu, chọn cửa, khôi phục, hồ sơ", async ({ page }) => {
    test.setTimeout(240_000);
    for (const url of ["/", "/bat-dau", "/khoi-phuc", "/ho-so"]) {
      await open(page, url);
      await expectNoA11yViolations(page);
    }
  });
});

test.describe("offline", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Service worker trong Playwright chỉ ổn định trên Chromium");

  test("luồng 8 (phần Bước 2): tắt mạng → tải lại trang lá số vẫn chạy", async ({ page, context }) => {
    await createProfile(page, { day: "16", month: "8", year: "2000", time: "03:30", gender: "Nam" });
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active?.state;
    });
    // Đợi service worker cài xong khung trang.
    await expect.poll(async () => page.evaluate(async () => (await caches.keys()).includes("pages"))).toBe(true);
    await expect.poll(async () => page.evaluate(async () => !!(await (await caches.open("pages")).match("/la-so")))).toBe(true);
    const before = await palaceLabels(page);
    await context.setOffline(true);
    await page.reload();
    expect(await palaceLabels(page)).toEqual(before);
    await context.setOffline(false);
  });
});

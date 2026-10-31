import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export interface ProfileInput {
  name?: string;
  calendar?: "Dương" | "Âm";
  day: string;
  month: string;
  year: string;
  time?: string;
  canh?: { branch: string; tyPart?: "Trước nửa đêm (23–24 giờ)" | "Sau nửa đêm (0–1 giờ)" };
  unknownTime?: boolean;
  province?: string;
  gender: "Nam" | "Nữ";
  school?: "Nam phái" | "Bắc phái";
  /** Giữ bảng "Giữ lá số an toàn" mở (mặc định đóng để xem lá số). */
  keepSheet?: boolean;
}

/**
 * Mở trang và đợi app chạy xong phía máy (gõ trước lúc đó thì React sẽ xóa mất). Trang có form thì
 * đợi chính form gắn data-ready, vì Next hydrate từng phần.
 */
export async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  if (await page.locator("form").count()) await page.locator("form[data-ready]:visible").waitFor({ state: "attached" });
}

/** Điền form Hồ sơ mới và bấm "Lập lá số"; trả về URL lá số. */
export async function createProfile(page: Page, p: ProfileInput): Promise<string> {
  // Thẻ cửa vào tự chuyển sang form: khi đó không mở lại trang (tránh hai lần điều hướng chồng nhau).
  if (new URL(page.url()).pathname === "/ho-so/moi") await page.locator("form[data-ready]:visible").waitFor({ state: "attached" });
  else await open(page, "/ho-so/moi");
  if (p.name) await page.getByLabel("Tên").fill(p.name);
  if (p.calendar === "Âm") await page.getByRole("radio", { name: "Âm", exact: true }).click();
  await page.getByLabel("Ngày", { exact: true }).fill(p.day);
  await page.getByLabel("Tháng", { exact: true }).fill(p.month);
  await page.getByLabel("Năm", { exact: true }).fill(p.year);
  if (p.unknownTime) {
    await page.getByRole("radio", { name: "Không rõ" }).click();
  } else if (p.canh) {
    await page.getByRole("radio", { name: "Giờ âm", exact: true }).click();
    await page.getByRole("radiogroup", { name: "Giờ âm" }).getByRole("radio", { name: new RegExp(`^${p.canh.branch}`) }).click();
    if (p.canh.tyPart) await page.getByRole("radio", { name: p.canh.tyPart }).click();
  } else if (p.time) {
    await page.getByLabel("Giờ phút trên giấy tờ").fill(p.time);
  }
  if (p.province) {
    await page.getByRole("button", { name: /^Nơi sinh:/ }).click();
    // Gõ không dấu; danh sách chỉ còn các tỉnh khớp, chọn tỉnh đầu tiên.
    await page.getByPlaceholder(/Tìm tỉnh/).fill(p.province);
    await page.getByRole("option").first().click();
  }
  await page.getByRole("radio", { name: p.gender, exact: true }).click();
  if (p.school) await page.getByRole("radio", { name: p.school, exact: true }).click();
  await page.getByRole("button", { name: "Lập lá số" }).click();
  await settleChart(page, p.keepSheet);
  return page.url();
}

/**
 * Sau khi bấm "Lập lá số": đợi vào lá số; hồ sơ đầu tiên mở bảng "Giữ lá số an toàn" thì đóng lại
 * (trừ khi keepSheet), và trả lời lời hỏi đồng ý phân tích.
 */
export async function settleChart(page: Page, keepSheet = false) {
  await page.waitForURL(/\/la-so\?ho-so=/);
  await page.getByRole("button", { name: "Đã lưu, xem lá số" }).or(page.getByRole("radio", { name: "Gốc", exact: true })).first().waitFor();
  if (keepSheet) return;
  const close = page.getByRole("button", { name: "Đã lưu, xem lá số" });
  if (await close.isVisible()) await close.click();
  await answerConsent(page);
}

/**
 * Trả lời lời hỏi đồng ý phân tích (nằm đè lên đáy màn hình) nếu chưa trả lời. Đọc cài đặt trong
 * IndexedDB để biết chắc, vì lời hỏi hiện sau khi app đọc xong hồ sơ và cài đặt.
 */
export async function answerConsent(page: Page) {
  const pending = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open("tinhban");
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("settings")) return resolve(false);
          const get = db.transaction("settings").objectStore("settings").get("app");
          get.onsuccess = () => {
            resolve((get.result as { value?: { analyticsConsent?: boolean | null } } | undefined)?.value?.analyticsConsent == null);
            db.close();
          };
          get.onerror = () => resolve(false);
        };
      }),
  );
  if (pending) await page.getByRole("region", { name: "Phân tích ẩn danh" }).getByRole("button", { name: "Không" }).click();
}

/** Nội dung 12 cung (theo nhãn đọc cho trình đọc màn hình), sắp theo tên cung. */
export async function palaceLabels(page: Page): Promise<string[]> {
  // Đợi lá số tính xong (hồ sơ đọc từ IndexedDB không đồng bộ).
  await expect(page.getByRole("radio", { name: "Gốc", exact: true })).toBeVisible();
  const labels = await page.locator("button[aria-label][aria-pressed]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  return labels.sort();
}

/** Quét axe-core (WCAG 2 A/AA): không có lỗi nào. */
export async function expectNoA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
}

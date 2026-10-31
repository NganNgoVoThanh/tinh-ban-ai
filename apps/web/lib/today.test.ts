import { describe, expect, it } from "vitest";
import { clampDay, dayRange, monthGrid, offsetBucket, reminderIcs, shiftDay } from "./today";

describe("chọn ngày ở màn Hôm nay", () => {
  it("phạm vi từ đầu năm trước đến cuối năm sau", () => {
    const r = dayRange({ year: 2026, month: 10, day: 30 });
    expect(r).toEqual({ min: "2025-01-01", max: "2027-12-31" });
    expect(clampDay("2024-12-31", r)).toBe("2025-01-01");
    expect(clampDay("2028-01-01", r)).toBe("2027-12-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("nhóm khoảng cách cho sự kiện", () => {
    expect(offsetBucket("2026-10-31", "2026-10-30")).toBe("+1");
    expect(offsetBucket("2026-10-25", "2026-10-30")).toBe("-7");
    expect(offsetBucket("2027-03-01", "2026-10-30")).toBe("xa_sau");
  });

  it("lưới tháng bắt đầu từ thứ Hai", () => {
    // 1/10/2026 là thứ Năm: 3 ô trống đầu.
    const g = monthGrid(2026, 10);
    expect(g.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(g.length % 7).toBe(0);
    expect(g.filter(Boolean)).toHaveLength(31);
  });

  it("file .ics lặp hằng ngày, mở /hom-nay, không có dữ liệu cá nhân", () => {
    const ics = reminderIcs("https://tinhban.app", "07:30", new Date(2026, 9, 30, 9, 0));
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("DTSTART:20261030T073000");
    expect(ics).toContain("URL:https://tinhban.app/hom-nay");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});

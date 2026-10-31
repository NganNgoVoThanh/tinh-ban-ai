import { addDays, formatDate, parseDate, type SolarDate } from "@tinhban/calendar";

/** Phạm vi chọn ngày ở màn Hôm nay (Technical Plan mục 8): từ 01/01 năm trước đến 31/12 năm sau. */
export function dayRange(today: SolarDate): { min: string; max: string } {
  return { min: `${today.year - 1}-01-01`, max: `${today.year + 1}-12-31` };
}

export const clampDay = (iso: string, range: { min: string; max: string }) => (iso < range.min ? range.min : iso > range.max ? range.max : iso);

export const shiftDay = (iso: string, days: number) => formatDate(addDays(parseDate(iso), days));

export const toIso = (d: Date) => formatDate({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });

/** Nhóm khoảng cách tới hôm nay cho sự kiện today_date_changed (không ghi ngày cụ thể). */
export function offsetBucket(iso: string, todayIso: string): string {
  const days = Math.round((Date.parse(iso) - Date.parse(todayIso)) / 86_400_000);
  if (days === 0) return "0";
  if (Math.abs(days) === 1) return days > 0 ? "+1" : "-1";
  if (Math.abs(days) <= 7) return days > 0 ? "+7" : "-7";
  return days > 0 ? "xa_sau" : "xa_truoc";
}

const WEEKDAY = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
export const weekdayName = (weekday: number) => WEEKDAY[weekday]!;

/** Lưới lịch tháng, tuần bắt đầu từ thứ Hai; ô ngoài tháng là null. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * File .ics nhắc mở Hôm nay mỗi ngày (Technical Plan mục 11): sự kiện lặp hằng ngày, link mở
 * /hom-nay. Không cần máy chủ, nội dung chung chung, không có dữ liệu cá nhân.
 */
export function reminderIcs(origin: string, time: string, now: Date): string {
  const [h = "07", m = "00"] = time.split(":");
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tinh Ban//Nhac nho//VI",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:tinhban-hom-nay-${d}@tinhban`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${d}T${h}${m}00`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:Xem ngày hôm nay",
    `URL:${origin}/hom-nay`,
    `DESCRIPTION:${origin}/hom-nay`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Xem ngày hôm nay",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

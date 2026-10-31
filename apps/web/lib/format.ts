import { CHI } from "@tinhban/calendar";
import type { ChartSnapshot } from "@tinhban/shared";

/** Khung giờ đồng hồ của 12 giờ âm. */
export const HOUR_RANGES = ["23–01", "01–03", "03–05", "05–07", "07–09", "09–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];

/** Năm canh đêm, mỗi canh trùng đúng một giờ âm (Technical Plan mục 5). */
export const CANH = [
  { canh: 1, branch: 10 },
  { canh: 2, branch: 11 },
  { canh: 3, branch: 0 },
  { canh: 4, branch: 1 },
  { canh: 5, branch: 2 },
] as const;

export const branchName = (b: number) => CHI[b]!;

/** "2000-08-16" → "16/08/2000" */
export function formatSolar(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "2000-08-16T03:30" → "03:30 ngày 16/08/2000" */
export function formatLocalStd(localStd: string, withDate: boolean): string {
  const [date = "", time = ""] = localStd.split("T");
  return withDate ? `${time} ngày ${formatSolar(date)}` : time;
}

export function formatLunar(lunar: ChartSnapshot["lunar"]): string {
  return `${lunar.day}/${lunar.month}${lunar.isLeap ? " nhuận" : ""} năm ${lunar.canChi.year}`;
}

export function utcLabel(offsetMin: number): string {
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs - h * 60);
  return `UTC${offsetMin < 0 ? "−" : "+"}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

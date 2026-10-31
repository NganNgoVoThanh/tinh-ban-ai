/**
 * Giờ đồng hồ ở nước ngoài theo múi IANA của nơi sinh, đọc từ tzdata của trình duyệt (hoặc Node)
 * qua Intl. Giờ an sao là giờ chuẩn địa phương nơi sinh: bỏ giờ mùa hè nếu lúc đó đang áp dụng,
 * không đổi sang giờ Việt Nam (Technical Plan mục 5, đề xuất chờ duyệt).
 */
import type { ClockResolution } from './tz-policy.ts';

const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Độ lệch (phút) của múi IANA so với UTC tại một thời điểm. */
export function ianaOffsetMin(tz: string, utcMs: number): number {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    formatters.set(tz, f);
  }
  const name = f.formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName')!.value;
  if (name === 'GMT') return 0;
  const m = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name);
  if (!m) throw new Error(`Không đọc được độ lệch múi giờ: ${name}`);
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]) + Number(m[4] ?? 0) / 60);
}

/**
 * Độ lệch của giờ chuẩn (không tính giờ mùa hè) trong năm chứa thời điểm đó.
 * Đầu năm và cuối năm cùng độ lệch thì phần chênh giữa năm là giờ mùa hè, ở Bắc hay Nam bán cầu
 * đều lấy độ lệch nhỏ hơn. Nếu khác nhau, múi đã đổi hẳn giờ chuẩn trong năm: coi độ lệch lúc đó
 * là giờ chuẩn.
 */
export function standardOffsetMin(tz: string, utcMs: number): number {
  const y = new Date(utcMs).getUTCFullYear();
  const jan = ianaOffsetMin(tz, Date.UTC(y, 0, 1, 12));
  const jul = ianaOffsetMin(tz, Date.UTC(y, 6, 1, 12));
  const dec = ianaOffsetMin(tz, Date.UTC(y, 11, 31, 12));
  return jan === dec ? Math.min(jan, jul) : ianaOffsetMin(tz, utcMs);
}

/** Đổi giờ đồng hồ tại múi IANA sang UTC. wallMs = Date.UTC(...) của giờ đồng hồ, coi như UTC. */
export function resolveIanaClock(tz: string, wallMs: number): ClockResolution {
  const pick = (offsetMin: number, status: ClockResolution['status']): ClockResolution => ({
    utcMs: wallMs - offsetMin * 60_000,
    offsetMin,
    rule: 'ENG.TZ.ABROAD_IANA',
    status,
    uncertain: false,
  });
  const candidates = new Set([wallMs - DAY_MS, wallMs, wallMs + DAY_MS].map((t) => ianaOffsetMin(tz, t)));
  // Lệch lớn hơn ứng với thời điểm sớm hơn: khi giờ này có hai lần thì lấy lần đầu.
  const valid = [...candidates].filter((o) => ianaOffsetMin(tz, wallMs - o * 60_000) === o).sort((a, b) => b - a);
  if (valid.length === 1) return pick(valid[0]!, 'ok');
  if (valid.length > 1) return pick(valid[0]!, 'overlap');
  // Giờ rơi vào khoảng bị nhảy qua: hiểu theo độ lệch cũ, như thể đồng hồ chưa vặn.
  return pick(ianaOffsetMin(tz, wallMs - DAY_MS), 'gap');
}

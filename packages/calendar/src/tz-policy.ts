/**
 * Chính sách múi giờ (tz_policy): vùng × khoảng thời gian → độ lệch UTC của giờ đồng hồ,
 * và múi giờ dùng để tính lịch âm. Bảng có phiên bản; đổi bảng là đổi phiên bản.
 *
 * Giờ đồng hồ miền Nam lấy theo IANA tzdata, zone Asia/Ho_Chi_Minh (test đối chiếu với Intl).
 * Miền Bắc giống miền Nam đến 1955, sau đó giữ UTC+7. Giai đoạn 1947–1955 ở miền Bắc
 * không chắc (vùng Pháp kiểm soát dùng UTC+8, vùng kháng chiến dùng UTC+7) nên gắn cờ.
 *
 * Lịch âm: trước 1968 lịch Việt Nam tính theo UTC+8. Miền Bắc đổi sang UTC+7 từ năm 1968
 * (Tết Mậu Thân miền Bắc 29/1, miền Nam 30/1). Miền Nam dùng UTC+8 đến hết 1975.
 * Hai mốc lịch âm cần đối chiếu thêm với lịch in khi có sách tham chiếu.
 *
 * Sinh ở nước ngoài: giờ đồng hồ đọc theo múi IANA của nơi sinh (iana.ts), không qua bảng này;
 * ngày âm vẫn tính theo lịch Việt Nam (lịch chính thức, giống miền Bắc).
 */
import type { Region } from '@tinhban/shared';

export type { Region };
/** Vùng trong nước: giờ đồng hồ tra theo bảng tz_policy. */
export type VnRegion = Exclude<Region, 'abroad'>;

export interface ClockSpan {
  /** Thời điểm bắt đầu áp dụng, giờ UTC (ISO). Span đầu tiên dùng null = từ xưa. */
  fromUtc: string | null;
  offsetMin: number;
  rule: string;
  uncertain?: boolean;
}

export interface CalendarSpan {
  /** Ngày dương bắt đầu áp dụng (YYYY-MM-DD), null = từ xưa. */
  from: string | null;
  timeZone: number;
  rule: string;
}

export interface TzPolicy {
  version: string;
  clock: Record<VnRegion, ClockSpan[]>;
  calendar: Record<Region, CalendarSpan[]>;
}

const COMMON_UNTIL_1955: ClockSpan[] = [
  { fromUtc: null, offsetMin: 426.5, rule: 'ENG.TZ.LMT_PRE_1911' },
  { fromUtc: '1911-04-30T16:53:30Z', offsetMin: 420, rule: 'ENG.TZ.UTC7' },
  { fromUtc: '1942-12-31T16:00:00Z', offsetMin: 480, rule: 'ENG.TZ.UTC8_1943' },
  { fromUtc: '1945-03-14T15:00:00Z', offsetMin: 540, rule: 'ENG.TZ.UTC9_1945' },
  { fromUtc: '1945-09-01T15:00:00Z', offsetMin: 420, rule: 'ENG.TZ.UTC7' },
];

export const TZ_POLICY: TzPolicy = {
  version: '2026-10-30',
  clock: {
    south: [
      ...COMMON_UNTIL_1955,
      { fromUtc: '1947-03-31T17:00:00Z', offsetMin: 480, rule: 'ENG.TZ.UTC8_1947' },
      { fromUtc: '1955-06-30T17:00:00Z', offsetMin: 420, rule: 'ENG.TZ.UTC7' },
      { fromUtc: '1959-12-31T16:00:00Z', offsetMin: 480, rule: 'ENG.TZ.SOUTH_UTC8' },
      { fromUtc: '1975-06-12T16:00:00Z', offsetMin: 420, rule: 'ENG.TZ.UTC7' },
    ],
    north: [
      ...COMMON_UNTIL_1955,
      { fromUtc: '1947-03-31T17:00:00Z', offsetMin: 480, rule: 'ENG.TZ.NORTH_UTC8_1947', uncertain: true },
      { fromUtc: '1955-06-30T17:00:00Z', offsetMin: 420, rule: 'ENG.TZ.UTC7' },
    ],
  },
  calendar: {
    north: [
      { from: null, timeZone: 8, rule: 'ENG.CAL.UTC8_PRE_1968' },
      { from: '1968-01-01', timeZone: 7, rule: 'ENG.CAL.UTC7' },
    ],
    south: [
      { from: null, timeZone: 8, rule: 'ENG.CAL.SOUTH_UTC8' },
      { from: '1976-01-01', timeZone: 7, rule: 'ENG.CAL.UTC7' },
    ],
    abroad: [
      { from: null, timeZone: 8, rule: 'ENG.CAL.UTC8_PRE_1968' },
      { from: '1968-01-01', timeZone: 7, rule: 'ENG.CAL.UTC7' },
    ],
  },
};

/** Sau mốc này, vùng sinh không còn ảnh hưởng tới giờ hay lịch. */
export const REGION_IRRELEVANT_FROM = '1976-01-01';

const spanStartMs = (s: ClockSpan) => (s.fromUtc === null ? -Infinity : Date.parse(s.fromUtc));

export interface ClockResolution {
  utcMs: number;
  offsetMin: number;
  rule: string;
  /** gap: giờ này không có trên đồng hồ (lúc vặn kim tới); overlap: giờ này có hai lần (lúc vặn kim lui). */
  status: 'ok' | 'gap' | 'overlap';
  uncertain: boolean;
}

/** Đổi giờ đồng hồ tại vùng sang UTC. wallMs = Date.UTC(...) của giờ đồng hồ, coi như UTC. */
export function resolveClock(region: VnRegion, wallMs: number, policy: TzPolicy = TZ_POLICY): ClockResolution {
  const spans = policy.clock[region];
  const inSpan = (i: number) => {
    const s = spans[i]!;
    const utc = wallMs - s.offsetMin * 60_000;
    const next = spans[i + 1];
    return utc >= spanStartMs(s) && (next === undefined || utc < spanStartMs(next));
  };
  const hits = spans.map((_, i) => i).filter(inSpan);
  const pick = (i: number, status: ClockResolution['status']): ClockResolution => {
    const s = spans[i]!;
    return {
      utcMs: wallMs - s.offsetMin * 60_000,
      offsetMin: s.offsetMin,
      rule: s.rule,
      status,
      uncertain: s.uncertain === true,
    };
  };
  if (hits.length === 1) return pick(hits[0]!, 'ok');
  if (hits.length > 1) return pick(hits[0]!, 'overlap');
  // Giờ rơi vào khoảng bị nhảy qua: hiểu theo độ lệch cũ, như thể đồng hồ chưa vặn.
  for (let i = 1; i < spans.length; i++) {
    const start = spanStartMs(spans[i]!);
    if (wallMs - spans[i - 1]!.offsetMin * 60_000 >= start && wallMs - spans[i]!.offsetMin * 60_000 < start) {
      return pick(i - 1, 'gap');
    }
  }
  throw new Error('tz_policy không phủ thời điểm này');
}

/** Múi giờ dùng để tính lịch âm cho một ngày dương tại vùng. */
export function calendarTimeZone(region: Region, isoDate: string, policy: TzPolicy = TZ_POLICY): CalendarSpan {
  const spans = policy.calendar[region];
  let current = spans[0]!;
  for (const s of spans) {
    if (s.from === null || isoDate >= s.from) current = s;
  }
  return current;
}

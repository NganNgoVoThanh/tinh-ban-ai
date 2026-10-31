/**
 * Xem ngày dân gian (Technical Plan mục 8): hoàng đạo/hắc đạo theo 12 thần, 12 trực, giờ hoàng đạo,
 * hợp/xung với tuổi. Không trộn với Tử Vi Đẩu Số; kết quả mang nhãn Dân gian.
 *
 * Quy tắc theo cách tính phổ biến trong lịch Việt (giờ hoàng đạo khớp bảng của lịch Hồ Ngọc Đức).
 * Sách tham chiếu chưa chọn (mục 22, việc 8): khi chọn xong thì đối chiếu cả 3 năm chọn được và
 * tăng FOLK_VERSION nếu phải sửa. Nhị thập bát tú chờ sách để chốt mốc khởi đầu của vòng 28 sao.
 */
import { canChiName, CHI, dayCanChi, formatDate, monthCanChi, parseDate, SOLAR_TERMS, solarMonthBranch, solarTermIndex, solarToLunar, yearCanChi, type SolarDate } from '@tinhban/calendar';

export const FOLK_VERSION = '0.1.0';

/** 12 thần, đi thuận theo địa chi ngày (hoặc giờ). */
export const THAN = ['Thanh Long', 'Minh Đường', 'Thiên Hình', 'Chu Tước', 'Kim Quỹ', 'Kim Đường', 'Bạch Hổ', 'Ngọc Đường', 'Thiên Lao', 'Huyền Vũ', 'Tư Mệnh', 'Câu Trận'] as const;
/** Thần hoàng đạo: Thanh Long, Minh Đường, Kim Quỹ, Kim Đường, Ngọc Đường, Tư Mệnh. */
const HOANG_DAO = new Set([0, 1, 4, 5, 7, 10]);

export const TRUC = ['Kiến', 'Trừ', 'Mãn', 'Bình', 'Định', 'Chấp', 'Phá', 'Nguy', 'Thành', 'Thu', 'Khai', 'Bế'] as const;

export const HOUR_RANGES = ['23–01', '01–03', '03–05', '05–07', '07–09', '09–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23'];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * Địa chi khởi Thanh Long: tháng (hoặc ngày, khi xét giờ) Dần/Thân khởi ở Tý, Mão/Dậu ở Dần,
 * Thìn/Tuất ở Thìn, Tỵ/Hợi ở Ngọ, Ngọ/Tý ở Thân, Mùi/Sửu ở Tuất.
 */
const thanhLongAt = (branch: number) => (((branch - 2) % 6 + 6) % 6) * 2;

/** Thần của một địa chi (ngày trong tháng, hoặc giờ trong ngày). */
const thanOf = (anchorBranch: number, branch: number) => mod12(branch - thanhLongAt(anchorBranch));

/** Giờ hoàng đạo của một ngày theo địa chi ngày. */
export function goodHours(dayBranch: number): number[] {
  return Array.from({ length: 12 }, (_, h) => h).filter((h) => HOANG_DAO.has(thanOf(dayBranch, h)));
}

export type AgeRelation = 'luc_hop' | 'tam_hop' | 'luc_xung' | null;

/** Quan hệ dân gian giữa địa chi ngày và địa chi năm sinh: lục xung, lục hợp, tam hợp. */
export function ageRelation(dayBranch: number, yearBranch: number): AgeRelation {
  if (mod12(dayBranch - yearBranch) === 6) return 'luc_xung';
  if (mod12(dayBranch + yearBranch) === 1) return 'luc_hop';
  if (dayBranch !== yearBranch && dayBranch % 4 === yearBranch % 4) return 'tam_hop';
  return null;
}

export interface DayPerson {
  profileId: string;
  /** Địa chi năm sinh âm lịch (0 = Tý). */
  yearBranch: number;
}

export interface DayInfo {
  date: string;
  /** 0 = Chủ nhật … 6 = Thứ bảy. */
  weekday: number;
  lunar: { year: number; month: number; day: number; isLeap: boolean };
  canChi: { year: string; month: string; day: string };
  solarTerm: string;
  hoangDao: { good: boolean; than: string };
  truc: string;
  goodHours: { branch: string; range: string }[];
  people: { profileId: string; relation: 'hop' | 'xung' | 'none'; detail: AgeRelation }[];
  folkVersion: string;
}

/** Dữ liệu màn Hôm nay cho một ngày bất kỳ, kèm hợp/xung với tuổi từng hồ sơ. */
export function getDayInfo(date: string | SolarDate, people: DayPerson[] = []): DayInfo {
  const solar = typeof date === 'string' ? parseDate(date) : date;
  // Phạm vi chọn ngày là năm trước đến năm sau: sau 1976 lịch hai miền như nhau.
  const lunar = solarToLunar(solar, 'north');
  const day = dayCanChi(solar);
  const monthBranch = mod12(lunar.month + 1);
  const than = thanOf(monthBranch, day.chi);
  return {
    date: formatDate(solar),
    weekday: new Date(Date.UTC(solar.year, solar.month - 1, solar.day)).getUTCDay(),
    lunar: { year: lunar.year, month: lunar.month, day: lunar.day, isLeap: lunar.isLeap },
    canChi: {
      year: canChiName(yearCanChi(lunar.year)),
      month: canChiName(monthCanChi(lunar.year, lunar.month)),
      day: canChiName(day),
    },
    solarTerm: SOLAR_TERMS[solarTermIndex(solar)]!,
    hoangDao: { good: HOANG_DAO.has(than), than: THAN[than]! },
    truc: TRUC[mod12(day.chi - solarMonthBranch(solar))]!,
    goodHours: goodHours(day.chi).map((h) => ({ branch: CHI[h]!, range: HOUR_RANGES[h]! })),
    people: people.map((p) => {
      const detail = ageRelation(day.chi, p.yearBranch);
      return { profileId: p.profileId, relation: detail === 'luc_xung' ? 'xung' : detail ? 'hop' : 'none', detail };
    }),
    folkVersion: FOLK_VERSION,
  };
}

/**
 * Kiểu dữ liệu dùng chung giữa các package (Technical Plan v1.2, mục 23).
 */

/** Nam phái (Tam Hợp), Bắc phái (Phi Tinh / Tứ Hóa). */
export const SCHOOL_IDS = ['nam', 'bac'] as const;
export type SchoolId = (typeof SCHOOL_IDS)[number];
/** Giao diện luôn viết đủ tên phái, không rút gọn thành "Nam"/"Bắc" (dễ nhầm với giới tính). */
export const SCHOOL_NAMES: Record<SchoolId, string> = { nam: 'Nam phái', bac: 'Bắc phái' };

export type TimeCertainty = 'exact' | 'canh' | 'unknown';
export type Region = 'north' | 'south' | 'abroad';
export type Door = 'A' | 'B';
/** Ví dụ: 'palace:quan_loc|star:thai_duong|state:mieu'. */
export type FactId = string;

export interface BirthInput {
  calendar: 'solar' | 'lunar';
  /** YYYY-MM-DD theo lịch đã chọn. */
  date: string;
  /** Chỉ khi calendar = 'lunar'. */
  isLeapMonth?: boolean;
  timeCertainty: TimeCertainty;
  /** exact: HH:mm theo giờ ghi trên giấy tờ. */
  time?: string;
  /** canh: 0 = Tý … 11 = Hợi. */
  timeBranch?: number;
  /** Chỉ khi timeBranch = 0. */
  tyPart?: 'before_midnight' | 'after_midnight';
  /** Suy ra từ provinceCode (regionOfProvince trong calendar). */
  region: Region;
  /** Danh mục 63 tỉnh trước 07/2025; bắt buộc nếu sinh trước 1976. */
  provinceCode?: string;
  /** Chỉ Quảng Trị, sinh 1954–1975. */
  benHaiSide?: 'north' | 'south';
  /** IANA, khi region = 'abroad'. */
  abroadTz?: string;
  /** exact: HH:mm giờ chuẩn do người dùng tự sửa. */
  stdTimeOverride?: string;
  gender: 'male' | 'female';
}

export interface LocalProfile {
  profileId: string;
  displayNameLocal?: string;
  birth: BirthInput;
  schoolId: SchoolId;
  createdAt: string;
  updatedAt: string;
  consentFlags: { analytics: boolean };
}

export interface Settings {
  door: Door;
  theme: 'system' | 'light' | 'dark';
  /** Ban đầu 'nam'. */
  defaultSchool: SchoolId;
  activeProfileId?: string;
  reminders: { ics: boolean; push: boolean };
  /** null = chưa hỏi. */
  analyticsConsent: boolean | null;
}

/** Khác biệt giữa hai phái nằm ở đây, không rải `if` theo phái trong code. */
export interface SchoolPolicy {
  id: SchoolId;
  /** Giờ 23:00–23:59: tính là giờ Tý của ngày hôm sau, hay của chính ngày đó. */
  lateTy: 'next_day' | 'same_day';
  /**
   * Sinh tháng nhuận: tính như tháng chính (same_month, giống lasotuvi), hay nửa đầu
   * tính tháng đó và từ ngày 16 tính tháng sau (split_15, mặc định của iztro).
   */
  leapMonth: 'same_month' | 'split_15';
  /** Can → key sao mang Lộc, Quyền, Khoa, Kỵ. */
  mutagenTable: Record<string, [string, string, string, string]>;
  /** 5: Miếu, Vượng, Đắc, Bình, Hãm (lối Việt Nam). 7: thêm Lợi, Bất (lối Trung Quốc của iztro). */
  brightnessScale: 5 | 7;
  /** Mã quy tắc an sao. */
  minorStarRules: { hoaLinh: string; khoiViet: string };
  showPalaceStems: boolean;
  palaceTapMode: 'tam_phuong' | 'phi_hoa';
}

export type Brightness = 'mieu' | 'vuong' | 'dac' | 'loi' | 'binh' | 'bat' | 'ham';
export type Mutagen = 'loc' | 'quyen' | 'khoa' | 'ky';
export const MUTAGENS: readonly Mutagen[] = ['loc', 'quyen', 'khoa', 'ky'];

export interface MutagenHit {
  mutagen: Mutagen;
  starKey: string;
  palaceKey?: string;
  /** Tự hóa: sao mang hóa nằm ngay trong cung phát hóa. */
  self?: boolean;
}

export interface StarFact {
  key: string;
  name: string;
  kind: 'major' | 'minor' | 'adjective';
  brightness?: Brightness;
  mutagen?: Mutagen;
}

export interface PalaceFacts {
  key: string;
  name: string;
  /** Địa chi của cung, ví dụ 'Ngọ'. */
  branch: string;
  stem: string;
  isBody: boolean;
  majorStars: StarFact[];
  minorStars: StarFact[];
  adjectiveStars: StarFact[];
  rings: { changsheng: string; boshi: string; suiqian: string; jiangqian: string };
  decadal: { from: number; to: number };
}

/** Sao an theo năm, dùng khi thiếu giờ sinh: chỉ biết địa chi, không gán tên cung. */
export interface BranchStars {
  branch: string;
  stars: StarFact[];
}

export interface ChartCore {
  menhBranch: string;
  thanBranch: string;
  cuc: { element: string; number: number; name: string };
  menhChu: string;
  thanChu: string;
}

export type WarningCode =
  | 'NO_BIRTH_TIME'
  | 'TIME_APPROX'
  | 'TZ_GAP'
  | 'TZ_OVERLAP'
  | 'TZ_UNCERTAIN'
  | 'REGION_ABROAD'
  | 'LEAP_MONTH'
  | 'UNSUPPORTED_DAY30';

export interface Warning {
  code: WarningCode;
  message: string;
}

export interface TraceStep {
  rule: string;
  detail?: string;
}

export interface ChartSnapshot {
  profileId: string;
  engineVersion: string;
  schoolId: SchoolId;
  tzPolicyVersion: string;
  normalizedTime?: { utc: string; localStd: string; ruleCode: string };
  lunar: {
    year: number;
    month: number;
    day: number;
    isLeap: boolean;
    canChi: { year: string; month: string; day: string; hour?: string };
  };
  facts: FactId[];
  /** Không có khi thiếu giờ sinh hoặc ngày chưa hỗ trợ (UNSUPPORTED_DAY30). */
  palaces?: PalaceFacts[];
  core?: ChartCore;
  /** Chỉ có khi thiếu giờ sinh. */
  yearStars?: BranchStars[];
  warnings: Warning[];
  trace: TraceStep[];
  generatedAt: string;
}

export interface AnswerSentence {
  text: string;
  ruleIds: string[];
  factIds: FactId[];
  label: 'fact' | 'interpretation' | 'folk' | 'suggestion';
}

/** Một câu hỏi đáp, chỉ lưu trên máy (Technical Plan mục 10). */
export interface QaHistoryItem {
  id: string;
  profileId: string;
  createdAt: string;
  /** Chỉ lưu trên máy. */
  question: string;
  questionType?: string;
  answer: { sentences: AnswerSentence[]; followups: string[] };
  source: 'kb' | 'cache' | 'llm' | 'fallback';
  schoolId: SchoolId;
  kbVersion: string;
}

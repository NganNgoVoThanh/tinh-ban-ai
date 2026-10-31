import { formatDate, lunarToSolar, normalizeBirthTime, parseDate, parseLunarDate } from "@tinhban/calendar";
import { checkBirthPlace } from "@tinhban/chart-engine";
import type { LocalProfile, QaHistoryItem, Settings } from "@tinhban/shared";
import { z } from "zod";

/**
 * File sao lưu (Technical Plan mục 11): hồ sơ (có tên), cài đặt, lịch sử hỏi đáp. Không có snapshot
 * vì lá số tính lại được. File chưa mã hóa. Khi nhập, mọi trường đều được kiểm vì file đến từ ngoài.
 */
export const BACKUP_VERSION = 1;

const hm = z.string().regex(/^\d{2}:\d{2}$/);
const birthSchema = z.object({
  calendar: z.enum(["solar", "lunar"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isLeapMonth: z.boolean().optional(),
  timeCertainty: z.enum(["exact", "canh", "unknown"]),
  time: hm.optional(),
  timeBranch: z.number().int().min(0).max(11).optional(),
  tyPart: z.enum(["before_midnight", "after_midnight"]).optional(),
  region: z.enum(["north", "south", "abroad"]),
  provinceCode: z.string().regex(/^\d{2}$/).optional(),
  benHaiSide: z.enum(["north", "south"]).optional(),
  abroadTz: z.string().max(64).optional(),
  stdTimeOverride: hm.optional(),
  gender: z.enum(["male", "female"]),
});
const schoolSchema = z.enum(["nam", "bac"]);
const profileSchema = z.object({
  profileId: z.string().regex(/^[0-9a-z]{6,40}$/),
  displayNameLocal: z.string().max(40).optional(),
  birth: birthSchema,
  schoolId: schoolSchema,
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  consentFlags: z.object({ analytics: z.boolean() }),
});
const settingsSchema = z
  .object({
    door: z.enum(["A", "B"]),
    theme: z.enum(["system", "light", "dark"]),
    defaultSchool: schoolSchema,
    activeProfileId: z.string().max(40).optional(),
    reminders: z.object({ ics: z.boolean(), push: z.boolean() }),
    analyticsConsent: z.boolean().nullable(),
  })
  .partial();
const sentenceSchema = z.object({
  text: z.string().max(2000),
  ruleIds: z.array(z.string().max(80)).max(20),
  factIds: z.array(z.string().max(120)).max(40),
  label: z.enum(["fact", "interpretation", "folk", "suggestion"]),
});
const qaSchema = z.object({
  id: z.string().max(40),
  profileId: z.string().max(40),
  createdAt: z.string().max(40),
  question: z.string().max(300),
  questionType: z.string().max(80).optional(),
  answer: z.object({ sentences: z.array(sentenceSchema).max(12), followups: z.array(z.string().max(300)).max(6) }),
  source: z.enum(["kb", "cache", "llm", "fallback"]),
  schoolId: schoolSchema,
  kbVersion: z.string().max(40),
});
const backupSchema = z.object({
  app: z.literal("tinhban"),
  kind: z.literal("backup"),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  profiles: z.array(z.unknown()).max(500),
  settings: z.unknown().optional(),
  qaHistory: z.array(z.unknown()).max(200_000).optional(),
});

export interface Backup {
  app: "tinhban";
  kind: "backup";
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  profiles: LocalProfile[];
  settings: Settings;
  qaHistory: QaHistoryItem[];
}

export function buildBackup(data: { profiles: LocalProfile[]; settings: Settings; qaHistory: QaHistoryItem[] }, now: Date): Backup {
  return { app: "tinhban", kind: "backup", version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data };
}

export const backupFileName = (now: Date) =>
  `tinhban-saoluu-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.json`;

export class BackupError extends Error {
  override name = "BackupError";
}

/** Đầu vào hồ sơ dựng được lá số không (kiểm nhanh, không an sao). */
function birthIsUsable(p: LocalProfile): boolean {
  try {
    const b = p.birth;
    const solar = b.calendar === "solar" ? parseDate(b.date) : lunarToSolar(parseLunarDate(b.date), b.isLeapMonth === true, b.region);
    if (!solar) return false;
    const solarDate = formatDate(solar);
    checkBirthPlace(b, solarDate);
    normalizeBirthTime({ ...b, date: solarDate });
    return true;
  } catch {
    return false;
  }
}

export interface ParsedBackup {
  profiles: LocalProfile[];
  settings: Partial<Settings>;
  qaHistory: QaHistoryItem[];
  /** Số bản ghi bị bỏ vì không hợp lệ. */
  invalid: number;
}

/** Đọc file sao lưu: sai định dạng thì báo lỗi; từng hồ sơ hoặc câu hỏi hỏng thì bỏ qua và đếm. */
export function parseBackup(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError("File không phải file sao lưu của Tinh Bàn");
  }
  const top = backupSchema.safeParse(json);
  if (!top.success) throw new BackupError("File không phải file sao lưu của Tinh Bàn, hoặc là phiên bản chưa hỗ trợ");
  let invalid = 0;
  const profiles: LocalProfile[] = [];
  for (const raw of top.data.profiles) {
    const p = profileSchema.safeParse(raw);
    if (p.success && birthIsUsable(p.data as LocalProfile)) profiles.push(p.data as LocalProfile);
    else invalid++;
  }
  const ids = new Set(profiles.map((p) => p.profileId));
  const qaHistory: QaHistoryItem[] = [];
  for (const raw of top.data.qaHistory ?? []) {
    const q = qaSchema.safeParse(raw);
    if (q.success && ids.has(q.data.profileId)) qaHistory.push(q.data as QaHistoryItem);
    else invalid++;
  }
  const settings = settingsSchema.safeParse(top.data.settings ?? {});
  return { profiles, settings: settings.success ? (settings.data as Partial<Settings>) : {}, qaHistory, invalid };
}

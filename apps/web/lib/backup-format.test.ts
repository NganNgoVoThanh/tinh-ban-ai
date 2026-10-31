import type { LocalProfile, QaHistoryItem } from "@tinhban/shared";
import { describe, expect, it } from "vitest";
import { backupFileName, BackupError, buildBackup, parseBackup } from "./backup-format";
import { DEFAULT_SETTINGS } from "./settings-defaults";

const profile = (id: string, birth: Partial<LocalProfile["birth"]> = {}): LocalProfile => ({
  profileId: id,
  displayNameLocal: "Minh",
  birth: { calendar: "solar", date: "2000-08-16", timeCertainty: "exact", time: "03:30", region: "north", gender: "male", ...birth },
  schoolId: "bac",
  createdAt: "2026-10-30T00:00:00.000Z",
  updatedAt: "2026-10-30T00:00:00.000Z",
  consentFlags: { analytics: false },
});

describe("file sao lưu", () => {
  it("xuất rồi đọc lại ra đúng hồ sơ, cài đặt, lịch sử", () => {
    const qa: QaHistoryItem = {
      id: "q1",
      profileId: "abcdef123456",
      createdAt: "2026-10-30T01:00:00.000Z",
      question: "Năm nay công việc thế nào?",
      answer: { sentences: [{ text: "…", ruleIds: ["TV.X.1"], factIds: [], label: "interpretation" }], followups: [] },
      source: "kb",
      schoolId: "bac",
      kbVersion: "0.1.0",
    };
    const backup = buildBackup({ profiles: [profile("abcdef123456")], settings: { ...DEFAULT_SETTINGS, door: "B" }, qaHistory: [qa] }, new Date());
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.profiles).toEqual([profile("abcdef123456")]);
    expect(parsed.settings.door).toBe("B");
    expect(parsed.qaHistory).toEqual([qa]);
    expect(parsed.invalid).toBe(0);
  });

  it("bỏ qua hồ sơ hỏng hoặc không dựng được lá số, đếm số bị bỏ", () => {
    const backup = buildBackup(
      {
        profiles: [
          profile("abcdef123456"),
          { ...profile("bad0000000"), schoolId: "khac" as "nam" },
          profile("xyz1234567", { date: "2023-02-30" }),
          // Sinh trước 1976 mà không có tỉnh.
          profile("nopro00000", { date: "1965-01-01", region: "south" }),
        ],
        settings: DEFAULT_SETTINGS,
        qaHistory: [],
      },
      new Date(),
    );
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.profiles.map((p) => p.profileId)).toEqual(["abcdef123456"]);
    expect(parsed.invalid).toBe(3);
  });

  it("từ chối file lạ", () => {
    expect(() => parseBackup("không phải json")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: "khac" }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: "tinhban", kind: "backup", version: 99, exportedAt: "", profiles: [] }))).toThrow(BackupError);
  });

  it("tên file theo ngày", () => {
    expect(backupFileName(new Date(2026, 9, 5))).toBe("tinhban-saoluu-20261005.json");
  });
});

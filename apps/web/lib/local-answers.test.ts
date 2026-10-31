import { computeChart } from "@tinhban/chart-engine";
import type { BirthInput, LocalProfile } from "@tinhban/shared";
import { describe, expect, it } from "vitest";
import { familyYearSentences, todaySentences, yearSentences, type Person } from "./local-answers";

const person = (name: string, birth: BirthInput): Person => {
  const profile: LocalProfile = { profileId: name, birth, schoolId: "nam", createdAt: "2026-10-30T00:00:00Z", updatedAt: "2026-10-30T00:00:00Z", consentFlags: { analytics: false } };
  return { name, profile, snapshot: computeChart(birth, "nam", undefined, { profileId: name, now: new Date(0) }) };
};

const minh = person("Minh", { calendar: "solar", date: "1990-05-15", time: "10:30", timeCertainty: "exact", region: "south", gender: "male" });
const lan = person("Lan", { calendar: "solar", date: "1996-02-20", timeCertainty: "unknown", region: "south", gender: "female" });

describe("câu gợi ý trả lời bằng dữ kiện trên máy", () => {
  it("năm nay của một người: đại vận, cung hạn, Tứ hóa năm (dữ kiện) và hợp/xung tuổi (dân gian)", () => {
    const s = yearSentences(minh, 2026, false);
    expect(s.map((x) => x.label)).toEqual(["fact", "fact", "folk"]);
    expect(s[0]!.text).toMatch(/^Năm 2026 Bính Ngọ, 37 tuổi âm; đại vận ở cung .+, cung hạn năm là .+\.$/);
    expect(s[1]!.factIds.every((f) => f.startsWith("year:2026|"))).toBe(true);
    expect(s[2]!.text).toContain("tuổi Canh Ngọ");
    expect(s.every((x) => x.ruleIds.length === 0)).toBe(true);
  });

  it("thiếu giờ sinh thì nói rõ cần giờ sinh, không đoán cung", () => {
    const s = yearSentences(lan, 2026, true);
    expect(s[0]!.text).toContain("Lan · Năm 2026");
    expect(s[0]!.text).toContain("Cần giờ sinh");
  });

  it("cả nhà: mỗi người một nhóm câu có tên", () => {
    const s = familyYearSentences([minh, lan], 2026);
    expect(s.filter((x) => x.text.startsWith("Minh · "))).toHaveLength(3);
    expect(s.filter((x) => x.text.startsWith("Lan · "))).toHaveLength(2);
  });

  it("hôm nay: lịch là dữ kiện, hoàng đạo, giờ tốt, hợp/xung là dân gian", () => {
    const s = todaySentences("2026-10-30", [minh, lan]);
    expect(s[0]!.label).toBe("fact");
    expect(s[0]!.text).toMatch(/âm lịch, ngày .+ tháng .+, tiết .+\.$/);
    expect(s.slice(1).every((x) => x.label === "folk")).toBe(true);
    expect(s[1]!.text).toMatch(/hoàng đạo|hắc đạo/);
  });
});

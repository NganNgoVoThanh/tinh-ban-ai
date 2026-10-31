import { canChiName, yearCanChi } from "@tinhban/calendar";
import { getYearView } from "@tinhban/chart-engine";
import { ageRelation, getDayInfo } from "@tinhban/folk-calendar";
import { MUTAGEN_NAMES, PALACES } from "@tinhban/kb";
import { MUTAGENS, type AnswerSentence, type ChartSnapshot, type LocalProfile } from "@tinhban/shared";
import { weekdayName } from "./today";

/**
 * Câu gợi ý trả lời từ dữ kiện tính được trên máy (Technical Plan mục 7–10): năm nay của một người
 * hoặc cả nhà (đại vận, cung hạn, Tứ hóa năm) và hôm nay (lịch, hoàng đạo, trực, giờ tốt, hợp/xung
 * tuổi). Chỉ có nhãn Dữ kiện và Dân gian; diễn giải Tử Vi chỉ đến từ kho đã duyệt.
 */
export interface Person {
  name: string;
  profile: LocalProfile;
  snapshot: ChartSnapshot;
}

export const LOCAL_QUESTIONS = {
  year: "Năm nay của tôi thế nào?",
  year_family: "Năm nay của cả nhà thế nào?",
  today: "Hôm nay là ngày thế nào với cả nhà?",
} as const;

export type LocalQuestion = keyof typeof LOCAL_QUESTIONS;

const palaceName = (key?: string) => (key ? (PALACES[key] ?? key) : "…");
const fact = (text: string, factIds: string[] = []): AnswerSentence => ({ text, ruleIds: [], factIds, label: "fact" });
const folk = (text: string): AnswerSentence => ({ text, ruleIds: [], factIds: [], label: "folk" });

const RELATION = { luc_hop: "hợp (lục hợp)", tam_hop: "hợp (tam hợp)", luc_xung: "xung (lục xung)" } as const;

/** Năm nay của một người, theo phái của hồ sơ. */
export function yearSentences(person: Person, lunarYear: number, withName: boolean): AnswerSentence[] {
  const { snapshot, profile } = person;
  const v = getYearView(snapshot, lunarYear, profile.birth.gender);
  const who = withName ? `${person.name} · ` : "";
  const out: AnswerSentence[] = [];
  if (!snapshot.palaces) {
    out.push(fact(`${who}Năm ${lunarYear} ${v.canChi}, ${v.ageLunar} tuổi âm. Cần giờ sinh để biết đại vận và cung hạn.`));
  } else {
    const limit = v.smallLimitPalaceKey ?? v.yearPalaceKey;
    out.push(
      fact(
        `${who}Năm ${lunarYear} ${v.canChi}, ${v.ageLunar} tuổi âm; đại vận ở cung ${palaceName(v.decade?.palaceKey)} (${v.decade?.from}–${v.decade?.to} tuổi), cung hạn năm là ${palaceName(limit)}.`,
      ),
    );
    const hits = MUTAGENS.flatMap((m) => {
      const h = v.yearMutagens.find((x) => x.mutagen === m && x.palaceKey);
      return h ? [`${MUTAGEN_NAMES[m]} vào ${palaceName(h.palaceKey)}`] : [];
    });
    if (hits.length) out.push(fact(`${who}Tứ hóa của năm: ${hits.join(", ")}.`, v.facts.filter((f) => f.startsWith("year:"))));
  }
  const rel = ageRelation(yearCanChi(lunarYear).chi, yearCanChi(snapshot.lunar.year).chi);
  out.push(folk(`${who}Dân gian: tuổi ${canChiName(yearCanChi(snapshot.lunar.year))} ${rel ? RELATION[rel] : "không xung, không hợp"} với năm ${v.canChi}.`));
  return out;
}

export function familyYearSentences(people: Person[], lunarYear: number): AnswerSentence[] {
  return people.flatMap((p) => yearSentences(p, lunarYear, true));
}

/** Hôm nay với cả nhà: dữ kiện lịch, xem ngày dân gian, hợp/xung theo tuổi từng người. */
export function todaySentences(iso: string, people: Person[]): AnswerSentence[] {
  const info = getDayInfo(
    iso,
    people.map((p) => ({ profileId: p.profile.profileId, yearBranch: yearCanChi(p.snapshot.lunar.year).chi })),
  );
  const out = [
    fact(
      `${weekdayName(info.weekday)}, ngày ${info.lunar.day}/${info.lunar.month}${info.lunar.isLeap ? " nhuận" : ""} âm lịch, ngày ${info.canChi.day} tháng ${info.canChi.month}, tiết ${info.solarTerm}.`,
    ),
    folk(
      `Dân gian: ngày ${info.hoangDao.good ? "hoàng đạo" : "hắc đạo"} (${info.hoangDao.than}), trực ${info.truc}; giờ tốt: ${info.goodHours.map((h) => `${h.branch} (${h.range})`).join(", ")}.`,
    ),
  ];
  const nameOf = (id: string) => people.find((p) => p.profile.profileId === id)?.name ?? "";
  const hop = info.people.filter((p) => p.relation === "hop").map((p) => nameOf(p.profileId));
  const xung = info.people.filter((p) => p.relation === "xung").map((p) => nameOf(p.profileId));
  if (hop.length || xung.length) {
    const parts = [hop.length && `hợp tuổi ${hop.join(", ")}`, xung.length && `xung tuổi ${xung.join(", ")}`].filter(Boolean);
    out.push(folk(`Dân gian: ngày ${info.canChi.day} ${parts.join("; ")}.`));
  }
  return out;
}

import { yearCanChi } from "@tinhban/calendar";
import { computeChart, getFlyingMutagens, InvalidBirthInputError, SCHOOLS, tamPhuongTuChinh } from "@tinhban/chart-engine";
import { MUTAGEN_NAMES, PALACES, starName } from "@tinhban/kb";
import type { ChartSnapshot, LocalProfile } from "@tinhban/shared";
import type { FlyArrow } from "@tinhban/ui";

export type ChartResult = { snapshot: ChartSnapshot; error?: undefined } | { snapshot?: undefined; error: string };

/**
 * Tính lá số trên máy (35–70 ms). Lỗi trả về thành thông báo, không ném: lỗi đầu vào giữ lời của bộ
 * tính (đã viết cho người dùng), lỗi nội bộ thay bằng câu chung, không lộ chi tiết kỹ thuật.
 */
export function chartOf(profile: LocalProfile): ChartResult {
  try {
    return { snapshot: computeChart(profile.birth, profile.schoolId, undefined, { profileId: profile.profileId }) };
  } catch (e) {
    return { error: e instanceof InvalidBirthInputError ? e.message : "hãy xem lại ngày giờ sinh trong Sửa hồ sơ." };
  }
}

/** Ngày sinh dương lịch của hồ sơ; hồ sơ nhập âm lịch lấy ngày đã đổi từ trace của bộ tính. */
export function solarDateOf(profile: LocalProfile, s: ChartSnapshot): string {
  if (profile.birth.calendar === "solar") return profile.birth.date;
  return s.trace.find((t) => t.rule === "ENG.CAL.LUNAR_INPUT")?.detail ?? profile.birth.date;
}

export interface Selection {
  strong: string[];
  soft: string[];
  arrows: FlyArrow[];
  badges: Record<string, string[]>;
  /** Mô tả bằng chữ của những gì đang làm nổi bật, cho người dùng và trình đọc màn hình. */
  summary: string;
}

const palaceName = (key: string) => PALACES[key] ?? key;

/** Chạm vào một cung: Nam phái sáng tam phương tứ chính, Bắc phái vẽ phi hóa (Technical Plan mục 6). */
export function selectionOf(snapshot: ChartSnapshot, palaceKey: string | null): Selection {
  const empty: Selection = { strong: [], soft: [], arrows: [], badges: {}, summary: "" };
  if (!palaceKey || !snapshot.palaces) return empty;
  const palace = snapshot.palaces.find((p) => p.key === palaceKey);
  if (!palace) return empty;
  if (SCHOOLS[snapshot.schoolId].palaceTapMode === "tam_phuong") {
    const t = tamPhuongTuChinh(snapshot, palaceKey);
    return {
      ...empty,
      strong: [t.self],
      soft: [...t.tamHop, t.xungChieu],
      summary: `Tam phương tứ chính của ${palaceName(t.self)}: tam hợp ${t.tamHop.map(palaceName).join(", ")}; xung chiếu ${palaceName(t.xungChieu)}.`,
    };
  }
  const hits = getFlyingMutagens(snapshot, palaceKey);
  const self = hits.filter((h) => h.self).map((h) => `Tự hóa ${MUTAGEN_NAMES[h.mutagen]}`);
  const parts = hits.map((h) => {
    const star = starName(h.starKey, h.starKey);
    return h.self ? `${MUTAGEN_NAMES[h.mutagen]}: tự hóa (${star})` : `${MUTAGEN_NAMES[h.mutagen]} → ${palaceName(h.palaceKey ?? "")} (${star})`;
  });
  return {
    strong: [palaceKey],
    soft: hits.flatMap((h) => (h.palaceKey && !h.self ? [h.palaceKey] : [])),
    arrows: hits.flatMap((h) => (h.palaceKey ? [{ from: palaceKey, to: h.palaceKey, mutagen: h.mutagen }] : [])),
    badges: self.length ? { [palaceKey]: self } : {},
    summary: `Phi hóa từ ${palaceName(palaceKey)} (can ${palace.stem}): ${parts.join("; ")}.`,
  };
}

/** "Dương nam", "Âm nữ"… theo can năm sinh âm lịch. */
export function yinYangGender(snapshot: ChartSnapshot, gender: "male" | "female"): string {
  const yang = yearCanChi(snapshot.lunar.year).can % 2 === 0;
  return `${yang ? "Dương" : "Âm"} ${gender === "male" ? "nam" : "nữ"}`;
}


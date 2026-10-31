import { getYearView } from "@tinhban/chart-engine";
import { getApplicableRules, MUTAGEN_NAMES, PALACES, type KnowledgeBundle } from "@tinhban/kb";
import { composeExplanation } from "@tinhban/narrative";
import { MUTAGENS, SCHOOL_NAMES, type ChartSnapshot, type Door } from "@tinhban/shared";

/**
 * Thẻ chia sẻ "Năm nay của tôi" (Technical Plan mục 14): vẽ trên máy, SVG → canvas → PNG 1080×1350,
 * nền đỏ son và vàng kim (ADR 0007). Thẻ chỉ có năm, cung hạn, Tứ hóa năm và chủ đề năm từ kho; không có ngày giờ
 * sinh, tuổi, tên hay mã hồ sơ.
 */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export interface YearCard {
  lunarYear: number;
  canChi: string;
  schoolName: string;
  limitPalace: string;
  mutagens: { name: string; palace: string }[];
  theme?: string;
  /** Link về trang giới thiệu, chọn sẵn cửa; không có ID người dùng. */
  url: string;
}

const palaceName = (key?: string) => (key ? (PALACES[key] ?? key) : "");

/** Dữ liệu thẻ của một lá số trong một năm âm; null khi thiếu giờ sinh (không có cung hạn). */
export function yearCardOf(snapshot: ChartSnapshot, gender: "male" | "female", lunarYear: number, origin: string, door: Door, kb: KnowledgeBundle): YearCard | null {
  if (!snapshot.palaces) return null;
  const v = getYearView(snapshot, lunarYear, gender);
  const theme = composeExplanation(getApplicableRules(snapshot, kb, "year").slice(0, 1), snapshot, kb)[0]?.headline;
  return {
    lunarYear,
    canChi: v.canChi,
    schoolName: SCHOOL_NAMES[snapshot.schoolId],
    limitPalace: palaceName(v.smallLimitPalaceKey ?? v.yearPalaceKey),
    mutagens: MUTAGENS.flatMap((m) => {
      const h = v.yearMutagens.find((x) => x.mutagen === m && x.palaceKey);
      return h ? [{ name: MUTAGEN_NAMES[m], palace: palaceName(h.palaceKey) }] : [];
    }),
    ...(theme && { theme }),
    url: `${origin.replace(/^https?:\/\//, "")}/?ref=card&door=${door}`,
  };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Ngắt dòng theo số ký tự (chữ tiếng Việt có dấu rộng gần như nhau ở cỡ chữ lớn). */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

const GOLD = "#ffe3a3";
const TEXT = "#fffaf3";
const MUTED = "#fbe1d6";
const SERIF = "'Noto Serif', Georgia, 'Times New Roman', serif";
const SANS = "'Be Vietnam Pro', 'Segoe UI', Roboto, Arial, sans-serif";

export function yearCardSvg(c: YearCard): string {
  const t = (x: number, y: number, size: number, text: string, opts: { fill?: string; family?: string; weight?: number; anchor?: string; spacing?: number } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${opts.fill ?? TEXT}" font-family="${opts.family ?? SANS}" font-weight="${opts.weight ?? 400}" text-anchor="${opts.anchor ?? "middle"}"${opts.spacing ? ` letter-spacing="${opts.spacing}"` : ""}>${escape(text)}</text>`;
  const mid = CARD_WIDTH / 2;
  const parts: string[] = [
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b42330"/><stop offset="0.55" stop-color="#a01d29"/><stop offset="1" stop-color="#82162a"/></linearGradient></defs>`,
    `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>`,
    `<rect x="48" y="48" width="${CARD_WIDTH - 96}" height="${CARD_HEIGHT - 96}" rx="36" fill="none" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="3"/>`,
    t(mid, 160, 34, "TINH BÀN", { fill: GOLD, weight: 600, spacing: 10 }),
    t(mid, 250, 44, "Năm nay của tôi", { fill: MUTED }),
    t(mid, 370, 96, `${c.lunarYear} · ${c.canChi}`, { family: SERIF, weight: 600 }),
    `<line x1="${mid - 120}" y1="430" x2="${mid + 120}" y2="430" stroke="${GOLD}" stroke-width="3"/>`,
    t(mid, 520, 38, "Cung hạn năm", { fill: MUTED }),
    t(mid, 610, 80, c.limitPalace, { family: SERIF, fill: GOLD, weight: 600 }),
  ];
  // Tứ hóa năm: hai cột, trái căn trái, phải căn phải.
  c.mutagens.forEach((m, i) => {
    const right = i % 2 === 1;
    parts.push(t(right ? CARD_WIDTH - 180 : 180, 720 + Math.floor(i / 2) * 80, 40, `${m.name} → ${m.palace}`, { anchor: right ? "end" : "start" }));
  });
  if (c.theme) {
    wrap(c.theme, 34)
      .slice(0, 4)
      .forEach((line, i) => parts.push(t(mid, 930 + i * 58, 42, line, { family: SERIF })));
  }
  parts.push(
    t(mid, 1180, 32, `Theo ${c.schoolName} · tính từ lá số, chỉ để tham khảo`, { fill: MUTED }),
    t(mid, 1250, 36, c.url, { fill: GOLD, weight: 600 }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">${parts.join("")}</svg>`;
}

/** SVG → ảnh PNG đúng kích thước thẻ (chạy trên trình duyệt). */
export async function svgToPng(svg: string): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = Object.assign(document.createElement("canvas"), { width: CARD_WIDTH, height: CARD_HEIGHT });
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}

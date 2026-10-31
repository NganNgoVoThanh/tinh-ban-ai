/**
 * Quy tắc giọng văn (Technical Plan mục 16): dùng ở bước kiểm nội dung của `kb build` và ở validator
 * câu trả lời AI. Không khẳng định quá mạnh, không khuyên hủy việc.
 */
export const BANNED_PHRASES = [
  'chắc chắn',
  'sẽ bị',
  'không nên cưới',
  'đại kỵ',
  'tuyệt đối tránh',
  'tuyệt đối không',
  'định mệnh đã an bài',
  'không thể tránh',
];

/** Cụm từ bị cấm có trong câu (so không phân biệt hoa thường). */
export function bannedPhrasesIn(text: string): string[] {
  const t = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => t.includes(p));
}

export const LIMITS = { headline: 140, because: 240, detail: 1200 } as const;

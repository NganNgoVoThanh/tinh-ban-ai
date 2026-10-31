import { PALACES } from '@tinhban/kb';

/**
 * Khớp câu hỏi tự do với loại câu hỏi cố định (question_type), chạy trên máy (Technical Plan mục 10).
 * Dựa trên từ khóa và tên cung; không khớp thì trả null (câu hỏi chung, dùng Mệnh và 5 cung hay hỏi).
 */
const KEYWORDS: Record<string, string[]> = {
  year: ['năm nay', 'năm tới', 'năm sau', 'sang năm', 'vận hạn', 'tiểu hạn', 'đại vận', 'lưu niên'],
  career: ['công việc', 'sự nghiệp', 'nghề', 'thăng chức', 'công danh', 'việc làm', 'đổi việc', 'làm ăn', 'kinh doanh'],
  wealth: ['tiền', 'tài chính', 'thu nhập', 'giàu', 'tài lộc', 'tiết kiệm'],
  love: ['tình cảm', 'tình yêu', 'người yêu', 'vợ', 'chồng', 'hôn nhân', 'cưới', 'kết hôn', 'duyên'],
  personality: ['tính cách', 'bản thân', 'điểm mạnh', 'điểm yếu', 'con người tôi', 'tôi là người'],
  inner_life: ['tinh thần', 'phúc đức', 'bình an', 'an yên', 'tâm linh'],
  outside: ['đi xa', 'xuất ngoại', 'du lịch', 'ra ngoài', 'định cư', 'du học'],
  parents: ['cha mẹ', 'bố mẹ', 'ba mẹ', 'bố tôi', 'mẹ tôi'],
  siblings: ['anh em', 'chị em', 'anh chị'],
  children: ['con cái', 'các con', 'con tôi', 'sinh con'],
  home: ['nhà cửa', 'mua nhà', 'chỗ ở', 'nơi ở', 'chuyển nhà'],
  friends: ['bạn bè', 'đồng nghiệp', 'cấp dưới', 'đối tác'],
};

/** Cung chính của từng loại câu hỏi. */
export const TOPIC_PALACE: Record<string, string> = {
  personality: 'menh',
  career: 'quan_loc',
  wealth: 'tai_bach',
  love: 'phu_the',
  inner_life: 'phuc_duc',
  outside: 'thien_di',
  parents: 'phu_mau',
  siblings: 'huynh_de',
  children: 'tu_nu',
  home: 'dien_trach',
  friends: 'no_boc',
};

const PALACE_TOPIC = Object.fromEntries(Object.entries(TOPIC_PALACE).map(([t, p]) => [p, t]));

/** Mệnh và 5 cung hay hỏi: dùng cho câu hỏi chung hoặc câu hỏi về năm. */
export const CORE_PALACES = ['menh', 'quan_loc', 'tai_bach', 'phu_the', 'phuc_duc', 'thien_di'];

export interface Intent {
  questionType: string | null;
  /** Cung cần gửi fact lên server: cung chính, Mệnh; hoặc Mệnh và 5 cung hay hỏi. */
  palaces: string[];
}

const norm = (s: string) => s.normalize('NFC').toLowerCase();

export function matchIntent(text: string): Intent {
  const t = norm(text);
  let questionType: string | null = null;
  for (const [type, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(w))) {
      questionType = type;
      break;
    }
  }
  if (!questionType) {
    const palace = Object.entries(PALACES).find(([, name]) => t.includes(norm(`cung ${name}`)) || t.includes(norm(name)))?.[0];
    if (palace && PALACE_TOPIC[palace]) questionType = PALACE_TOPIC[palace]!;
  }
  const main = questionType ? TOPIC_PALACE[questionType] : undefined;
  return { questionType, palaces: main ? [...new Set([main, 'menh'])] : CORE_PALACES };
}

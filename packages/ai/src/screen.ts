/**
 * Cổng vào của câu hỏi tự do (Technical Plan mục 10): câu ngoài phạm vi nhận câu từ chối soạn sẵn;
 * số điện thoại, email, số giấy tờ, link trong câu hỏi bị xóa trước khi gửi cho nhà cung cấp AI.
 */
export const MAX_QUESTION_LENGTH = 300;

export type OutOfScope = 'health' | 'law' | 'investment' | 'politics' | 'programming';

const SCOPE_WORDS: Record<OutOfScope, string[]> = {
  health: ['bệnh', 'thuốc', 'ung thư', 'bác sĩ', 'chữa trị', 'phẫu thuật', 'mang thai', 'triệu chứng', 'xét nghiệm', 'điều trị'],
  law: ['kiện', 'tòa án', 'luật sư', 'pháp luật', 'hợp đồng pháp lý', 'khởi tố', 'tranh chấp đất'],
  investment: ['cổ phiếu', 'chứng khoán', 'bitcoin', 'crypto', 'tiền ảo', 'đầu tư vào', 'mua mã', 'lô đề', 'xổ số'],
  politics: ['chính trị', 'bầu cử', 'đảng phái', 'biểu tình'],
  programming: ['lập trình', 'javascript', 'python', 'viết code', 'sửa code'],
};

/** Câu từ chối soạn sẵn, không gọi AI. */
export const REFUSALS: Record<OutOfScope, string> = {
  health: 'Tinh Bàn không tư vấn sức khỏe. Hãy hỏi bác sĩ hoặc cơ sở y tế.',
  law: 'Tinh Bàn không tư vấn pháp luật. Hãy hỏi luật sư hoặc cơ quan có thẩm quyền.',
  investment: 'Tinh Bàn không tư vấn đầu tư hay tài chính. Quyết định tiền bạc nên dựa trên thông tin và chuyên gia tài chính.',
  politics: 'Tinh Bàn không bàn chuyện chính trị.',
  programming: 'Tinh Bàn chỉ trả lời về lá số và xem ngày.',
};

/** Chủ đề ngoài phạm vi của câu hỏi, nếu có. */
export function outOfScope(question: string): OutOfScope | null {
  const q = question.toLowerCase();
  for (const [topic, words] of Object.entries(SCOPE_WORDS) as [OutOfScope, string[]][]) {
    if (words.some((w) => q.includes(w))) return topic;
  }
  return null;
}

const PII_PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  // Link: dừng trước dấu câu đứng sau.
  [/https?:\/\/[^\s,;]*[^\s,;.]/g, '[link]'],
  // Dãy số dài trước (CCCD 12 số, tài khoản ngân hàng), để không bị nhận nhầm là số điện thoại.
  [/\b\d{11,16}\b/g, '[số]'],
  // Số điện thoại Việt Nam: 0 hoặc +84 rồi 9 chữ số, có thể cách bằng dấu cách, chấm, gạch.
  [/(?:\+84|\b0)(?:[\s.-]?\d){9}\b/g, '[số điện thoại]'],
  // CMND cũ (9 số) và dãy số khác.
  [/\b\d{9,10}\b/g, '[số]'],
];

/** Xóa thông tin liên lạc và dãy số dài; trả về câu đã lọc và các đoạn đã xóa (để kiểm câu trả lời). */
export function scrubPii(question: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  let text = question;
  for (const [re, label] of PII_PATTERNS) {
    text = text.replace(re, (m) => {
      removed.push(m);
      return label;
    });
  }
  return { text, removed };
}

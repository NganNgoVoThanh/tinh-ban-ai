/**
 * Prompt hệ thống, phiên bản 1 (Technical Plan mục 10). Đổi nội dung là đổi PROMPT_VERSION và phải
 * chạy lại eval E-01 (CI chặn PR sửa thư mục này nếu thiếu báo cáo eval mới).
 * Giữ cố định từng byte: prompt đặt đầu tiên để được prompt caching.
 */
export const PROMPT_VERSION = '1.0.0';

export const SYSTEM_PROMPT = `Bạn là trợ lý của Tinh Bàn, app Tử Vi. Bạn chỉ diễn đạt lại và nối các đơn vị tri thức đã duyệt được gửi kèm, cho đúng câu hỏi của người dùng.

Quy tắc bắt buộc:
- Chỉ dùng các đơn vị tri thức (rule) và dữ kiện lá số (fact) được gửi kèm. Không tự an sao, không tự suy ra sao hay cung không có trong dữ kiện.
- Mỗi câu phải ghi rule_ids là các rule làm căn cứ, và fact_ids là các fact được nhắc tới, đúng nguyên văn mã đã gửi.
- Gắn nhãn cho từng câu: "fact" (dữ kiện lá số), "interpretation" (diễn giải Tử Vi), "folk" (dân gian), "suggestion" (gợi ý tham khảo).
- Viết tiếng Việt tự nhiên, gần gũi, 3 đến 5 câu, tổng không quá 120 từ.
- Không khẳng định quá mạnh: không dùng "chắc chắn", "sẽ bị", "đại kỵ", "tuyệt đối tránh", không khuyên hủy việc, không phán xét người khác.
- Không tư vấn y tế, pháp luật, đầu tư, chính trị. Nếu câu hỏi thuộc các loại đó, hoặc các rule gửi kèm không đủ để trả lời, đặt out_of_scope = true và trả về sentences rỗng.
- Không nhắc lại thông tin cá nhân có trong câu hỏi.
- followups: tối đa 3 câu hỏi tiếp theo ngắn, trả lời được bằng chính các rule đã gửi.

Trả về đúng JSON theo schema.`;

/** Phần người dùng: fact viết dạng mã gọn, kèm các đơn vị đã truy xuất và câu hỏi. */
export function userPrompt(input: {
  question: string;
  schoolName: string;
  facts: string[];
  rules: { ruleId: string; headline: string; because: string; detail: string; kind: string }[];
  repairErrors?: string[];
}): string {
  const lines = [
    `Phái: ${input.schoolName}`,
    `Fact: ${input.facts.join('; ')}`,
    'Rule:',
    ...input.rules.map((r) => `- [${r.ruleId}] (${r.kind}) ${r.headline} | ${r.because} | ${r.detail}`),
    `Câu hỏi: ${input.question}`,
  ];
  if (input.repairErrors?.length) {
    lines.push('Lần trả lời trước không qua kiểm tra vì:', ...input.repairErrors.map((e) => `- ${e}`), 'Hãy trả lời lại, sửa đúng các lỗi trên.');
  }
  return lines.join('\n');
}

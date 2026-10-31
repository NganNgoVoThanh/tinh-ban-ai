import { getApplicableRules, rulesForPalace, type KnowledgeBundle } from '@tinhban/kb';
import type { ChartSnapshot } from '@tinhban/shared';
import { composeExplanation, type Insight } from './compose.ts';

/**
 * Câu hỏi gợi ý theo cung (Technical Plan mục 7): mỗi câu ứng với một question_type cố định (cũng là
 * topic của đơn vị tri thức), trả lời ngay trên máy từ kho. Cung Tật Ách không có câu gợi ý: app từ
 * chối tư vấn y tế (mục 10, 16).
 */
export interface SuggestedQuestion {
  questionType: string;
  palaceKey: string;
  text: string;
}

const BY_PALACE: Record<string, { questionType: string; text: string }> = {
  menh: { questionType: 'personality', text: 'Tính cách nổi bật của tôi là gì?' },
  quan_loc: { questionType: 'career', text: 'Công việc nào hợp với tôi?' },
  tai_bach: { questionType: 'wealth', text: 'Cách tôi kiếm và giữ tiền ra sao?' },
  phu_the: { questionType: 'love', text: 'Chuyện tình cảm, hôn nhân của tôi thế nào?' },
  phuc_duc: { questionType: 'inner_life', text: 'Đời sống tinh thần của tôi ra sao?' },
  thien_di: { questionType: 'outside', text: 'Ra ngoài, đi xa có thuận cho tôi không?' },
  phu_mau: { questionType: 'parents', text: 'Quan hệ với cha mẹ của tôi thế nào?' },
  huynh_de: { questionType: 'siblings', text: 'Quan hệ anh chị em của tôi thế nào?' },
  tu_nu: { questionType: 'children', text: 'Chuyện con cái của tôi thế nào?' },
  dien_trach: { questionType: 'home', text: 'Nhà cửa, nơi ở của tôi ra sao?' },
  no_boc: { questionType: 'friends', text: 'Bạn bè, đồng nghiệp quanh tôi thế nào?' },
};

/** Câu hỏi gợi ý của một cung, chỉ hiện khi kho có đơn vị trả lời được. */
export function suggestedQuestions(snapshot: ChartSnapshot, kb: KnowledgeBundle, palaceKey: string): SuggestedQuestion[] {
  const q = BY_PALACE[palaceKey];
  if (!q) return [];
  const has = rulesForPalace(getApplicableRules(snapshot, kb, q.questionType), palaceKey).length > 0;
  return has ? [{ ...q, palaceKey }] : [];
}

/** Trả lời câu hỏi gợi ý bằng kho: các đơn vị cùng question_type của cung đó, tối đa 3. */
export function answerSuggested(snapshot: ChartSnapshot, kb: KnowledgeBundle, q: Pick<SuggestedQuestion, 'questionType' | 'palaceKey'>): Insight[] {
  const matches = rulesForPalace(getApplicableRules(snapshot, kb, q.questionType), q.palaceKey);
  return composeExplanation(matches.slice(0, 3), snapshot, kb);
}

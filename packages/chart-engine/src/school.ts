import type { SchoolId, SchoolPolicy } from '@tinhban/shared';
import { TU_HOA_VN } from './conventions.ts';

export type { SchoolPolicy };

/**
 * Hai phái an sao lá số gốc giống nhau, chỉ khác cách đọc (Technical Plan mục 6).
 * Đề xuất đang dùng (mục 22, việc 1, chờ duyệt): cả hai phái an sao theo quy ước Việt Nam như
 * lasotuvi, thang độ sáng 5 mức. Nếu sách tham chiếu của Bắc phái dùng bảng Tứ hóa khác thì chỉ
 * cần đổi mutagenTable của Bắc phái rồi chạy lại golden test.
 */
const VN_CONVENTIONS: Omit<SchoolPolicy, 'id' | 'showPalaceStems' | 'palaceTapMode'> = {
  lateTy: 'next_day',
  leapMonth: 'same_month',
  mutagenTable: TU_HOA_VN,
  brightnessScale: 5,
  minorStarRules: { hoaLinh: 'ENG.STAR.HOA_LINH_VN', khoiViet: 'ENG.STAR.KHOI_VIET_VN' },
};

export const SCHOOLS: Record<SchoolId, SchoolPolicy> = {
  nam: { id: 'nam', ...VN_CONVENTIONS, showPalaceStems: false, palaceTapMode: 'tam_phuong' },
  bac: { id: 'bac', ...VN_CONVENTIONS, showPalaceStems: true, palaceTapMode: 'phi_hoa' },
};

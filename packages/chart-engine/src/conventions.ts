/**
 * Quy ước an sao lối Việt Nam, lấy theo lasotuvi 0.1.2 (an theo sách của cụ Thiên Lương) và
 * kiểm bằng bộ ca chuẩn (tools/golden). iztro theo lối Trung Quốc nên bộ tính ghi đè các chỗ này.
 * Đề xuất đang dùng cho cả hai phái, chờ chốt bằng sách tham chiếu (Technical Plan mục 22, việc 1).
 */
import { CAN, CHI } from '@tinhban/calendar';
import type { Brightness } from '@tinhban/shared';

/** Can năm → sao mang Lộc, Quyền, Khoa, Kỵ. Khác iztro ở Canh (Khoa Thiên Đồng, Kỵ Thái Âm) và Nhâm (Khoa Thiên Phủ). */
export const TU_HOA_VN: Record<string, [string, string, string, string]> = {
  Giáp: ['liem_trinh', 'pha_quan', 'vu_khuc', 'thai_duong'],
  Ất: ['thien_co', 'thien_luong', 'tu_vi', 'thai_am'],
  Bính: ['thien_dong', 'thien_co', 'van_xuong', 'liem_trinh'],
  Đinh: ['thai_am', 'thien_dong', 'thien_co', 'cu_mon'],
  Mậu: ['tham_lang', 'thai_am', 'huu_bat', 'thien_co'],
  Kỷ: ['vu_khuc', 'tham_lang', 'thien_luong', 'van_khuc'],
  Canh: ['thai_duong', 'vu_khuc', 'thien_dong', 'thai_am'],
  Tân: ['cu_mon', 'thai_duong', 'van_khuc', 'van_xuong'],
  Nhâm: ['thien_luong', 'tu_vi', 'thien_phu', 'vu_khuc'],
  Quý: ['pha_quan', 'cu_mon', 'thai_am', 'tham_lang'],
};

const LEVEL: Record<string, Brightness> = { M: 'mieu', V: 'vuong', Đ: 'dac', B: 'binh', H: 'ham' };

/**
 * Độ sáng thang 5 mức, từ Tý đến Hợi; '-' là không ghi độ sáng.
 * lasotuvi không có độ sáng Thiên Phủ: tạm lấy bảng của iztro (chỉ có Miếu, Vượng, Đắc, đều nằm
 * trong thang 5 mức), chờ sách tham chiếu. Thiên Diêu là tên iztro của Thiên Riêu.
 */
const BRIGHTNESS_ROWS: Record<string, string> = {
  tu_vi: 'B Đ M B V M M Đ M B V B',
  liem_trinh: 'V Đ V H M H V Đ V H M H',
  thien_dong: 'V H M Đ H Đ H H M H H Đ',
  vu_khuc: 'V M V Đ M H V M V Đ M H',
  thai_duong: 'H Đ V V V M M Đ H H H H',
  thien_co: 'Đ Đ H M M V Đ Đ V M M H',
  thien_phu: 'M M M Đ M Đ V M Đ V M Đ',
  thai_am: 'V Đ H H H H H Đ V M M M',
  tham_lang: 'H M Đ H V H H M Đ H V H',
  cu_mon: 'V H V M H H V H Đ M H Đ',
  thien_tuong: 'V Đ M H V Đ V Đ M H V Đ',
  thien_luong: 'V Đ V V M H M Đ V H M H',
  that_sat: 'M Đ M H H V M Đ M H H V',
  pha_quan: 'M V H H Đ H M V H H Đ H',
  kinh_duong: 'H Đ H H Đ H H Đ H H Đ H',
  da_la: 'H Đ H H Đ H H Đ H H Đ H',
  hoa_tinh: 'H H Đ Đ Đ Đ Đ H H H H H',
  linh_tinh: 'H H Đ Đ Đ Đ Đ H H H H H',
  van_xuong: 'H Đ H Đ H Đ H Đ H H Đ Đ',
  van_khuc: 'H Đ H Đ H Đ H Đ H H Đ Đ',
  dia_khong: 'H H Đ H H Đ H H Đ H H Đ',
  dia_kiep: 'H H Đ H H Đ H H Đ H H Đ',
  thien_ma: '- - Đ - - Đ - - - - - -',
  thien_khoc: 'Đ Đ - Đ - - Đ Đ - Đ - -',
  thien_hu: 'Đ Đ - Đ - - Đ Đ - Đ - -',
  thien_hinh: '- - Đ Đ - - - - Đ Đ - -',
  thien_dieu: '- - Đ Đ - - - - - Đ Đ -',
};

export const BRIGHTNESS_VN: Record<string, (Brightness | undefined)[]> = Object.fromEntries(
  Object.entries(BRIGHTNESS_ROWS).map(([star, row]) => {
    const cells = row.trim().split(/\s+/);
    if (cells.length !== 12) throw new Error(`Bảng độ sáng của ${star} cần 12 ô`);
    return [star, cells.map((c) => (c === '-' ? undefined : LEVEL[c]))];
  }),
);

/** Ngữ cảnh để an phụ tinh: chỉ số can, chi năm; chi giờ (nếu có); Dương nam, Âm nữ đi thuận. */
export interface PlacementContext {
  yearCan: number;
  yearChi: number;
  hourChi?: number;
  forward: boolean;
}

/** Trả về key sao → chỉ số địa chi của cung (0 = Tý). null: giữ nguyên vị trí của iztro. */
type Placement = ((ctx: PlacementContext) => Record<string, number>) | null;

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const chi = (name: string) => CHI.indexOf(name as (typeof CHI)[number]);

/** Cung khởi Hỏa, Linh theo tam hợp chi năm (chỉ số chi năm mod 4). */
const HOA_LINH_START: Record<number, [string, string]> = {
  0: ['Dần', 'Tuất'], // Thân Tý Thìn
  1: ['Tuất', 'Mão'], // Tỵ Dậu Sửu
  2: ['Sửu', 'Mão'], // Dần Ngọ Tuất
  3: ['Dậu', 'Tuất'], // Hợi Mão Mùi
};

/** Can năm → Thiên Khôi, Thiên Việt. Khác iztro ở Đinh, Mậu, Canh, Nhâm (đổi chỗ Khôi và Việt). */
const KHOI_VIET_VN: Record<string, [string, string]> = {
  Giáp: ['Sửu', 'Mùi'],
  Ất: ['Tý', 'Thân'],
  Bính: ['Hợi', 'Dậu'],
  Đinh: ['Dậu', 'Hợi'],
  Mậu: ['Mùi', 'Sửu'],
  Kỷ: ['Tý', 'Thân'],
  Canh: ['Mùi', 'Sửu'],
  Tân: ['Ngọ', 'Dần'],
  Nhâm: ['Tỵ', 'Mão'],
  Quý: ['Mão', 'Tỵ'],
};

export const MINOR_STAR_RULES: Record<string, Placement> = {
  'ENG.STAR.HOA_LINH_IZTRO': null,
  // Khởi cung theo tam hợp chi năm, đếm đến giờ sinh: Dương nam, Âm nữ thì Hỏa thuận Linh nghịch;
  // Âm nam, Dương nữ thì Hỏa nghịch Linh thuận.
  'ENG.STAR.HOA_LINH_VN': ({ yearChi, hourChi, forward }): Record<string, number> => {
    if (hourChi === undefined) return {};
    const [hoa, linh] = HOA_LINH_START[yearChi % 4]!;
    const step = forward ? hourChi : -hourChi;
    return { hoa_tinh: mod12(chi(hoa) + step), linh_tinh: mod12(chi(linh) - step) };
  },
  'ENG.STAR.KHOI_VIET_IZTRO': null,
  'ENG.STAR.KHOI_VIET_VN': ({ yearCan }) => {
    const [khoi, viet] = KHOI_VIET_VN[CAN[yearCan]!]!;
    return { thien_khoi: chi(khoi), thien_viet: chi(viet) };
  },
};

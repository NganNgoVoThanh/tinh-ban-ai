/**
 * Từ điển của kho tri thức: sao, cung, trạng thái (Technical Plan mục 7). Điều kiện của đơn vị
 * tri thức chỉ được dùng các key có ở đây. Key trùng với key bộ tính sinh ra (slug tên iztro).
 *
 * Ngũ hành của sao lấy theo lasotuvi 0.1.2, chỉ gán cho sao chắc chắn trùng với sao của lasotuvi;
 * sao chưa rõ tương ứng để trống (giao diện không tô màu, tên sao vẫn là chữ).
 */
import type { Brightness, Mutagen } from '@tinhban/shared';

export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

export const ELEMENT_NAMES: Record<Element, string> = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ' };

export interface StarEntry {
  name: string;
  kind: 'major' | 'minor' | 'adjective';
  element?: Element;
}

const K = 'kim';
const M = 'moc';
const T = 'thuy';
const H = 'hoa';
const O = 'tho';

const major = (name: string, element: Element): StarEntry => ({ name, kind: 'major', element });
const minor = (name: string, element?: Element): StarEntry => ({ name, kind: 'minor', ...(element && { element }) });
const adj = (name: string, element?: Element): StarEntry => ({ name, kind: 'adjective', ...(element && { element }) });

export const STARS: Record<string, StarEntry> = {
  tu_vi: major('Tử Vi', O),
  liem_trinh: major('Liêm Trinh', H),
  thien_dong: major('Thiên Đồng', T),
  vu_khuc: major('Vũ Khúc', K),
  thai_duong: major('Thái Dương', H),
  thien_co: major('Thiên Cơ', M),
  thien_phu: major('Thiên Phủ', O),
  thai_am: major('Thái Âm', T),
  tham_lang: major('Tham Lang', T),
  cu_mon: major('Cự Môn', T),
  thien_tuong: major('Thiên Tướng', T),
  thien_luong: major('Thiên Lương', M),
  that_sat: major('Thất Sát', K),
  pha_quan: major('Phá Quân', T),

  ta_phu: minor('Tả Phù', O),
  huu_bat: minor('Hữu Bật', O),
  van_xuong: minor('Văn Xương', K),
  van_khuc: minor('Văn Khúc', T),
  thien_khoi: minor('Thiên Khôi', H),
  thien_viet: minor('Thiên Việt', H),
  loc_ton: minor('Lộc Tồn', O),
  thien_ma: minor('Thiên Mã', H),
  kinh_duong: minor('Kình Dương', K),
  da_la: minor('Đà La', K),
  hoa_tinh: minor('Hỏa Tinh', H),
  linh_tinh: minor('Linh Tinh', H),
  dia_khong: minor('Địa Không', H),
  dia_kiep: minor('Địa Kiếp', H),

  an_quang: adj('Ân Quang', M),
  am_sat: adj('Âm Sát'),
  bat_toa: adj('Bát Tọa', T),
  co_than: adj('Cô Thần', O),
  // iztro gọi 台辅 là Đài Phụ; sách Việt gọi Thai Phụ.
  dai_phu: adj('Đài Phụ', K),
  giai_than: adj('Giải Thần'),
  ham_tri: adj('Hàm Trì'),
  hoa_cai: adj('Hoa Cái', K),
  hong_loan: adj('Hồng Loan', T),
  khong_vong: adj('Không Vong'),
  long_tri: adj('Long Trì', T),
  nguyet_duc: adj('Nguyệt Đức', H),
  nien_giai: adj('Niên Giải'),
  pha_toai: adj('Phá Toái', H),
  // Phi Liêm của iztro (蜚廉) khác Phi Liêm trong vòng Bác Sĩ của sách Việt.
  phi_liem: adj('Phi Liêm'),
  phong_cao: adj('Phong Cáo', O),
  phung_cac: adj('Phượng Các', O),
  qua_tu: adj('Quả Tú', O),
  tam_thai: adj('Tam Thai', M),
  // iztro gọi là Thiên Diêu; sách Việt gọi Thiên Riêu.
  thien_dieu: adj('Thiên Riêu', T),
  thien_duc: adj('Thiên Đức', H),
  thien_hinh: adj('Thiên Hình', H),
  thien_hu: adj('Thiên Hư', T),
  thien_hy: adj('Thiên Hỷ', T),
  thien_khoc: adj('Thiên Khốc', T),
  thien_khong: adj('Thiên Không', T),
  thien_nguyet: adj('Thiên Nguyệt'),
  thien_phuc: adj('Thiên Phúc', H),
  thien_quan: adj('Thiên Quan', H),
  thien_quy: adj('Thiên Quý', O),
  thien_su: adj('Thiên Sứ', T),
  thien_tai: adj('Thiên Tài', O),
  thien_tho: adj('Thiên Thọ', O),
  thien_thuong: adj('Thiên Thương', O),
  thien_tru: adj('Thiên Trù', O),
  thien_vu: adj('Thiên Vu'),
  triet_lo: adj('Triệt'),
  tuan_khong: adj('Tuần'),
};

export const PALACES: Record<string, string> = {
  menh: 'Mệnh',
  phu_mau: 'Phụ Mẫu',
  phuc_duc: 'Phúc Đức',
  dien_trach: 'Điền Trạch',
  quan_loc: 'Quan Lộc',
  no_boc: 'Nô Bộc',
  thien_di: 'Thiên Di',
  tat_ach: 'Tật Ách',
  tai_bach: 'Tài Bạch',
  tu_nu: 'Tử Nữ',
  phu_the: 'Phu Thê',
  huynh_de: 'Huynh Đệ',
};

export const BRIGHTNESS_NAMES: Record<Brightness, string> = {
  mieu: 'Miếu',
  vuong: 'Vượng',
  dac: 'Đắc',
  loi: 'Lợi',
  binh: 'Bình',
  bat: 'Bất',
  ham: 'Hãm',
};

/** Chữ viết tắt trong ô cung. Thang 7 mức dùng "Lợi", "Bất" viết đủ để không trùng chữ B của Bình. */
export const BRIGHTNESS_SHORT: Record<Brightness, string> = {
  mieu: 'M',
  vuong: 'V',
  dac: 'Đ',
  loi: 'Lợi',
  binh: 'B',
  bat: 'Bất',
  ham: 'H',
};

export const MUTAGEN_NAMES: Record<Mutagen, string> = { loc: 'Lộc', quyen: 'Quyền', khoa: 'Khoa', ky: 'Kỵ' };

export const elementOf = (starKey: string): Element | undefined => STARS[starKey]?.element;

/** Tên hiển thị theo sách Việt (Thiên Riêu, Phượng Các…); sao lạ thì trả lại tên bộ tính đưa. */
export const starName = (starKey: string, fallback: string): string => STARS[starKey]?.name ?? fallback;

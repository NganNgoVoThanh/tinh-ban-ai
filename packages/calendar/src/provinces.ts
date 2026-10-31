/**
 * Danh mục 63 tỉnh, thành trước sáp nhập 07/2025, mã theo danh mục đơn vị hành chính của
 * Tổng cục Thống kê. Nơi sinh là dữ liệu lịch sử nên dùng danh mục cũ: vài tỉnh mới sau
 * sáp nhập nằm vắt qua ranh giới Bắc–Nam giai đoạn 1954–1975.
 *
 * Vùng (Region) chỉ có ý nghĩa với người sinh trước 1976 (REGION_IRRELEVANT_FROM): từ Quảng Bình
 * trở ra là miền Bắc, từ Thừa Thiên Huế trở vào là miền Nam. Quảng Trị nằm hai bên sông Bến Hải,
 * nên người sinh 1954–1975 phải chọn thêm bờ sông.
 */
import { REGION_IRRELEVANT_FROM, type VnRegion } from './tz-policy.ts';

export interface Province {
  code: string;
  name: string;
  zone: VnRegion | 'ben_hai';
}

export const BEN_HAI_FROM = '1954-01-01';

const N = 'north';
const S = 'south';

export const PROVINCES: readonly Province[] = [
  { code: '01', name: 'Hà Nội', zone: N },
  { code: '02', name: 'Hà Giang', zone: N },
  { code: '04', name: 'Cao Bằng', zone: N },
  { code: '06', name: 'Bắc Kạn', zone: N },
  { code: '08', name: 'Tuyên Quang', zone: N },
  { code: '10', name: 'Lào Cai', zone: N },
  { code: '11', name: 'Điện Biên', zone: N },
  { code: '12', name: 'Lai Châu', zone: N },
  { code: '14', name: 'Sơn La', zone: N },
  { code: '15', name: 'Yên Bái', zone: N },
  { code: '17', name: 'Hòa Bình', zone: N },
  { code: '19', name: 'Thái Nguyên', zone: N },
  { code: '20', name: 'Lạng Sơn', zone: N },
  { code: '22', name: 'Quảng Ninh', zone: N },
  { code: '24', name: 'Bắc Giang', zone: N },
  { code: '25', name: 'Phú Thọ', zone: N },
  { code: '26', name: 'Vĩnh Phúc', zone: N },
  { code: '27', name: 'Bắc Ninh', zone: N },
  { code: '30', name: 'Hải Dương', zone: N },
  { code: '31', name: 'Hải Phòng', zone: N },
  { code: '33', name: 'Hưng Yên', zone: N },
  { code: '34', name: 'Thái Bình', zone: N },
  { code: '35', name: 'Hà Nam', zone: N },
  { code: '36', name: 'Nam Định', zone: N },
  { code: '37', name: 'Ninh Bình', zone: N },
  { code: '38', name: 'Thanh Hóa', zone: N },
  { code: '40', name: 'Nghệ An', zone: N },
  { code: '42', name: 'Hà Tĩnh', zone: N },
  { code: '44', name: 'Quảng Bình', zone: N },
  { code: '45', name: 'Quảng Trị', zone: 'ben_hai' },
  { code: '46', name: 'Thừa Thiên Huế', zone: S },
  { code: '48', name: 'Đà Nẵng', zone: S },
  { code: '49', name: 'Quảng Nam', zone: S },
  { code: '51', name: 'Quảng Ngãi', zone: S },
  { code: '52', name: 'Bình Định', zone: S },
  { code: '54', name: 'Phú Yên', zone: S },
  { code: '56', name: 'Khánh Hòa', zone: S },
  { code: '58', name: 'Ninh Thuận', zone: S },
  { code: '60', name: 'Bình Thuận', zone: S },
  { code: '62', name: 'Kon Tum', zone: S },
  { code: '64', name: 'Gia Lai', zone: S },
  { code: '66', name: 'Đắk Lắk', zone: S },
  { code: '67', name: 'Đắk Nông', zone: S },
  { code: '68', name: 'Lâm Đồng', zone: S },
  { code: '70', name: 'Bình Phước', zone: S },
  { code: '72', name: 'Tây Ninh', zone: S },
  { code: '74', name: 'Bình Dương', zone: S },
  { code: '75', name: 'Đồng Nai', zone: S },
  { code: '77', name: 'Bà Rịa - Vũng Tàu', zone: S },
  { code: '79', name: 'TP. Hồ Chí Minh', zone: S },
  { code: '80', name: 'Long An', zone: S },
  { code: '82', name: 'Tiền Giang', zone: S },
  { code: '83', name: 'Bến Tre', zone: S },
  { code: '84', name: 'Trà Vinh', zone: S },
  { code: '86', name: 'Vĩnh Long', zone: S },
  { code: '87', name: 'Đồng Tháp', zone: S },
  { code: '89', name: 'An Giang', zone: S },
  { code: '91', name: 'Kiên Giang', zone: S },
  { code: '92', name: 'Cần Thơ', zone: S },
  { code: '93', name: 'Hậu Giang', zone: S },
  { code: '94', name: 'Sóc Trăng', zone: S },
  { code: '95', name: 'Bạc Liêu', zone: S },
  { code: '96', name: 'Cà Mau', zone: S },
];

const BY_CODE = new Map(PROVINCES.map((p) => [p.code, p]));

export function provinceByCode(code: string): Province | undefined {
  return BY_CODE.get(code);
}

/** Sinh trước 1976 (ngày dương theo đồng hồ nơi sinh) thì bắt buộc nơi sinh. */
export function needsBirthPlace(solarDate: string): boolean {
  return solarDate < REGION_IRRELEVANT_FROM;
}

/** Quảng Trị, sinh 1954–1975: phải chọn bờ Bắc hay bờ Nam sông Bến Hải. */
export function needsBenHaiSide(provinceCode: string, solarDate: string): boolean {
  return provinceByCode(provinceCode)?.zone === 'ben_hai' && solarDate >= BEN_HAI_FROM && solarDate < REGION_IRRELEVANT_FROM;
}

/**
 * Vùng của tỉnh vào ngày sinh. Quảng Trị ngoài giai đoạn 1954–1975 tính là miền Nam nếu không
 * chọn bờ sông: khi đó hai vùng chỉ khác nhau ở cờ "không chắc" của miền Bắc 1947–1955.
 */
export function regionOfProvince(provinceCode: string, solarDate: string, benHaiSide?: VnRegion): VnRegion {
  const p = provinceByCode(provinceCode);
  if (!p) throw new RangeError(`Mã tỉnh không có trong danh mục: ${provinceCode}`);
  if (p.zone !== 'ben_hai') return p.zone;
  if (benHaiSide === undefined && needsBenHaiSide(provinceCode, solarDate)) {
    throw new RangeError('Sinh ở Quảng Trị giai đoạn 1954–1975 cần chọn bờ Bắc hay bờ Nam sông Bến Hải');
  }
  return benHaiSide ?? 'south';
}

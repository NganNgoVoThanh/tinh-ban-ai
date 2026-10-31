import { isValidTimeZone, needsBirthPlace, provinceByCode, regionOfProvince } from '@tinhban/calendar';
import type { BirthInput } from '@tinhban/shared';

export class InvalidBirthInputError extends Error {
  override name = 'InvalidBirthInputError';
}

/**
 * Kiểm nơi sinh. solarDate là ngày dương theo đồng hồ nơi sinh.
 * Trong nước: trước 1976 bắt buộc có tỉnh, và vùng phải khớp vùng suy ra từ tỉnh.
 * Nước ngoài: không có tỉnh, bắt buộc có múi giờ IANA.
 */
export function checkBirthPlace(input: BirthInput, solarDate: string): void {
  if (input.region === 'abroad') {
    if (input.provinceCode !== undefined || input.benHaiSide !== undefined) {
      throw new InvalidBirthInputError('Sinh ở nước ngoài thì không chọn tỉnh');
    }
    if (input.abroadTz === undefined || !isValidTimeZone(input.abroadTz)) {
      throw new InvalidBirthInputError(`Sinh ở nước ngoài cần múi giờ IANA hợp lệ: ${input.abroadTz ?? '(trống)'}`);
    }
    return;
  }
  if (input.abroadTz !== undefined) throw new InvalidBirthInputError('Chỉ chọn múi giờ khi sinh ở nước ngoài');
  if (input.benHaiSide !== undefined && provinceByCode(input.provinceCode ?? '')?.zone !== 'ben_hai') {
    throw new InvalidBirthInputError('Chỉ chọn bờ sông Bến Hải khi sinh ở Quảng Trị');
  }
  if (input.provinceCode === undefined) {
    if (needsBirthPlace(solarDate)) throw new InvalidBirthInputError('Sinh trước 1976 cần chọn nơi sinh');
    return;
  }
  let region: BirthInput['region'];
  try {
    region = regionOfProvince(input.provinceCode, solarDate, input.benHaiSide);
  } catch (e) {
    throw new InvalidBirthInputError((e as Error).message);
  }
  if (region !== input.region) {
    throw new InvalidBirthInputError(`Vùng ${input.region} không khớp tỉnh ${input.provinceCode} (${region})`);
  }
}

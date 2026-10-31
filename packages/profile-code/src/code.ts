/**
 * Mã hồ sơ (Technical Plan mục 11): đầu vào lá số gói thành chuỗi bit, viết bằng Base32 Crockford,
 * kèm 2 ký tự CRC-10. Dạng TB2-7KQ2-M9XD-4H8P-Q…; không chứa tên. Ai có mã cũng dựng được lá số.
 *
 * Phiên bản 2 ghi: lịch, ngày, cờ nhuận; cách nhập giờ (giờ phút, giờ âm và phần trước/sau nửa đêm
 * của giờ Tý); vùng, mã tỉnh, bờ sông Bến Hải, múi giờ nước ngoài; giờ chỉnh tay; giới tính; phái.
 * Đổi bố cục bit là đổi phiên bản mã (TB3…); bộ giải mã giữ cách đọc các phiên bản cũ.
 */
import type { BirthInput, Region, SchoolId } from '@tinhban/shared';
import { TIME_ZONES_V2 } from './time-zones.ts';

export type ProfileCodeErrorReason = 'format' | 'checksum' | 'version' | 'invalid';

export class ProfileCodeError extends Error {
  override name = 'ProfileCodeError';
  readonly reason: ProfileCodeErrorReason;
  constructor(reason: ProfileCodeErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export interface DecodedProfile {
  birth: BirthInput;
  schoolId: SchoolId;
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = 'TB2';
const RAW_TZ = 511;
const REGIONS: Region[] = ['north', 'south', 'abroad'];
const SCHOOLS: SchoolId[] = ['nam', 'bac'];
const CERTAINTY: BirthInput['timeCertainty'][] = ['exact', 'canh', 'unknown'];

class BitWriter {
  bits: number[] = [];
  write(value: number, width: number) {
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** width) throw new RangeError(`Giá trị ${value} không vừa ${width} bit`);
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
  }
}

class BitReader {
  private pos = 0;
  private readonly bits: number[];
  constructor(bits: number[]) {
    this.bits = bits;
  }
  read(width: number): number {
    if (this.pos + width > this.bits.length) throw new ProfileCodeError('invalid', 'Mã hồ sơ bị thiếu');
    let v = 0;
    for (let i = 0; i < width; i++) v = (v << 1) | this.bits[this.pos++]!;
    return v;
  }
  /** Phần còn lại chỉ được là bit đệm 0 (ít hơn 5 bit). */
  done(): boolean {
    const rest = this.bits.slice(this.pos);
    return rest.length < 5 && rest.every((b) => b === 0);
  }
}

/** CRC-10 (đa thức 0x233): bắt mọi lỗi dồn cụm đến 10 bit, tức mọi lỗi sai một ký tự và đảo hai ký tự liền nhau. */
function crc10(bits: number[]): number {
  let crc = 0;
  for (const b of bits) {
    const top = ((crc >> 9) & 1) ^ b;
    crc = (crc << 1) & 0x3ff;
    if (top) crc ^= 0x233;
  }
  return crc;
}

const toChars = (bits: number[]) => {
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).join(''), 2)];
  return out;
};

const parseYmd = (date: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new RangeError(`Ngày không hợp lệ: ${date}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
};

const parseHm = (hhmm: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new RangeError(`Giờ không hợp lệ: ${hhmm}`);
  return { hour: Number(m[1]), minute: Number(m[2]) };
};

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Mã hồ sơ của một hồ sơ: chỉ dùng đầu vào và phái, không có tên. */
export function encodeProfileCode(profile: DecodedProfile): string {
  const { birth: b, schoolId } = profile;
  const w = new BitWriter();
  const d = parseYmd(b.date);
  w.write(b.calendar === 'lunar' ? 1 : 0, 1);
  w.write(d.year - 1900, 8);
  w.write(d.month, 4);
  w.write(d.day, 5);
  w.write(b.isLeapMonth ? 1 : 0, 1);
  w.write(CERTAINTY.indexOf(b.timeCertainty), 2);
  if (b.timeCertainty === 'exact') {
    const t = parseHm(b.time ?? '');
    w.write(t.hour, 5);
    w.write(t.minute, 6);
  } else if (b.timeCertainty === 'canh') {
    w.write(b.timeBranch ?? 0, 4);
    if (b.timeBranch === 0) w.write(b.tyPart === 'before_midnight' ? 1 : 0, 1);
  }
  w.write(REGIONS.indexOf(b.region), 2);
  w.write(b.provinceCode ? 1 : 0, 1);
  if (b.provinceCode) w.write(Number(b.provinceCode), 7);
  w.write(b.benHaiSide === 'north' ? 1 : b.benHaiSide === 'south' ? 2 : 0, 2);
  if (b.region === 'abroad') {
    const tz = b.abroadTz ?? '';
    const index = TIME_ZONES_V2.indexOf(tz);
    if (index >= 0) {
      w.write(index, 9);
    } else {
      // Múi giờ ngoài danh sách đóng băng: ghi nguyên văn (ASCII 7 bit).
      w.write(RAW_TZ, 9);
      w.write(tz.length, 6);
      for (const ch of tz) w.write(ch.charCodeAt(0), 7);
    }
  }
  w.write(b.stdTimeOverride ? 1 : 0, 1);
  if (b.stdTimeOverride) {
    const t = parseHm(b.stdTimeOverride);
    w.write(t.hour, 5);
    w.write(t.minute, 6);
  }
  w.write(b.gender === 'female' ? 1 : 0, 1);
  w.write(SCHOOLS.indexOf(schoolId), 2);

  const bits = [...w.bits];
  while (bits.length % 5 !== 0) bits.push(0);
  const check = new BitWriter();
  check.write(crc10(bits), 10);
  const body = toChars(bits) + toChars(check.bits);
  return [PREFIX, ...(body.match(/.{1,4}/g) ?? [])].join('-');
}

/** Chuẩn hóa mã người dùng gõ: bỏ gạch, khoảng trắng; I, L → 1; O → 0. */
export function normalizeProfileCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

/** Giải mã hồ sơ. Checksum sai thì báo lỗi rõ ràng, không tự đoán. */
export function decodeProfileCode(code: string): DecodedProfile {
  const raw = normalizeProfileCode(code);
  // Tiền tố "TB" không đi qua bước đổi O/I của phần thân.
  const prefix = code.toUpperCase().replace(/[\s-]/g, '').slice(0, 3);
  if (!/^TB\d$/.test(prefix)) throw new ProfileCodeError('format', 'Mã hồ sơ bắt đầu bằng TB2');
  if (prefix !== PREFIX) throw new ProfileCodeError('version', `Không đọc được mã phiên bản ${prefix.slice(2)}`);
  const body = raw.slice(3);
  if (body.length < 4 || [...body].some((c) => !ALPHABET.includes(c))) throw new ProfileCodeError('format', 'Mã hồ sơ có ký tự lạ');
  const toBits = (s: string) => [...s].flatMap((c) => {
    const v = ALPHABET.indexOf(c);
    return [4, 3, 2, 1, 0].map((i) => (v >> i) & 1);
  });
  const dataBits = toBits(body.slice(0, -2));
  const checkBits = toBits(body.slice(-2));
  if (crc10(dataBits) !== parseInt(checkBits.join(''), 2)) {
    throw new ProfileCodeError('checksum', 'Mã hồ sơ không khớp: kiểm tra lại từng ký tự');
  }

  const r = new BitReader(dataBits);
  const invalid = (what: string) => new ProfileCodeError('invalid', `Mã hồ sơ có ${what} không hợp lệ`);
  const calendar = r.read(1) === 1 ? 'lunar' : 'solar';
  const year = 1900 + r.read(8);
  const month = r.read(4);
  const day = r.read(5);
  if (year < 1901 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) throw invalid('ngày');
  const isLeap = r.read(1) === 1;
  const timeCertainty = CERTAINTY[r.read(2)];
  if (!timeCertainty) throw invalid('cách nhập giờ');
  const birth: BirthInput = {
    calendar,
    date: `${pad(year, 4)}-${pad(month)}-${pad(day)}`,
    ...(isLeap ? { isLeapMonth: true } : {}),
    timeCertainty,
    region: 'north',
    gender: 'male',
  };
  if (timeCertainty === 'exact') {
    const hour = r.read(5);
    const minute = r.read(6);
    if (hour > 23 || minute > 59) throw invalid('giờ');
    birth.time = `${pad(hour)}:${pad(minute)}`;
  } else if (timeCertainty === 'canh') {
    const branch = r.read(4);
    if (branch > 11) throw invalid('giờ âm');
    birth.timeBranch = branch;
    if (branch === 0) birth.tyPart = r.read(1) === 1 ? 'before_midnight' : 'after_midnight';
  }
  const region = REGIONS[r.read(2)];
  if (!region) throw invalid('vùng');
  birth.region = region;
  if (r.read(1) === 1) {
    const province = r.read(7);
    if (province < 1 || province > 99) throw invalid('mã tỉnh');
    birth.provinceCode = pad(province);
  }
  const side = r.read(2);
  if (side === 1) birth.benHaiSide = 'north';
  else if (side === 2) birth.benHaiSide = 'south';
  else if (side !== 0) throw invalid('bờ sông');
  if (region === 'abroad') {
    const index = r.read(9);
    if (index === RAW_TZ) {
      const len = r.read(6);
      birth.abroadTz = Array.from({ length: len }, () => String.fromCharCode(r.read(7))).join('');
    } else {
      const tz = TIME_ZONES_V2[index];
      if (!tz) throw invalid('múi giờ');
      birth.abroadTz = tz;
    }
  }
  if (r.read(1) === 1) {
    const hour = r.read(5);
    const minute = r.read(6);
    if (hour > 23 || minute > 59) throw invalid('giờ chỉnh tay');
    birth.stdTimeOverride = `${pad(hour)}:${pad(minute)}`;
  }
  birth.gender = r.read(1) === 1 ? 'female' : 'male';
  const schoolId = SCHOOLS[r.read(2)];
  if (!schoolId) throw invalid('phái');
  if (!r.done()) throw invalid('độ dài');
  return { birth, schoolId };
}

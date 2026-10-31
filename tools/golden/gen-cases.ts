/**
 * Sinh bộ ca chuẩn (cases.json). Dùng seed cố định nên chạy lại ra đúng bộ cũ.
 * Các nhóm theo mục 5 của Technical Plan: ca ngẫu nhiên, tháng nhuận, quanh Tết,
 * quanh giờ Tý, năm 1968 và 1985, miền Nam 1960–1975, ngày 30, thiếu giờ sinh;
 * từ v1.2 thêm nhập theo giờ âm, sinh ở nước ngoài, Quảng Trị hai bờ Bến Hải, giờ chỉnh tay.
 * Nhóm mới luôn thêm ở cuối để các ca cũ giữ nguyên số thứ tự và dữ liệu.
 */
import { writeFileSync } from 'node:fs';
import { formatDate, jdFromDate, jdToDate, lunarToSolar, needsBirthPlace, solarToLunar } from '@tinhban/calendar';
import type { BirthInput } from '@tinhban/shared';
import type { Case } from './lib.ts';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261029);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(xs: readonly T[]) => xs[int(0, xs.length - 1)]!;
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const gender = () => pick(['male', 'female'] as const);

const cases: Case[] = [];
// Sinh trước 1976 trong nước thì bắt buộc tỉnh: lấy Hà Nội cho miền Bắc, TP. Hồ Chí Minh cho miền Nam.
const add = (tags: string[], input: Omit<BirthInput, 'calendar' | 'timeCertainty'> & Partial<BirthInput>) =>
  cases.push({
    id: `case-${String(cases.length + 1).padStart(3, '0')}`,
    tags,
    input: {
      calendar: 'solar',
      timeCertainty: 'exact',
      ...(input.region !== 'abroad' && needsBirthPlace(input.date) && { provinceCode: input.region === 'south' ? '79' : '01' }),
      ...input,
    },
  });
const randomDate = (y0: number, y1: number) => formatDate(jdToDate(int(jdFromDate(1, 1, y0), jdFromDate(31, 12, y1))));

// Ca ngẫu nhiên 1930–2030.
for (let i = 0; i < 160; i++) {
  const date = randomDate(1930, 2030);
  const region = date < '1976-01-01' ? pick(['north', 'south'] as const) : 'north';
  add(['random'], { date, time: hhmm(int(0, 23), int(0, 59)), region, gender: gender() });
}

// Quanh Tết: ngày cuối năm và mùng 1.
for (const [year, region] of [[1968, 'north'], [1968, 'south'], [1985, 'north'], [2000, 'north'], [2026, 'north'], [2027, 'north']] as const) {
  const tet = lunarToSolar({ year, month: 1, day: 1 }, false, region)!;
  const tetJd = jdFromDate(tet.day, tet.month, tet.year);
  for (const jd of [tetJd - 1, tetJd]) {
    add(['tet', `y${year}`], { date: formatDate(jdToDate(jd)), time: '10:00', region, gender: gender() });
  }
}

// Năm 1985: lịch Việt Nam và Trung Quốc lệch cả tháng.
for (const date of ['1985-01-21', '1985-01-25', '1985-02-10', '1985-02-19', '1985-02-20']) {
  add(['y1985'], { date, time: hhmm(int(0, 23), 30), region: 'north', gender: gender() });
}

// Quanh giờ Tý.
for (let i = 0; i < 12; i++) {
  const date = randomDate(1976, 2030);
  add(['ty'], { date, time: pick(['22:59', '23:00', '23:45', '00:00', '00:40', '01:00']), region: 'north', gender: gender() });
}

// Miền Nam 1960–1975 (giờ đồng hồ UTC+8).
for (let i = 0; i < 20; i++) {
  add(['south-utc8'], { date: randomDate(1960, 1975), time: hhmm(int(0, 23), int(0, 59)), region: 'south', gender: gender() });
}

// Tháng nhuận: 4/2020, 2/2023, 6/2025, 6/1987, 5/2001.
for (const [year, month] of [[2020, 4], [2023, 2], [2025, 6], [1987, 6], [2001, 4]] as const) {
  for (const day of [1, 15, 16, 29]) {
    const s = lunarToSolar({ year, month, day }, true, 'north');
    if (s) add(['leap'], { date: formatDate(s), time: hhmm(int(0, 23), 10), region: 'north', gender: gender() });
  }
}

// Ngày 30 âm lịch.
for (let n = 0; n < 10; ) {
  const date = randomDate(1976, 2030);
  if (solarToLunar(date, 'north').day === 30) {
    add(['day30'], { date, time: hhmm(int(0, 23), 20), region: 'north', gender: gender() });
    n++;
  }
}

// Ngày 30 mà lịch Trung Quốc năm cùng can chi không có (giới hạn của lớp bọc iztro).
for (const [year, month] of [[1938, 8], [1941, 6], [1944, 5], [1952, 6], [1955, 4], [1974, 11], [1989, 7], [1997, 12], [2008, 11], [2017, 6]] as const) {
  for (const region of ['north', 'south'] as const) {
    const s = lunarToSolar({ year, month, day: 30 }, false, region);
    if (s) {
      add(['day30-no-proxy'], { date: formatDate(s), time: '08:00', region, gender: gender() });
      break;
    }
  }
}

// Sóc sát nửa đêm (bản gốc của thuật toán từng ra "mùng 0").
for (const date of ['1939-04-19', '1947-03-22', '2009-03-26']) {
  add(['new-moon-edge'], { date, time: '12:00', region: 'north', gender: gender() });
}

// Thiếu giờ sinh.
for (let i = 0; i < 5; i++) {
  add(['no-time'], { date: randomDate(1950, 2020), timeCertainty: 'unknown', region: 'north', gender: gender() });
}

// Nhập theo giờ âm: đủ 12 giờ âm, giờ Tý tách trước và sau nửa đêm.
for (let b = 0; b < 12; b++) {
  for (const tyPart of b === 0 ? (['before_midnight', 'after_midnight'] as const) : [undefined]) {
    add(['canh'], {
      date: randomDate(1976, 2030),
      timeCertainty: 'canh',
      timeBranch: b,
      ...(tyPart && { tyPart }),
      region: 'north',
      gender: gender(),
    });
  }
}

// Giờ âm ở miền Nam 1960–1975: giờ đồng hồ UTC+8 nhưng không quy đổi.
for (let i = 0; i < 4; i++) {
  add(['canh', 'south-utc8'], { date: randomDate(1960, 1975), timeCertainty: 'canh', timeBranch: int(1, 11), region: 'south', gender: gender() });
}

// Sinh ở nước ngoài: có và không có giờ mùa hè, hai bán cầu.
for (const [abroadTz, y0, y1] of [
  ['America/Los_Angeles', 1976, 2020],
  ['America/New_York', 1950, 1990],
  ['Europe/Paris', 1980, 2020],
  ['Australia/Sydney', 1976, 2020],
  ['Asia/Tokyo', 1976, 2020],
  ['Europe/London', 1965, 1975],
] as const) {
  for (let i = 0; i < 2; i++) {
    add(['abroad'], { date: randomDate(y0, y1), time: hhmm(int(0, 23), int(0, 59)), region: 'abroad', abroadTz, gender: gender() });
  }
}

// Quảng Trị 1954–1975, hai bờ sông Bến Hải.
for (const side of ['north', 'south'] as const) {
  for (let i = 0; i < 2; i++) {
    add(['ben-hai'], {
      date: randomDate(1956, 1975),
      time: hhmm(int(0, 23), int(0, 59)),
      region: side,
      provinceCode: '45',
      benHaiSide: side,
      gender: gender(),
    });
  }
}

// Giờ chuẩn do người dùng tự sửa.
for (let i = 0; i < 3; i++) {
  add(['override'], {
    date: randomDate(1960, 1975),
    time: hhmm(int(0, 23), int(0, 59)),
    region: 'south',
    stdTimeOverride: hhmm(int(0, 23), int(0, 59)),
    gender: gender(),
  });
}

writeFileSync(new URL('./cases.json', import.meta.url), JSON.stringify(cases, null, 1) + '\n');
console.log(`Đã ghi ${cases.length} ca vào cases.json`);

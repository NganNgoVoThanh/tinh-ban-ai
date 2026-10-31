import { addDays, CHI, formatDate, parseDate } from '@tinhban/calendar';
import { describe, expect, it } from 'vitest';
import { ageRelation, getDayInfo, goodHours, TRUC } from '../src/index.ts';

const shiftDay = (iso: string, n: number) => formatDate(addDays(parseDate(iso), n));

/** Bảng giờ hoàng đạo của lịch Hồ Ngọc Đức theo địa chi ngày (Tý/Ngọ, Sửu/Mùi, …), 1 = hoàng đạo. */
const HND_GIO_HD = ['110100101100', '001101001011', '110011010010', '101100110100', '001011001101', '010010110011'];

describe('xem ngày dân gian', () => {
  it('giờ hoàng đạo khớp bảng của lịch Hồ Ngọc Đức cho cả 12 địa chi ngày', () => {
    for (let d = 0; d < 12; d++) {
      const expected = [...HND_GIO_HD[d % 6]!].flatMap((c, h) => (c === '1' ? [h] : []));
      expect(goodHours(d), CHI[d]).toEqual(expected);
    }
  });

  it('16/8/2000: âm lịch 17/7 Canh Thìn, ngày Bính Ngọ, giờ hoàng đạo Tý Sửu Mão Ngọ Thân Dậu', () => {
    const info = getDayInfo('2000-08-16');
    expect(info.lunar).toEqual({ year: 2000, month: 7, day: 17, isLeap: false });
    expect(info.canChi).toEqual({ year: 'Canh Thìn', month: 'Giáp Thân', day: 'Bính Ngọ' });
    expect(info.weekday).toBe(3);
    expect(info.goodHours.map((h) => h.branch)).toEqual(['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu']);
  });

  it('trực: ngày có địa chi trùng tháng theo tiết là trực Kiến, rồi đi thuận', () => {
    // Tháng Dần theo tiết bắt đầu từ Lập xuân (4/2/2026); tìm ngày Dần đầu tiên sau đó.
    const days = Array.from({ length: 24 }, (_, i) => getDayInfo(shiftDay('2026-02-05', i)));
    const k = days.findIndex((x) => x.canChi.day.endsWith('Dần'));
    expect(k).toBeGreaterThanOrEqual(0);
    expect(days.slice(k, k + 12).map((x) => x.truc)).toEqual([...TRUC]);
  });

  it('hoàng đạo: tháng Giêng (Dần) khởi Thanh Long ở ngày Tý', () => {
    // 2026-02-18 là mùng 2 tháng Giêng Bính Ngọ; tìm ngày Tý trong tháng Giêng.
    const tyDay = Array.from({ length: 28 }, (_, i) => getDayInfo(`2026-02-${String(17 + (i % 12)).padStart(2, '0')}`)).find((x) =>
      x.canChi.day.endsWith('Tý'),
    )!;
    expect(tyDay.lunar.month).toBe(1);
    expect(tyDay.hoangDao).toEqual({ good: true, than: 'Thanh Long' });
  });

  it('hợp/xung với tuổi: lục xung, lục hợp, tam hợp', () => {
    // Ngày Ngọ: xung tuổi Tý, lục hợp tuổi Mùi, tam hợp tuổi Dần, Tuất.
    expect(ageRelation(6, 0)).toBe('luc_xung');
    expect(ageRelation(6, 7)).toBe('luc_hop');
    expect(ageRelation(6, 2)).toBe('tam_hop');
    expect(ageRelation(6, 10)).toBe('tam_hop');
    expect(ageRelation(6, 6)).toBeNull();
    expect(ageRelation(6, 3)).toBeNull();
    const info = getDayInfo('2000-08-16', [
      { profileId: 'a', yearBranch: 0 },
      { profileId: 'b', yearBranch: 7 },
    ]);
    expect(info.people).toEqual([
      { profileId: 'a', relation: 'xung', detail: 'luc_xung' },
      { profileId: 'b', relation: 'hop', detail: 'luc_hop' },
    ]);
  });
});

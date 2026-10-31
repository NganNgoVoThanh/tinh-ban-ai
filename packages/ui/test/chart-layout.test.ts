import { describe, expect, it } from 'vitest';
import { anchorOn, arrowBetween, BRANCH_ORDER, GRID_POSITION } from '../src/chart-layout.ts';

describe('bố cục lưới lá số', () => {
  it('12 địa chi nằm ở 12 ô viền khác nhau, chừa 4 ô giữa', () => {
    const cells = BRANCH_ORDER.map((b) => GRID_POSITION[b]!.join(','));
    expect(new Set(cells).size).toBe(12);
    for (const c of ['1,1', '1,2', '2,1', '2,2']) expect(cells).not.toContain(c);
  });

  it('đi thuận chiều kim đồng hồ từ Tỵ ở góc trên trái', () => {
    expect(GRID_POSITION['Tỵ']).toEqual([0, 0]);
    expect(GRID_POSITION['Thân']).toEqual([0, 3]);
    expect(GRID_POSITION['Hợi']).toEqual([3, 3]);
    expect(GRID_POSITION['Dần']).toEqual([3, 0]);
  });

  it('mũi tên đi trong ô giữa: bắt đầu ở mép gần cung nguồn, kết thúc ở mép gần cung đích', () => {
    // Lưới 400×400: ô giữa là [100,300]×[100,300]. Dần ở góc dưới trái, Tỵ ở góc trên trái.
    const inner = { left: 100, top: 100, right: 300, bottom: 300 };
    const dan = { x: 50, y: 350, w: 100, h: 100 };
    const ty = { x: 50, y: 50, w: 100, h: 100 };
    const arrow = arrowBetween(dan, ty, 1.5, inner);
    const [start, control, end] = arrow.d.match(/-?[\d.]+,-?[\d.]+/g)!.map((p) => p.split(',').map(Number));
    expect(start).toEqual([100, 300]);
    expect(end![0]!).toBeLessThan(100);
    expect(end![1]!).toBeLessThan(100);
    // Cong vào phía trong ô giữa.
    expect(control![0]!).toBeGreaterThan(100);
    expect(anchorOn(inner, { x: 250, y: 350, w: 100, h: 100 })).toEqual({ x: 250, y: 300 });
    // Hai lane khác nhau thì không trùng đường.
    expect(arrowBetween(dan, ty, 0, inner).d).not.toBe(arrowBetween(dan, ty, 3, inner).d);
  });
});

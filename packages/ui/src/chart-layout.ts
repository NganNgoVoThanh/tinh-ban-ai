/**
 * Bố cục lưới lá số 4×4 theo lối truyền thống: Tỵ ở góc trên trái, đi thuận chiều kim đồng hồ;
 * bốn ô giữa dành cho thông tin chung.
 */
export const GRID_POSITION: Record<string, [row: number, col: number]> = {
  Tỵ: [0, 0],
  Ngọ: [0, 1],
  Mùi: [0, 2],
  Thân: [0, 3],
  Thìn: [1, 0],
  Dậu: [1, 3],
  Mão: [2, 0],
  Tuất: [2, 3],
  Dần: [3, 0],
  Sửu: [3, 1],
  Tý: [3, 2],
  Hợi: [3, 3],
};

/** Thứ tự đọc cho chế độ danh sách: từ Tý đi thuận. */
export const BRANCH_ORDER = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

/** Tâm và kích thước một ô, đo trong khung của lưới (px). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Arrow {
  /** Đường cong SVG (quadratic Bézier). */
  d: string;
  /** Chỗ đặt nhãn: gần đầu mũi tên. */
  lx: number;
  ly: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Điểm trên mép ô giữa gần tâm ô cung nhất (ô cung luôn nằm ngoài ô giữa). */
export function anchorOn(inner: Rect, cell: Box): { x: number; y: number } {
  return { x: clamp(cell.x, inner.left, inner.right), y: clamp(cell.y, inner.top, inner.bottom) };
}

/**
 * Mũi tên phi hóa đi bên trong ô giữa (thiên bàn) để không đè lên chữ trong các ô cung: xuất phát
 * từ mép ô giữa gần cung nguồn, cong vào phía trong, đầu mũi tên chạm mép cung đích.
 * lane (0–3) tách bốn hóa để không chồng lên nhau.
 */
export function arrowBetween(from: Box, to: Box, lane: number, inner: Rect): Arrow {
  const a = anchorOn(inner, from);
  const b = anchorOn(inner, to);
  const center = { x: (inner.left + inner.right) / 2, y: (inner.top + inner.bottom) / 2 };
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const shift = (lane - 1.5) * 7;
  const cx = mx + (center.x - mx) * 0.55 - ((b.y - a.y) / len) * shift;
  const cy = my + (center.y - my) * 0.55 + ((b.x - a.x) / len) * shift;
  // Đầu mũi tên nhích ra 2 px về phía cung đích để chạm mép ô.
  const ol = Math.hypot(to.x - b.x, to.y - b.y) || 1;
  const e = { x: b.x + ((to.x - b.x) / ol) * 2, y: b.y + ((to.y - b.y) / ol) * 2 };
  const t = 0.78;
  const lx = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t ** 2 * e.x;
  const ly = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t ** 2 * e.y;
  const r = (n: number) => Math.round(n * 10) / 10;
  return { d: `M${r(a.x)},${r(a.y)} Q${r(cx)},${r(cy)} ${r(e.x)},${r(e.y)}`, lx: r(lx), ly: r(ly) };
}

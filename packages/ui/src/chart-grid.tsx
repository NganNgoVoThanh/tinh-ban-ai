'use client';

import { MUTAGENS, type BranchStars, type Brightness, type Mutagen, type PalaceFacts, type StarFact } from '@tinhban/shared';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { arrowBetween, BRANCH_ORDER, GRID_POSITION, type Box, type Rect } from './chart-layout.ts';

export type FiveElement = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

/** Màu chữ theo ngũ hành (tên class tĩnh để Tailwind sinh được). */
export const ELEMENT_CLASS: Record<FiveElement, string> = {
  kim: 'text-el-kim',
  moc: 'text-el-moc',
  thuy: 'text-el-thuy',
  hoa: 'text-el-hoa',
  tho: 'text-el-tho',
};

/** Màu từng hóa. Luôn đi kèm chữ (Lộc, Quyền, Khoa, Kỵ), không truyền thông tin chỉ bằng màu. */
export const MUTAGEN_TONE: Record<Mutagen, { text: string; stroke: string }> = {
  loc: { text: 'text-hop', stroke: 'var(--hop)' },
  quyen: { text: 'text-quyen', stroke: 'var(--quyen)' },
  khoa: { text: 'text-el-thuy', stroke: 'var(--el-thuy)' },
  ky: { text: 'text-xung', stroke: 'var(--xung)' },
};

export interface ChartLabels {
  starName: (key: string, fallback: string) => string;
  elementOf: (key: string) => FiveElement | undefined;
  brightnessShort: (b: Brightness) => string;
  brightnessName: (b: Brightness) => string;
  mutagenName: (m: Mutagen) => string;
  palaceName: (key: string, fallback: string) => string;
}

export interface FlyArrow {
  from: string;
  to: string;
  mutagen: Mutagen;
}

export interface ChartGridProps {
  palaces: PalaceFacts[];
  labels: ChartLabels;
  center: ReactNode;
  showStems: boolean;
  selected: string | null;
  onSelect: (palaceKey: string | null) => void;
  /** Cung làm nổi bật mạnh (cung đang chọn) và nhẹ (tam hợp, xung chiếu). */
  strong?: string[];
  soft?: string[];
  arrows?: FlyArrow[];
  /** Nhãn thêm trong ô, ví dụ "Tự hóa Kỵ". */
  badges?: Record<string, string[]>;
  /** Hiện mọi sao (chế độ "Toàn bộ sao"); mặc định chỉ chính tinh và phụ tinh chính. */
  full?: boolean;
}

function StarLine({ star, labels, small }: { star: StarFact; labels: ChartLabels; small?: boolean }) {
  const element = labels.elementOf(star.key);
  return (
    <span className={small ? 'mr-1 inline-block' : 'block'}>
      <span className={element ? ELEMENT_CLASS[element] : undefined}>{labels.starName(star.key, star.name)}</span>
      {star.brightness && (
        <span className="text-muted-foreground" title={labels.brightnessName(star.brightness)}>
          {' '}
          {labels.brightnessShort(star.brightness)}
        </span>
      )}
      {star.mutagen && (
        <span className={`ml-0.5 font-semibold ${MUTAGEN_TONE[star.mutagen].text}`}>{labels.mutagenName(star.mutagen)}</span>
      )}
    </span>
  );
}

/** Khung lưới: viền pha vàng kim, đổ bóng nhẹ; khe 1 px giữa các ô là màu viền. */
const FRAME = 'rounded-lg border border-[color-mix(in_oklab,var(--gold)_45%,var(--border))] bg-border shadow-[0_18px_40px_-28px_rgb(80_10_20/0.45)]';

/** Ô giữa: nền ửng vàng ở tâm, có vòng 12 cung mờ phía sau chữ. */
const CENTER =
  'relative col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklab,var(--gold)_8%,var(--card)),var(--card)_70%)] p-2 text-center';

/** Vòng 12 cung trang trí trong ô giữa (vạch dài ở Tý, Mão, Ngọ, Dậu). */
function CenterRing() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 size-[min(92%,15rem)] -translate-x-1/2 -translate-y-1/2 text-gold opacity-[0.14]">
      <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 4" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r2 = i % 3 === 0 ? 86 : 78;
        return (
          <line
            key={i}
            x1={100 + 68 * Math.sin(a)}
            y1={100 - 68 * Math.cos(a)}
            x2={100 + r2 * Math.sin(a)}
            y2={100 - r2 * Math.cos(a)}
            stroke="currentColor"
            strokeWidth={i % 3 === 0 ? 3 : 2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function describePalace(p: PalaceFacts, labels: ChartLabels): string {
  const star = (s: StarFact) =>
    [labels.starName(s.key, s.name), s.brightness && labels.brightnessName(s.brightness), s.mutagen && `Hóa ${labels.mutagenName(s.mutagen)}`]
      .filter(Boolean)
      .join(' ');
  const majors = p.majorStars.length ? p.majorStars.map(star).join(', ') : 'Vô chính diệu';
  const minors = p.minorStars.map(star).join(', ');
  return `${labels.palaceName(p.key, p.name)}${p.isBody ? ' (Thân)' : ''}, ${p.stem} ${p.branch}. Chính tinh: ${majors}.${minors ? ` Phụ tinh: ${minors}.` : ''} Đại hạn ${p.decadal.from}–${p.decadal.to}.`;
}

/** Lưới 12 cung. Chạm vào một cung để chọn; chạm lại để bỏ chọn. */
export function ChartGrid(props: ChartGridProps) {
  const { palaces, labels, center, showStems, selected, onSelect, strong = [], soft = [], arrows = [], badges = {}, full } = props;
  const container = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const centerRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [inner, setInner] = useState<Rect | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const next: Record<string, Box> = {};
      for (const [key, cell] of cells.current) {
        const r = cell.getBoundingClientRect();
        next[key] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2, w: r.width, h: r.height };
      }
      setBoxes(next);
      const c = centerRef.current?.getBoundingClientRect();
      if (c) setInner({ left: c.left - base.left, top: c.top - base.top, right: c.right - base.left, bottom: c.bottom - base.top });
      setSize({ w: base.width, h: base.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [palaces, full]);

  const focused = strong.length + soft.length > 0;
  const byKey = new Map(palaces.map((p) => [p.key, p]));

  return (
    <div ref={container} className={`relative grid grid-cols-4 gap-px overflow-hidden ${FRAME}`}>
      {palaces.map((p) => {
        const [row, col] = GRID_POSITION[p.branch]!;
        const isStrong = strong.includes(p.key);
        const isSoft = soft.includes(p.key);
        const marked = p.key === 'menh' || p.isBody;
        const minors = full ? [...p.minorStars, ...p.adjectiveStars] : p.minorStars;
        return (
          <button
            key={p.key}
            ref={(el) => {
              if (el) cells.current.set(p.key, el);
              else cells.current.delete(p.key);
            }}
            type="button"
            aria-pressed={selected === p.key}
            aria-label={describePalace(p, labels)}
            onClick={() => onSelect(selected === p.key ? null : p.key)}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
            className={[
              'relative flex min-h-28 flex-col gap-0.5 bg-card p-1 text-left text-[11px] leading-tight transition-opacity duration-150 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
              marked ? 'shadow-[inset_0_0_0_2px_var(--gold)]' : '',
              // Trộn đỏ son vào bề mặt (không dùng nền trong suốt, kẻo lộ màu viền của lưới). 11% để chữ
              // vàng, hợp, xung trên nền này vẫn đạt 4,5:1.
              isStrong ? 'z-[1] bg-[color-mix(in_oklab,var(--primary)_11%,var(--card))] shadow-[inset_0_0_0_2px_var(--primary)]' : '',
              isSoft ? 'bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))]' : '',
              focused && !isStrong && !isSoft ? '[&>*]:opacity-50' : '',
            ].join(' ')}
          >
            <span className="flex flex-wrap items-center gap-x-1 text-xs font-semibold">
              {labels.palaceName(p.key, p.name)}
              {p.isBody && <span className="rounded-sm bg-gold px-0.5 text-[10px] font-medium text-card">Thân</span>}
            </span>
            <span className="text-xs font-medium">
              {p.majorStars.length ? (
                p.majorStars.map((s) => <StarLine key={s.key} star={s} labels={labels} />)
              ) : (
                <span className="text-muted-foreground italic">Vô chính diệu</span>
              )}
            </span>
            <span className="text-muted-foreground">
              {minors.map((s) => (
                <StarLine key={s.key} star={s} labels={labels} small />
              ))}
            </span>
            {badges[p.key]?.map((b) => (
              <span key={b} className="w-fit rounded-sm border border-dashed border-xung px-0.5 text-[10px] text-xung">
                {b}
              </span>
            ))}
            <span className="mt-auto text-muted-foreground">{p.rings.changsheng}</span>
            <span className="flex flex-wrap justify-between gap-x-1 text-muted-foreground tabular-nums">
              <span className={showStems ? 'text-foreground' : undefined}>{showStems ? `${p.stem} ${p.branch}` : p.branch}</span>
              <span>
                {p.decadal.from}–{p.decadal.to}
              </span>
            </span>
          </button>
        );
      })}
      <div ref={centerRef} className={CENTER}>
        <CenterRing />
        <div className="relative flex flex-col items-center gap-1">{center}</div>
      </div>
      {arrows.length > 0 && size.w > 0 && inner && (
        <svg className="pointer-events-none absolute inset-0" width={size.w} height={size.h} aria-hidden="true">
          <defs>
            {(Object.keys(MUTAGEN_TONE) as Mutagen[]).map((m) => (
              <marker key={m} id={`tb-arrow-${m}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={MUTAGEN_TONE[m].stroke} />
              </marker>
            ))}
          </defs>
          {arrows.map((a) => {
            const from = boxes[a.from];
            const to = boxes[a.to];
            if (!from || !to || a.from === a.to || !byKey.has(a.to)) return null;
            const g = arrowBetween(from, to, MUTAGENS.indexOf(a.mutagen), inner);
            return (
              <g key={`${a.mutagen}-${a.to}`}>
                <path d={g.d} fill="none" stroke="var(--card)" strokeOpacity={0.85} strokeWidth={6} strokeLinecap="round" />
                <path d={g.d} fill="none" stroke={MUTAGEN_TONE[a.mutagen].stroke} strokeWidth={2} markerEnd={`url(#tb-arrow-${a.mutagen})`} />
                <text
                  x={g.lx}
                  y={g.ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={MUTAGEN_TONE[a.mutagen].stroke}
                  stroke="var(--card)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {labels.mutagenName(a.mutagen)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** Chế độ danh sách: cùng nội dung với lưới, đọc theo thứ tự Tý → Hợi, hợp với trình đọc màn hình. */
export function ChartList({ palaces, labels, showStems }: Pick<ChartGridProps, 'palaces' | 'labels' | 'showStems'>) {
  const ordered = [...palaces].sort((a, b) => BRANCH_ORDER.indexOf(a.branch) - BRANCH_ORDER.indexOf(b.branch));
  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-card">
      {ordered.map((p) => (
        <li key={p.key} className="flex flex-col gap-1 p-3 text-sm">
          <span className="flex justify-between">
            <span className="font-serif font-semibold">
              {labels.palaceName(p.key, p.name)}
              {p.isBody && ' · Thân'}
            </span>
            <span className="text-muted-foreground">{showStems ? `${p.stem} ${p.branch}` : p.branch}</span>
          </span>
          <span>
            {p.majorStars.length ? (
              p.majorStars.map((s) => <StarLine key={s.key} star={s} labels={labels} small />)
            ) : (
              <span className="text-muted-foreground italic">Vô chính diệu</span>
            )}
          </span>
          {p.minorStars.length > 0 && (
            <span className="text-muted-foreground">
              {p.minorStars.map((s) => (
                <StarLine key={s.key} star={s} labels={labels} small />
              ))}
            </span>
          )}
          <span className="text-muted-foreground tabular-nums">
            {p.rings.changsheng} · Đại hạn {p.decadal.from}–{p.decadal.to}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Thiếu giờ sinh: chỉ có sao an theo năm, theo địa chi; không gán tên cung (Technical Plan mục 5). */
export function YearStarsGrid({ yearStars, labels, center }: { yearStars: BranchStars[]; labels: ChartLabels; center: ReactNode }) {
  return (
    <div className={`grid grid-cols-4 gap-px overflow-hidden ${FRAME}`}>
      {yearStars.map((b) => {
        const [row, col] = GRID_POSITION[b.branch]!;
        return (
          <div key={b.branch} style={{ gridRow: row + 1, gridColumn: col + 1 }} className="flex min-h-24 flex-col gap-0.5 bg-card p-1 text-[11px] leading-tight">
            <span className="flex justify-between">
              <span className="text-muted-foreground italic">Cần giờ sinh</span>
              <span className="text-muted-foreground">{b.branch}</span>
            </span>
            <span>
              {b.stars.map((s) => (
                <StarLine key={s.key} star={s} labels={labels} small />
              ))}
            </span>
          </div>
        );
      })}
      <div className={CENTER}>
        <CenterRing />
        <div className="relative flex flex-col items-center gap-1">{center}</div>
      </div>
    </div>
  );
}

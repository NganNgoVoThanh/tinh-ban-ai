import { cn } from "cn";

/**
 * Biểu tượng Tinh Bàn (cùng hình với icon app): vòng 12 cung, vạch dài ở Tý, Mão, Ngọ, Dậu; chấm son
 * ở tâm, sao vàng phía trên là Mệnh. Vòng và vạch theo màu chữ (thường là text-gold). Chỉ để trang trí.
 * spin: vòng ngoài xoay rất chậm (tắt khi máy bật giảm chuyển động). core={false}: bỏ chấm son, dùng
 * khi biểu tượng nằm mờ phía sau chữ.
 */
export function Emblem({ className, spin, core = true }: { className?: string; spin?: boolean; core?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={cn("shrink-0", className)}>
      <g className={spin ? "animate-spin-slow" : undefined} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <circle cx="256" cy="256" r="236" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="4 12" opacity="0.6" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          const r2 = i % 3 === 0 ? 206 : 192;
          return (
            <line
              key={i}
              x1={256 + 168 * Math.sin(a)}
              y1={256 - 168 * Math.cos(a)}
              x2={256 + r2 * Math.sin(a)}
              y2={256 - r2 * Math.cos(a)}
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx="256" cy="256" r="150" fill="none" stroke="currentColor" strokeWidth="12" />
      {core && <circle cx="256" cy="256" r="34" fill="#c8323a" />}
      <circle cx="256" cy="160" r="16" fill="currentColor" />
    </svg>
  );
}

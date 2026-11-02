import { cn } from "cn";

/**
 * Biểu tượng Tinh Bàn (cùng hình với icon app): vòng 12 cung, vạch dài ở Tý, Mão, Ngọ, Dậu; chấm son
 * ở tâm, sao vàng phía trên là Mệnh. Vòng và vạch theo màu chữ (thường là text-gold). Chỉ để trang trí.
 * spin: vòng ngoài xoay rất chậm (tắt khi máy bật giảm chuyển động). core={false}: bỏ chấm son, dùng
 * khi biểu tượng nằm mờ phía sau chữ.
 */
export function Emblem({ className, spin, core = true }: { className?: string; spin?: boolean; core?: boolean }) {
  // Làm tròn tọa độ: sin/cos trên server và trình duyệt có thể lệch ở chữ số cuối, gây lệch khi hydrate.
  const at = (r: number, a: number, f: typeof Math.sin) => Math.round((256 + r * f(a)) * 100) / 100;
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
              x1={at(168, a, Math.sin)}
              y1={at(-168, a, Math.cos)}
              x2={at(r2, a, Math.sin)}
              y2={at(-r2, a, Math.cos)}
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

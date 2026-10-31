import type { ReactNode } from "react";

/** Một ô của form: nhãn, nội dung, lỗi báo ngay dưới ô. */
export function Field({ id, label, error, hint, children }: { id: string; label: ReactNode; error?: string | undefined; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-xung">
          {error}
        </p>
      )}
    </div>
  );
}

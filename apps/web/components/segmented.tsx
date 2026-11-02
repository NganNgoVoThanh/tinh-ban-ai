"use client";

import { cn } from "cn";
import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Nút chọn một trong vài lựa chọn, cao 44 px: các ô rời nhau nền ngà viền mảnh, ô đang chọn là lá vàng
 * (`gold-leaf`), chữ nâu đậm. Không dùng rãnh nền với viên nổi, không gạch dưới (ADR 0009).
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  invalid,
  disabled,
  id,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <ToggleGroup.Root
      id={id}
      type="single"
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      className="grid w-full auto-cols-fr grid-flow-col gap-2"
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            "min-h-11 rounded-xl border bg-card px-2 py-1 text-sm leading-tight font-medium text-muted-foreground outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 data-[state=off]:hover:border-[color-mix(in_oklab,var(--gold)_45%,var(--input))] data-[state=off]:hover:text-foreground data-[state=on]:gold-leaf data-[state=on]:font-semibold",
            invalid ? "border-xung" : "border-input",
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

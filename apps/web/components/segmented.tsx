"use client";

import { cn } from "cn";
import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";

/** Nút chọn một trong vài lựa chọn, cao 44 px; mục đang chọn là viên nền sáng viền chỉ vàng, chữ đỏ son đậm, bóng rất nhẹ. */
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
      className={cn("grid w-full auto-cols-fr grid-flow-col gap-1 rounded-xl border border-border bg-muted p-1", invalid && "ring-2 ring-xung")}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="h-11 rounded-lg px-2 text-sm font-medium text-muted-foreground outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_40%,transparent),0_2px_8px_-4px_rgb(90_60_20/0.25)]"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

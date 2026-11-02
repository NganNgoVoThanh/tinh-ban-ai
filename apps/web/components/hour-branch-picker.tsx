"use client";

import { useState } from "react";
import { Segmented } from "@/components/segmented";
import type { TyPart } from "@/lib/birth-form";
import { branchName, CANH, HOUR_RANGES } from "@/lib/format";

/**
 * Chọn giờ âm: lưới 12 giờ âm kèm khung giờ đồng hồ; dòng phụ "Biết theo canh?" đổi canh sang giờ âm.
 * Giờ Tý hỏi thêm trước hay sau nửa đêm.
 */
export function HourBranchPicker({
  id,
  branch,
  tyPart,
  onChange,
  invalid,
}: {
  id: string;
  branch: number | null;
  tyPart: TyPart | null;
  onChange: (branch: number, tyPart: TyPart | null) => void;
  invalid?: boolean;
}) {
  const [showCanh, setShowCanh] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div id={id} role="radiogroup" aria-label="Giờ âm" className="grid grid-cols-4 gap-1.5">
        {HOUR_RANGES.map((range, b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={branch === b}
            onClick={() => onChange(b, b === 0 ? tyPart : null)}
            className={`flex min-h-11 flex-col items-center justify-center rounded-lg border text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring ${
              branch === b ? "gold-leaf font-semibold" : `bg-card font-medium ${invalid ? "border-xung" : "border-input"}`
            }`}
          >
            <span>{branchName(b)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{range}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setShowCanh((v) => !v)} className="min-h-11 w-fit text-sm text-primary underline-offset-4 hover:underline" aria-expanded={showCanh}>
        Biết theo canh?
      </button>
      {showCanh && (
        <div className="grid grid-cols-5 gap-1.5" aria-label="Đổi canh sang giờ âm">
          {CANH.map((c) => (
            <button
              key={c.canh}
              type="button"
              onClick={() => onChange(c.branch, c.branch === 0 ? tyPart : null)}
              className="flex min-h-11 flex-col items-center justify-center rounded-lg border border-input bg-card text-sm"
            >
              <span>Canh {c.canh}</span>
              <span className="text-xs text-muted-foreground">{branchName(c.branch)}</span>
            </button>
          ))}
        </div>
      )}
      {branch === 0 && (
        <Segmented<TyPart>
          label="Giờ Tý trước hay sau nửa đêm"
          value={tyPart}
          onChange={(v) => onChange(0, v)}
          invalid={invalid && !tyPart}
          options={[
            { value: "before_midnight", label: "Trước nửa đêm (23–24 giờ)" },
            { value: "after_midnight", label: "Sau nửa đêm (0–1 giờ)" },
          ]}
        />
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { Emblem } from "@/components/emblem";

/** Màn trống (chưa có hồ sơ…): biểu tượng xoay chậm trên tấm sơn mài, tiêu đề, lời dẫn, các nút. */
export function EmptyState({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="blush relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl px-6 py-8">
        <Emblem className="size-24 text-gold animate-float" spin />
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
      {children}
    </main>
  );
}

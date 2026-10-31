import type { ReactNode } from 'react';

/**
 * Bốn nhãn nội dung bắt buộc (Technical Plan mục 13), mỗi nhãn một hình thức riêng, không chỉ
 * khác màu: Dữ kiện là chip xám, Diễn giải Tử Vi có viền trái đỏ son, Dân gian là khối nền màu đất,
 * Gợi ý tham khảo có viền đứt.
 */
export type ContentKind = 'fact' | 'interpretation' | 'folk' | 'suggestion';

export const CONTENT_LABEL: Record<ContentKind, string> = {
  fact: 'Dữ kiện',
  interpretation: 'Diễn giải Tử Vi',
  folk: 'Dân gian',
  suggestion: 'Gợi ý tham khảo',
};

const SHADOW = 'shadow-[0_1px_2px_rgb(60_20_20/0.05),0_10px_28px_-20px_rgb(60_20_20/0.35)]';

const BLOCK: Record<ContentKind, string> = {
  fact: `rounded-2xl border border-border bg-card p-4 ${SHADOW}`,
  interpretation: `rounded-r-2xl border-l-4 border-primary bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))] p-4 ${SHADOW}`,
  folk: 'rounded-2xl border border-[color-mix(in_oklab,var(--folk)_18%,transparent)] bg-folk-bg p-4 text-folk',
  suggestion: 'rounded-2xl border border-dashed border-muted-foreground p-4',
};

const TAG: Record<ContentKind, string> = {
  fact: 'rounded-full bg-muted px-2 text-muted-foreground',
  interpretation: 'text-primary',
  folk: 'text-folk',
  suggestion: 'text-muted-foreground',
};

export function ContentTag({ kind }: { kind: ContentKind }) {
  return <span className={`text-xs font-medium ${TAG[kind]}`}>{CONTENT_LABEL[kind]}</span>;
}

/** Khối nội dung có nhãn. extra: nhãn phụ như "Chưa qua chuyên gia", "Bắc phái". */
export function ContentBlock({ kind, title, extra, children }: { kind: ContentKind; title?: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className={BLOCK[kind]}>
      <header className="mb-1 flex items-center justify-between gap-2">
        {title ? <h3 className="font-serif text-base font-semibold">{title}</h3> : <ContentTag kind={kind} />}
        <span className="flex items-center gap-1">
          {extra}
          {title && <ContentTag kind={kind} />}
        </span>
      </header>
      {children}
    </section>
  );
}

/** Nhãn phụ dạng chip, ví dụ "Chưa qua chuyên gia" hoặc tên phái. */
export function SubLabel({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-border px-2 text-xs text-muted-foreground">{children}</span>;
}

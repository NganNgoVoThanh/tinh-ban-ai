"use client";

import { SCHOOL_NAMES, SCHOOL_IDS, type LocalProfile, type SchoolId } from "@tinhban/shared";
import { ArrowLeft, Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { profileLabel } from "@/lib/profiles";

/** Thanh trên: trái là chọn hồ sơ (hoặc nút quay lại và tiêu đề), phải là chip phái và menu. */
export function TopBar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 flex min-h-14 items-center justify-between gap-2 border-b border-border/70 bg-background/80 px-2 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex min-w-0 items-center">{left}</div>
      <div className="flex items-center gap-1">{right}</div>
    </header>
  );
}

/** Mũi tên quay lại: PWA trên iOS không có nút Back. */
export function BackTitle({ href, title }: { href: string; title: string }) {
  return (
    <>
      <Button asChild variant="ghost" size="icon" aria-label="Quay lại">
        <Link href={href}>
          <ArrowLeft aria-hidden />
        </Link>
      </Button>
      <h1 className="truncate font-serif text-lg font-semibold">{title}</h1>
    </>
  );
}

export function ProfileSwitcher({ profiles, current, onSelect }: { profiles: LocalProfile[]; current: LocalProfile; onSelect: (p: LocalProfile) => void }) {
  const router = useRouter();
  const index = profiles.findIndex((p) => p.profileId === current.profileId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-[55vw] gap-1 px-2 font-serif text-lg font-semibold">
          <span className="truncate">{profileLabel(current, Math.max(index, 0))}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Hồ sơ trên máy</DropdownMenuLabel>
        {profiles.map((p, i) => (
          <DropdownMenuItem key={p.profileId} className="min-h-11" onSelect={() => onSelect(p)}>
            <Check className={p.profileId === current.profileId ? "" : "invisible"} aria-hidden />
            {profileLabel(p, i)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11" onSelect={() => router.push("/ho-so/moi")}>
          <Plus aria-hidden /> Thêm hồ sơ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Chip phái: luôn viết đủ "Nam phái" / "Bắc phái". */
export function SchoolSwitch({ value, onChange }: { value: SchoolId; onChange: (s: SchoolId) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 rounded-full px-3" aria-label={`Phái: ${SCHOOL_NAMES[value]}. Đổi phái`}>
          {SCHOOL_NAMES[value]}
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Phái của hồ sơ này</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as SchoolId)}>
          {SCHOOL_IDS.map((s) => (
            <DropdownMenuRadioItem key={s} value={s} className="min-h-11">
              {SCHOOL_NAMES[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

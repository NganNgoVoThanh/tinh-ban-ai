import type { Metadata } from "next";
import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { DoorCards } from "@/components/landing";
import { BackTitle, TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Bắt đầu" };

/** Chọn cửa vào (Technical Plan mục 12): chọn một lần, quyết định tab mở đầu và thứ tự khối. */
export default function StartPage() {
  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-6 px-4 pb-8 lg:max-w-4xl lg:px-8">
      <TopBar left={<BackTitle href="/" title="Bắt đầu" />} />
      <div className="flex flex-col items-center gap-3 pt-2 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Emblem className="size-20 text-gold animate-float" spin />
        <p className="font-display text-[28px] leading-tight font-semibold">Bạn muốn xem điều gì trước?</p>
        <p className="text-sm text-muted-foreground">Chọn một lối vào; các phần khác vẫn mở được bất cứ lúc nào.</p>
      </div>
      <DoorCards />
      <Link href="/khoi-phuc" className="flex min-h-11 items-center justify-center text-primary">
        Đã có mã hồ sơ
      </Link>
    </main>
  );
}

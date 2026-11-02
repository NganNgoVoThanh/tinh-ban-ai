"use client";

import type { LocalProfile } from "@tinhban/shared";
import { Download, Share } from "lucide-react";
import { useEffect } from "react";
import { Emblem } from "@/components/emblem";
import { ProfileCodeCard } from "@/components/profile-code-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/sheet";
import { isIos, promptInstall, requestPersistentStorage, useCanInstall } from "@/lib/install";
import { isStandalone } from "@/lib/meta";
import { useHydrated } from "@/lib/use-hydrated";

/** Hướng dẫn cài app: iOS qua nút Chia sẻ, Android qua hộp thoại cài của trình duyệt. */
export function InstallGuide() {
  const canInstall = useCanInstall();
  // User agent và chế độ hiển thị chỉ đọc được sau khi hydrate (lúc prerender không có navigator).
  const hydrated = useHydrated();
  const ios = hydrated && isIos();
  if (hydrated && isStandalone()) return null;
  return (
    <section className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold">Cài app lên màn hình chính</h3>
      {canInstall ? (
        <Button variant="outline" onClick={() => void promptInstall()}>
          <Download aria-hidden /> Cài app
        </Button>
      ) : ios ? (
        <p className="text-muted-foreground">
          Trên iPhone: bấm <Share className="inline size-4" aria-label="Chia sẻ" /> ở thanh dưới của Safari, chọn &quot;Thêm vào MH chính&quot;.
        </p>
      ) : (
        <p className="text-muted-foreground">Trên Android: mở menu ⋮ của Chrome, chọn &quot;Cài đặt ứng dụng&quot; hoặc &quot;Thêm vào màn hình chính&quot;.</p>
      )}
      <p className="text-muted-foreground">App đã cài thì trình duyệt giữ dữ liệu lâu hơn và chạy được khi không có mạng.</p>
    </section>
  );
}

/** Bảng "Giữ lá số an toàn" hiện sau khi lưu hồ sơ đầu tiên (Technical Plan mục 11). */
export function KeepSafeSheet({ profile, open, onOpenChange }: { profile: LocalProfile; open: boolean; onOpenChange: (open: boolean) => void }) {
  useEffect(() => {
    if (open) void requestPersistentStorage();
  }, [open]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4">
          <SheetHeader className="items-center px-0">
            <Emblem className="mb-1 size-12 text-gold" />
            <SheetTitle className="font-display text-2xl font-semibold">Giữ lá số an toàn</SheetTitle>
            <SheetDescription>Hồ sơ chỉ nằm trên máy này. Lưu mã hồ sơ để khôi phục khi đổi máy hoặc trình duyệt xóa dữ liệu.</SheetDescription>
          </SheetHeader>
          <ProfileCodeCard profile={profile} />
          <InstallGuide />
        </div>
        <SheetFooter className="mx-auto w-full max-w-md">
          <Button size="lg" className="rounded-full" onClick={() => onOpenChange(false)}>
            Đã lưu, xem lá số
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Download, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { trackEvent } from "@/lib/analytics";
import { CARD_HEIGHT, CARD_WIDTH, svgToPng, yearCardSvg, type YearCard } from "@/lib/share-card";

/**
 * Bảng chia sẻ thẻ (Technical Plan mục 14): xem trước, chia sẻ ảnh qua navigator.share({ files }),
 * trình duyệt không hỗ trợ thì tải ảnh về. Ảnh vẽ ngay trên máy, không gửi lên server.
 */
export function ShareCardSheet({ card, open, onOpenChange }: { card: YearCard; open: boolean; onOpenChange: (open: boolean) => void }) {
  const svg = useMemo(() => yearCardSvg(card), [card]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) trackEvent("share_card_created", { card_type: "year" });
  }, [open]);

  const fileName = `tinhban-nam-${card.lunarYear}.png`;
  const share = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const file = new File([await svgToPng(svg)], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Năm ${card.lunarYear} của tôi` });
      } else {
        const url = URL.createObjectURL(file);
        const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      trackEvent("share_card_shared", { card_type: "year" });
    } catch (e) {
      // Người dùng đóng bảng chia sẻ của hệ điều hành: không phải lỗi.
      if ((e as Error).name !== "AbortError") setError("Chưa tạo được ảnh. Thử lại sau.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 overflow-y-auto px-4">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-display text-2xl font-semibold">Chia sẻ năm {card.lunarYear}</DrawerTitle>
            <DrawerDescription>Thẻ không có ngày giờ sinh, tuổi, tên hay mã hồ sơ.</DrawerDescription>
          </DrawerHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh SVG tạo trên máy, không qua next/image */}
          <img
            data-testid="share-card"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            alt={`Thẻ năm ${card.lunarYear} ${card.canChi}: cung hạn ${card.limitPalace}`}
            className="mx-auto h-auto max-h-[55dvh] w-auto rounded-xl"
          />
          {error && (
            <p role="alert" className="text-sm text-xung">
              {error}
            </p>
          )}
        </div>
        <DrawerFooter className="mx-auto w-full max-w-md">
          <Button size="lg" disabled={busy} onClick={() => void share()}>
            {typeof navigator !== "undefined" && "share" in navigator ? <Share2 aria-hidden /> : <Download aria-hidden />}
            Chia sẻ ảnh
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

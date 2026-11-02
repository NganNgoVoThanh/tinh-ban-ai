"use client";

import { cn } from "cn";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { useWide } from "@/lib/use-media-query";

const WideContext = createContext(false);

/**
 * Bảng nổi theo khổ màn hình: điện thoại là bảng kéo lên từ đáy (dễ với bằng ngón cái); từ md (768 px)
 * là hộp thoại giữa màn hình, rộng vừa nội dung, không tràn hết bề ngang như bảng kéo lên.
 */
export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const wide = useWide();
  const Root = wide ? Dialog : Drawer;
  return (
    <WideContext value={wide}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </WideContext>
  );
}

export function SheetContent({ children }: { children: ReactNode }) {
  return useContext(WideContext) ? (
    <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">{children}</DialogContent>
  ) : (
    <DrawerContent className="max-h-[92dvh]">{children}</DrawerContent>
  );
}

/** Đầu bảng: căn giữa ở cả hai dạng (bảng kéo lên của vaul vốn căn giữa). */
export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-0.5 p-4 text-center", className)} {...props} />;
}

export function SheetTitle(props: ComponentProps<typeof DialogTitle>) {
  return useContext(WideContext) ? <DialogTitle {...props} /> : <DrawerTitle {...props} />;
}

export function SheetDescription(props: ComponentProps<typeof DialogDescription>) {
  return useContext(WideContext) ? <DialogDescription {...props} /> : <DrawerDescription {...props} />;
}

/** Chân bảng chỉ là khối div, giống nhau ở hai dạng. */
export const SheetFooter = DrawerFooter;

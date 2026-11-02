"use client";

import { PROVINCES, provinceByCode } from "@tinhban/calendar";
import { ChevronDown, Globe, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Place } from "@/lib/birth-form";
import { fold } from "@/lib/text";
import { useWide } from "@/lib/use-media-query";

/** "America/Los_Angeles" → "Los Angeles · America" */
export function timeZoneLabel(tz: string): string {
  const parts = tz.split("/");
  const city = parts.at(-1)!.replace(/_/g, " ");
  return parts.length > 1 ? `${city} · ${parts.slice(0, -1).join("/").replace(/_/g, " ")}` : city;
}

export function placeLabel(place: Place | null): string | null {
  if (!place) return null;
  if (place.kind === "abroad") return `Nước ngoài · ${timeZoneLabel(place.tz)}`;
  return provinceByCode(place.code)?.name ?? place.code;
}

const allTimeZones = () => Intl.supportedValuesOf("timeZone").filter((tz) => tz.includes("/"));

/**
 * Chọn nơi sinh: 63 tỉnh trước 07/2025, hoặc "Nước ngoài" rồi chọn múi giờ IANA. Điện thoại: bảng kéo
 * lên; từ md: ô nổi ngay dưới nút, rộng bằng nút, như ô chọn của trang web.
 */
export function PlacePicker({ id, value, onChange, invalid }: { id: string; value: Place | null; onChange: (p: Place) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"province" | "abroad">("province");
  const wide = useWide();
  const timeZones = useMemo(() => (step === "abroad" ? allTimeZones() : []), [step]);
  const title = step === "province" ? "Nơi sinh" : "Múi giờ nơi sinh";

  const openChange = (o: boolean) => {
    setOpen(o);
    if (!o) setStep("province");
  };
  const close = (p: Place) => {
    onChange(p);
    openChange(false);
  };

  const trigger = (
    <Button
      id={id}
      type="button"
      variant="outline"
      aria-invalid={invalid || undefined}
      aria-haspopup="dialog"
      aria-label={`Nơi sinh: ${placeLabel(value) ?? "chưa chọn"}`}
      // Từ md, PopoverTrigger tự mở và đóng ô nổi.
      onClick={wide ? undefined : () => setOpen(true)}
      className="w-full justify-between bg-card font-normal aria-invalid:border-xung aria-invalid:ring-xung/30"
    >
      <span className={value ? "" : "text-muted-foreground"}>{placeLabel(value) ?? "Chọn tỉnh, thành nơi sinh"}</span>
      <ChevronDown aria-hidden />
    </Button>
  );

  const list = (
    <Command
      className="min-h-0 flex-1 px-2"
      filter={(itemValue, search, keywords) => (fold([itemValue, ...(keywords ?? [])].join(" ")).includes(fold(search)) ? 1 : 0)}
    >
      <CommandInput placeholder={step === "province" ? "Tìm tỉnh, thành (gõ không dấu cũng được)" : "Tìm thành phố, ví dụ Paris"} className="text-base" />
      <CommandList className="max-h-none flex-1">
        <CommandEmpty>Không tìm thấy</CommandEmpty>
        {step === "province" ? (
          <>
            <CommandGroup heading="Ngoài Việt Nam">
              <CommandItem value="Nước ngoài" keywords={["nuoc ngoai", "abroad"]} onSelect={() => setStep("abroad")} className="min-h-11">
                <Globe aria-hidden /> Nước ngoài
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="63 tỉnh, thành (trước 07/2025)">
              {PROVINCES.map((p) => (
                <CommandItem key={p.code} value={p.name} keywords={[p.code]} onSelect={() => close({ kind: "province", code: p.code })} className="min-h-11">
                  <MapPin aria-hidden /> {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          <CommandGroup heading="Múi giờ IANA">
            {timeZones.map((tz) => (
              <CommandItem key={tz} value={tz} keywords={[timeZoneLabel(tz)]} onSelect={() => close({ kind: "abroad", tz })} className="min-h-11">
                {timeZoneLabel(tz)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );

  if (wide)
    return (
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={16}
          aria-label={title}
          className="h-[min(22rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) min-w-80 gap-0 rounded-2xl p-0 py-1"
        >
          {list}
        </PopoverContent>
      </Popover>
    );

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={openChange}>
        <DrawerContent className="h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {list}
        </DrawerContent>
      </Drawer>
    </>
  );
}

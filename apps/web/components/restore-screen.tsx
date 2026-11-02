"use client";

import { provinceByCode } from "@tinhban/calendar";
import { decodeProfileCode, normalizeProfileCode, ProfileCodeError, type DecodedProfile } from "@tinhban/profile-code";
import { SCHOOL_NAMES } from "@tinhban/shared";
import { QrCode, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Emblem } from "@/components/emblem";
import { QrScanner } from "@/components/qr-scanner";
import { BackTitle, TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { BackupError } from "@/lib/backup-format";
import { importBackup, restoreProfile } from "@/lib/data";
import { branchName, formatSolar } from "@/lib/format";
import { chartHref } from "@/lib/routes";

/** Lấy mã từ link khôi phục (…/khoi-phuc#ma=TB2-…) hoặc từ chính chuỗi mã. */
export function codeFromScan(text: string): string {
  const m = /[#&?]ma=([^&]+)/.exec(text);
  return m ? decodeURIComponent(m[1]!) : text.trim();
}

/** Định dạng khi gõ: TB2-XXXX-XXXX-… */
function formatCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const head = raw.slice(0, 3);
  const body = raw.slice(3).match(/.{1,4}/g) ?? [];
  return [head, ...body].filter(Boolean).join("-");
}

function describe(p: DecodedProfile): string {
  const b = p.birth;
  const date = b.calendar === "solar" ? formatSolar(b.date) : `${formatSolar(b.date)} âm lịch${b.isLeapMonth ? " (nhuận)" : ""}`;
  const time = b.timeCertainty === "exact" ? b.time : b.timeCertainty === "canh" ? `giờ ${branchName(b.timeBranch ?? 0)}` : "không rõ giờ";
  const place = b.region === "abroad" ? `nước ngoài (${b.abroadTz})` : b.provinceCode ? provinceByCode(b.provinceCode)?.name : undefined;
  return [date, time, place, b.gender === "male" ? "Nam" : "Nữ", SCHOOL_NAMES[p.schoolId]].filter(Boolean).join(" · ");
}

/** Phần # của URL lúc mở trang, chụp một lần (sau đó bị xóa khỏi thanh địa chỉ). */
let openingHash: string | undefined;
const noop = () => () => undefined;

/** Khôi phục bằng mã hồ sơ, QR hoặc file sao lưu (Technical Plan mục 11, 12). */
export function RestoreScreen() {
  const router = useRouter();
  const hash = useSyncExternalStore(
    noop,
    () => (openingHash ??= window.location.hash),
    () => "",
  );
  const fromLink = hash.includes("ma=") ? formatCode(codeFromScan(hash)) : "";
  const [entry, setEntry] = useState<{ code: string; via: "code" | "qr" } | null>(null);
  const { code, via } = entry ?? { code: fromLink, via: fromLink ? "qr" : "code" };
  const [name, setName] = useState("");
  const [scanning, setScanning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Mã đến từ link QR nằm sau dấu #: xóa khỏi thanh địa chỉ ngay khi đã đọc.
  useEffect(() => {
    if (window.location.hash.includes("ma=")) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const result = useMemo((): { profile?: DecodedProfile; error?: string } => {
    if (normalizeProfileCode(code).length < 8) return {};
    try {
      return { profile: decodeProfileCode(code) };
    } catch (e) {
      return { error: e instanceof ProfileCodeError ? e.message : "Mã hồ sơ không đọc được" };
    }
  }, [code]);

  const onScan = useCallback((text: string) => {
    setScanning(false);
    setEntry({ code: formatCode(codeFromScan(text)), via: "qr" });
  }, []);

  const restore = async () => {
    if (!result.profile) return;
    const p = await restoreProfile(result.profile.birth, result.profile.schoolId, name.trim());
    trackEvent("profile_restored", { via });
    router.push(chartHref(p.profileId));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = await importBackup(file);
      trackEvent("profile_restored", { via: "file" });
      toast(`Đã thêm ${r.added} hồ sơ${r.skipped ? `, bỏ qua ${r.skipped} hồ sơ đã có` : ""}${r.invalid ? `, ${r.invalid} mục hỏng` : ""}`);
      router.push("/la-so");
    } catch (e) {
      toast(e instanceof BackupError ? e.message : "Không đọc được file");
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-6 px-4 pb-8 lg:max-w-5xl lg:px-8">
      <TopBar left={<BackTitle href="/" title="Khôi phục" />} />
      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        <Emblem className="size-10 text-gold" />
        Nhập mã hồ sơ (bắt đầu bằng TB2) hoặc quét mã QR đã lưu để dựng lại lá số trên máy này.
      </p>

      {/* Máy tính: hai cách khôi phục là hai thẻ cạnh nhau. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <section className="flex flex-col gap-3 lg:surface lg:rounded-3xl lg:border lg:p-6">
          <h2 className="hidden font-serif text-lg font-semibold lg:block">Từ mã hồ sơ</h2>
          <Field id="code" label="Mã hồ sơ" error={result.error}>
            <Input
              id="code"
              value={code}
              onChange={(e) => setEntry({ code: formatCode(e.target.value), via: "code" })}
              placeholder="TB2-XXXX-XXXX-XXXX-XX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={result.error ? true : undefined}
              aria-describedby={result.error ? "code-error" : undefined}
              className="font-mono tracking-wider"
            />
          </Field>
          <Button variant="outline" onClick={() => setScanning(true)}>
            <QrCode aria-hidden /> Quét mã QR
          </Button>
          {result.profile && (
            <div className="surface flex flex-col gap-3 rounded-2xl border border-gold/50 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm">{describe(result.profile)}</p>
              <Field id="restore-name" label="Tên (không có trong mã, đặt lại nếu muốn)">
                <Input id="restore-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" />
              </Field>
              <Button size="lg" className="rounded-full" onClick={() => void restore()}>
                Khôi phục lá số
              </Button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2 lg:surface lg:gap-3 lg:rounded-3xl lg:border lg:p-6">
          <h2 className="font-serif text-lg font-semibold">Từ file sao lưu</h2>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden /> Nhập file sao lưu
          </Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Chọn file sao lưu" onChange={(e) => void onFile(e.target.files?.[0])} />
          <p className="text-sm text-muted-foreground">Mã hồ sơ khôi phục một hồ sơ; file sao lưu khôi phục cả nhà cùng lịch sử hỏi đáp.</p>
        </section>
      </div>

      <Dialog open={scanning} onOpenChange={setScanning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quét mã QR</DialogTitle>
          </DialogHeader>
          {scanning && <QrScanner onResult={onScan} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

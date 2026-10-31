"use client";

import { encodeProfileCode } from "@tinhban/profile-code";
import type { LocalProfile } from "@tinhban/shared";
import { Copy, Send } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Link khôi phục: mã nằm sau dấu #, nên không bao giờ được gửi lên máy chủ. */
export const restoreLink = (code: string) => `${window.location.origin}/khoi-phuc#ma=${encodeURIComponent(code)}`;

/** Mã hồ sơ, QR, "Gửi cho chính mình" (Technical Plan mục 11). */
export function ProfileCodeCard({ profile }: { profile: LocalProfile }) {
  const code = useMemo(() => encodeProfileCode({ birth: profile.birth, schoolId: profile.schoolId }), [profile.birth, profile.schoolId]);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void QRCode.toString(restoreLink(code), { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((svg) => alive && setQr(svg));
    return () => {
      alive = false;
    };
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast("Đã chép mã hồ sơ");
    } catch {
      toast("Không chép được; hãy chép tay mã ở trên");
    }
  };
  const share = async () => {
    const text = `Mã hồ sơ Tinh Bàn: ${code}\nGiữ kín: ai có mã cũng dựng được lá số.`;
    if (navigator.share) {
      await navigator.share({ title: "Mã hồ sơ Tinh Bàn", text, url: restoreLink(code) }).catch(() => undefined);
    } else {
      await copy();
    }
  };

  return (
    <section aria-label="Mã hồ sơ" className="surface flex flex-col items-center gap-3 rounded-2xl border p-4">
      <p
        className="rounded-xl border border-dashed border-gold/60 bg-[color-mix(in_oklab,var(--gold)_6%,var(--card))] px-3 py-2 font-mono text-lg font-semibold tracking-wider select-all"
        data-testid="profile-code"
      >
        {code}
      </p>
      {qr && (
        // QR là SVG do thư viện qrcode sinh từ chính link khôi phục.
        <div className="size-40 rounded-xl bg-white p-1.5 shadow-[0_0_0_1px_var(--border),0_10px_24px_-14px_rgb(60_20_20/0.4)] [&_svg]:size-full" role="img" aria-label="Mã QR để khôi phục hồ sơ" dangerouslySetInnerHTML={{ __html: qr }} />
      )}
      <div className="grid w-full grid-cols-2 gap-2">
        <Button variant="outline" onClick={copy}>
          <Copy aria-hidden /> Chép mã
        </Button>
        <Button variant="outline" onClick={share}>
          <Send aria-hidden /> Gửi cho chính mình
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Ai có mã cũng dựng được lá số này. Giữ mã ở chỗ riêng tư; mã không chứa tên.</p>
    </section>
  );
}

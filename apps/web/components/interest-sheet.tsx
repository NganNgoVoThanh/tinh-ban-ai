"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { getInstallId } from "@/lib/meta";
import type { ProductId } from "@/lib/plans";
import { useSettings } from "@/lib/settings";

/** Ba gói của bản trả phí (Technical Plan mục 14). P0 chưa hiện giá; quyền lợi chi tiết theo đặc tả v1.0. */
const PRODUCTS: { id: ProductId; title: string; text: string }[] = [
  { id: "sub_month", title: "Gói tháng", text: "Hỏi tự do nhiều hơn mỗi ngày, trả theo tháng." },
  { id: "sub_year", title: "Gói năm", text: "Như gói tháng, trả một lần cho cả năm." },
  { id: "qa_pack", title: "Gói lượt hỏi", text: "Mua thêm câu hỏi tự do khi cần, theo câu hoặc theo ngày." },
];

/**
 * Bảng "Báo tôi khi có": chọn gói, email không bắt buộc, phải đồng ý; Turnstile khi server yêu cầu.
 * initial: gói đánh dấu sẵn khi mở từ một thẻ ở trang Các gói.
 */
export function InterestSheet({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (open: boolean) => void; initial?: ProductId[] }) {
  const settings = useSettings();
  const [picked, setPicked] = useState<ProductId[]>(initial ?? []);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string>();
  const [siteKey, setSiteKey] = useState<string>();
  const [sending, setSending] = useState(false);

  const toggle = (id: ProductId) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    trackEvent("interest_clicked", { product: id });
  };

  const send = async (turnstileToken?: string) => {
    if (!picked.length) return setError("Chọn ít nhất một gói");
    if (!consent) return setError("Cần đánh dấu đồng ý để gửi");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Email chưa đúng");
    setError(undefined);
    setSending(true);
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          installId: await getInstallId(),
          products: picked,
          ...(email && { email }),
          consent: true,
          door: settings?.door ?? "A",
          ...(turnstileToken && { turnstileToken }),
        }),
      });
      if (res.status === 403) {
        const config = (await fetch("/api/config").then((r) => r.json())) as { turnstile: { siteKey: string | null } };
        if (config.turnstile.siteKey) return setSiteKey(config.turnstile.siteKey);
      }
      if (!res.ok) return setError("Chưa gửi được. Thử lại sau.");
      toast("Đã ghi nhận. Tinh Bàn sẽ báo khi có bản trả phí.");
      setSiteKey(undefined);
      onOpenChange(false);
    } catch {
      setError("Cần có mạng để gửi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-display text-2xl font-semibold">Bản trả phí</DrawerTitle>
            <DrawerDescription>Chưa thu tiền. Chọn gói bạn quan tâm, Tinh Bàn sẽ báo khi có.</DrawerDescription>
          </DrawerHeader>
          <ul className="flex flex-col gap-2">
            {PRODUCTS.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-colors has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-[color-mix(in_oklab,var(--primary)_5%,var(--card))]">
                  <Checkbox className="mt-1" checked={picked.includes(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={p.title} />
                  <span className="flex flex-col">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-sm text-muted-foreground">{p.text}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Field id="interest-email" label="Email (không bắt buộc)" hint="Chỉ dùng để báo khi có bản trả phí.">
            <Input id="interest-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox className="mt-0.5" checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-label="Đồng ý lưu lựa chọn" />
            <span>Tôi đồng ý để Tinh Bàn lưu lựa chọn này{email && " và email"} gắn với mã cài đặt ẩn danh của máy. Xóa được bằng “Xóa toàn bộ dữ liệu”.</span>
          </label>
          {siteKey && <Turnstile siteKey={siteKey} onToken={(t) => void send(t)} />}
          {error && (
            <p role="alert" className="text-sm text-xung">
              {error}
            </p>
          )}
        </div>
        <DrawerFooter className="mx-auto w-full max-w-md">
          <Button size="lg" className="rounded-full" disabled={sending} onClick={() => void send()}>
            Báo tôi khi có
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

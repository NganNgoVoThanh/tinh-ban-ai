"use client";

import { SCHOOL_NAMES, type SchoolId, type Settings } from "@tinhban/shared";
import { Bell, ChevronRight, Crown, Download, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Emblem } from "@/components/emblem";
import { Segmented } from "@/components/segmented";
import { TopBar } from "@/components/top-bar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { BackupError } from "@/lib/backup-format";
import { deleteAllLocalData, exportBackup, importBackup } from "@/lib/data";
import { formatSolar } from "@/lib/format";
import { CURRENT_PLAN, FREE_DAILY_QUESTIONS, planName } from "@/lib/plans";
import { profileLabel, useProfiles } from "@/lib/profiles";
import { useDailyQuota } from "@/lib/quota";
import { disablePush, enablePush, pushSupport } from "@/lib/push";
import { chartHref } from "@/lib/routes";
import { getSettings, updateSettings, useSettings } from "@/lib/settings";
import { reminderIcs, toIso } from "@/lib/today";
import { useHydrated } from "@/lib/use-hydrated";
import { useToday } from "@/lib/use-today";

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

/** Sao lưu ra file (có cảnh báo chưa mã hóa), nhập file, xóa toàn bộ dữ liệu (Technical Plan mục 11, 16). */
function DataSettings() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = await importBackup(file);
      trackEvent("profile_restored", { via: "file" });
      toast(`Đã thêm ${r.added} hồ sơ${r.skipped ? `, bỏ qua ${r.skipped} hồ sơ đã có` : ""}${r.invalid ? `, ${r.invalid} mục hỏng` : ""}`);
    } catch (e) {
      toast(e instanceof BackupError ? e.message : "Không đọc được file");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <SettingRow label="Dữ liệu trên máy">
      <AlertDialog open={exportOpen} onOpenChange={setExportOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="justify-start">
            <Download aria-hidden /> Sao lưu ra file
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sao lưu ra file</AlertDialogTitle>
            <AlertDialogDescription>
              File chứa tên, ngày giờ sinh của cả nhà và lịch sử hỏi đáp, chưa được mã hóa. Cất file ở chỗ riêng tư.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Thôi</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await exportBackup();
                trackEvent("backup_exported");
              }}
            >
              Tải file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="outline" className="justify-start" onClick={() => fileInput.current?.click()}>
        <Upload aria-hidden /> Nhập file sao lưu
      </Button>
      <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Chọn file sao lưu" onChange={(e) => void onImport(e.target.files?.[0])} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="justify-start">
            <Trash2 aria-hidden /> Xóa toàn bộ dữ liệu
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa toàn bộ dữ liệu?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>Sẽ xóa:</p>
                <ul className="list-disc pl-5">
                  <li>mọi hồ sơ, lá số và lịch sử hỏi đáp trên máy;</li>
                  <li>cài đặt và đăng ký nhắc nhở;</li>
                  <li>dữ liệu trên máy chủ gắn với máy này (đăng ký quan tâm, nhắc nhở).</li>
                </ul>
                <p>Nên lưu mã hồ sơ hoặc file sao lưu trước: sau khi xóa không khôi phục được.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive bg-none text-white shadow-none hover:bg-destructive/90 dark:text-background"
              onClick={async () => {
                await deleteAllLocalData();
                window.location.replace("/");
              }}
            >
              Xóa toàn bộ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingRow>
  );
}

/** Nhắc nhở do người dùng tự bật: file .ics lặp hằng ngày, mở /hom-nay (Technical Plan mục 11). */
function ReminderSettings() {
  const [time, setTime] = useState("07:00");
  const download = () => {
    const blob = new Blob([reminderIcs(window.location.origin, time, new Date())], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "tinhban-nhac-hom-nay.ics" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    void getSettings().then(({ reminders }) => updateSettings({ reminders: { ...reminders, ics: true } }));
    trackEvent("reminder_enabled", { type: "ics" });
  };
  return (
    <SettingRow label="Nhắc xem ngày mỗi sáng">
      <div className="flex gap-2">
        <Input type="time" aria-label="Giờ nhắc" value={time} onChange={(e) => setTime(e.target.value || "07:00")} className="w-32 tabular-nums" />
        <Button variant="outline" className="flex-1 justify-start" onClick={download}>
          <Bell aria-hidden /> Thêm vào lịch (.ics)
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Mở file để thêm sự kiện lặp hằng ngày vào app Lịch; bấm vào sự kiện sẽ mở Hôm nay.</p>
    </SettingRow>
  );
}

/** Web Push mỗi sáng: chỉ khi trình duyệt hỗ trợ; iPhone cần cài app lên màn hình chính trước. */
function PushSettings({ enabled }: { enabled: boolean }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  if (!hydrated) return null;
  const support = pushSupport();
  const change = async (on: boolean) => {
    if (on === enabled) return;
    setBusy(true);
    try {
      if (!on) return void (await disablePush());
      const r = await enablePush();
      if (r === "denied") toast("Trình duyệt đang chặn thông báo. Mở cài đặt trang để cho phép.");
      else if (r === "unavailable") toast("Máy chủ chưa bật thông báo. Dùng file .ics ở trên.");
      else if (r === "error") toast("Chưa bật được thông báo. Thử lại sau.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <SettingRow label="Thông báo mỗi sáng">
      {support === "supported" ? (
        <>
          <Segmented<"on" | "off">
            label="Thông báo mỗi sáng"
            value={enabled ? "on" : "off"}
            disabled={busy}
            onChange={(v) => void change(v === "on")}
            options={[
              { value: "on", label: "Bật" },
              { value: "off", label: "Tắt" },
            ]}
          />
          <p className="text-sm text-muted-foreground">Khoảng 7 giờ sáng, chỉ ghi “Xem ngày hôm nay”, không có dữ liệu cá nhân.</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {support === "needs_install"
            ? "Trên iPhone, cài app lên màn hình chính (Chia sẻ → Thêm vào MH chính) rồi bật ở đây."
            : "Trình duyệt này chưa nhận được thông báo; dùng file .ics ở trên."}
        </p>
      )}
    </SettingRow>
  );
}

/** Màu nền ảnh đại diện chữ cái, xoay vòng theo thứ tự hồ sơ (chữ trắng trên nền đậm, từ 4,5:1). */
const AVATAR = ["bg-[#a3171f]", "bg-[#835c12]", "bg-[#27734a]", "bg-[#6a3fa0]", "bg-[#1e5aa0]"];

/** Thẻ gói hiện tại ở đầu tab Hồ sơ: tên gói, lượt hỏi hôm nay, lối sang trang Các gói. */
function PlanCard() {
  const today = useToday();
  const [quota] = useDailyQuota(today ? toIso(today) : null, FREE_DAILY_QUESTIONS);
  return (
    <Link
      href="/goi"
      className="gilded group flex items-center gap-4 overflow-hidden rounded-3xl p-4 outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Emblem className="size-12 text-gold" spin />
      <span className="flex flex-1 flex-col">
        <span className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Gói của bạn</span>
        <span className="font-display text-2xl leading-tight font-semibold">{planName(CURRENT_PLAN)}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {quota ? `Còn ${quota.remaining}/${quota.total} câu hỏi tự do hôm nay` : `${FREE_DAILY_QUESTIONS} câu hỏi tự do mỗi ngày`}
        </span>
      </span>
      <span className="flex items-center gap-1 rounded-full border border-gold/50 px-3 py-1.5 text-sm font-medium text-gold transition-colors group-hover:bg-gold/10">
        <Crown className="size-4" aria-hidden /> Các gói
      </span>
    </Link>
  );
}

/** Tab Hồ sơ: gói hiện tại, danh sách cả nhà và Cài đặt (Technical Plan mục 12). */
export function ProfilesScreen() {
  const profiles = useProfiles();
  const settings = useSettings();
  const { setTheme } = useTheme();

  const setThemeSetting = (theme: Settings["theme"]) => {
    setTheme(theme);
    void updateSettings({ theme });
    trackEvent("theme_set", { value: theme });
  };
  const setDefaultSchool = (to: SchoolId) => {
    if (!settings || to === settings.defaultSchool) return;
    void updateSettings({ defaultSchool: to });
    trackEvent("school_switched", { from: settings.defaultSchool, to, where: "settings" });
  };

  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-6 px-4 pb-8">
      <TopBar left={<h1 className="px-2 font-serif text-xl font-semibold">Hồ sơ</h1>} />
      <PlanCard />

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Cả nhà</h2>
        <ul className="surface divide-y divide-border overflow-hidden rounded-2xl border">
          {profiles?.map((p, i) => (
            <li key={p.profileId}>
              <Link href={chartHref(p.profileId)} className="flex min-h-16 items-center gap-3 px-3 transition-colors hover:bg-muted">
                <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full font-serif text-lg font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] ${AVATAR[i % AVATAR.length]}`}>
                  {profileLabel(p, i).charAt(0).toUpperCase()}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-medium">{profileLabel(p, i)}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {p.birth.calendar === "solar" ? formatSolar(p.birth.date) : `${formatSolar(p.birth.date)} âm lịch`} · {SCHOOL_NAMES[p.schoolId]}
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link href="/ho-so/moi" className="flex min-h-14 items-center gap-2 px-3 font-medium text-primary transition-colors hover:bg-muted">
              <Plus aria-hidden /> Thêm hồ sơ
            </Link>
          </li>
          <li>
            <Link href="/khoi-phuc" className="flex min-h-14 items-center gap-2 px-3 font-medium text-primary transition-colors hover:bg-muted">
              <Upload aria-hidden /> Khôi phục bằng mã hoặc file
            </Link>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Cài đặt</h2>
        <div className="surface divide-y divide-border rounded-2xl border">
          <SettingRow label="Giao diện">
            <Segmented<Settings["theme"]>
              label="Giao diện"
              value={settings?.theme ?? null}
              onChange={setThemeSetting}
              options={[
                { value: "system", label: "Theo máy" },
                { value: "light", label: "Sáng" },
                { value: "dark", label: "Tối" },
              ]}
            />
          </SettingRow>
          <SettingRow label="Phái mặc định cho hồ sơ mới">
            <Segmented<SchoolId>
              label="Phái mặc định"
              value={settings?.defaultSchool ?? null}
              onChange={setDefaultSchool}
              options={[
                { value: "nam", label: SCHOOL_NAMES.nam },
                { value: "bac", label: SCHOOL_NAMES.bac },
              ]}
            />
          </SettingRow>
          <ReminderSettings />
          <PushSettings enabled={settings?.reminders.push ?? false} />
          <SettingRow label="Bản trả phí">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/goi">
                <Crown className="text-gold" aria-hidden /> Xem các gói
              </Link>
            </Button>
          </SettingRow>
          <DataSettings />
          <SettingRow label="Gửi số liệu dùng app ẩn danh">
            <Segmented<"on" | "off">
              label="Phân tích ẩn danh"
              value={settings?.analyticsConsent === true ? "on" : settings?.analyticsConsent === false ? "off" : null}
              onChange={(v) => void updateSettings({ analyticsConsent: v === "on" })}
              options={[
                { value: "on", label: "Bật" },
                { value: "off", label: "Tắt" },
              ]}
            />
          </SettingRow>
        </div>
        <Link href="/quyen-rieng-tu" className="flex min-h-11 items-center text-sm text-primary">
          Quyền riêng tư: dữ liệu nào đi đâu
        </Link>
      </section>
    </main>
  );
}

"use client";

import { SCHOOL_NAMES, type LocalProfile, type SchoolId, type TimeCertainty } from "@tinhban/shared";
import { Info, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field } from "@/components/field";
import { HourBranchPicker } from "@/components/hour-branch-picker";
import { PlacePicker } from "@/components/place-picker";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent } from "@/lib/analytics";
import { analyzeForm, emptyForm, formFromInput, type BirthForm, type FieldKey, type FormAnalysis } from "@/lib/birth-form";
import { branchName, formatLocalStd, utcLabel } from "@/lib/format";
import { createProfile, updateProfile, useProfiles } from "@/lib/profiles";
import { chartHref } from "@/lib/routes";
import { useSettings } from "@/lib/settings";
import { useHydrated } from "@/lib/use-hydrated";
import { useToday } from "@/lib/use-today";

const FIELD_ID: Record<FieldKey, string> = {
  date: "f-day",
  time: "f-time",
  place: "f-place",
  benHaiSide: "f-benhai",
  gender: "f-gender",
  override: "f-override",
  form: "f-submit",
};

function StdTimeLine({ form, analysis, onOverride }: { form: BirthForm; analysis: FormAnalysis; onOverride: (v: string | null) => void }) {
  const [editing, setEditing] = useState(form.stdTimeOverride !== null);
  const std = analysis.stdTime;
  if (form.timeMode === "unknown") return null;
  if (!std) return null;
  const [stdDate = "", stdClock = ""] = std.localStd.split("T");
  const withDate = analysis.solarDate !== undefined && stdDate !== analysis.solarDate;
  const why =
    form.timeMode === "canh"
      ? "Nhập theo giờ âm nên không quy đổi múi giờ: Tinh Bàn dùng thẳng giờ âm đã chọn."
      : form.place?.kind === "abroad"
        ? `Giờ đồng hồ nơi sinh lúc đó là ${utcLabel(std.clockOffsetMin)}. Tinh Bàn dùng giờ chuẩn nơi sinh ${utcLabel(std.stdOffsetMin)}, đã bỏ giờ mùa hè nếu có.`
        : `Giờ đồng hồ nơi sinh lúc đó là ${utcLabel(std.clockOffsetMin)}. Tinh Bàn đổi sang giờ chuẩn ${utcLabel(std.stdOffsetMin)} để an sao.`;

  return (
    <div className="surface flex flex-col gap-2 rounded-2xl border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Giờ dùng để an sao</span>
        <span className="font-medium tabular-nums">
          {form.timeMode === "canh" ? `giờ ${branchName(std.hourBranch)}` : formatLocalStd(std.localStd, withDate)}
        </span>
        <Popover>
          <PopoverTrigger className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground" aria-label="Vì sao giờ này">
            <Info className="size-4" aria-hidden />
          </PopoverTrigger>
          <PopoverContent className="text-sm">{why}</PopoverContent>
        </Popover>
        {form.timeMode === "exact" && !editing && (
          <button type="button" className="ml-auto min-h-11 text-primary" onClick={() => setEditing(true)}>
            Sửa
          </button>
        )}
      </div>
      {std.approx && (
        <p className="text-xung">
          Giờ đồng hồ lúc đó lệch giờ chuẩn. Nếu giờ âm của bạn được tính theo đồng hồ thì có thể lệch một giờ âm.
        </p>
      )}
      {editing && form.timeMode === "exact" && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">Chỉ sửa khi bạn chắc giờ quy đổi chưa đúng. Giờ sửa được lưu trong hồ sơ và mã hồ sơ.</p>
          <div className="flex gap-2">
            <Input
              id={FIELD_ID.override}
              type="time"
              aria-label="Giờ chuẩn dùng để an sao"
              value={form.stdTimeOverride ?? stdClock}
              onChange={(e) => onOverride(e.target.value)}
              aria-invalid={analysis.errors.override ? true : undefined}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOverride(null);
                setEditing(false);
              }}
            >
              Bỏ sửa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Form nhập hồ sơ (Technical Plan mục 12). Có profile thì là sửa hồ sơ đó. */
export function ProfileForm({ profile }: { profile?: LocalProfile }) {
  const router = useRouter();
  const settings = useSettings();
  const profiles = useProfiles();
  const today = useToday();
  const hydrated = useHydrated();
  const [form, setForm] = useState<BirthForm>(() =>
    profile ? formFromInput(profile.birth, profile.schoolId, profile.displayNameLocal) : emptyForm("nam"),
  );
  // Phái điền sẵn theo Cài đặt cho tới khi người dùng tự chọn.
  const [schoolChoice, setSchoolChoice] = useState<SchoolId | null>(profile?.schoolId ?? null);
  const schoolId = schoolChoice ?? settings?.defaultSchool ?? "nam";
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const analysis = useMemo(() => analyzeForm({ ...form, schoolId }, today), [form, schoolId, today]);
  const set = (patch: Partial<BirthForm>) => setForm((f) => ({ ...f, ...patch }));
  const err = (k: FieldKey) => (submitted ? analysis.errors[k] : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!analysis.input) {
      const first = (Object.keys(FIELD_ID) as FieldKey[]).find((k) => analysis.errors[k]);
      if (first) document.getElementById(FIELD_ID[first])?.focus();
      return;
    }
    setSaving(true);
    const name = form.name.trim();
    if (profile) {
      await updateProfile(profile.profileId, { birth: analysis.input, schoolId, displayNameLocal: name });
      router.push(chartHref(profile.profileId));
      return;
    }
    const created = await createProfile(analysis.input, schoolId, name);
    trackEvent("chart_created", { time_certainty: form.timeMode, profile_index: profiles?.length ?? 0, school: schoolId });
    router.push(chartHref(created.profileId, { moi: "1" }));
  }

  const showLeap = form.calendar === "lunar" && analysis.leapMonth !== null && analysis.leapMonth !== undefined && Number(form.month) === analysis.leapMonth;

  return (
    <form onSubmit={submit} noValidate data-ready={hydrated ? "1" : undefined} className="flex flex-col gap-5">
      <Field id="f-name" label="Tên" hint="Chỉ lưu trên máy này, không gửi đi.">
        <div className="relative">
          <Input
            id="f-name"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            autoComplete="off"
            maxLength={40}
            placeholder="Ví dụ: Minh"
            className="pr-10"
          />
          <Lock className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        </div>
      </Field>

      <Field id="f-calendar" label="Lịch">
        <Segmented<"solar" | "lunar">
          id="f-calendar"
          label="Lịch"
          value={form.calendar}
          onChange={(calendar) => set({ calendar, isLeapMonth: false })}
          options={[
            { value: "solar", label: "Dương" },
            { value: "lunar", label: "Âm" },
          ]}
        />
      </Field>

      <Field id="f-day" label={form.calendar === "solar" ? "Ngày sinh (dương lịch)" : "Ngày sinh (âm lịch)"} error={err("date")}>
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          {(
            [
              ["f-day", "day", "Ngày", 2],
              ["f-month", "month", "Tháng", 2],
              ["f-year", "year", "Năm", 4],
            ] as const
          ).map(([id, key, placeholder, max]) => (
            <Input
              key={id}
              id={id}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={max}
              placeholder={placeholder}
              aria-label={placeholder}
              value={form[key]}
              onChange={(e) => set({ [key]: e.target.value.replace(/\D/g, "") })}
              aria-invalid={err("date") ? true : undefined}
              aria-describedby={err("date") ? "f-day-error" : undefined}
              className="text-center tabular-nums"
            />
          ))}
        </div>
        {showLeap && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox checked={form.isLeapMonth} onCheckedChange={(v) => set({ isLeapMonth: v === true })} />
            Tháng {analysis.leapMonth} nhuận
          </label>
        )}
      </Field>

      <Field id="f-timemode" label="Giờ sinh" error={err("time")}>
        <Segmented<TimeCertainty>
          id="f-timemode"
          label="Cách nhập giờ"
          value={form.timeMode}
          onChange={(timeMode) => set({ timeMode, stdTimeOverride: null })}
          options={[
            { value: "exact", label: "Giờ phút" },
            { value: "canh", label: "Giờ âm" },
            { value: "unknown", label: "Không rõ" },
          ]}
        />
        {form.timeMode === "exact" && (
          <Input
            id="f-time"
            type="time"
            aria-label="Giờ phút trên giấy tờ"
            value={form.time}
            onChange={(e) => set({ time: e.target.value, stdTimeOverride: null })}
            aria-invalid={err("time") ? true : undefined}
            className="tabular-nums"
          />
        )}
        {form.timeMode === "canh" && (
          <HourBranchPicker
            id="f-time"
            branch={form.timeBranch}
            tyPart={form.tyPart}
            invalid={Boolean(err("time"))}
            onChange={(timeBranch, tyPart) => set({ timeBranch, tyPart })}
          />
        )}
        {form.timeMode === "unknown" && <p className="text-sm text-muted-foreground">Không có giờ sinh thì chỉ xem được các sao an theo năm.</p>}
      </Field>

      <Field
        id="f-place"
        label={analysis.solarDate && !analysis.needsPlace && !form.place && analysis.solarDate >= "1976-01-01" ? "Nơi sinh (không bắt buộc)" : "Nơi sinh"}
        error={err("place")}
      >
        <PlacePicker id="f-place" value={form.place} onChange={(place) => set({ place, benHaiSide: null })} invalid={Boolean(err("place"))} />
      </Field>

      {analysis.needsBenHai && (
        <Field id="f-benhai" label="Sinh ở bờ nào của sông Bến Hải?" error={err("benHaiSide")}>
          <Segmented<"north" | "south">
            id="f-benhai"
            label="Bờ sông Bến Hải"
            value={form.benHaiSide}
            onChange={(benHaiSide) => set({ benHaiSide })}
            invalid={Boolean(err("benHaiSide"))}
            options={[
              { value: "north", label: "Bờ Bắc" },
              { value: "south", label: "Bờ Nam" },
            ]}
          />
        </Field>
      )}

      <Field id="f-gender" label="Giới tính" error={err("gender")}>
        <Segmented<"male" | "female">
          id="f-gender"
          label="Giới tính"
          value={form.gender}
          onChange={(gender) => set({ gender })}
          invalid={Boolean(err("gender"))}
          options={[
            { value: "male", label: "Nam" },
            { value: "female", label: "Nữ" },
          ]}
        />
      </Field>

      <Field id="f-school" label="Phái">
        <Segmented<SchoolId>
          id="f-school"
          label="Phái"
          value={schoolId}
          onChange={setSchoolChoice}
          options={[
            { value: "nam", label: SCHOOL_NAMES.nam },
            { value: "bac", label: SCHOOL_NAMES.bac },
          ]}
        />
      </Field>

      <StdTimeLine form={form} analysis={analysis} onOverride={(stdTimeOverride) => set({ stdTimeOverride })} />

      {analysis.under16 && (
        <p className="rounded-2xl bg-muted p-3 text-sm">Hồ sơ dưới 16 tuổi: câu hỏi tự do về hồ sơ này chỉ được trả lời ngay trên máy, không gửi đi đâu.</p>
      )}

      {submitted && analysis.errors.form && (
        <p role="alert" className="text-sm text-xung">
          {analysis.errors.form}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button id="f-submit" type="submit" size="lg" className="w-full" disabled={saving}>
          {profile ? "Lưu hồ sơ" : "Lập lá số"}
        </Button>
      </div>
    </form>
  );
}

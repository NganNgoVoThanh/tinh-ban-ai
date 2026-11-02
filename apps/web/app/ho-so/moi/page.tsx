import type { Metadata } from "next";
import { BookOpenCheck, Clock, ShieldCheck, Users } from "lucide-react";
import { Emblem } from "@/components/emblem";
import { ProfileForm } from "@/components/profile-form";
import { BackTitle, TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Hồ sơ mới" };

const POINTS = [
  { icon: ShieldCheck, text: "Ngày giờ sinh không rời máy của bạn. Không cần tài khoản." },
  { icon: BookOpenCheck, text: "Mỗi nhận định chỉ rõ sao, cung nào trong lá số và sách nào nói vậy." },
  { icon: Clock, text: "Không nhớ giờ sinh? Chọn “Không rõ”, vẫn xem được các sao an theo năm." },
  { icon: Users, text: "Thêm cả nhà để xem ngày tốt, hợp xung theo tuổi." },
];

export default function NewProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-4 px-4 lg:max-w-5xl lg:px-8">
      <TopBar left={<BackTitle href="/ho-so" title="Hồ sơ mới" />} />
      {/* Máy tính: tấm dát vàng giới thiệu bên trái (đứng yên khi cuộn), form bên phải. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-start lg:gap-10 lg:pt-2">
        <aside className="gilded hidden flex-col gap-5 rounded-3xl p-7 lg:sticky lg:top-18 lg:flex">
          <Emblem className="size-16 text-gold" spin />
          <p className="font-display text-[28px] leading-tight font-semibold">
            Lá số của bạn, <span className="text-son-gradient">tính ngay trên máy</span>
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            {POINTS.map((p) => (
              <li key={p.text} className="flex gap-3">
                <p.icon className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
                {p.text}
              </li>
            ))}
          </ul>
        </aside>
        <ProfileForm />
      </div>
    </main>
  );
}

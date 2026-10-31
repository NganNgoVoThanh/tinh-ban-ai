import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { BackTitle, TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Hồ sơ mới" };

export default function NewProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-4 px-4">
      <TopBar left={<BackTitle href="/ho-so" title="Hồ sơ mới" />} />
      <ProfileForm />
    </main>
  );
}

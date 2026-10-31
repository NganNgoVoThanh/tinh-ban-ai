"use client";

import { Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProfileCodeCard } from "@/components/profile-code-card";
import { ProfileForm } from "@/components/profile-form";
import { BackTitle, TopBar } from "@/components/top-bar";
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
import { deleteProfile, useProfile } from "@/lib/profiles";
import { chartHref } from "@/lib/routes";

/** Sửa hồ sơ, mã hồ sơ, xóa hồ sơ (Technical Plan mục 12). */
export function EditProfileScreen() {
  const router = useRouter();
  const profileId = useSearchParams().get("ho-so") ?? undefined;
  const profile = useProfile(profileId);
  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-6 px-4 pb-8">
      <TopBar left={<BackTitle href={profileId ? chartHref(profileId) : "/ho-so"} title="Sửa hồ sơ" />} />
      {profile === null && <p>Không có hồ sơ này trên máy.</p>}
      {profile && (
        <>
          <ProfileForm key={profile.profileId} profile={profile} />
          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-lg font-semibold">Mã hồ sơ</h2>
            <ProfileCodeCard profile={profile} />
          </section>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg">
                <Trash2 aria-hidden /> Xóa hồ sơ này
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa hồ sơ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Xóa hồ sơ, lá số và lịch sử hỏi của hồ sơ này khỏi máy. Nếu chưa lưu mã hồ sơ thì không khôi phục được.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive bg-none text-white shadow-none hover:bg-destructive/90 dark:text-background"
                  onClick={async () => {
                    await deleteProfile(profile.profileId);
                    router.replace("/ho-so");
                  }}
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </main>
  );
}

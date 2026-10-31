import type { Metadata } from "next";
import { Suspense } from "react";
import { EditProfileScreen } from "@/components/edit-profile-screen";

export const metadata: Metadata = { title: "Sửa hồ sơ" };

export default function EditProfilePage() {
  return (
    <Suspense fallback={null}>
      <EditProfileScreen />
    </Suspense>
  );
}

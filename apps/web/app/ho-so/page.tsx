import type { Metadata } from "next";
import { ProfilesScreen } from "@/components/profiles-screen";

export const metadata: Metadata = { title: "Hồ sơ" };

export default function ProfilesPage() {
  return <ProfilesScreen />;
}

import type { Metadata } from "next";
import { RestoreScreen } from "@/components/restore-screen";

export const metadata: Metadata = { title: "Khôi phục" };

export default function RestorePage() {
  return <RestoreScreen />;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isStandalone } from "@/lib/meta";
import { useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";

/**
 * Điểm vào của PWA (start_url): chưa có hồ sơ thì mở Khôi phục nếu đang chạy dạng app đã cài (nhiều
 * khả năng là người dùng cũ bị mất dữ liệu), nếu không thì mở Chọn cửa; có hồ sơ thì mở tab theo cửa.
 */
export function AppEntry() {
  const router = useRouter();
  const profiles = useProfiles();
  const settings = useSettings();
  useEffect(() => {
    if (!profiles || !settings) return;
    if (profiles.length === 0) router.replace(isStandalone() ? "/khoi-phuc" : "/bat-dau");
    // Cửa A mở Lá số, cửa B mở Hôm nay (Technical Plan mục 12).
    else router.replace(settings.door === "B" ? "/hom-nay" : "/la-so");
  }, [profiles, settings, router]);
  return null;
}

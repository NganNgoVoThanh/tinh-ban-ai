"use client";

import type { BirthInput, LocalProfile, SchoolId } from "@tinhban/shared";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { newId } from "./ids";

export async function createProfile(birth: BirthInput, schoolId: SchoolId, displayNameLocal?: string): Promise<LocalProfile> {
  const now = new Date().toISOString();
  const profile: LocalProfile = {
    profileId: newId(),
    ...(displayNameLocal ? { displayNameLocal } : {}),
    birth,
    schoolId,
    createdAt: now,
    updatedAt: now,
    consentFlags: { analytics: false },
  };
  await db.profiles.add(profile);
  return profile;
}

export async function updateProfile(profileId: string, patch: Partial<Pick<LocalProfile, "birth" | "schoolId" | "displayNameLocal">>) {
  await db.profiles.update(profileId, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteProfile(profileId: string) {
  await db.transaction("rw", [db.profiles, db.snapshots, db.notes, db.qa_history, db.settings], async () => {
    await db.profiles.delete(profileId);
    await db.snapshots.where("profileId").equals(profileId).delete();
    await db.notes.where("profileId").equals(profileId).delete();
    await db.qa_history.where("profileId").equals(profileId).delete();
    const settings = await db.settings.get("app");
    if (settings?.value.activeProfileId === profileId) {
      const value = { ...settings.value };
      delete value.activeProfileId;
      await db.settings.put({ id: "app", value });
    }
  });
}

/** Danh sách hồ sơ theo thứ tự tạo; undefined khi chưa đọc xong. */
export function useProfiles(): LocalProfile[] | undefined {
  return useLiveQuery(() => db.profiles.orderBy("createdAt").toArray());
}

/** Một hồ sơ; null khi không có, undefined khi chưa đọc xong. */
export function useProfile(profileId: string | undefined): LocalProfile | null | undefined {
  return useLiveQuery(async () => (profileId ? ((await db.profiles.get(profileId)) ?? null) : null), [profileId]);
}

export const profileLabel = (p: LocalProfile, index: number) => p.displayNameLocal?.trim() || `Hồ sơ ${index + 1}`;

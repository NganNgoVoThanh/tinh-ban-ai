"use client";

import type { Settings } from "@tinhban/shared";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { DEFAULT_SETTINGS } from "./settings-defaults";

export { DEFAULT_SETTINGS };

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get("app");
  return { ...DEFAULT_SETTINGS, ...row?.value };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return db.transaction("rw", db.settings, async () => {
    const value = { ...(await getSettings()), ...patch };
    await db.settings.put({ id: "app", value });
    return value;
  });
}

/** Cài đặt hiện tại; undefined khi chưa đọc xong IndexedDB. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings);
}

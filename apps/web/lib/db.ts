import type { ChartSnapshot, LocalProfile, QaHistoryItem, Settings } from "@tinhban/shared";
import Dexie, { type EntityTable } from "dexie";

/** Cơ sở dữ liệu trên máy (Technical Plan mục 11). Dữ liệu sinh chỉ nằm ở đây, không gửi đi. */
export interface SnapshotRow {
  /** `${profileId}|${schoolId}|${engineVersion}` */
  id: string;
  profileId: string;
  /** Khóa của đầu vào, để biết snapshot còn khớp hồ sơ không. */
  inputKey: string;
  snapshot: ChartSnapshot;
}

export interface SettingsRow {
  id: "app";
  value: Settings;
}

export interface MetaRow {
  key: "install_id" | "schema_version";
  value: string;
}

export interface NoteRow {
  id: string;
  profileId: string;
  month: string;
  text: string;
}

class TinhBanDb extends Dexie {
  profiles!: EntityTable<LocalProfile, "profileId">;
  snapshots!: EntityTable<SnapshotRow, "id">;
  qa_history!: EntityTable<QaHistoryItem, "id">;
  settings!: EntityTable<SettingsRow, "id">;
  notes!: EntityTable<NoteRow, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("tinhban");
    this.version(1).stores({
      profiles: "profileId, createdAt",
      snapshots: "id, profileId",
      qa_history: "id, profileId, createdAt, [profileId+createdAt]",
      settings: "id",
      notes: "id, profileId",
      meta: "key",
    });
  }
}

export const db = new TinhBanDb();

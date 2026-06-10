/**
 * IndexedDB (Dexie) — the single local-first data store.
 *
 * Tables are relational by id reference. Photo blobs are stored encrypted at
 * rest (see crypto.ts); everything else is plaintext structured data, which is
 * acceptable for a local-only on-device store and keeps queries fast.
 */
import Dexie, { type Table } from "dexie";
import type {
  BodyweightEntry,
  Exercise,
  PRRecord,
  Photo,
  Settings,
  Template,
  Workout,
} from "@/types";

/** Photo as stored: blob is the encrypted envelope, not raw image bytes. */
export interface StoredPhoto extends Omit<Photo, "blob"> {
  blob: Blob;
}

export class IronLogDB extends Dexie {
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  templates!: Table<Template, string>;
  bodyweight!: Table<BodyweightEntry, string>;
  prs!: Table<PRRecord, string>;
  photos!: Table<StoredPhoto, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("ironlog");
    this.version(1).stores({
      // Indexes chosen for the queries the app actually runs.
      exercises: "id, muscleGroup, custom, name",
      workouts: "id, date, inProgress",
      templates: "id, title",
      bodyweight: "id, date",
      prs: "id, exerciseId, type, date",
      photos: "id, category, date",
      settings: "id",
    });
  }
}

let _db: IronLogDB | null = null;

/** Lazily instantiate so SSR / static export never touches IndexedDB. */
export function db(): IronLogDB {
  if (typeof window === "undefined") {
    throw new Error("IronLogDB is only available in the browser");
  }
  if (!_db) _db = new IronLogDB();
  return _db;
}

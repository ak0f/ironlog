/**
 * Backup schema migrations.
 *
 * Each migration upgrades a payload from version N to N+1. `migratePayload`
 * runs them in sequence so an old `.ironlog` file always lands on the current
 * schema before validation. Today there is only v1, so this is a no-op chain —
 * but the framework means future schema changes won't break old backups.
 */
import { SCHEMA_VERSION } from "./schema";

type RawPayload = { schemaVersion?: number; data?: unknown; [k: string]: unknown };

type Migration = (payload: RawPayload) => RawPayload;

/** Index i upgrades version (i+1) -> (i+2). */
const MIGRATIONS: Migration[] = [
  // (v1 -> v2) example slot — add here when SCHEMA_VERSION increases.
  // (p) => { ...transform...; return { ...p, schemaVersion: 2 }; },
];

export interface MigrationOutcome {
  payload: RawPayload;
  fromVersion: number;
  toVersion: number;
  migrated: boolean;
}

export function migratePayload(raw: RawPayload): MigrationOutcome {
  const from = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
  if (from > SCHEMA_VERSION) {
    throw new Error(
      `This backup was made with a newer version of IronLog (schema v${from}). Update the app to import it.`
    );
  }
  let payload = raw;
  let v = from;
  while (v < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[v - 1];
    if (!migrate) break;
    payload = migrate(payload);
    v += 1;
  }
  return {
    payload: { ...payload, schemaVersion: SCHEMA_VERSION },
    fromVersion: from,
    toVersion: SCHEMA_VERSION,
    migrated: from !== SCHEMA_VERSION,
  };
}

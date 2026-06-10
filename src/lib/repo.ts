/**
 * Repository layer — the only module the UI uses to touch data.
 *
 * Wraps Dexie with domain operations: PR recomputation on workout save,
 * photo encryption at rest, settings singleton, timeline aggregation, etc.
 * Keeping this boundary means the storage engine (or a future sync adapter)
 * can change without touching components.
 */
import { db, type StoredPhoto } from "./db";
import {
  decryptBlobAtRest,
  encryptBlobAtRest,
} from "./crypto";
import { buildBestMap, detectPRs } from "./pr";
import { SCHEMA_VERSION } from "./schema";
import { startOfDay, uid } from "./utils";
import type {
  BodyweightEntry,
  Exercise,
  PRRecord,
  Photo,
  Settings,
  Template,
  TimelineEvent,
  Workout,
} from "@/types";

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_SETTINGS: Settings = {
  id: "singleton",
  units: "metric",
  theme: "dark",
  biometricLockEnabled: false,
  schemaVersion: SCHEMA_VERSION,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const settingsRepo = {
  async get(): Promise<Settings> {
    const existing = await db().settings.get("singleton");
    if (existing) return existing;
    await db().settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
  async update(patch: Partial<Settings>): Promise<Settings> {
    const cur = await this.get();
    const next: Settings = { ...cur, ...patch, id: "singleton", updatedAt: Date.now() };
    await db().settings.put(next);
    return next;
  },
};

/* -------------------------------------------------------------------------- */
/* Exercises                                                                   */
/* -------------------------------------------------------------------------- */

export const exerciseRepo = {
  all(): Promise<Exercise[]> {
    return db().exercises.orderBy("name").toArray();
  },
  get(id: string): Promise<Exercise | undefined> {
    return db().exercises.get(id);
  },
  byMuscle(group: string): Promise<Exercise[]> {
    return db().exercises.where("muscleGroup").equals(group).sortBy("name");
  },
  async create(
    input: Omit<Exercise, "id" | "createdAt" | "updatedAt" | "custom"> &
      Partial<Pick<Exercise, "custom">>
  ): Promise<Exercise> {
    const now = Date.now();
    const ex: Exercise = {
      id: uid(),
      custom: true,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    await db().exercises.put(ex);
    return ex;
  },
  async update(id: string, patch: Partial<Exercise>): Promise<void> {
    await db().exercises.update(id, { ...patch, updatedAt: Date.now() });
  },
  async remove(id: string): Promise<void> {
    await db().exercises.delete(id);
  },
  /** Seed bundled exercises only once (idempotent on id). */
  async seed(exercises: Exercise[]): Promise<void> {
    const count = await db().exercises.count();
    if (count > 0) return;
    await db().exercises.bulkPut(exercises);
  },
};

/* -------------------------------------------------------------------------- */
/* Workouts + PR engine                                                        */
/* -------------------------------------------------------------------------- */

export const workoutRepo = {
  all(): Promise<Workout[]> {
    return db().workouts.orderBy("date").reverse().toArray();
  },
  get(id: string): Promise<Workout | undefined> {
    return db().workouts.get(id);
  },
  recent(limit = 5): Promise<Workout[]> {
    return db().workouts
      .orderBy("date")
      .reverse()
      .filter((w) => !w.inProgress)
      .limit(limit)
      .toArray();
  },
  async inProgress(): Promise<Workout | undefined> {
    // `inProgress` is a boolean — not a valid IndexedDB key — so filter rather
    // than index-query it.
    return db().workouts.filter((w) => w.inProgress).first();
  },

  /**
   * Persist a workout. When `finalize` is true the PR engine runs against all
   * prior PRs, set flags are written, and new PR records are inserted in one
   * transaction.
   */
  async save(workout: Workout, finalize = false): Promise<PRRecord[]> {
    workout.updatedAt = Date.now();

    if (!finalize) {
      await db().workouts.put(workout);
      return [];
    }

    workout.inProgress = false;
    let newPRs: PRRecord[] = [];

    await db().transaction("rw", db().workouts, db().prs, async () => {
      // Re-derive bests from records belonging to OTHER workouts so that
      // re-finalising an edited workout is idempotent.
      await db().prs.where("workoutId").equals(workout.id).delete();
      const priorPRs = await db().prs.toArray();
      const best = buildBestMap(priorPRs);
      newPRs = detectPRs(workout, best);
      await db().workouts.put(workout);
      if (newPRs.length) await db().prs.bulkPut(newPRs);
    });

    return newPRs;
  },

  async remove(id: string): Promise<void> {
    await db().transaction("rw", db().workouts, db().prs, async () => {
      await db().prs.where("workoutId").equals(id).delete();
      await db().workouts.delete(id);
    });
  },

  /** Last performed sets for an exercise (for "previous" hints in logger). */
  async lastForExercise(
    exerciseId: string,
    excludeWorkoutId?: string
  ): Promise<{ weight: number; reps: number }[] | null> {
    const workouts = await db().workouts
      .orderBy("date")
      .reverse()
      .filter((w) => !w.inProgress && w.id !== excludeWorkoutId)
      .toArray();
    for (const w of workouts) {
      const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex && ex.sets.length) {
        return ex.sets.map((s) => ({ weight: s.weight, reps: s.reps }));
      }
    }
    return null;
  },
};

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

export const templateRepo = {
  all(): Promise<Template[]> {
    return db().templates.orderBy("title").toArray();
  },
  get(id: string): Promise<Template | undefined> {
    return db().templates.get(id);
  },
  async save(template: Template): Promise<void> {
    template.updatedAt = Date.now();
    await db().templates.put(template);
  },
  async remove(id: string): Promise<void> {
    await db().templates.delete(id);
  },
  /** Derive a template from a completed workout. */
  fromWorkout(workout: Workout, title?: string): Template {
    const now = Date.now();
    return {
      id: uid(),
      title: title ?? workout.title,
      exercises: workout.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        muscleGroup: e.muscleGroup,
        targetSets: Math.max(1, e.sets.length),
      })),
      createdAt: now,
      updatedAt: now,
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Bodyweight                                                                  */
/* -------------------------------------------------------------------------- */

export const bodyweightRepo = {
  all(): Promise<BodyweightEntry[]> {
    return db().bodyweight.orderBy("date").toArray();
  },
  async upsertForDay(
    entry: Omit<BodyweightEntry, "id" | "createdAt">
  ): Promise<BodyweightEntry> {
    const day = startOfDay(entry.date);
    const existing = (await db().bodyweight.toArray()).find(
      (e) => startOfDay(e.date) === day
    );
    const row: BodyweightEntry = {
      id: existing?.id ?? uid(),
      createdAt: existing?.createdAt ?? Date.now(),
      ...entry,
      date: day,
    };
    await db().bodyweight.put(row);
    return row;
  },
  async remove(id: string): Promise<void> {
    await db().bodyweight.delete(id);
  },
  latest(): Promise<BodyweightEntry | undefined> {
    return db().bodyweight.orderBy("date").reverse().first();
  },
};

/* -------------------------------------------------------------------------- */
/* PRs                                                                         */
/* -------------------------------------------------------------------------- */

export const prRepo = {
  all(): Promise<PRRecord[]> {
    return db().prs.orderBy("date").reverse().toArray();
  },
  recent(limit = 5): Promise<PRRecord[]> {
    return db().prs.orderBy("date").reverse().limit(limit).toArray();
  },
  forExercise(exerciseId: string): Promise<PRRecord[]> {
    return db().prs.where("exerciseId").equals(exerciseId).toArray();
  },
};

/* -------------------------------------------------------------------------- */
/* Photos (encrypted at rest)                                                  */
/* -------------------------------------------------------------------------- */

export const photoRepo = {
  /** Returns metadata only; call `decryptedUrl` to render. */
  async allMeta(): Promise<Array<Omit<Photo, "blob">>> {
    const rows = await db().photos.orderBy("date").reverse().toArray();
    return rows.map(({ blob: _blob, ...meta }) => meta);
  },
  async latest(): Promise<Omit<Photo, "blob"> | undefined> {
    const row = await db().photos.orderBy("date").reverse().first();
    if (!row) return undefined;
    const { blob: _b, ...meta } = row;
    return meta;
  },
  async byCategory(category: string): Promise<Array<Omit<Photo, "blob">>> {
    const rows = await db().photos
      .where("category")
      .equals(category)
      .reverse()
      .sortBy("date");
    return rows.map(({ blob: _blob, ...meta }) => meta);
  },
  async create(
    meta: Omit<Photo, "id" | "createdAt" | "blob">,
    rawBlob: Blob
  ): Promise<Omit<Photo, "blob">> {
    const encrypted = await encryptBlobAtRest(rawBlob);
    const row: StoredPhoto = {
      id: uid(),
      createdAt: Date.now(),
      blob: encrypted,
      ...meta,
    };
    await db().photos.put(row);
    const { blob: _b, ...rest } = row;
    return rest;
  },
  /** Decrypt a stored photo into an object URL for rendering. Caller revokes. */
  async objectUrl(id: string): Promise<string | null> {
    const row = await db().photos.get(id);
    if (!row) return null;
    const blob = await decryptBlobAtRest(row.blob);
    return URL.createObjectURL(blob);
  },
  async decryptedBlob(id: string): Promise<Blob | null> {
    const row = await db().photos.get(id);
    if (!row) return null;
    return decryptBlobAtRest(row.blob);
  },
  async remove(id: string): Promise<void> {
    await db().photos.delete(id);
  },
};

/* -------------------------------------------------------------------------- */
/* Derived-data regeneration                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Recompute the entire PR table from finalized workouts in chronological
 * order. Deterministic and idempotent — used after an import (or to repair a
 * corrupted PR table). Also re-writes each set's `prTypes` flags.
 */
export async function rebuildDerivedData(): Promise<number> {
  const d = db();
  return d.transaction("rw", d.workouts, d.prs, async () => {
    const workouts = (await d.workouts.toArray())
      .filter((w) => !w.inProgress)
      .sort((a, b) => a.date - b.date);

    await d.prs.clear();
    const best = buildBestMap([]);
    const allPRs: PRRecord[] = [];
    for (const w of workouts) {
      const prs = detectPRs(w, best);
      allPRs.push(...prs);
      await d.workouts.put(w); // persist updated set.prTypes flags
    }
    if (allPRs.length) await d.prs.bulkPut(allPRs);
    return allPRs.length;
  });
}

/* -------------------------------------------------------------------------- */
/* Timeline aggregation                                                        */
/* -------------------------------------------------------------------------- */

export async function buildTimeline(): Promise<TimelineEvent[]> {
  const [workouts, weights, prs, photoMetas] = await Promise.all([
    workoutRepo.all(),
    bodyweightRepo.all(),
    prRepo.all(),
    photoRepo.allMeta(),
  ]);

  const events: TimelineEvent[] = [];
  for (const w of workouts) {
    if (w.inProgress) continue;
    events.push({ id: `w-${w.id}`, type: "workout", date: w.date, ref: w });
  }
  for (const b of weights) {
    events.push({ id: `b-${b.id}`, type: "bodyweight", date: b.date, ref: b });
  }
  for (const p of prs) {
    events.push({ id: `p-${p.id}`, type: "pr", date: p.date, ref: p });
  }
  for (const ph of photoMetas) {
    events.push({
      id: `ph-${ph.id}`,
      type: "photo",
      date: ph.date,
      ref: ph as Photo,
    });
  }
  events.sort((a, b) => b.date - a.date);
  return events;
}

/* -------------------------------------------------------------------------- */
/* Streak                                                                      */
/* -------------------------------------------------------------------------- */

/** Consecutive-day workout streak ending today or yesterday. */
export async function computeStreak(): Promise<number> {
  const workouts = await db().workouts
    .orderBy("date")
    .reverse()
    .filter((w) => !w.inProgress)
    .toArray();
  if (!workouts.length) return 0;

  const days = new Set(workouts.map((w) => startOfDay(w.date)));
  const today = startOfDay();
  const day = 86_400_000;

  // Allow the streak to count if the most recent workout was today or yesterday.
  let cursor = days.has(today) ? today : today - day;
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= day;
  }
  return streak;
}

/** All logged sets for an exercise across completed workouts, newest first. */
export async function exerciseHistory(exerciseId: string): Promise<
  Array<{ date: number; workoutTitle: string; sets: Array<{ weight: number; reps: number; warmup?: boolean }> }>
> {
  const workouts = await db().workouts
    .orderBy("date")
    .reverse()
    .filter((w) => !w.inProgress)
    .toArray();
  const result = [];
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex && ex.sets.length > 0) {
      result.push({
        date: w.date,
        workoutTitle: w.title,
        sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, warmup: s.warmup })),
      });
    }
  }
  return result;
}

/** Sets per muscle group across completed workouts in the trailing 7 days. */
export async function weeklyMuscleSets(): Promise<Partial<Record<import("@/types").MuscleGroup, number>>> {
  const workouts = await workoutRepo.all();
  const cutoff = startOfDay() - 6 * 86_400_000;
  const result: Partial<Record<import("@/types").MuscleGroup, number>> = {};
  for (const w of workouts) {
    if (w.inProgress || w.date < cutoff) continue;
    for (const ex of w.exercises) {
      const working = ex.sets.filter((s) => s.done && !s.warmup);
      if (working.length > 0) {
        const g = ex.muscleGroup as import("@/types").MuscleGroup;
        result[g] = (result[g] ?? 0) + working.length;
      }
    }
  }
  return result;
}

/** Workouts in the trailing 7 days (for the dashboard frequency widget). */
export async function weeklyFrequency(): Promise<number[]> {
  const workouts = await workoutRepo.all();
  const today = startOfDay();
  const day = 86_400_000;
  const buckets = new Array(7).fill(0);
  for (const w of workouts) {
    if (w.inProgress) continue;
    const diff = Math.round((today - startOfDay(w.date)) / day);
    if (diff >= 0 && diff < 7) buckets[6 - diff] += 1;
  }
  return buckets;
}

/**
 * Progressive-overload PR detection engine.
 *
 * Three independent record types per exercise:
 *  - weight: heaviest single set (max kg)
 *  - reps:   most reps in a single set (at any weight)
 *  - volume: highest single-set volume (kg × reps)
 *
 * `detectPRs` is pure: given the prior best-by-type map and a workout, it
 * returns the new PRRecords to persist and mutates each set's `prTypes` flags.
 */
import type { PRRecord, PRType, Workout } from "@/types";
import { uid } from "./utils";

export interface BestByType {
  weight: number;
  reps: number;
  volume: number;
}

export type BestMap = Map<string, BestByType>;

/** Build the current best-per-exercise map from persisted PR records. */
export function buildBestMap(prs: PRRecord[]): BestMap {
  const map: BestMap = new Map();
  for (const pr of prs) {
    const cur = map.get(pr.exerciseId) ?? { weight: 0, reps: 0, volume: 0 };
    cur[pr.type] = Math.max(cur[pr.type], pr.value);
    map.set(pr.exerciseId, cur);
  }
  return map;
}

const TYPES: PRType[] = ["weight", "reps", "volume"];

function setMetric(weight: number, reps: number, type: PRType): number {
  if (type === "weight") return weight;
  if (type === "reps") return reps;
  return weight * reps;
}

/**
 * Detect PRs for a workout. Mutates `workout.exercises[].sets[].prTypes`.
 * Returns the new PRRecord rows to insert. The passed `best` map is updated
 * in place so multiple new bests within one session chain correctly.
 */
export function detectPRs(workout: Workout, best: BestMap): PRRecord[] {
  const newRecords: PRRecord[] = [];

  for (const ex of workout.exercises) {
    const current = best.get(ex.exerciseId) ?? {
      weight: 0,
      reps: 0,
      volume: 0,
    };

    for (const set of ex.sets) {
      if (!set.done || set.reps <= 0) {
        set.prTypes = [];
        continue;
      }
      const hit: PRType[] = [];
      for (const type of TYPES) {
        const metric = setMetric(set.weight, set.reps, type);
        // A zero-weight bodyweight set should not register a weight PR.
        if (type === "weight" && set.weight <= 0) continue;
        if (metric > current[type]) {
          current[type] = metric;
          hit.push(type);
          newRecords.push({
            id: uid(),
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            type,
            value: metric,
            weight: set.weight,
            reps: set.reps,
            workoutId: workout.id,
            date: workout.date,
            createdAt: Date.now(),
          });
        }
      }
      set.prTypes = hit;
    }
    best.set(ex.exerciseId, current);
  }

  return newRecords;
}

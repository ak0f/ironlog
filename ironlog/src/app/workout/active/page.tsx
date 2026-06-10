"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ExercisePicker } from "@/components/ExercisePicker";
import { MuscleBadge } from "@/components/MuscleIllustration";
import {
  IconCheck,
  IconCopy,
  IconPlus,
  IconTrash,
} from "@/components/Icons";
import { useApp, useUnits } from "@/components/AppProvider";
import { templateRepo, workoutRepo } from "@/lib/repo";
import { fromKg, toKg, uid, unitLabel } from "@/lib/utils";
import type {
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/types";

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const units = useUnits();
  const { toast } = useApp();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previous, setPrevious] = useState<Record<string, { weight: number; reps: number }[]>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(Date.now());

  // Load the in-progress workout.
  useEffect(() => {
    (async () => {
      const all = await workoutRepo.all();
      const ip = all.find((w) => w.inProgress);
      if (!ip) {
        router.replace("/workout");
        return;
      }
      setWorkout(ip);
      startTime.current = ip.createdAt;
      setLoading(false);
      // Load "previous" hints for each exercise.
      const prev: Record<string, { weight: number; reps: number }[]> = {};
      for (const ex of ip.exercises) {
        const last = await workoutRepo.lastForExercise(ex.exerciseId, ip.id);
        if (last) prev[ex.exerciseId] = last;
      }
      setPrevious(prev);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Mutate workout in state and autosave (debounced) without finalizing. */
  function mutate(updater: (w: Workout) => Workout) {
    setWorkout((cur) => {
      if (!cur) return cur;
      const next = updater({ ...cur });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void workoutRepo.save(next, false);
      }, 400);
      return next;
    });
  }

  async function addExercises(exercises: Exercise[]) {
    const additions: WorkoutExercise[] = exercises.map((ex) => ({
      id: uid(),
      exerciseId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: [{ id: uid(), weight: 0, reps: 0, done: false }],
    }));
    mutate((w) => ({ ...w, exercises: [...w.exercises, ...additions] }));
    // Fetch previous hints for the new exercises.
    const prev = { ...previous };
    for (const ex of exercises) {
      const last = await workoutRepo.lastForExercise(ex.id, workout?.id);
      if (last) prev[ex.id] = last;
    }
    setPrevious(prev);
  }

  function updateSet(exId: string, setId: string, patch: Partial<WorkoutSet>) {
    mutate((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            }
      ),
    }));
  }

  function addSet(exId: string) {
    mutate((w) => ({
      ...w,
      exercises: w.exercises.map((e) => {
        if (e.id !== exId) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              id: uid(),
              weight: last?.weight ?? 0,
              reps: last?.reps ?? 0,
              done: false,
            },
          ],
        };
      }),
    }));
  }

  function removeSet(exId: string, setId: string) {
    mutate((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId) }
      ),
    }));
  }

  function removeExercise(exId: string) {
    mutate((w) => ({
      ...w,
      exercises: w.exercises.filter((e) => e.id !== exId),
    }));
  }

  async function finish() {
    if (!workout) return;
    const hasSets = workout.exercises.some((e) =>
      e.sets.some((s) => s.done)
    );
    if (!hasSets) {
      if (!confirm("No sets marked done. Finish anyway?")) return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const finalized: Workout = {
      ...workout,
      durationSec: Math.round((Date.now() - startTime.current) / 1000),
    };
    const newPRs = await workoutRepo.save(finalized, true);
    if (newPRs.length > 0) {
      toast(`🏆 ${newPRs.length} new PR${newPRs.length === 1 ? "" : "s"}!`);
    } else {
      toast("Workout saved");
    }
    router.replace(`/workout/view?id=${workout.id}`);
  }

  async function discard() {
    if (!workout) return;
    if (!confirm("Discard this workout? This cannot be undone.")) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await workoutRepo.remove(workout.id);
    router.replace("/workout");
  }

  async function saveTemplate() {
    if (!workout || workout.exercises.length === 0) return;
    const title = prompt("Template name", workout.title);
    if (!title) return;
    await templateRepo.save(templateRepo.fromWorkout(workout, title));
    toast("Template saved");
  }

  if (loading || !workout) {
    return (
      <>
        <TopBar title="Workout" back />
        <div className="spinner" />
      </>
    );
  }

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0
  );

  return (
    <>
      <TopBar
        title="Active"
        right={
          <button
            className="btn btn-text"
            style={{ fontWeight: 600 }}
            onClick={finish}
          >
            Finish
          </button>
        }
      />
      <div className="page">
        <input
          className="t-hero"
          value={workout.title}
          onChange={(e) => mutate((w) => ({ ...w, title: e.target.value }))}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            width: "100%",
            color: "var(--ink)",
            marginBottom: 4,
          }}
          aria-label="Workout title"
        />
        <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
          {doneSets}/{totalSets} sets · {workout.exercises.length} exercises
        </p>

        {workout.exercises.map((ex) => {
          const prev = previous[ex.exerciseId];
          return (
            <div key={ex.id} className="card" style={{ marginBottom: 14, padding: 16 }}>
              <div className="row gap-sm" style={{ marginBottom: 12 }}>
                <MuscleBadge group={ex.muscleGroup} size={38} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="t-headline">{ex.exerciseName}</div>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {ex.sets.length} set{ex.sets.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  className="btn btn-text btn-danger"
                  onClick={() => removeExercise(ex.id)}
                  aria-label="Remove exercise"
                >
                  <IconTrash style={{ width: 20, height: 20 }} />
                </button>
              </div>

              <div className="set-grid set-grid-head">
                <span style={{ textAlign: "center" }}>#</span>
                <span style={{ textAlign: "center" }}>{unitLabel(units)}</span>
                <span style={{ textAlign: "center" }}>Reps</span>
                <span />
              </div>

              <div className="col" style={{ gap: 8, marginTop: 6 }}>
                {ex.sets.map((set, i) => {
                  const hint = prev?.[i];
                  return (
                    <div key={set.id} className="set-grid">
                      <span className="set-index">{i + 1}</span>
                      <input
                        className="num-cell"
                        type="number"
                        inputMode="decimal"
                        value={set.weight ? fromKg(set.weight, units) : ""}
                        placeholder={
                          hint ? String(fromKg(hint.weight, units)) : "0"
                        }
                        onChange={(e) =>
                          updateSet(ex.id, set.id, {
                            weight: e.target.value
                              ? toKg(parseFloat(e.target.value) || 0, units)
                              : 0,
                          })
                        }
                      />
                      <input
                        className="num-cell"
                        type="number"
                        inputMode="numeric"
                        value={set.reps || ""}
                        placeholder={hint ? String(hint.reps) : "0"}
                        onChange={(e) =>
                          updateSet(ex.id, set.id, {
                            reps: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <div className="row" style={{ gap: 2 }}>
                        <button
                          className={`set-check${set.done ? " set-check-on" : ""}`}
                          onClick={() =>
                            updateSet(ex.id, set.id, { done: !set.done })
                          }
                          aria-label="Mark set done"
                        >
                          {set.done && <IconCheck style={{ width: 20, height: 20 }} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="row gap-sm" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-ghost grow"
                  onClick={() => addSet(ex.id)}
                >
                  <IconPlus style={{ width: 18, height: 18 }} /> Add set
                </button>
                {ex.sets.length > 1 && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => removeSet(ex.id, ex.sets[ex.sets.length - 1].id)}
                    aria-label="Remove last set"
                  >
                    <IconTrash style={{ width: 18, height: 18 }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 4 }}
          onClick={() => setPickerOpen(true)}
        >
          <IconPlus style={{ width: 20, height: 20 }} /> Add exercise
        </button>

        <div className="divider" />

        <div className="row gap-sm">
          <button
            className="btn btn-ghost grow"
            onClick={saveTemplate}
            disabled={workout.exercises.length === 0}
          >
            <IconCopy style={{ width: 18, height: 18 }} /> Save as template
          </button>
          <button className="btn btn-ghost btn-danger grow" onClick={discard}>
            <IconTrash style={{ width: 18, height: 18 }} /> Discard
          </button>
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16, height: 52 }}
          onClick={finish}
        >
          Finish workout
        </button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercises}
      />
    </>
  );
}

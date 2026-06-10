"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ExercisePicker } from "@/components/ExercisePicker";
import { RestTimer } from "@/components/RestTimer";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { MuscleBadge } from "@/components/MuscleIllustration";
import {
  IconCheck,
  IconCopy,
  IconPlus,
  IconTrash,
} from "@/components/Icons";
import { useApp, useI18n, useUnits } from "@/components/AppProvider";
import { templateRepo, workoutRepo } from "@/lib/repo";
import { fromKg, toKg, uid, unitLabel } from "@/lib/utils";
import type {
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/types";

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ff375f",
  back: "#5e5ce6",
  shoulders: "#ff9f0a",
  arms: "#30d158",
  legs: "#0a84ff",
  core: "#ffd60a",
  glutes: "#bf5af2",
  cardio: "#64d2ff",
};

function muscleColor(group: string): string {
  return MUSCLE_COLORS[group?.toLowerCase()] ?? "var(--primary)";
}

type ConfirmType = "discard" | "noSets" | null;

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const units = useUnits();
  const t = useI18n();
  const { toast, settings } = useApp();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previous, setPrevious] = useState<Record<string, { weight: number; reps: number }[]>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(Date.now());
  const [restTrigger, setRestTrigger] = useState(0);
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const pendingFinish = useRef(false);

  const restPreset = settings?.restTimerDuration ?? 90;

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
      const prev: Record<string, { weight: number; reps: number }[]> = {};
      for (const ex of ip.exercises) {
        const last = await workoutRepo.lastForExercise(ex.exerciseId, ip.id);
        if (last) prev[ex.exerciseId] = last;
      }
      setPrevious(prev);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function doFinish() {
    if (!workout) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const finalized: Workout = {
      ...workout,
      durationSec: Math.round((Date.now() - startTime.current) / 1000),
    };
    const newPRs = await workoutRepo.save(finalized, true);
    if (newPRs.length > 0) {
      toast(t.activeWorkout.newPRs(newPRs.length));
    } else {
      toast(t.activeWorkout.workoutSaved);
    }
    router.replace(`/workout/view?id=${workout.id}`);
  }

  async function finish() {
    if (!workout) return;
    const hasSets = workout.exercises.some((e) => e.sets.some((s) => s.done));
    if (!hasSets) {
      pendingFinish.current = true;
      setConfirmType("noSets");
      return;
    }
    await doFinish();
  }

  async function discard() {
    if (!workout) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await workoutRepo.remove(workout.id);
    router.replace("/workout");
  }

  async function saveTemplate() {
    if (!workout || workout.exercises.length === 0) return;
    const title = prompt(t.activeWorkout.templateNamePrompt, workout.title);
    if (!title) return;
    await templateRepo.save(templateRepo.fromWorkout(workout, title));
    toast(t.activeWorkout.templateSaved);
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
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  return (
    <>
      <TopBar
        title="Active"
        right={
          <button
            className="btn btn-primary"
            style={{ fontWeight: 600, padding: "8px 18px", minHeight: 36, fontSize: 15 }}
            onClick={finish}
          >
            {t.activeWorkout.finish}
          </button>
        }
      />

      {/* Workout progress bar */}
      <div className="workout-prog">
        <div className="workout-prog-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="page">
        {/* Title + meta */}
        <div style={{ marginBottom: 20, paddingTop: 6 }}>
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
              marginBottom: 6,
              padding: 0,
              fontSize: 30,
            }}
            aria-label="Workout title"
          />
          <div className="row gap-sm" style={{ alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 14 }}>
              {doneSets}/{totalSets} {t.activeWorkout.setsDone}
            </span>
            {totalSets > 0 && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--primary)",
                  background: "var(--primary-tint)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {Math.round(pct)}%
              </span>
            )}
          </div>

          {/* Workout note */}
          {noteExpanded ? (
            <textarea
              className="input"
              value={workout.notes ?? ""}
              onChange={(e) => mutate((w) => ({ ...w, notes: e.target.value }))}
              placeholder={t.activeWorkout.notePlaceholder}
              rows={3}
              style={{ marginTop: 10, resize: "none", fontSize: 14 }}
              autoFocus
            />
          ) : (
            <button
              className="btn btn-text"
              style={{ marginTop: 6, fontSize: 13, color: "var(--ink-muted-48)", padding: 0 }}
              onClick={() => setNoteExpanded(true)}
            >
              {workout.notes ? workout.notes : `+ ${t.activeWorkout.workoutNote}`}
            </button>
          )}
        </div>

        {/* Exercise cards */}
        <div className="col stagger" style={{ gap: 14 }}>
          {workout.exercises.map((ex) => {
            const prev = previous[ex.exerciseId];
            const accentColor = muscleColor(ex.muscleGroup);
            return (
              <div
                key={ex.id}
                className="card ex-card"
                style={{
                  padding: "16px 16px 16px 20px",
                  "--ex-accent": accentColor,
                } as React.CSSProperties}
              >
                {/* Colored left border */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 12,
                    bottom: 12,
                    width: 3.5,
                    borderRadius: 2,
                    background: accentColor,
                    opacity: 0.8,
                  }}
                />

                {/* Exercise header */}
                <div className="row gap-sm" style={{ marginBottom: 4 }}>
                  <MuscleBadge group={ex.muscleGroup} size={38} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="t-headline" style={{ fontSize: 16 }}>
                      {ex.exerciseName}
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {ex.sets.length} set{ex.sets.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <button
                    className="btn btn-text btn-danger"
                    onClick={() => removeExercise(ex.id)}
                    aria-label="Remove exercise"
                    style={{ padding: "4px 8px" }}
                  >
                    <IconTrash style={{ width: 18, height: 18 }} />
                  </button>
                </div>

                {/* Exercise notes */}
                <ExerciseNoteRow
                  notes={ex.notes}
                  onSave={(val) =>
                    mutate((w) => ({
                      ...w,
                      exercises: w.exercises.map((e) =>
                        e.id === ex.id ? { ...e, notes: val } : e
                      ),
                    }))
                  }
                />

                {/* Column headers */}
                <div
                  className="set-grid set-grid-head"
                  style={{ marginBottom: 4, gridTemplateColumns: "28px 1fr 1fr 1fr 44px" }}
                >
                  <span style={{ textAlign: "center", fontSize: 11 }}>W</span>
                  <span style={{ textAlign: "center" }}>#</span>
                  <span style={{ textAlign: "center" }}>{unitLabel(units)}</span>
                  <span style={{ textAlign: "center" }}>Reps</span>
                  <span />
                </div>

                {/* Set rows */}
                <div className="col" style={{ gap: 8 }}>
                  {ex.sets.map((set, i) => {
                    const hint = prev?.[i];
                    return (
                      <div
                        key={set.id}
                        className={`set-grid${set.done ? " set-grid-done" : ""}`}
                        style={{
                          transition: "background 0.2s ease",
                          opacity: set.warmup ? 0.55 : 1,
                          gridTemplateColumns: "28px 1fr 1fr 1fr 44px",
                        }}
                      >
                        {/* Warmup toggle */}
                        <button
                          onClick={() => updateSet(ex.id, set.id, { warmup: !set.warmup })}
                          aria-label="Toggle warmup"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: set.warmup ? "var(--primary)" : "var(--ink-muted-30)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                        >
                          {t.activeWorkout.warmup}
                        </button>

                        <span className="set-index" style={{ fontSize: 13 }}>
                          {i + 1}
                        </span>
                        <input
                          className="num-cell"
                          type="number"
                          inputMode="decimal"
                          value={set.weight ? fromKg(set.weight, units) : ""}
                          placeholder={hint ? String(fromKg(hint.weight, units)) : "0"}
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
                        <div className="row" style={{ justifyContent: "center" }}>
                          <button
                            className={`set-check${set.done ? " set-check-on" : ""}`}
                            onClick={() => {
                              const nowDone = !set.done;
                              updateSet(ex.id, set.id, { done: nowDone });
                              if (nowDone && !set.warmup && restPreset > 0) {
                                setRestTrigger((n) => n + 1);
                                if ("vibrate" in navigator) navigator.vibrate?.(15);
                              }
                            }}
                            aria-label="Mark set done"
                          >
                            {set.done && <IconCheck style={{ width: 18, height: 18 }} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add / remove set */}
                <div className="row gap-sm" style={{ marginTop: 14 }}>
                  <button
                    className="btn btn-ghost grow"
                    style={{ fontSize: 14, padding: "10px 14px", minHeight: 38 }}
                    onClick={() => addSet(ex.id)}
                  >
                    <IconPlus style={{ width: 16, height: 16 }} /> {t.activeWorkout.addSet}
                  </button>
                  {ex.sets.length > 1 && (
                    <button
                      className="btn btn-ghost btn-danger"
                      style={{ minHeight: 38, padding: "10px 14px" }}
                      onClick={() => removeSet(ex.id, ex.sets[ex.sets.length - 1].id)}
                      aria-label="Remove last set"
                    >
                      <IconTrash style={{ width: 16, height: 16 }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add exercise */}
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 16, fontSize: 15 }}
          onClick={() => setPickerOpen(true)}
        >
          <IconPlus style={{ width: 20, height: 20 }} /> {t.activeWorkout.addExercise}
        </button>

        <div className="divider" style={{ margin: "20px 0" }} />

        {/* Secondary actions */}
        <div className="row gap-sm" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-ghost grow"
            style={{ fontSize: 14, minHeight: 44 }}
            onClick={saveTemplate}
            disabled={workout.exercises.length === 0}
          >
            <IconCopy style={{ width: 17, height: 17 }} /> {t.activeWorkout.saveAsTemplate}
          </button>
          <button
            className="btn btn-ghost btn-danger grow"
            style={{ fontSize: 14, minHeight: 44 }}
            onClick={() => setConfirmType("discard")}
          >
            <IconTrash style={{ width: 17, height: 17 }} /> {t.activeWorkout.discard}
          </button>
        </div>

        {/* Finish button */}
        <button
          className="btn btn-primary btn-block"
          style={{ height: 54, fontSize: 17, letterSpacing: -0.3, marginBottom: 8 }}
          onClick={finish}
        >
          {t.activeWorkout.finishWorkout}
        </button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercises}
      />

      <RestTimer trigger={restTrigger} preset={restPreset > 0 ? restPreset : 90} />

      {/* Discard confirm */}
      <ConfirmSheet
        open={confirmType === "discard"}
        onClose={() => setConfirmType(null)}
        onConfirm={discard}
        title={t.confirmSheet.discardTitle}
        message={t.confirmSheet.discardMsg}
        danger
      />

      {/* No sets confirm */}
      <ConfirmSheet
        open={confirmType === "noSets"}
        onClose={() => setConfirmType(null)}
        onConfirm={doFinish}
        title={t.confirmSheet.noSetsTitle}
        message={t.confirmSheet.noSetsMsg}
        confirmLabel={t.confirmSheet.finish}
        danger={false}
      />
    </>
  );
}

function ExerciseNoteRow({
  notes,
  onSave,
}: {
  notes?: string;
  onSave: (val: string) => void;
}) {
  const t = useI18n();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(notes ?? "");

  if (editing) {
    return (
      <div style={{ marginBottom: 10 }}>
        <textarea
          className="input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={t.activeWorkout.notePlaceholder}
          rows={2}
          autoFocus
          style={{ resize: "none", fontSize: 13 }}
          onBlur={() => {
            onSave(val);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <button
      className="btn btn-text"
      style={{
        fontSize: 12,
        color: notes ? "var(--ink-muted-48)" : "var(--ink-muted-30)",
        padding: "0 0 8px",
        textAlign: "left",
      }}
      onClick={() => {
        setVal(notes ?? "");
        setEditing(true);
      }}
    >
      {notes ? notes : `+ ${t.activeWorkout.notePlaceholder}`}
    </button>
  );
}

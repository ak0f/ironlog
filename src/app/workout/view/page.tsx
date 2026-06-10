"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { MuscleBadge } from "@/components/MuscleIllustration";
import { IconCopy, IconTrash, IconTrophy } from "@/components/Icons";
import { useApp, useUnits } from "@/components/AppProvider";
import { templateRepo, workoutRepo } from "@/lib/repo";
import {
  formatDate,
  formatDuration,
  formatTime,
  formatWeight,
  uid,
} from "@/lib/utils";
import type { Workout } from "@/types";

function ViewInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const units = useUnits();
  const { toast } = useApp();
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setWorkout(null);
      return;
    }
    void workoutRepo.get(id).then((w) => setWorkout(w ?? null));
  }, [id]);

  async function repeat() {
    if (!workout) return;
    const existing = (await workoutRepo.all()).find((w) => w.inProgress);
    if (existing && !confirm("You have a workout in progress. Replace it?")) {
      return;
    }
    if (existing) await workoutRepo.remove(existing.id);
    const now = Date.now();
    const copy: Workout = {
      id: uid(),
      title: workout.title,
      date: now,
      exercises: workout.exercises.map((e) => ({
        id: uid(),
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        muscleGroup: e.muscleGroup,
        sets: e.sets.map((s) => ({
          id: uid(),
          weight: s.weight,
          reps: s.reps,
          done: false,
        })),
      })),
      inProgress: true,
      createdAt: now,
      updatedAt: now,
    };
    await workoutRepo.save(copy, false);
    router.push("/workout/active");
  }

  async function remove() {
    if (!workout) return;
    if (!confirm("Delete this workout and its PRs?")) return;
    await workoutRepo.remove(workout.id);
    toast("Workout deleted");
    router.replace("/workout");
  }

  async function saveTemplate() {
    if (!workout) return;
    const title = prompt("Template name", workout.title);
    if (!title) return;
    await templateRepo.save(templateRepo.fromWorkout(workout, title));
    toast("Template saved");
  }

  if (workout === undefined) {
    return (
      <>
        <TopBar title="Workout" back />
        <div className="spinner" />
      </>
    );
  }
  if (workout === null) {
    return (
      <>
        <TopBar title="Workout" back />
        <div className="empty">Workout not found.</div>
      </>
    );
  }

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const totalVolume = workout.exercises.reduce(
    (n, e) => n + e.sets.reduce((m, s) => m + s.weight * s.reps, 0),
    0
  );
  const prCount = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.prTypes && s.prTypes.length).length,
    0
  );

  return (
    <>
      <TopBar
        title="Workout"
        back
        right={
          <button className="btn btn-text btn-danger" onClick={remove} aria-label="Delete">
            <IconTrash style={{ width: 22, height: 22 }} />
          </button>
        }
      />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 4 }}>
          {workout.title}
        </h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          {formatDate(workout.date)} · {formatTime(workout.date)}
          {workout.durationSec ? ` · ${formatDuration(workout.durationSec)}` : ""}
        </p>

        <div className="dash-grid" style={{ marginBottom: 20 }}>
          <div className="card-parchment center">
            <div className="stat-value">{workout.exercises.length}</div>
            <span className="muted" style={{ fontSize: 13 }}>exercises</span>
          </div>
          <div className="card-parchment center">
            <div className="stat-value">{totalSets}</div>
            <span className="muted" style={{ fontSize: 13 }}>sets</span>
          </div>
          <div className="card-parchment center">
            <div className="stat-value" style={{ fontSize: 22 }}>
              {formatWeight(totalVolume, units)}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>volume</span>
          </div>
          <div className="card-parchment center">
            <div className="stat-value" style={{ color: prCount ? "var(--pr-gold)" : undefined }}>
              {prCount}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>PRs</span>
          </div>
        </div>

        {workout.exercises.map((ex) => (
          <div key={ex.id} className="card" style={{ marginBottom: 12, padding: 16 }}>
            <div className="row gap-sm" style={{ marginBottom: 10 }}>
              <MuscleBadge group={ex.muscleGroup} size={36} />
              <div className="t-headline">{ex.exerciseName}</div>
            </div>
            <div className="col" style={{ gap: 6 }}>
              {ex.sets.map((s, i) => (
                <div
                  key={s.id}
                  className="row-between"
                  style={{ fontSize: 15, padding: "4px 0" }}
                >
                  <span className="muted" style={{ width: 24 }}>{i + 1}</span>
                  <span className="grow t-mono-num">
                    {formatWeight(s.weight, units)} × {s.reps}
                  </span>
                  {s.prTypes && s.prTypes.length > 0 && (
                    <span className="pr-badge">
                      <IconTrophy style={{ width: 12, height: 12 }} />
                      {s.prTypes.join(" · ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="row gap-sm" style={{ marginTop: 8 }}>
          <button className="btn btn-primary grow" onClick={repeat}>
            Repeat workout
          </button>
          <button className="btn btn-ghost" onClick={saveTemplate} aria-label="Save as template">
            <IconCopy style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function WorkoutViewPage() {
  return (
    <Suspense fallback={<div className="spinner" />}>
      <ViewInner />
    </Suspense>
  );
}

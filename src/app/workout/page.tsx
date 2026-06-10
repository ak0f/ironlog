"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { MuscleBadge } from "@/components/MuscleIllustration";
import {
  IconChevron,
  IconDumbbell,
  IconPlus,
  IconTrash,
} from "@/components/Icons";
import { templateRepo, workoutRepo } from "@/lib/repo";
import { uid, relativeDay } from "@/lib/utils";
import type { Template, Workout } from "@/types";

export default function WorkoutPage() {
  const router = useRouter();
  const workouts = useLiveQuery(() => workoutRepo.all(), [], []);
  const templates = useLiveQuery(() => templateRepo.all(), [], []);

  const inProgress = workouts?.find((w) => w.inProgress);
  const history = (workouts ?? []).filter((w) => !w.inProgress);

  async function startEmpty() {
    if (inProgress) {
      router.push("/workout/active");
      return;
    }
    const now = Date.now();
    const w: Workout = {
      id: uid(),
      title: defaultTitle(),
      date: now,
      exercises: [],
      inProgress: true,
      createdAt: now,
      updatedAt: now,
    };
    await workoutRepo.save(w, false);
    router.push("/workout/active");
  }

  async function startFromTemplate(t: Template) {
    if (inProgress) {
      router.push("/workout/active");
      return;
    }
    const now = Date.now();
    const w: Workout = {
      id: uid(),
      title: t.title,
      date: now,
      exercises: t.exercises.map((te) => ({
        id: uid(),
        exerciseId: te.exerciseId,
        exerciseName: te.exerciseName,
        muscleGroup: te.muscleGroup,
        sets: Array.from({ length: te.targetSets }, () => ({
          id: uid(),
          weight: 0,
          reps: 0,
          done: false,
        })),
      })),
      inProgress: true,
      createdAt: now,
      updatedAt: now,
    };
    await workoutRepo.save(w, false);
    router.push("/workout/active");
  }

  async function deleteTemplate(id: string) {
    if (confirm("Delete this template?")) await templateRepo.remove(id);
  }

  return (
    <>
      <TopBar title="Workout" />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 16 }}>
          Workout
        </h1>

        {inProgress ? (
          <Link
            href="/workout/active"
            className="card"
            style={{
              display: "block",
              background: "var(--primary)",
              color: "#fff",
              marginBottom: 16,
            }}
          >
            <div className="row-between">
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
                  IN PROGRESS
                </span>
                <div className="t-title" style={{ color: "#fff", marginTop: 2 }}>
                  {inProgress.title}
                </div>
                <span style={{ fontSize: 14, opacity: 0.85 }}>
                  {inProgress.exercises.length} exercises · Tap to resume
                </span>
              </div>
              <IconChevron style={{ width: 24, height: 24 }} />
            </div>
          </Link>
        ) : (
          <button
            className="btn btn-primary btn-block"
            style={{ marginBottom: 16, height: 52 }}
            onClick={startEmpty}
          >
            <IconPlus style={{ width: 22, height: 22 }} />
            Start workout
          </button>
        )}

        {/* Templates */}
        {templates && templates.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
              Templates
            </h2>
            <div className="list-group">
              {templates.map((t) => (
                <div key={t.id} className="list-row">
                  <button
                    className="grow row gap-sm"
                    style={{ background: "none", border: "none", textAlign: "left", minWidth: 0 }}
                    onClick={() => startFromTemplate(t)}
                  >
                    <div className="muscle-badge" style={{ width: 40, height: 40 }}>
                      <IconDumbbell style={{ width: 22, height: 22, color: "var(--primary)" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-headline">{t.title}</div>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {t.exercises.length} exercises
                      </span>
                    </div>
                  </button>
                  <button
                    className="btn btn-text btn-danger"
                    onClick={() => deleteTemplate(t.id)}
                    aria-label="Delete template"
                  >
                    <IconTrash style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History */}
        <section>
          <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
            History
          </h2>
          {history.length === 0 ? (
            <div className="empty">
              <IconDumbbell className="empty-icon" />
              <p>No workouts yet. Start your first session above.</p>
            </div>
          ) : (
            <div className="list-group">
              {history.map((w) => (
                <Link
                  key={w.id}
                  href={`/workout/view?id=${w.id}`}
                  className="list-row list-row-tap"
                >
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="t-headline">{w.title}</div>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {relativeDay(w.date)} · {w.exercises.length} exercises ·{" "}
                      {w.exercises.reduce((n, e) => n + e.sets.length, 0)} sets
                    </span>
                  </div>
                  <WorkoutGroups workout={w} />
                  <IconChevron
                    style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function WorkoutGroups({ workout }: { workout: Workout }) {
  const groups = Array.from(
    new Set(workout.exercises.map((e) => e.muscleGroup))
  ).slice(0, 3);
  return (
    <div className="row" style={{ gap: 2 }}>
      {groups.map((g) => (
        <MuscleBadge key={g} group={g} size={30} />
      ))}
    </div>
  );
}

function defaultTitle(): string {
  const h = new Date().getHours();
  if (h < 11) return "Morning Workout";
  if (h < 16) return "Midday Workout";
  if (h < 21) return "Evening Workout";
  return "Late Workout";
}

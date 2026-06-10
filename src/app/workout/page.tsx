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
        <h1 className="t-hero enter" style={{ marginBottom: 20 }}>
          Workout
        </h1>

        {/* In-progress banner or start button */}
        {inProgress ? (
          <Link
            href="/workout/active"
            className="card card-active-pulse card-tap"
            style={{
              display: "block",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-focus) 100%)",
              color: "#fff",
              marginBottom: 20,
              padding: "18px 20px",
            }}
          >
            <div className="row-between" style={{ alignItems: "center" }}>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    opacity: 0.82,
                  }}
                >
                  In progress
                </span>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: -0.4,
                    color: "#fff",
                    marginTop: 3,
                  }}
                >
                  {inProgress.title}
                </div>
                <span style={{ fontSize: 14, opacity: 0.82, marginTop: 2, display: "block" }}>
                  {inProgress.exercises.length} exercise{inProgress.exercises.length !== 1 ? "s" : ""} · Tap to resume
                </span>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconChevron style={{ width: 22, height: 22, color: "#fff" }} />
              </div>
            </div>
          </Link>
        ) : (
          <button
            className="btn btn-primary btn-block enter"
            style={{ height: 54, fontSize: 17, marginBottom: 24, letterSpacing: -0.3 }}
            onClick={startEmpty}
          >
            <IconPlus style={{ width: 22, height: 22 }} />
            Start workout
          </button>
        )}

        {/* Templates */}
        {templates && templates.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
              Templates
            </h2>
            <div className="list-group">
              {templates.map((t) => (
                <div key={t.id} className="list-row">
                  <button
                    className="grow row gap-sm"
                    style={{
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      minWidth: 0,
                      cursor: "pointer",
                    }}
                    onClick={() => startFromTemplate(t)}
                  >
                    <div
                      className="muscle-badge"
                      style={{
                        width: 40,
                        height: 40,
                        background: "var(--primary-tint)",
                      }}
                    >
                      <IconDumbbell
                        style={{ width: 20, height: 20, color: "var(--primary)" }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-headline">{t.title}</div>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                  <button
                    className="btn btn-text btn-danger"
                    onClick={() => deleteTemplate(t.id)}
                    aria-label="Delete template"
                  >
                    <IconTrash style={{ width: 18, height: 18 }} />
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
                    style={{ width: 16, height: 16, color: "var(--ink-muted-30)", flexShrink: 0 }}
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
    <div className="row" style={{ gap: 3 }}>
      {groups.map((g) => (
        <MuscleBadge key={g} group={g} size={28} />
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

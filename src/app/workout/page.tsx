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
import { useI18n, useLocale } from "@/components/AppProvider";
import type { Template, Workout } from "@/types";

export default function WorkoutPage() {
  const router = useRouter();
  const t = useI18n();
  const locale = useLocale();
  const defaultTitle = useDefaultTitle();
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
    if (confirm(t.workout.deleteTemplateConfirm)) await templateRepo.remove(id);
  }

  return (
    <>
      <TopBar title="Workout" />
      <div className="page">
        <h1 className="t-hero enter" style={{ marginBottom: 20 }}>
          {t.workout.title}
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
                  {t.workout.inProgress}
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
                  {t.workout.exercises(inProgress.exercises.length)} · {t.workout.tapToResume}
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
            {t.workout.startWorkout}
          </button>
        )}

        {/* Templates */}
        {templates && templates.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
              {t.workout.templates}
            </h2>
            <div className="list-group">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="list-row">
                  <button
                    className="grow row gap-sm"
                    style={{
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      minWidth: 0,
                      cursor: "pointer",
                    }}
                    onClick={() => startFromTemplate(tmpl)}
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
                      <div className="t-headline">{tmpl.title}</div>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {t.workout.exercises(tmpl.exercises.length)}
                      </span>
                    </div>
                  </button>
                  <button
                    className="btn btn-text btn-danger"
                    onClick={() => deleteTemplate(tmpl.id)}
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
            {t.workout.history}
          </h2>
          {history.length === 0 ? (
            <div className="empty">
              <IconDumbbell className="empty-icon" />
              <p>{t.workout.noWorkoutsYet}</p>
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
                      {relativeDay(w.date, locale)} · {t.workout.exercises(w.exercises.length)} ·{" "}
                      {t.workout.sets(w.exercises.reduce((n, e) => n + e.sets.length, 0))}
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

function useDefaultTitle() {
  const t = useI18n();
  return () => {
    const h = new Date().getHours();
    if (h < 11) return t.workout.morning;
    if (h < 16) return t.workout.midday;
    if (h < 21) return t.workout.evening;
    return t.workout.late;
  };
}

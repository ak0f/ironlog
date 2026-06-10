"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { LineChart, type Point } from "@/components/LineChart";
import { ActivityRing } from "@/components/ActivityRing";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { MuscleBadge } from "@/components/MuscleIllustration";
import {
  IconChevron,
  IconFlame,
  IconGear,
  IconTrophy,
} from "@/components/Icons";
import { useApp, useUnits } from "@/components/AppProvider";
import {
  bodyweightRepo,
  computeStreak,
  prRepo,
  photoRepo,
  weeklyFrequency,
  workoutRepo,
} from "@/lib/repo";
import { formatWeight, fromKg, relativeDay, unitLabel } from "@/lib/utils";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKLY_GOAL = 4;

export default function DashboardPage() {
  const units = useUnits();
  const { settings } = useApp();

  const recentWorkouts = useLiveQuery(() => workoutRepo.recent(1), [], []);
  const weights = useLiveQuery(() => bodyweightRepo.all(), [], []);
  const recentPRs = useLiveQuery(() => prRepo.recent(3), [], []);
  const latestPhoto = useLiveQuery(() => photoRepo.latest(), [], undefined);

  const [streak, setStreak] = useState(0);
  const [freq, setFreq] = useState<number[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const workoutCount = useLiveQuery(
    async () => (await workoutRepo.all()).filter((w) => !w.inProgress).length,
    [],
    0
  );
  useEffect(() => {
    void computeStreak().then(setStreak);
    void weeklyFrequency().then(setFreq);
  }, [workoutCount]);

  useEffect(() => {
    let url: string | null = null;
    if (latestPhoto) {
      void photoRepo.objectUrl(latestPhoto.id).then((u) => {
        url = u;
        setPhotoUrl(u);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [latestPhoto?.id]);

  const lastWorkout = recentWorkouts?.[0];
  const latestWeight =
    weights && weights.length ? weights[weights.length - 1] : null;
  const weekCount = freq.reduce((a, b) => a + b, 0);
  const todayIdx = new Date().getDay();

  const trendPoints: Point[] = (weights ?? []).map((w) => ({
    x: w.date,
    y: w.weight,
  }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <>
      <TopBar
        title="IronLog"
        right={
          <Link href="/settings" className="btn btn-text" aria-label="Settings">
            <IconGear style={{ width: 24, height: 24 }} />
          </Link>
        }
      />
      <div className="page">
        <div className="enter">
          <h1 className="t-hero" style={{ marginBottom: 4 }}>
            {greeting}
          </h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="dash-grid stagger">
          {/* Signature ring card */}
          <div className="card span-2">
            <div className="row gap-md" style={{ alignItems: "center" }}>
              <ActivityRing progress={weekCount / WEEKLY_GOAL} size={128} stroke={15}>
                <span className="stat-value" style={{ fontSize: 30 }}>
                  <AnimatedNumber value={weekCount} />
                </span>
                <span
                  className="muted"
                  style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}
                >
                  of {WEEKLY_GOAL}
                </span>
              </ActivityRing>

              <div className="grow">
                <span className="t-caption-strong">This week</span>
                <div
                  className="row gap-xs"
                  style={{ margin: "6px 0 14px", alignItems: "baseline" }}
                >
                  <IconFlame
                    style={{ width: 22, height: 22, color: "var(--primary)" }}
                  />
                  <span className="stat-value" style={{ fontSize: 28 }}>
                    <AnimatedNumber value={streak} />
                  </span>
                  <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
                    day streak
                  </span>
                </div>
                <div className="freq-bars">
                  {freq.map((v, i) => {
                    const dayIdx = (todayIdx - (6 - i) + 7) % 7;
                    return (
                      <div key={i} className="freq-col">
                        <div
                          className={`freq-bar${v > 0 ? " freq-bar-on" : ""}`}
                          style={{ height: v > 0 ? `${Math.min(100, 34 + v * 30)}%` : "10%" }}
                        />
                        <span
                          className={`freq-day${i === 6 ? " freq-day-today" : ""}`}
                        >
                          {DAY_LABELS[dayIdx]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bodyweight trend */}
          <Link href="/body" className="card span-2 card-tap" style={{ display: "block" }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="t-caption-strong">Bodyweight</span>
              {latestWeight && (
                <span className="t-headline tnum">
                  {formatWeight(latestWeight.weight, units)}
                </span>
              )}
            </div>
            <LineChart
              points={trendPoints}
              height={150}
              goal={settings?.bodyweightGoal}
              formatY={(y) => `${Math.round(fromKg(y, units))}`}
            />
          </Link>

          {/* Last workout */}
          <Link
            href={lastWorkout ? `/workout/view?id=${lastWorkout.id}` : "/workout"}
            className="card span-2 card-tap"
            style={{ display: "block" }}
          >
            <div className="row-between">
              <span className="t-caption-strong">Last workout</span>
              <IconChevron
                style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }}
              />
            </div>
            {lastWorkout ? (
              <div className="row gap-sm" style={{ marginTop: 12 }}>
                <div className="row" style={{ gap: 2 }}>
                  {Array.from(
                    new Set(lastWorkout.exercises.map((e) => e.muscleGroup))
                  )
                    .slice(0, 2)
                    .map((g) => (
                      <MuscleBadge key={g} group={g} size={40} />
                    ))}
                </div>
                <div className="grow">
                  <div className="t-title" style={{ fontSize: 19 }}>
                    {lastWorkout.title}
                  </div>
                  <p className="muted" style={{ fontSize: 14, marginTop: 2 }}>
                    {relativeDay(lastWorkout.date)} ·{" "}
                    {lastWorkout.exercises.length} exercises ·{" "}
                    {lastWorkout.exercises.reduce((n, e) => n + e.sets.length, 0)}{" "}
                    sets
                  </p>
                </div>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 10 }}>
                No workouts yet — start your first one.
              </p>
            )}
          </Link>

          {/* Recent PRs */}
          <div className="card span-2">
            <div className="row-between" style={{ marginBottom: 14 }}>
              <span className="t-caption-strong">Recent PRs</span>
              <IconTrophy
                style={{ width: 20, height: 20, color: "var(--pr-gold)" }}
              />
            </div>
            {recentPRs && recentPRs.length ? (
              <div className="col gap-md">
                {recentPRs.map((pr) => (
                  <div key={pr.id} className="row-between">
                    <div style={{ minWidth: 0 }}>
                      <div className="t-headline" style={{ fontSize: 16 }}>
                        {pr.exerciseName}
                      </div>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {pr.type === "weight"
                          ? `Top weight · ${formatWeight(pr.weight, units)}`
                          : pr.type === "reps"
                            ? `Rep PR · ${pr.reps} reps`
                            : `Volume · ${formatWeight(pr.weight, units)} × ${pr.reps}`}
                      </span>
                    </div>
                    <span className="pr-badge">{pr.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Set your first PR to see it here.</p>
            )}
          </div>

          {/* Latest photo */}
          {photoUrl && (
            <Link
              href="/photos"
              className="span-2 card-tap"
              style={{ display: "block" }}
            >
              <span
                className="t-caption-strong"
                style={{ display: "block", marginBottom: 10 }}
              >
                Latest photo
              </span>
              <div className="img-surface" style={{ aspectRatio: "16 / 10" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Latest progress"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

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
import { useApp, useI18n, useLocale, useUnits } from "@/components/AppProvider";
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
  const t = useI18n();
  const locale = useLocale();

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

  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t.greeting.morning;
    if (h < 18) return t.greeting.afternoon;
    return t.greeting.evening;
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

        {/* Greeting */}
        <div className="enter" style={{ marginBottom: 20 }}>
          <h1 className="t-hero" style={{ marginBottom: 8 }}>
            {greeting}
            {settings?.displayName ? `, ${settings.displayName}` : ""}
          </h1>
          <span className="date-pill">{dateStr}</span>
        </div>

        <div className="dash-grid stagger">

          {/* Hero ring card */}
          <div className="card card-hero span-2" style={{ padding: "20px 20px 18px" }}>
            <div className="row gap-md" style={{ alignItems: "center" }}>
              <ActivityRing
                progress={weekCount / WEEKLY_GOAL}
                size={132}
                stroke={16}
              >
                <span
                  className="stat-value"
                  style={{ fontSize: 34, lineHeight: 1, fontWeight: 800, letterSpacing: -1.5 }}
                >
                  <AnimatedNumber value={weekCount} />
                </span>
                <span className="ring-goal-label">{t.dashboard.ofGoal(WEEKLY_GOAL)}</span>
              </ActivityRing>

              <div className="grow col" style={{ gap: 0 }}>
                <span
                  className="t-caption-strong"
                  style={{ marginBottom: 10 }}
                >
                  {t.dashboard.thisWeek}
                </span>

                {/* Streak badge */}
                <div className="streak-badge" style={{ alignSelf: "flex-start", marginBottom: 14 }}>
                  <IconFlame
                    style={{ width: 20, height: 20, color: "var(--fire)", flexShrink: 0 }}
                  />
                  <span className="streak-badge-val">
                    <AnimatedNumber value={streak} />
                  </span>
                  <span className="streak-badge-label">{t.dashboard.dayStreak}</span>
                </div>

                {/* Frequency bars */}
                <div className="freq-bars">
                  {freq.map((v, i) => {
                    const dayIdx = (todayIdx - (6 - i) + 7) % 7;
                    const isToday = i === 6;
                    return (
                      <div key={i} className="freq-col">
                        <div
                          className={`freq-bar${v > 0 ? " freq-bar-on" : ""}`}
                          style={{
                            height: v > 0 ? `${Math.min(100, 36 + v * 28)}%` : "10%",
                            ...(isToday && v === 0
                              ? { background: "var(--primary-tint)", border: "1.5px solid var(--primary)", borderRadius: 4 }
                              : {}),
                          }}
                        />
                        <span
                          className={`freq-day${isToday ? " freq-day-today" : ""}`}
                          style={{ fontWeight: isToday ? 700 : 500 }}
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

          {/* Total workouts chip row */}
          {(workoutCount ?? 0) > 0 && (
            <div className="stat-chips span-2">
              <div className="stat-chip">
                <span className="stat-chip-val">
                  <AnimatedNumber value={workoutCount ?? 0} />
                </span>
                <span className="stat-chip-label">{t.dashboard.sessions}</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-val">
                  <AnimatedNumber value={weekCount} />
                </span>
                <span className="stat-chip-label">{t.dashboard.thisWeekLabel}</span>
              </div>
              {streak > 0 && (
                <div className="stat-chip">
                  <span className="stat-chip-val" style={{ color: "var(--fire)" }}>
                    <AnimatedNumber value={streak} />
                  </span>
                  <span className="stat-chip-label">{t.dashboard.dayStreak}</span>
                </div>
              )}
            </div>
          )}

          {/* Bodyweight trend */}
          <Link
            href="/body"
            className="card span-2 card-tap"
            style={{ display: "block" }}
          >
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="t-caption-strong">{t.dashboard.bodyweight}</span>
              {latestWeight && (
                <span
                  className="t-headline tnum"
                  style={{ color: "var(--primary)" }}
                >
                  {formatWeight(latestWeight.weight, units)}
                </span>
              )}
            </div>
            <LineChart
              points={trendPoints}
              height={140}
              goal={settings?.bodyweightGoal}
              formatY={(y) => `${Math.round(fromKg(y, units))}`}
            />
            {!trendPoints.length && (
              <p className="muted" style={{ fontSize: 14, padding: "12px 0 4px" }}>
                {t.dashboard.noDataYet}
              </p>
            )}
          </Link>

          {/* Last workout */}
          <Link
            href={lastWorkout ? `/workout/view?id=${lastWorkout.id}` : "/workout"}
            className="card span-2 card-tap"
            style={{ display: "block" }}
          >
            <div className="row-between" style={{ marginBottom: lastWorkout ? 12 : 0 }}>
              <span className="t-caption-strong">{t.dashboard.lastWorkout}</span>
              <IconChevron
                style={{ width: 17, height: 17, color: "var(--ink-muted-30)" }}
              />
            </div>
            {lastWorkout ? (
              <div className="row gap-sm" style={{ alignItems: "center" }}>
                <div className="row" style={{ gap: 3 }}>
                  {Array.from(
                    new Set(lastWorkout.exercises.map((e) => e.muscleGroup))
                  )
                    .slice(0, 2)
                    .map((g) => (
                      <MuscleBadge key={g} group={g} size={42} />
                    ))}
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div
                    className="t-title"
                    style={{ fontSize: 18, letterSpacing: -0.4, marginBottom: 2 }}
                  >
                    {lastWorkout.title}
                  </div>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    {relativeDay(lastWorkout.date, locale)} ·{" "}
                    {t.workout.exercises(lastWorkout.exercises.length)} ·{" "}
                    {t.workout.sets(lastWorkout.exercises.reduce((n, e) => n + e.sets.length, 0))}
                  </p>
                </div>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
                {t.dashboard.noWorkoutsYet}
              </p>
            )}
          </Link>

          {/* Recent PRs */}
          {recentPRs && recentPRs.length > 0 && (
            <div className="card span-2">
              <div className="row-between" style={{ marginBottom: 16 }}>
                <span className="t-caption-strong">{t.dashboard.recentPRs}</span>
                <IconTrophy
                  style={{ width: 18, height: 18, color: "var(--pr-gold)" }}
                />
              </div>
              <div className="col" style={{ gap: 14 }}>
                {recentPRs.map((pr, i) => (
                  <div key={pr.id}>
                    {i > 0 && (
                      <div
                        style={{
                          height: "0.5px",
                          background: "var(--hairline)",
                          margin: "0 0 14px",
                        }}
                      />
                    )}
                    <div className="row-between" style={{ alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="t-headline"
                          style={{ fontSize: 16, marginBottom: 2 }}
                        >
                          {pr.exerciseName}
                        </div>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {pr.type === "weight"
                            ? `${t.pr.topWeight} · ${formatWeight(pr.weight, units)}`
                            : pr.type === "reps"
                              ? `${t.pr.repPR} · ${pr.reps} ${t.common.reps.toLowerCase()}`
                              : `${t.pr.volume} · ${formatWeight(pr.weight, units)} × ${pr.reps}`}
                        </span>
                      </div>
                      <span
                        className={`pr-badge pr-type-${pr.type}`}
                        style={{ flexShrink: 0, marginLeft: 8 }}
                      >
                        {pr.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                {t.dashboard.latestPhoto}
              </span>
              <div className="img-surface" style={{ aspectRatio: "16 / 9" }}>
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

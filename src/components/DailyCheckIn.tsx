"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp, useI18n, useLocale, useUnits } from "./AppProvider";
import { ActivityRing } from "./ActivityRing";
import { IconClose, IconDumbbell, IconScale } from "./Icons";
import {
  bodyweightRepo,
  computeStreak,
  weeklyFrequency,
} from "@/lib/repo";
import { toKg, isSameDay, fromKg, unitLabel } from "@/lib/utils";

const KEY = "ironlog.lastCheckIn";
const WEEKLY_GOAL = 4;

export function DailyCheckIn() {
  const router = useRouter();
  const units = useUnits();
  const { ready, settings, toast } = useApp();
  const t = useI18n();
  const locale = useLocale();
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [loggedToday, setLoggedToday] = useState(true);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    if (!ready || !settings) return;
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const last = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : stamp;
    if (last === stamp) return;

    (async () => {
      const [s, freq, latest] = await Promise.all([
        computeStreak(),
        weeklyFrequency(),
        bodyweightRepo.latest(),
      ]);
      setStreak(s);
      setWeekCount(freq.reduce((a, b) => a + b, 0));
      setLoggedToday(!!latest && isSameDay(latest.date, Date.now()));
      setLastWeight(latest?.weight ?? null);
      setDateStr(
        new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      );
      setShow(true);
    })();
  }, [ready, settings, locale]);

  function dismiss() {
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    try {
      localStorage.setItem(KEY, stamp);
    } catch {
      /* ignore */
    }
    setClosing(true);
    setTimeout(() => setShow(false), 320);
  }

  async function quickLog() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    await bodyweightRepo.upsertForDay({ weight: toKg(w, units), date: Date.now() });
    toast(t.body.weightLogged);
    setLoggedToday(true);
    setWeight("");
  }

  if (!show) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t.greeting.morning;
    if (h < 18) return t.greeting.afternoon;
    return t.greeting.evening;
  })();

  return (
    <div
      className={`checkin-backdrop${closing ? " checkin-closing" : ""}`}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
      role="dialog"
      aria-modal="true"
    >
      <div className={`checkin-sheet${closing ? " checkin-sheet-out" : ""}`}>
        <div className="sheet-grabber" />
        <button
          className="checkin-close"
          onClick={dismiss}
          aria-label="Close"
        >
          <IconClose style={{ width: 20, height: 20 }} />
        </button>

        <div className="checkin-hero">
          <ActivityRing progress={weekCount / WEEKLY_GOAL} size={120} stroke={13}>
            <span className="stat-value" style={{ fontSize: 26 }}>
              {weekCount}
            </span>
            <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
              {t.dashboard.ofGoal(WEEKLY_GOAL)}
            </span>
          </ActivityRing>
        </div>

        <h1 className="t-title center" style={{ marginTop: 14 }}>
          {greeting}
          {settings?.displayName ? `, ${settings.displayName}` : ""}
        </h1>
        <p className="muted center" style={{ marginTop: 4 }}>
          {dateStr}
        </p>

        <div className="checkin-streak">
          {streak > 0 ? t.checkin.streakAlive(streak) : t.checkin.freshStart}
        </div>

        {!loggedToday && (
          <div className="checkin-quick">
            <div className="row gap-sm" style={{ marginBottom: 4 }}>
              <IconScale style={{ width: 20, height: 20, color: "var(--primary)" }} />
              <span className="t-headline grow">{t.checkin.logWeight}</span>
            </div>
            <div className="row gap-sm" style={{ marginTop: 10 }}>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder={
                  lastWeight ? String(fromKg(lastWeight, units)) : unitLabel(units)
                }
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <button
                className="btn btn-secondary"
                onClick={quickLog}
                disabled={!weight}
                style={{ flexShrink: 0 }}
              >
                {t.common.save}
              </button>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16, height: 52 }}
          onClick={() => {
            dismiss();
            router.push("/workout");
          }}
        >
          <IconDumbbell style={{ width: 22, height: 22 }} />
          {t.checkin.startWorkout}
        </button>
        <button
          className="btn btn-text btn-block"
          style={{ marginTop: 6 }}
          onClick={dismiss}
        >
          {t.checkin.notNow}
        </button>
      </div>
    </div>
  );
}

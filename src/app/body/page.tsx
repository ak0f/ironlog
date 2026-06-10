"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { LineChart, type Point } from "@/components/LineChart";
import { Sheet } from "@/components/Sheet";
import { IconPlus, IconScale, IconTrash } from "@/components/Icons";
import { useApp, useI18n, useLocale, useUnits } from "@/components/AppProvider";
import { bodyweightRepo } from "@/lib/repo";
import {
  formatWeight,
  fromKg,
  relativeDay,
  startOfDay,
  toKg,
  unitLabel,
} from "@/lib/utils";

type Range = 30 | 90 | 365 | 0;

export default function BodyPage() {
  const units = useUnits();
  const { settings, toast } = useApp();
  const t = useI18n();
  const locale = useLocale();
  const entries = useLiveQuery(() => bodyweightRepo.all(), [], []);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<Range>(90);

  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");

  const latest = entries && entries.length ? entries[entries.length - 1] : null;
  const first = entries && entries.length ? entries[0] : null;
  const change =
    latest && first && latest.id !== first.id
      ? latest.weight - first.weight
      : 0;

  const cutoff = range === 0 ? 0 : startOfDay() - range * 86_400_000;
  const points: Point[] = (entries ?? [])
    .filter((e) => e.date >= cutoff)
    .map((e) => ({ x: e.date, y: e.weight }));

  async function save() {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      toast(t.body.enterValidWeight);
      return;
    }
    await bodyweightRepo.upsertForDay({
      weight: toKg(w, units),
      calories: calories ? parseInt(calories) || undefined : undefined,
      date: Date.now(),
    });
    setWeight("");
    setCalories("");
    setOpen(false);
    toast(t.body.weightLogged);
  }

  async function remove(id: string) {
    if (confirm(t.body.deleteConfirm)) await bodyweightRepo.remove(id);
  }

  const reversed = [...(entries ?? [])].reverse();

  return (
    <>
      <TopBar
        title={t.body.title}
        right={
          <button className="btn btn-text" onClick={() => setOpen(true)} aria-label="Add weight">
            <IconPlus style={{ width: 24, height: 24 }} />
          </button>
        }
      />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 16 }}>
          {t.body.title}
        </h1>

        <div className="card-parchment" style={{ marginBottom: 16 }}>
          <div className="row-between" style={{ marginBottom: 4 }}>
            <div>
              <span className="t-caption-strong">{t.body.current}</span>
              <div className="stat-value" style={{ marginTop: 4 }}>
                {latest ? formatWeight(latest.weight, units) : "—"}
              </div>
            </div>
            {change !== 0 && (
              <div className="center">
                <span className="t-caption-strong">{t.body.change}</span>
                <div
                  className="t-title"
                  style={{
                    marginTop: 4,
                    color: change < 0 ? "var(--good)" : "var(--ink)",
                  }}
                >
                  {change > 0 ? "+" : ""}
                  {formatWeight(Math.abs(change), units).replace(/^/, change < 0 ? "−" : "")}
                </div>
              </div>
            )}
          </div>

          <LineChart
            points={points}
            height={170}
            goal={settings?.bodyweightGoal}
          />

          <div className="segmented" style={{ marginTop: 12 }}>
            {([30, 90, 365, 0] as Range[]).map((r) => (
              <button
                key={r}
                className={range === r ? "on" : ""}
                onClick={() => setRange(r)}
              >
                {r === 0 ? "All" : r === 365 ? "1Y" : `${r}D`}
              </button>
            ))}
          </div>
        </div>

        <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
          {t.body.history}
        </h2>
        {reversed.length === 0 ? (
          <div className="empty">
            <IconScale className="empty-icon" />
            <p>{t.body.empty}</p>
          </div>
        ) : (
          <div className="list-group">
            {reversed.map((e) => (
              <div key={e.id} className="list-row">
                <div className="grow">
                  <div className="t-headline">{formatWeight(e.weight, units)}</div>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {relativeDay(e.date, locale)}
                    {e.calories ? ` · ${e.calories} kcal` : ""}
                  </span>
                </div>
                <button
                  className="btn btn-text btn-danger"
                  onClick={() => remove(e.id)}
                  aria-label="Delete entry"
                >
                  <IconTrash style={{ width: 20, height: 20 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={t.body.logBodyweight}>
        <div className="col gap-md">
          <div>
            <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
              {t.body.weight(unitLabel(units))}
            </label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              autoFocus
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={latest ? String(fromKg(latest.weight, units)) : "0.0"}
            />
          </div>
          <div>
            <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
              {t.body.caloriesOptional}
            </label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="—"
            />
          </div>
          <button className="btn btn-primary btn-block" onClick={save}>
            {t.common.save}
          </button>
          <p className="muted center" style={{ fontSize: 13 }}>
            {t.body.oneEntryPerDay}
          </p>
        </div>
      </Sheet>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Sheet } from "./Sheet";
import { LineChart } from "./LineChart";
import { useI18n, useUnits } from "./AppProvider";
import { exerciseHistory } from "@/lib/repo";
import { formatWeight } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
}

export function ExerciseHistory({ open, onClose, exerciseId, exerciseName }: Props) {
  const t = useI18n();
  const units = useUnits();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof exerciseHistory>>>([]);

  useEffect(() => {
    if (!open || !exerciseId) return;
    void exerciseHistory(exerciseId).then(setHistory);
  }, [open, exerciseId]);

  const points = history
    .map((h) => ({
      x: h.date,
      y: Math.max(0, ...h.sets.filter((s) => !s.warmup).map((s) => s.weight)),
    }))
    .filter((p) => p.y > 0)
    .reverse();

  return (
    <Sheet open={open} onClose={onClose} title={exerciseName}>
      <div className="col gap-md">
        {history.length === 0 ? (
          <p className="muted center" style={{ fontSize: 15, padding: "24px 0" }}>
            {t.exerciseHistory.noHistory}
          </p>
        ) : (
          <>
            {points.length >= 2 && (
              <div style={{ marginBottom: 4 }}>
                <span className="t-caption-strong" style={{ display: "block", marginBottom: 8 }}>
                  {t.exerciseHistory.maxWeight}
                </span>
                <LineChart
                  points={points}
                  height={130}
                  formatY={(y) => formatWeight(y, units)}
                />
              </div>
            )}
            <div className="list-group">
              {history.slice(0, 12).map((h, i) => {
                const working = h.sets.filter((s) => !s.warmup);
                const maxW = working.length ? Math.max(...working.map((s) => s.weight)) : 0;
                const date = new Date(h.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div
                    key={i}
                    className="list-row"
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}
                  >
                    <div className="row-between" style={{ width: "100%" }}>
                      <span className="t-headline" style={{ fontSize: 14 }}>
                        {h.workoutTitle}
                      </span>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {date}
                      </span>
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {working.length} {t.exerciseHistory.setsLabel}
                      {maxW > 0
                        ? ` · ${t.exerciseHistory.maxWeight}: ${formatWeight(maxW, units)}`
                        : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

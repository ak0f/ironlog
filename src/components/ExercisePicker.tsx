"use client";

/**
 * Exercise picker sheet — muscle-group filter + search + inline create.
 * Returns the chosen Exercise(s) to the caller. Supports multi-select so a
 * whole workout can be assembled in one pass.
 */
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sheet } from "./Sheet";
import { MuscleBadge } from "./MuscleIllustration";
import { IconCheck, IconPlus, IconSearch } from "./Icons";
import { useI18n } from "./AppProvider";
import { exerciseRepo } from "@/lib/repo";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Exercise,
  type MuscleGroup,
} from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exercises: Exercise[]) => void;
}

export function ExercisePicker({ open, onClose, onPick }: Props) {
  const t = useI18n();
  const all = useLiveQuery(() => exerciseRepo.all(), [], []);
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, Exercise>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<MuscleGroup>("chest");
  const [newEquip, setNewEquip] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (all ?? []).filter((e) => {
      if (group !== "all" && e.muscleGroup !== group) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, group, query]);

  const selectedList = Object.values(selected);

  function toggle(ex: Exercise) {
    setSelected((s) => {
      const next = { ...s };
      if (next[ex.id]) delete next[ex.id];
      else next[ex.id] = ex;
      return next;
    });
  }

  function reset() {
    setSelected({});
    setQuery("");
    setGroup("all");
    setCreating(false);
    setNewName("");
  }

  function addSelected() {
    if (selectedList.length === 0) return;
    onPick(selectedList);
    reset();
    onClose();
  }

  async function createExercise() {
    if (!newName.trim()) return;
    const ex = await exerciseRepo.create({
      name: newName.trim(),
      muscleGroup: newGroup,
      equipment: newEquip.trim() || undefined,
      illustration: newGroup,
    });
    setSelected((s) => ({ ...s, [ex.id]: ex }));
    setCreating(false);
    setNewName("");
    setNewEquip("");
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t.exercisePicker.title}
      right={
        <button
          className="btn btn-text"
          onClick={addSelected}
          disabled={selectedList.length === 0}
          style={{ fontWeight: 600 }}
        >
          {selectedList.length > 0
            ? t.exercisePicker.addN(selectedList.length)
            : t.exercisePicker.add}
        </button>
      }
    >
      {!creating ? (
        <>
          <div className="row gap-xs" style={{ marginBottom: 12 }}>
            <div
              className="input"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}
            >
              <IconSearch style={{ width: 18, height: 18, color: "var(--ink-muted-48)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.exercisePicker.search}
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  flex: 1,
                  fontSize: 17,
                  color: "var(--ink)",
                }}
              />
            </div>
          </div>

          <div className="chip-row" style={{ marginBottom: 12 }}>
            <button
              className={`chip${group === "all" ? " chip-active" : ""}`}
              onClick={() => setGroup("all")}
            >
              {t.photos.all}
            </button>
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                className={`chip${group === g ? " chip-active" : ""}`}
                onClick={() => setGroup(g)}
              >
                {MUSCLE_GROUP_LABELS[g]}
              </button>
            ))}
          </div>

          <div className="list-group" style={{ marginBottom: 12 }}>
            <button
              className="list-row list-row-tap"
              onClick={() => setCreating(true)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--primary)",
              }}
            >
              <div className="muscle-badge" style={{ width: 40, height: 40 }}>
                <IconPlus style={{ width: 20, height: 20, color: "var(--primary)" }} />
              </div>
              <span className="t-headline" style={{ color: "var(--primary)" }}>
                {t.exercisePicker.createNew}
              </span>
            </button>
          </div>

          <div className="list-group">
            {filtered.map((ex) => {
              const on = !!selected[ex.id];
              return (
                <button
                  key={ex.id}
                  className="list-row list-row-tap"
                  onClick={() => toggle(ex)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                  }}
                >
                  <MuscleBadge group={ex.muscleGroup} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="t-headline">{ex.name}</div>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                      {ex.equipment ? ` · ${ex.equipment}` : ""}
                    </span>
                  </div>
                  <div className={`set-check${on ? " set-check-on" : ""}`}>
                    {on && <IconCheck style={{ width: 20, height: 20 }} />}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="list-row">
                <span className="muted">{t.exercisePicker.noMatches}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="col gap-md">
          <div>
            <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
              {t.exercisePicker.nameLabel}
            </label>
            <input
              className="input"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.exercisePicker.namePlaceholder}
            />
          </div>
          <div>
            <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
              {t.exercisePicker.muscleLabel}
            </label>
            <div className="chip-row">
              {MUSCLE_GROUPS.map((g) => (
                <button
                  key={g}
                  className={`chip${newGroup === g ? " chip-active" : ""}`}
                  onClick={() => setNewGroup(g)}
                >
                  {MUSCLE_GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
              {t.exercisePicker.equipLabel}
            </label>
            <input
              className="input"
              value={newEquip}
              onChange={(e) => setNewEquip(e.target.value)}
              placeholder={t.exercisePicker.equipPlaceholder}
            />
          </div>
          <div className="row gap-sm">
            <button className="btn btn-ghost grow" onClick={() => setCreating(false)}>
              {t.confirmSheet.cancel}
            </button>
            <button
              className="btn btn-primary grow"
              onClick={createExercise}
              disabled={!newName.trim()}
            >
              {t.common.save}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

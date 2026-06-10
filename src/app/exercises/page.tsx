"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/Sheet";
import { MuscleBadge } from "@/components/MuscleIllustration";
import { IconPlus, IconSearch, IconTrash } from "@/components/Icons";
import { useApp } from "@/components/AppProvider";
import { exerciseRepo, prRepo } from "@/lib/repo";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Exercise,
  type MuscleGroup,
} from "@/types";

export default function ExercisesPage() {
  const { toast } = useApp();
  const all = useLiveQuery(() => exerciseRepo.all(), [], []);
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (all ?? []).filter((e) => {
      if (group !== "all" && e.muscleGroup !== group) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, group, query]);

  async function remove(ex: Exercise) {
    const prs = await prRepo.forExercise(ex.id);
    const warn = prs.length
      ? `Delete "${ex.name}"? Its ${prs.length} PR record(s) stay in history.`
      : `Delete "${ex.name}"?`;
    if (!confirm(warn)) return;
    await exerciseRepo.remove(ex.id);
    setEditing(null);
    toast("Exercise deleted");
  }

  return (
    <>
      <TopBar
        title="Exercises"
        back
        right={
          <button className="btn btn-text" onClick={() => setCreating(true)} aria-label="New exercise">
            <IconPlus style={{ width: 24, height: 24 }} />
          </button>
        }
      />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 14 }}>
          Exercises
        </h1>

        <div className="input" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12 }}>
          <IconSearch style={{ width: 18, height: 18, color: "var(--ink-muted-48)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: 17, color: "var(--ink)" }}
          />
        </div>

        <div className="chip-row" style={{ marginBottom: 16 }}>
          <button className={`chip${group === "all" ? " chip-active" : ""}`} onClick={() => setGroup("all")}>
            All
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} className={`chip${group === g ? " chip-active" : ""}`} onClick={() => setGroup(g)}>
              {MUSCLE_GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
          {filtered.length} exercises
        </p>
        <div className="list-group">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={() => setEditing(ex)}
            >
              <MuscleBadge group={ex.muscleGroup} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="t-headline">{ex.name}</div>
                <span className="muted" style={{ fontSize: 13 }}>
                  {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                  {ex.equipment ? ` · ${ex.equipment}` : ""}
                  {ex.custom ? " · Custom" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <ExerciseEditor
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          toast("Exercise created");
        }}
      />
      <ExerciseEditor
        open={!!editing}
        exercise={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast("Saved");
        }}
        onDelete={editing?.custom ? () => remove(editing) : undefined}
      />
    </>
  );
}

function ExerciseEditor({
  open,
  exercise,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean;
  exercise?: Exercise;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(exercise?.name ?? "");
  const [group, setGroup] = useState<MuscleGroup>(exercise?.muscleGroup ?? "chest");
  const [equip, setEquip] = useState(exercise?.equipment ?? "");

  // Reset fields when the target exercise changes.
  const key = exercise?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setName(exercise?.name ?? "");
    setGroup(exercise?.muscleGroup ?? "chest");
    setEquip(exercise?.equipment ?? "");
  }

  const isCore = exercise && !exercise.custom;

  async function save() {
    if (!name.trim()) return;
    if (exercise) {
      await exerciseRepo.update(exercise.id, {
        name: name.trim(),
        muscleGroup: group,
        equipment: equip.trim() || undefined,
        illustration: group,
      });
    } else {
      await exerciseRepo.create({
        name: name.trim(),
        muscleGroup: group,
        equipment: equip.trim() || undefined,
        illustration: group,
      });
    }
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title={exercise ? "Edit exercise" : "New exercise"}>
      <div className="col gap-md">
        {isCore && (
          <p className="muted" style={{ fontSize: 13 }}>
            This is a core exercise. Edits are saved locally.
          </p>
        )}
        <div>
          <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
            Name
          </label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" />
        </div>
        <div>
          <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
            Muscle group
          </label>
          <div className="chip-row">
            {MUSCLE_GROUPS.map((g) => (
              <button key={g} className={`chip${group === g ? " chip-active" : ""}`} onClick={() => setGroup(g)}>
                {MUSCLE_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="t-caption-strong" style={{ display: "block", marginBottom: 6 }}>
            Equipment
          </label>
          <input className="input" value={equip} onChange={(e) => setEquip(e.target.value)} placeholder="Barbell, Dumbbell…" />
        </div>
        <button className="btn btn-primary btn-block" onClick={save} disabled={!name.trim()}>
          Save
        </button>
        {onDelete && (
          <button className="btn btn-ghost btn-danger btn-block" onClick={onDelete}>
            <IconTrash style={{ width: 20, height: 20 }} /> Delete exercise
          </button>
        )}
      </div>
    </Sheet>
  );
}

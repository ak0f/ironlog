/**
 * Starter training splits. Each split generates a set of workout templates on
 * onboarding. Exercises are referenced by their core id (deterministic, see
 * data/exercises.ts) so the templates link straight to the bundled pack.
 */
import type { MuscleGroup } from "@/types";

export type SplitId = "ppl" | "bro" | "upperlower" | "custom";

export interface SplitOption {
  id: SplitId;
  name: string;
  description: string;
}

export const SPLITS: SplitOption[] = [
  { id: "ppl", name: "Push / Pull / Legs", description: "3–6 days · balanced volume" },
  { id: "bro", name: "Bro Split", description: "5 days · one muscle per day" },
  { id: "upperlower", name: "Upper / Lower", description: "4 days · strength focus" },
  { id: "custom", name: "Custom", description: "Start empty, build your own" },
];

function coreId(name: string): string {
  return "core-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export interface BlueprintExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
}

export interface Blueprint {
  title: string;
  exercises: Array<{ name: string; group: MuscleGroup; sets: number }>;
}

const BLUEPRINTS: Record<Exclude<SplitId, "custom">, Blueprint[]> = {
  ppl: [
    {
      title: "Push Day",
      exercises: [
        { name: "Barbell Bench Press", group: "chest", sets: 4 },
        { name: "Incline Dumbbell Press", group: "chest", sets: 3 },
        { name: "Overhead Press", group: "shoulders", sets: 3 },
        { name: "Lateral Raise", group: "shoulders", sets: 3 },
        { name: "Triceps Pushdown", group: "triceps", sets: 3 },
      ],
    },
    {
      title: "Pull Day",
      exercises: [
        { name: "Deadlift", group: "back", sets: 3 },
        { name: "Pull-Up", group: "back", sets: 3 },
        { name: "Seated Cable Row", group: "back", sets: 3 },
        { name: "Face Pull", group: "shoulders", sets: 3 },
        { name: "Barbell Curl", group: "biceps", sets: 3 },
      ],
    },
    {
      title: "Leg Day",
      exercises: [
        { name: "Back Squat", group: "legs", sets: 4 },
        { name: "Romanian Deadlift", group: "legs", sets: 3 },
        { name: "Leg Press", group: "legs", sets: 3 },
        { name: "Leg Curl", group: "legs", sets: 3 },
        { name: "Standing Calf Raise", group: "legs", sets: 4 },
      ],
    },
  ],
  bro: [
    {
      title: "Chest Day",
      exercises: [
        { name: "Barbell Bench Press", group: "chest", sets: 4 },
        { name: "Incline Dumbbell Press", group: "chest", sets: 3 },
        { name: "Cable Crossover", group: "chest", sets: 3 },
        { name: "Push-Up", group: "chest", sets: 3 },
      ],
    },
    {
      title: "Back Day",
      exercises: [
        { name: "Deadlift", group: "back", sets: 3 },
        { name: "Lat Pulldown", group: "back", sets: 3 },
        { name: "Barbell Row", group: "back", sets: 3 },
        { name: "Seated Cable Row", group: "back", sets: 3 },
      ],
    },
    {
      title: "Shoulder Day",
      exercises: [
        { name: "Overhead Press", group: "shoulders", sets: 4 },
        { name: "Arnold Press", group: "shoulders", sets: 3 },
        { name: "Lateral Raise", group: "shoulders", sets: 4 },
        { name: "Rear Delt Fly", group: "shoulders", sets: 3 },
      ],
    },
    {
      title: "Arm Day",
      exercises: [
        { name: "Barbell Curl", group: "biceps", sets: 3 },
        { name: "Hammer Curl", group: "biceps", sets: 3 },
        { name: "Skull Crusher", group: "triceps", sets: 3 },
        { name: "Triceps Pushdown", group: "triceps", sets: 3 },
      ],
    },
    {
      title: "Leg Day",
      exercises: [
        { name: "Back Squat", group: "legs", sets: 4 },
        { name: "Leg Press", group: "legs", sets: 3 },
        { name: "Leg Extension", group: "legs", sets: 3 },
        { name: "Leg Curl", group: "legs", sets: 3 },
      ],
    },
  ],
  upperlower: [
    {
      title: "Upper Body",
      exercises: [
        { name: "Barbell Bench Press", group: "chest", sets: 4 },
        { name: "Barbell Row", group: "back", sets: 4 },
        { name: "Overhead Press", group: "shoulders", sets: 3 },
        { name: "Lat Pulldown", group: "back", sets: 3 },
        { name: "Dumbbell Curl", group: "biceps", sets: 3 },
        { name: "Triceps Pushdown", group: "triceps", sets: 3 },
      ],
    },
    {
      title: "Lower Body",
      exercises: [
        { name: "Back Squat", group: "legs", sets: 4 },
        { name: "Romanian Deadlift", group: "legs", sets: 4 },
        { name: "Leg Press", group: "legs", sets: 3 },
        { name: "Leg Curl", group: "legs", sets: 3 },
        { name: "Standing Calf Raise", group: "legs", sets: 4 },
        { name: "Hanging Leg Raise", group: "abs", sets: 3 },
      ],
    },
  ],
};

/** Resolve a split into template-ready exercise blueprints. */
export function blueprintsFor(split: SplitId): Blueprint[] {
  if (split === "custom") return [];
  return BLUEPRINTS[split];
}

export function blueprintExercises(bp: Blueprint): BlueprintExercise[] {
  return bp.exercises.map((e) => ({
    exerciseId: coreId(e.name),
    exerciseName: e.name,
    muscleGroup: e.group,
    targetSets: e.sets,
  }));
}

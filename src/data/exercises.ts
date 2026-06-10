/**
 * Bundled core exercise database.
 *
 * Architecture note: this is the "core pack". The shape is intentionally the
 * same as user-created exercises so downloadable packs (future) can be merged
 * by `exerciseRepo.seed` / import without schema changes.
 */
import type { Exercise, MuscleGroup } from "@/types";

type Seed = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  secondary?: MuscleGroup[];
};

const SEEDS: Seed[] = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "chest", equipment: "Barbell", secondary: ["triceps", "shoulders"] },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", equipment: "Dumbbell", secondary: ["shoulders", "triceps"] },
  { name: "Dumbbell Fly", muscleGroup: "chest", equipment: "Dumbbell" },
  { name: "Cable Crossover", muscleGroup: "chest", equipment: "Cable" },
  { name: "Push-Up", muscleGroup: "chest", equipment: "Bodyweight", secondary: ["triceps"] },
  { name: "Machine Chest Press", muscleGroup: "chest", equipment: "Machine", secondary: ["triceps"] },

  // Triceps
  { name: "Triceps Pushdown", muscleGroup: "triceps", equipment: "Cable" },
  { name: "Overhead Cable Extension", muscleGroup: "triceps", equipment: "Cable" },
  { name: "Skull Crusher", muscleGroup: "triceps", equipment: "Barbell" },
  { name: "Dips", muscleGroup: "triceps", equipment: "Bodyweight", secondary: ["chest"] },
  { name: "Close-Grip Bench Press", muscleGroup: "triceps", equipment: "Barbell", secondary: ["chest"] },

  // Biceps
  { name: "Barbell Curl", muscleGroup: "biceps", equipment: "Barbell" },
  { name: "Dumbbell Curl", muscleGroup: "biceps", equipment: "Dumbbell" },
  { name: "Hammer Curl", muscleGroup: "biceps", equipment: "Dumbbell" },
  { name: "Preacher Curl", muscleGroup: "biceps", equipment: "Machine" },
  { name: "Cable Curl", muscleGroup: "biceps", equipment: "Cable" },

  // Back
  { name: "Deadlift", muscleGroup: "back", equipment: "Barbell", secondary: ["legs"] },
  { name: "Pull-Up", muscleGroup: "back", equipment: "Bodyweight", secondary: ["biceps"] },
  { name: "Lat Pulldown", muscleGroup: "back", equipment: "Cable", secondary: ["biceps"] },
  { name: "Barbell Row", muscleGroup: "back", equipment: "Barbell", secondary: ["biceps"] },
  { name: "Seated Cable Row", muscleGroup: "back", equipment: "Cable", secondary: ["biceps"] },
  { name: "Dumbbell Row", muscleGroup: "back", equipment: "Dumbbell", secondary: ["biceps"] },

  // Shoulders
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "Barbell", secondary: ["triceps"] },
  { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", equipment: "Dumbbell", secondary: ["triceps"] },
  { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Rear Delt Fly", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Face Pull", muscleGroup: "shoulders", equipment: "Cable", secondary: ["back"] },
  { name: "Arnold Press", muscleGroup: "shoulders", equipment: "Dumbbell", secondary: ["triceps"] },

  // Abs
  { name: "Hanging Leg Raise", muscleGroup: "abs", equipment: "Bodyweight" },
  { name: "Cable Crunch", muscleGroup: "abs", equipment: "Cable" },
  { name: "Plank", muscleGroup: "abs", equipment: "Bodyweight" },
  { name: "Ab Wheel Rollout", muscleGroup: "abs", equipment: "Bodyweight" },

  // Legs
  { name: "Back Squat", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Front Squat", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Romanian Deadlift", muscleGroup: "legs", equipment: "Barbell", secondary: ["back"] },
  { name: "Leg Press", muscleGroup: "legs", equipment: "Machine" },
  { name: "Leg Extension", muscleGroup: "legs", equipment: "Machine" },
  { name: "Leg Curl", muscleGroup: "legs", equipment: "Machine" },
  { name: "Walking Lunge", muscleGroup: "legs", equipment: "Dumbbell" },
  { name: "Standing Calf Raise", muscleGroup: "legs", equipment: "Machine" },
];

/** Deterministic ids so re-seeding / imports never duplicate core exercises. */
function coreId(name: string): string {
  return "core-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const BUNDLED_EXERCISES: Exercise[] = SEEDS.map((s) => ({
  id: coreId(s.name),
  name: s.name,
  muscleGroup: s.muscleGroup,
  secondary: s.secondary,
  illustration: s.muscleGroup,
  equipment: s.equipment,
  custom: false,
  createdAt: 0,
  updatedAt: 0,
}));

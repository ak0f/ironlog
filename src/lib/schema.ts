/**
 * Zod schemas — runtime validation source of truth.
 *
 * Used to validate imported data (the only untrusted boundary) and to keep
 * the persisted shape honest. Kept structurally aligned with `src/types`.
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const muscleGroupSchema = z.enum([
  "chest",
  "triceps",
  "biceps",
  "back",
  "shoulders",
  "abs",
  "legs",
]);

export const photoCategorySchema = z.enum(["front", "side", "back"]);
export const prTypeSchema = z.enum(["weight", "reps", "volume"]);

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  muscleGroup: muscleGroupSchema,
  secondary: z.array(muscleGroupSchema).optional(),
  illustration: z.string().optional(),
  custom: z.boolean(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const workoutSetSchema = z.object({
  id: z.string(),
  weight: z.number().min(0),
  reps: z.number().int().min(0),
  done: z.boolean(),
  notes: z.string().optional(),
  prTypes: z.array(prTypeSchema).optional(),
});

export const workoutExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  muscleGroup: muscleGroupSchema,
  sets: z.array(workoutSetSchema),
  notes: z.string().optional(),
});

export const workoutSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.number(),
  exercises: z.array(workoutExerciseSchema),
  notes: z.string().optional(),
  durationSec: z.number().optional(),
  inProgress: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const templateSchema = z.object({
  id: z.string(),
  title: z.string(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      exerciseName: z.string(),
      muscleGroup: muscleGroupSchema,
      targetSets: z.number().int().min(1),
    })
  ),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const bodyweightEntrySchema = z.object({
  id: z.string(),
  weight: z.number().min(0),
  calories: z.number().min(0).optional(),
  date: z.number(),
  notes: z.string().optional(),
  createdAt: z.number(),
});

export const prRecordSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  type: prTypeSchema,
  value: z.number(),
  weight: z.number(),
  reps: z.number(),
  workoutId: z.string(),
  date: z.number(),
  createdAt: z.number(),
});

export const settingsSchema = z.object({
  id: z.literal("singleton"),
  units: z.enum(["metric", "imperial"]),
  theme: z.enum(["system", "light", "dark"]),
  webauthnCredentialId: z.string().optional(),
  biometricLockEnabled: z.boolean(),
  bodyweightGoal: z.number().optional(),
  displayName: z.string().optional(),
  trainingGoal: z.enum(["bulk", "maintain", "cut"]).optional(),
  onboarded: z.boolean().optional(),
  language: z.enum(["en", "de"]).optional(),
  schemaVersion: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const photoMetaSchema = z.object({
  id: z.string(),
  category: photoCategorySchema,
  date: z.number(),
  width: z.number(),
  height: z.number(),
  notes: z.string().optional(),
  createdAt: z.number(),
  file: z.string(),
});

export const exportPayloadSchema = z.object({
  app: z.literal("IronLog"),
  schemaVersion: z.number(),
  exportedAt: z.number(),
  data: z.object({
    exercises: z.array(exerciseSchema),
    workouts: z.array(workoutSchema),
    templates: z.array(templateSchema),
    bodyweight: z.array(bodyweightEntrySchema),
    prs: z.array(prRecordSchema),
    settings: settingsSchema.nullable(),
    photoIndex: z.array(photoMetaSchema),
  }),
});

export type ExportPayloadParsed = z.infer<typeof exportPayloadSchema>;

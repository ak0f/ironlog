/**
 * IronLog — core domain types.
 *
 * These mirror the Zod schemas in `src/lib/schema.ts` (the schemas are the
 * runtime source of truth; these types are derived for ergonomic imports).
 */

export type MuscleGroup =
  | "chest"
  | "triceps"
  | "biceps"
  | "back"
  | "shoulders"
  | "abs"
  | "legs";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "triceps",
  "biceps",
  "back",
  "shoulders",
  "abs",
  "legs",
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  triceps: "Triceps",
  biceps: "Biceps",
  back: "Back",
  shoulders: "Shoulders",
  abs: "Abs",
  legs: "Legs",
};

export type PhotoCategory = "front" | "side" | "back";

export type PRType = "weight" | "reps" | "volume";

/** A single exercise definition — bundled or user-created. */
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  /** Secondary muscles worked, for future analytics. */
  secondary?: MuscleGroup[];
  /** Illustration reference (inline SVG key from the bundled set). */
  illustration?: string;
  /** True when authored by the user rather than bundled. */
  custom: boolean;
  /** Equipment hint, free-form (e.g. "Barbell", "Dumbbell", "Cable"). */
  equipment?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** A logged set within a workout exercise. */
export interface WorkoutSet {
  id: string;
  /** kilograms (storage unit is always metric; UI converts). */
  weight: number;
  reps: number;
  /** Completed flag for in-progress workout UX. */
  done: boolean;
  notes?: string;
  /** PR flags computed at save time. */
  prTypes?: PRType[];
}

/** An exercise instance inside a workout, with its ordered sets. */
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  /** Denormalised for fast rendering / history independence. */
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSet[];
  notes?: string;
}

/** A complete workout session. */
export interface Workout {
  id: string;
  /** Display title, e.g. "Push Day". */
  title: string;
  /** Epoch ms of the session date. */
  date: number;
  exercises: WorkoutExercise[];
  notes?: string;
  /** Duration in seconds, optional. */
  durationSec?: number;
  /** Soft flag — true while still being logged. */
  inProgress: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A reusable workout template. */
export interface Template {
  id: string;
  title: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: MuscleGroup;
    targetSets: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

/** A near-daily bodyweight entry. */
export interface BodyweightEntry {
  id: string;
  /** kilograms. */
  weight: number;
  /** Optional, lightweight — not macro tracking. */
  calories?: number;
  /** Epoch ms (date normalised to local midnight on input). */
  date: number;
  notes?: string;
  createdAt: number;
}

/** A persisted personal record. */
export interface PRRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: PRType;
  /** The record value: kg (weight), reps (reps), or kg·reps (volume). */
  value: number;
  /** Context: the weight/reps that produced this record. */
  weight: number;
  reps: number;
  /** Link back to the workout that set it. */
  workoutId: string;
  date: number;
  createdAt: number;
}

/** A progress photo. Image bytes live in IndexedDB as an encrypted blob. */
export interface Photo {
  id: string;
  category: PhotoCategory;
  date: number;
  /** Stored WebP blob (already compressed; encrypted at the storage layer). */
  blob: Blob;
  width: number;
  height: number;
  notes?: string;
  createdAt: number;
}

export type Theme = "system" | "light" | "dark";
export type Units = "metric" | "imperial";
export type TrainingGoal = "bulk" | "maintain" | "cut";

/** Single-row user settings document. */
export interface Settings {
  id: "singleton";
  units: Units;
  theme: Theme;
  /** WebAuthn credential id (base64url) once registered. */
  webauthnCredentialId?: string;
  /** True once the user has opted into biometric lock. */
  biometricLockEnabled: boolean;
  /** Goal bodyweight in kg, optional. */
  bodyweightGoal?: number;
  /** Profile (collected during onboarding). */
  displayName?: string;
  trainingGoal?: TrainingGoal;
  /** True once first-launch onboarding has completed. */
  onboarded?: boolean;
  /** Schema version for export/import migration. */
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
}

/** The shape of a full export payload (decrypted). */
export interface ExportPayload {
  app: "IronLog";
  schemaVersion: number;
  exportedAt: number;
  data: {
    exercises: Exercise[];
    workouts: Workout[];
    templates: Template[];
    bodyweight: BodyweightEntry[];
    prs: PRRecord[];
    settings: Settings | null;
    // Photos are exported as separate files inside the ZIP, referenced here.
    photoIndex: Array<Omit<Photo, "blob"> & { file: string }>;
  };
}

/** Unified timeline event for the chronological feed. */
export type TimelineEventType = "workout" | "bodyweight" | "pr" | "photo";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: number;
  ref: Workout | BodyweightEntry | PRRecord | Photo;
}

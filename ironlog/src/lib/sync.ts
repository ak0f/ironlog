import { supabase } from "./supabase";
import { db } from "./db";
import { computeStreak } from "./repo";

/** Push local data to Supabase and recalculate XP snapshot. */
export async function syncAll(userId: string): Promise<void> {
  await Promise.all([
    syncWorkouts(userId),
    syncPRs(userId),
    syncBodyweight(userId),
  ]);
  await recalculateSnapshot(userId);
}

async function syncWorkouts(userId: string) {
  const workouts = (await db().workouts.toArray()).filter(
    (w) => !w.inProgress
  );

  const rows = workouts.map((w) => ({
    user_id: userId,
    local_id: w.id,
    date: w.date,
    title: w.title,
    duration_sec: w.durationSec ?? null,
    total_volume_kg: w.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.done)
          .reduce((s2, set) => s2 + set.weight * set.reps, 0),
      0
    ),
  }));

  if (rows.length === 0) return;
  await supabase
    .from("synced_workouts")
    .upsert(rows, { onConflict: "user_id,local_id" });
}

async function syncPRs(userId: string) {
  const prs = await db().prs.toArray();
  if (prs.length === 0) return;

  const rows = prs.map((pr) => ({
    user_id: userId,
    local_id: pr.id,
    exercise_name: pr.exerciseName,
    type: pr.type,
    value: pr.value,
    weight_kg: pr.weight,
    reps: pr.reps,
    date: pr.date,
  }));

  await supabase
    .from("synced_prs")
    .upsert(rows, { onConflict: "user_id,local_id" });
}

async function syncBodyweight(userId: string) {
  const entries = await db().bodyweight.orderBy("date").toArray();
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    user_id: userId,
    local_id: e.id,
    date: e.date,
    weight_kg: e.weight,
  }));

  await supabase
    .from("synced_bodyweight")
    .upsert(rows, { onConflict: "user_id,local_id" });
}

async function recalculateSnapshot(userId: string) {
  const [workoutsRes, prsRes, bodyweightRes] = await Promise.all([
    supabase.from("synced_workouts").select("*").eq("user_id", userId),
    supabase.from("synced_prs").select("*").eq("user_id", userId),
    supabase
      .from("synced_bodyweight")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
  ]);

  const workouts = workoutsRes.data ?? [];
  const prs = prsRes.data ?? [];
  const bodyweights = bodyweightRes.data ?? [];

  const workoutCount = workouts.length;
  const prCount = prs.length;
  const streak = await computeStreak();

  // XP calculation
  const streakBonus =
    Math.floor(streak / 30) * 100 + Math.floor((streak % 30) / 7) * 25;
  const recompScore = calculateRecompScore(bodyweights, prs);
  const xpTotal =
    workoutCount * 10 +
    prCount * 50 +
    streakBonus +
    Math.round(recompScore);

  // Top PRs for named lifts
  const findTopPR = (name: string) =>
    prs
      .filter(
        (p) =>
          p.exercise_name.toLowerCase().includes(name) && p.type === "weight"
      )
      .reduce<number | null>((max, p) => (max === null || p.value > max ? p.value : max), null);

  const snapshot = {
    user_id: userId,
    xp_total: xpTotal,
    pr_bench_kg: findTopPR("bench"),
    pr_squat_kg: findTopPR("squat"),
    pr_deadlift_kg: findTopPR("deadlift"),
    pr_ohp_kg: findTopPR("overhead") ?? findTopPR("ohp") ?? findTopPR("press"),
    recomp_score: recompScore,
    workout_count: workoutCount,
    current_streak: streak,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("leaderboard_snapshots")
    .upsert(snapshot, { onConflict: "user_id" });
}

function calculateRecompScore(
  bodyweights: Array<{ weight_kg: number; date: number }>,
  prs: Array<{ type: string; value: number; date: number; exercise_name: string }>
): number {
  if (bodyweights.length < 2) return 0;

  const first = bodyweights[0].weight_kg;
  const last = bodyweights[bodyweights.length - 1].weight_kg;
  const bwDelta = Math.abs(last - first);
  const bodyScore = Math.min(bwDelta * 10, 200);

  // PR improvement: compare oldest vs newest PR per exercise
  const byExercise = new Map<string, Array<{ value: number; date: number }>>();
  for (const pr of prs.filter((p) => p.type === "weight")) {
    const list = byExercise.get(pr.exercise_name) ?? [];
    list.push({ value: pr.value, date: pr.date });
    byExercise.set(pr.exercise_name, list);
  }

  let prBonus = 0;
  for (const entries of byExercise.values()) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.date - b.date);
    const improvement = entries[entries.length - 1].value - entries[0].value;
    if (improvement > 0) prBonus += improvement * 0.5;
  }

  return Math.round(bodyScore + Math.min(prBonus, 100));
}

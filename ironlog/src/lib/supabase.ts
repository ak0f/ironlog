import { createClient } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  gym_location: string | null;
  avatar_url: string | null;
  is_public: boolean;
  friend_code: string;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardSnapshot {
  id: string;
  user_id: string;
  xp_total: number;
  pr_bench_kg: number | null;
  pr_squat_kg: number | null;
  pr_deadlift_kg: number | null;
  pr_ohp_kg: number | null;
  recomp_score: number;
  workout_count: number;
  current_streak: number;
  updated_at: string;
  profiles?: Profile;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface SyncedWorkout {
  id: string;
  user_id: string;
  local_id: string;
  date: number;
  title: string;
  duration_sec: number | null;
  total_volume_kg: number;
  synced_at: string;
}

export interface SyncedPR {
  id: string;
  user_id: string;
  local_id: string;
  exercise_name: string;
  type: string;
  value: number;
  weight_kg: number;
  reps: number;
  date: number;
  synced_at: string;
}

export interface SyncedBodyweight {
  id: string;
  user_id: string;
  local_id: string;
  date: number;
  weight_kg: number;
  synced_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

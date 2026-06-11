import { supabase, type Profile } from "./supabase";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}

export async function upsertProfile(
  userId: string,
  values: Partial<Omit<Profile, "id" | "created_at" | "updated_at" | "friend_code">>
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .upsert({ id: userId, friend_code: "", ...values }, { onConflict: "id" })
    .select()
    .single();
  return data ?? null;
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
  gymLocation?: string
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { data, error };

  const profile = await upsertProfile(data.user.id, {
    username,
    display_name: username,
    gym_location: gymLocation ?? null,
    is_public: false,
  });
  return { data: { ...data, profile }, error: null };
}

export async function signInWithGoogle(redirectTo: string) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/Sheet";
import { IconCopy, IconEdit, IconTrophy } from "@/components/Icons";
import { useAuth } from "@/context/AuthContext";
import { upsertProfile, signOut, uploadAvatar } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { syncAll } from "@/lib/sync";

const COLOR_PRESETS = [
  "#FF375F", "#FF6830", "#FFD60A", "#30D158",
  "#00C7BE", "#0A84FF", "#5E5CE6", "#BF5AF2",
  "#FF2D55", "#8E8E93", "#A6FF00", "#FF9F0A",
];

export default function ProfilePage() {
  const { user, profile, authReady, refreshProfile } = useAuth();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gymLocation, setGymLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    xp_total: number;
    workout_count: number;
    current_streak: number;
    recomp_score: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (authReady && !user) router.replace("/auth/login");
  }, [authReady, user]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name ?? "");
      setGymLocation(profile.gym_location ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("leaderboard_snapshots")
      .select("xp_total, workout_count, current_streak, recomp_score")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setSnapshot(data); });
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setBusy(true);
    await upsertProfile(user.id, {
      username: username.trim(),
      display_name: displayName.trim() || username.trim(),
      gym_location: gymLocation.trim() || null,
    });
    await refreshProfile();
    setBusy(false);
    setEditOpen(false);
  }

  async function togglePublic() {
    if (!user || !profile) return;
    await upsertProfile(user.id, { is_public: !profile.is_public });
    await refreshProfile();
  }

  async function handleSync() {
    if (!user) return;
    setSyncing(true);
    try {
      await syncAll(user.id);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSync(now);
      // refresh snapshot
      const { data } = await supabase
        .from("leaderboard_snapshots")
        .select("xp_total, workout_count, current_streak, recomp_score")
        .eq("user_id", user.id)
        .single();
      if (data) setSnapshot(data);
    } finally {
      setSyncing(false);
    }
  }

  async function selectPresetColor(hex: string) {
    if (!user) return;
    await upsertProfile(user.id, { avatar_url: `color:${hex}` });
    await refreshProfile();
    setAvatarOpen(false);
  }

  async function handleUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true);
    const url = await uploadAvatar(user.id, file);
    if (url) {
      await upsertProfile(user.id, { avatar_url: url });
      await refreshProfile();
    }
    setBusy(false);
    setAvatarOpen(false);
  }

  function copyFriendCode() {
    if (!profile?.friend_code) return;
    navigator.clipboard.writeText(profile.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  if (!authReady || !profile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  const avatarUrl = profile.avatar_url ?? null;
  const isAvatarColor = avatarUrl?.startsWith("color:");
  const avatarColor = isAvatarColor ? avatarUrl!.slice(6) : null;
  const avatarImg =
    avatarUrl && !isAvatarColor && !avatarUrl.startsWith("emoji:") ? avatarUrl : null;
  const profileInitial = (profile.display_name ?? profile.username ?? "?")[0].toUpperCase();

  return (
    <>
      <TopBar title="Profile" back />
      <div className="page" style={{ paddingTop: 24 }}>
        {/* Avatar + name */}
        <div className="col" style={{ alignItems: "center", marginBottom: 28 }}>
          <button
            className="avatar-btn"
            onClick={() => setAvatarOpen(true)}
            aria-label="Change avatar"
          >
            {avatarImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarImg} alt="Avatar" className="avatar-img" />
            ) : (
              <div
                className="color-avatar"
                style={{ background: avatarColor ?? "var(--primary)", fontSize: 30 }}
              >
                {profileInitial}
              </div>
            )}
            <span className="avatar-edit-badge">
              <IconEdit style={{ width: 12, height: 12 }} />
            </span>
          </button>
          <h1 className="t-title" style={{ marginTop: 12 }}>
            {profile.display_name ?? profile.username}
          </h1>
          <p className="muted" style={{ fontSize: 14 }}>@{profile.username}</p>
          {profile.gym_location && (
            <p className="muted" style={{ fontSize: 14 }}>{profile.gym_location}</p>
          )}
        </div>

        {/* XP stats */}
        {snapshot && (
          <div className="xp-grid" style={{ marginBottom: 24 }}>
            <div className="xp-stat">
              <IconTrophy style={{ width: 20, height: 20, color: "var(--pr-gold)" }} />
              <span className="t-title tnum">{snapshot.xp_total}</span>
              <span className="muted" style={{ fontSize: 12 }}>XP</span>
            </div>
            <div className="xp-stat">
              <span className="t-title tnum">{snapshot.workout_count}</span>
              <span className="muted" style={{ fontSize: 12 }}>Workouts</span>
            </div>
            <div className="xp-stat">
              <span className="t-title tnum">{snapshot.current_streak}</span>
              <span className="muted" style={{ fontSize: 12 }}>Streak</span>
            </div>
            <div className="xp-stat">
              <span className="t-title tnum">{Math.round(snapshot.recomp_score)}</span>
              <span className="muted" style={{ fontSize: 12 }}>Recomp</span>
            </div>
          </div>
        )}

        {/* Leaderboard visibility */}
        <section style={{ marginBottom: 20 }}>
          <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>Leaderboard</h2>
          <div className="list-group">
            <div className="list-row">
              <div className="grow">
                <div className="t-body">Show on leaderboard</div>
                <span className="muted" style={{ fontSize: 13 }}>
                  {profile.is_public
                    ? "Your stats are visible to others"
                    : "Stats are hidden (private)"}
                </span>
              </div>
              <button
                className={`toggle ${profile.is_public ? "toggle-on" : ""}`}
                onClick={togglePublic}
                aria-checked={profile.is_public}
                role="switch"
              />
            </div>
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={handleSync}
              disabled={syncing}
            >
              <span className="grow t-body">Sync now</span>
              {lastSync && (
                <span className="muted" style={{ fontSize: 13 }}>
                  Last: {lastSync}
                </span>
              )}
              {syncing && <div className="spinner spinner-sm" />}
            </button>
          </div>
        </section>

        {/* Friend code */}
        <section style={{ marginBottom: 20 }}>
          <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>Friend code</h2>
          <div className="list-group">
            <div className="list-row">
              <span className="grow t-headline tnum" style={{ letterSpacing: 2, fontSize: 20 }}>
                {profile.friend_code}
              </span>
              <button className="btn btn-text" onClick={copyFriendCode}>
                {copied ? "Copied!" : <IconCopy style={{ width: 20, height: 20 }} />}
              </button>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6, paddingLeft: 4 }}>
            Share this code with friends so they can add you.
          </p>
        </section>

        {/* Account */}
        <section style={{ marginBottom: 20 }}>
          <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>Account</h2>
          <div className="list-group">
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={() => setEditOpen(true)}
            >
              <span className="grow t-body">Edit profile</span>
            </button>
            <button
              className="list-row list-row-tap btn-danger"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left", color: "var(--danger)" }}
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </section>
      </div>

      {/* Edit profile sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="col gap-sm">
          <input
            className="input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Gym location (optional)"
            value={gymLocation}
            onChange={(e) => setGymLocation(e.target.value)}
          />
          <button
            className="btn btn-primary btn-block"
            onClick={saveProfile}
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </Sheet>

      {/* Avatar picker sheet */}
      <Sheet open={avatarOpen} onClose={() => setAvatarOpen(false)} title="Choose avatar">
        <div className="col gap-md">
          <div className="color-swatch-grid">
            {COLOR_PRESETS.map((hex) => (
              <button
                key={hex}
                className={`color-swatch-btn${avatarColor === hex ? " color-swatch-active" : ""}`}
                style={{ background: hex }}
                onClick={() => selectPresetColor(hex)}
                aria-label={`Select color ${hex}`}
              />
            ))}
          </div>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => fileRef.current?.click()}
          >
            Upload photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUploadAvatar}
          />
        </div>
      </Sheet>
    </>
  );
}

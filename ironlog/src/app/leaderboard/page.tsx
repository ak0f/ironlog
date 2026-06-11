"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { IconTrophy, IconSearch, IconUser } from "@/components/Icons";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { LeaderboardSnapshot, Profile } from "@/lib/supabase";

type Tab = "global" | "friends";
type Category = "xp" | "prs" | "recomp";

type RowData = LeaderboardSnapshot & { profiles: Profile; rank: number };

export default function LeaderboardPage() {
  const { user, profile, authReady } = useAuth();
  const [tab, setTab] = useState<Tab>("global");
  const [category, setCategory] = useState<Category>("xp");
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchGlobal = useCallback(async () => {
    setLoading(true);
    let orderCol = "xp_total";
    if (category === "recomp") orderCol = "recomp_score";

    const { data } = await supabase
      .from("leaderboard_snapshots")
      .select("*, profiles!inner(*)")
      .order(orderCol, { ascending: false })
      .limit(100);

    const ranked = (data ?? []).map((r, i) => ({ ...r, rank: i + 1 })) as RowData[];
    setRows(ranked);

    if (user) {
      const idx = ranked.findIndex((r) => r.user_id === user.id);
      setMyRank(idx >= 0 ? idx + 1 : null);
    }
    setLoading(false);
  }, [category, user]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get accepted friend IDs
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");

    const friendIds = (friendships ?? []).map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    friendIds.push(user.id);

    let orderCol = "xp_total";
    if (category === "recomp") orderCol = "recomp_score";

    const { data } = await supabase
      .from("leaderboard_snapshots")
      .select("*, profiles!inner(*)")
      .in("user_id", friendIds)
      .order(orderCol, { ascending: false });

    const ranked = (data ?? []).map((r, i) => ({ ...r, rank: i + 1 })) as RowData[];
    setRows(ranked);
    setLoading(false);
  }, [category, user]);

  useEffect(() => {
    if (!authReady) return;
    if (tab === "global") fetchGlobal();
    else fetchFriends();
  }, [tab, category, authReady, fetchGlobal, fetchFriends]);

  if (!authReady) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <TopBar title="Leaderboard" />
        <div className="page" style={{ paddingTop: 48 }}>
          <div className="col" style={{ alignItems: "center", gap: 16 }}>
            <div className="auth-logo">
              <IconTrophy style={{ width: 36, height: 36, color: "#fff" }} />
            </div>
            <h1 className="t-title">Join the leaderboard</h1>
            <p className="muted center" style={{ fontSize: 15, maxWidth: 280 }}>
              Create a free account to see how your lifts stack up globally and compete with friends.
            </p>
            <Link href="/welcome" className="btn btn-primary" style={{ marginTop: 8 }}>
              Get started
            </Link>
          </div>
        </div>
      </>
    );
  }

  const myRow = rows.find((r) => r.user_id === user.id);
  const myRowInTop = myRow && myRow.rank <= 100;

  return (
    <>
      <TopBar
        title="Leaderboard"
        right={
          <Link href="/profile" className="btn btn-text" aria-label="Profile">
            <IconUser style={{ width: 24, height: 24 }} />
          </Link>
        }
      />
      <div className="page" style={{ paddingTop: 12 }}>
        {/* Opt-in banner */}
        {profile && !profile.is_public && (
          <Link href="/profile" className="opt-in-banner">
            <span>Your stats are private.</span>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>
              Join the board →
            </span>
          </Link>
        )}

        {/* Tab switcher */}
        <div className="segmented" style={{ marginBottom: 16 }}>
          <button className={tab === "global" ? "on" : ""} onClick={() => setTab("global")}>
            Global
          </button>
          <button className={tab === "friends" ? "on" : ""} onClick={() => setTab("friends")}>
            Friends
          </button>
        </div>

        {/* Category chips */}
        <div className="chip-row" style={{ marginBottom: 16 }}>
          {(["xp", "prs", "recomp"] as Category[]).map((c) => (
            <button
              key={c}
              className={`chip${category === c ? " chip-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c === "xp" ? "XP Score" : c === "prs" ? "Top PRs" : "Recomp"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <div className="spinner" />
          </div>
        ) : rows.length === 0 ? (
          <div className="col" style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
            <p className="muted">
              {tab === "friends"
                ? "No friends on the board yet."
                : "No public athletes yet."}
            </p>
            {tab === "friends" && (
              <Link href="/friends" className="btn btn-secondary">
                Add friends
              </Link>
            )}
          </div>
        ) : (
          <div className="col" style={{ gap: 0 }}>
            <div className="list-group">
              {rows.map((row) => (
                <LeaderboardRow
                  key={row.id}
                  row={row}
                  category={category}
                  isMe={row.user_id === user.id}
                />
              ))}
            </div>

            {/* Sticky my-rank row if outside top 100 */}
            {!myRowInTop && myRank && tab === "global" && (
              <div className="my-rank-sticky">
                <span className="rank-num">#{myRank}</span>
                <span className="muted" style={{ fontSize: 14 }}>You</span>
              </div>
            )}
          </div>
        )}

        {tab === "friends" && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link href="/friends" className="btn btn-text">
              <IconSearch style={{ width: 18, height: 18 }} />
              Manage friends
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function LeaderboardRow({
  row,
  category,
  isMe,
}: {
  row: RowData;
  category: Category;
  isMe: boolean;
}) {
  const p = row.profiles;
  const url = p.avatar_url ?? null;
  const isColor = url?.startsWith("color:");
  const isImg = url && !isColor && !url.startsWith("emoji:");
  const avatarBg = isColor ? url!.slice(6) : "var(--primary)";
  const initial = (p.display_name ?? p.username ?? "?")[0].toUpperCase();

  const rankColors = ["var(--pr-gold)", "#9e9e9e", "#cd7f32"] as const;
  const rankColor = row.rank <= 3 ? rankColors[row.rank - 1] : "var(--ink-muted-48)";
  const rankBadgeFg = row.rank === 1 ? "#000" : "#fff";

  const metricValue =
    category === "xp"
      ? `${row.xp_total} XP`
      : category === "recomp"
        ? `${Math.round(row.recomp_score)} pts`
        : row.pr_bench_kg
          ? `${row.pr_bench_kg}kg bench`
          : "—";

  return (
    <div className={`list-row lb-row${isMe ? " lb-row-me" : ""}`} style={{ gap: 12 }}>
      <span className="rank-num tnum" style={{ minWidth: 28, textAlign: "center" }}>
        {row.rank <= 3 ? (
          <span
            className="rank-badge"
            style={{ background: rankColor, color: rankBadgeFg }}
          >
            {row.rank}
          </span>
        ) : (
          <span style={{ color: rankColor }}>{`#${row.rank}`}</span>
        )}
      </span>

      <div className="lb-avatar">
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url!} alt="" className="lb-avatar-img" />
        ) : (
          <div className="color-avatar" style={{ background: avatarBg, fontSize: 15 }}>
            {initial}
          </div>
        )}
      </div>

      <div className="grow" style={{ minWidth: 0 }}>
        <div className="t-headline" style={{ fontSize: 15 }}>
          {p.display_name ?? p.username}
          {isMe && (
            <span style={{ marginLeft: 6, fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>
              You
            </span>
          )}
        </div>
        {p.gym_location && (
          <p className="muted" style={{ fontSize: 12 }}>{p.gym_location}</p>
        )}
      </div>

      <div className="col" style={{ alignItems: "flex-end", gap: 2 }}>
        <span className="t-headline tnum" style={{ fontSize: 15 }}>{metricValue}</span>
        <span className="muted" style={{ fontSize: 11 }}>{row.workout_count} workouts</span>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/Sheet";
import { IconSearch, IconClose } from "@/components/Icons";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Friendship, Profile } from "@/lib/supabase";

type FriendshipWithProfiles = Friendship & {
  requester: Profile;
  addressee: Profile;
};

export default function FriendsPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendshipWithProfiles[]>([]);
  const [pending, setPending] = useState<FriendshipWithProfiles[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "code">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friendCode, setFriendCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authReady && !user) router.replace("/auth/login");
  }, [authReady, user]);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select(
        `*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)`
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const all = (data ?? []) as FriendshipWithProfiles[];
    setFriends(all.filter((f) => f.status === "accepted"));
    setPending(
      all.filter((f) => f.status === "pending" && f.addressee_id === user.id)
    );
  }, [user]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  async function searchUsers() {
    if (query.trim().length < 2) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${query.trim()}%`)
      .neq("id", user?.id ?? "")
      .limit(10);
    setSearchResults(data ?? []);
  }

  async function sendByCode() {
    setError("");
    setSuccess("");
    if (!user) return;
    const code = friendCode.trim().toUpperCase();
    if (code.length !== 8) {
      setError("Friend codes are 8 characters");
      return;
    }
    setBusy(true);
    const { data: target } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("friend_code", code)
      .single();

    if (!target) {
      setError("No user found with that code");
      setBusy(false);
      return;
    }
    if (target.id === user.id) {
      setError("That's your own code!");
      setBusy(false);
      return;
    }
    await sendRequest(target.id);
    setBusy(false);
  }

  async function sendRequest(targetId: string) {
    if (!user) return;
    const { error: err } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetId,
      status: "pending",
    });
    if (err) {
      setError(err.message.includes("unique") ? "Request already sent" : err.message);
    } else {
      setSuccess("Friend request sent!");
      setQuery("");
      setFriendCode("");
      setSearchResults([]);
      setTimeout(() => {
        setSuccess("");
        setAddOpen(false);
      }, 1500);
      loadFriends();
    }
  }

  async function acceptRequest(friendshipId: string) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    loadFriends();
  }

  async function rejectRequest(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    loadFriends();
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    loadFriends();
  }

  if (!authReady || !user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <TopBar title="Friends" back />
      <div className="page" style={{ paddingTop: 16 }}>
        <button
          className="btn btn-primary btn-block"
          style={{ marginBottom: 24 }}
          onClick={() => { setAddOpen(true); setError(""); setSuccess(""); }}
        >
          <IconSearch style={{ width: 18, height: 18 }} />
          Add friend
        </button>

        {/* Pending requests */}
        {pending.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
              Requests ({pending.length})
            </h2>
            <div className="list-group">
              {pending.map((f) => (
                <FriendRequestRow
                  key={f.id}
                  friendship={f}
                  currentUserId={user.id}
                  onAccept={() => acceptRequest(f.id)}
                  onReject={() => rejectRequest(f.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
            Friends ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <p className="muted" style={{ fontSize: 15 }}>
              No friends yet. Add some to see them on the leaderboard.
            </p>
          ) : (
            <div className="list-group">
              {friends.map((f) => {
                const other = f.requester_id === user.id ? f.addressee : f.requester;
                return (
                  <FriendRow
                    key={f.id}
                    profile={other}
                    onRemove={() => removeFriend(f.id)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Add friend sheet */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add friend">
        <div className="col gap-md">
          <div className="segmented">
            <button className={addMode === "search" ? "on" : ""} onClick={() => setAddMode("search")}>
              Search
            </button>
            <button className={addMode === "code" ? "on" : ""} onClick={() => setAddMode("code")}>
              Friend code
            </button>
          </div>

          {addMode === "search" ? (
            <>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Search by username…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSearchResults([]); }}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
              </div>
              <button className="btn btn-ghost btn-block" onClick={searchUsers}>
                <IconSearch style={{ width: 18, height: 18 }} />
                Search
              </button>
              {searchResults.length > 0 && (
                <div className="list-group">
                  {searchResults.map((p) => (
                    <div key={p.id} className="list-row">
                      <AvatarMini profile={p} />
                      <div className="grow">
                        <div className="t-headline" style={{ fontSize: 15 }}>
                          {p.display_name ?? p.username}
                        </div>
                        <p className="muted" style={{ fontSize: 13 }}>@{p.username}</p>
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "8px 14px", fontSize: 14 }}
                        onClick={() => sendRequest(p.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <input
                className="input"
                type="text"
                placeholder="8-character friend code"
                maxLength={8}
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase", letterSpacing: 3, fontSize: 20, textAlign: "center" }}
              />
              <button
                className="btn btn-primary btn-block"
                onClick={sendByCode}
                disabled={busy}
              >
                {busy ? "Sending…" : "Send request"}
              </button>
            </>
          )}

          {error && <p style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p>}
          {success && <p style={{ color: "var(--good)", fontSize: 14 }}>{success}</p>}
        </div>
      </Sheet>
    </>
  );
}

function AvatarMini({ profile }: { profile: Profile }) {
  const url = profile.avatar_url ?? null;
  const isColor = url?.startsWith("color:");
  const isImg = url && !isColor && !url.startsWith("emoji:");
  const bg = isColor ? url!.slice(6) : "var(--primary)";
  const initial = (profile.display_name ?? profile.username ?? "?")[0].toUpperCase();
  return (
    <div className="lb-avatar">
      {isImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt="" className="lb-avatar-img" />
      ) : (
        <div className="color-avatar" style={{ background: bg, fontSize: 15 }}>
          {initial}
        </div>
      )}
    </div>
  );
}

function FriendRow({
  profile,
  onRemove,
}: {
  profile: Profile;
  onRemove: () => void;
}) {
  return (
    <div className="list-row">
      <AvatarMini profile={profile} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="t-headline" style={{ fontSize: 15 }}>
          {profile.display_name ?? profile.username}
        </div>
        {profile.gym_location && (
          <p className="muted" style={{ fontSize: 13 }}>{profile.gym_location}</p>
        )}
      </div>
      <button className="btn btn-text btn-danger" onClick={onRemove}>
        <IconClose style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}

function FriendRequestRow({
  friendship,
  currentUserId,
  onAccept,
  onReject,
}: {
  friendship: FriendshipWithProfiles;
  currentUserId: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const sender =
    friendship.requester_id === currentUserId
      ? friendship.requester
      : friendship.requester;
  return (
    <div className="list-row" style={{ gap: 10 }}>
      <AvatarMini profile={sender} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="t-headline" style={{ fontSize: 15 }}>
          {sender.display_name ?? sender.username}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>wants to be friends</p>
      </div>
      <button
        className="btn btn-secondary"
        style={{ padding: "8px 14px", fontSize: 14 }}
        onClick={onAccept}
      >
        Accept
      </button>
      <button className="btn btn-text btn-danger" onClick={onReject}>
        <IconClose style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}

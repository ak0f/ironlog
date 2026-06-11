"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, upsertProfile } from "@/lib/auth";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      router.replace("/auth/login");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(async ({ data, error }) => {
        if (error || !data.user) {
          setStatus("Sign-in failed. Redirecting…");
          setTimeout(() => router.replace("/auth/login"), 1500);
          return;
        }
        // Ensure profile row exists for Google OAuth users
        const existing = await getProfile(data.user.id);
        if (!existing) {
          const emailName = data.user.email?.split("@")[0] ?? "user";
          await upsertProfile(data.user.id, {
            username: emailName,
            display_name: data.user.user_metadata?.full_name ?? emailName,
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
            is_public: false,
          });
          router.replace("/profile");
        } else {
          router.replace("/leaderboard");
        }
      });
  }, []);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <div className="spinner" />
      <p className="muted">{status}</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

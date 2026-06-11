"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, upsertProfile } from "@/lib/auth";

function CallbackInner() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");
  const handled = useRef(false);

  useEffect(() => {
    async function onSession(userId: string, email: string | undefined, meta: Record<string, unknown>) {
      if (handled.current) return;
      handled.current = true;

      const existing = await getProfile(userId);
      if (!existing) {
        const emailName = email?.split("@")[0] ?? "user";
        await upsertProfile(userId, {
          username: emailName,
          display_name: (meta?.full_name as string) ?? emailName,
          avatar_url: (meta?.avatar_url as string) ?? null,
          is_public: false,
        });
        router.replace("/profile");
      } else {
        router.replace("/leaderboard");
      }
    }

    function fail() {
      if (handled.current) return;
      handled.current = true;
      setStatus("Sign-in failed. Redirecting…");
      setTimeout(() => router.replace("/auth/login"), 1500);
    }

    // Supabase auto-exchanges the PKCE code (detectSessionInUrl: true).
    // Listen for the resulting SIGNED_IN event, then handle profile + redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await onSession(session.user.id, session.user.email, session.user.user_metadata ?? {});
        }
      }
    );

    // Race: session may already be set if the exchange completed before listener registered.
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await onSession(data.session.user.id, data.session.user.email, data.session.user.user_metadata ?? {});
      }
    });

    // Fallback timeout — if neither fires within 10s, something went wrong.
    const timeout = setTimeout(fail, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

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

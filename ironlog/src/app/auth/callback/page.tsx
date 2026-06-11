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
    async function finish(userId: string, email: string | undefined, meta: Record<string, unknown>) {
      if (handled.current) return;
      handled.current = true;
      try {
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
      } catch {
        router.replace("/leaderboard");
      }
    }

    function fail() {
      if (handled.current) return;
      handled.current = true;
      setStatus("Sign-in failed. Redirecting…");
      setTimeout(() => router.replace("/auth/login"), 1500);
    }

    // Register listener before getSession so we catch SIGNED_IN if exchange
    // is still in progress, and INITIAL_SESSION if it already completed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          await finish(session.user.id, session.user.email, session.user.user_metadata ?? {});
        }
      }
    );

    // getSession() awaits initializePromise, so it blocks until the PKCE
    // exchange is done. Covers the race where INITIAL_SESSION already fired.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session?.user) {
        fail();
      } else {
        finish(data.session.user.id, data.session.user.email, data.session.user.user_metadata ?? {});
      }
    });

    const timeout = setTimeout(fail, 12000);

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

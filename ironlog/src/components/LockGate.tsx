"use client";

/**
 * Biometric lock gate. When the user has enabled biometric lock, the app shell
 * is hidden behind a Face ID / Touch ID prompt until a successful assertion.
 * Unlock state is held in memory only (re-locks on full reload).
 */
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { verifyBiometric } from "@/lib/webauthn";
import { IconFaceId } from "./Icons";

export function LockGate({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const locked =
    ready &&
    !!settings?.biometricLockEnabled &&
    !!settings?.webauthnCredentialId &&
    !unlocked;

  const attempt = useCallback(async () => {
    if (!settings?.webauthnCredentialId) return;
    setBusy(true);
    setError(false);
    const ok = await verifyBiometric(settings.webauthnCredentialId);
    setBusy(false);
    if (ok) setUnlocked(true);
    else setError(true);
  }, [settings?.webauthnCredentialId]);

  // Auto-prompt once when the gate appears.
  useEffect(() => {
    if (locked && !busy && !error) void attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  if (!locked) return <>{children}</>;

  return (
    <div className="lock-screen">
      <div className="lock-inner">
        <div className="lock-icon">
          <IconFaceId style={{ width: 64, height: 64 }} />
        </div>
        <h1 className="t-title">IronLog is locked</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {error
            ? "Authentication failed. Try again."
            : "Authenticate to continue."}
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 24 }}
          onClick={attempt}
          disabled={busy}
        >
          {busy ? "Authenticating…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}

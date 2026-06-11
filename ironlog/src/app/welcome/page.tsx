"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  IconDumbbell,
  IconTrophy,
  IconFlame,
  IconUsers,
  IconPlus,
} from "@/components/Icons";
import { signUpWithEmail, signInWithEmail, signInWithGoogle, upsertProfile } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

type Step = "splash" | "choose" | "login" | "register" | "avatar" | "done";
type InstallPlatform = "ios" | "chrome" | null;

const COLOR_PRESETS = [
  "#FF375F", "#FF6830", "#FFD60A", "#30D158",
  "#00C7BE", "#0A84FF", "#5E5CE6", "#BF5AF2",
  "#FF2D55", "#8E8E93", "#A6FF00", "#FF9F0A",
];

// —— Apple Health triple rings ——
function TripleRings({ complete = false }: { complete?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(id);
  }, []);

  const rings = [
    { r: 118, color: "#ff375f", bg: "rgba(255,59,48,0.14)",  fill: complete ? 0.02 : 0.17, delay: "0.1s"  },
    { r: 88,  color: "#a6ff00", bg: "rgba(166,255,0,0.14)",  fill: complete ? 0.02 : 0.29, delay: "0.32s" },
    { r: 58,  color: "#00e5ff", bg: "rgba(0,229,255,0.14)",  fill: complete ? 0.02 : 0.44, delay: "0.54s" },
  ];

  return (
    <div className="wiz-rings-wrap" aria-hidden="true">
      <svg viewBox="0 0 280 280" className="wiz-rings-svg">
        {rings.map(({ r, color, bg, fill, delay }) => {
          const circ = 2 * Math.PI * r;
          const offset = ready ? circ * fill : circ;
          return (
            <g key={r}>
              <circle cx="140" cy="140" r={r} fill="none" stroke={bg} strokeWidth="18" />
              <circle
                cx="140" cy="140" r={r}
                fill="none" stroke={color} strokeWidth="18" strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 140 140)"
                style={{
                  transition: ready
                    ? `stroke-dashoffset 1.6s cubic-bezier(0.32,0.72,0,1) ${delay}`
                    : "none",
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Safari share arrow
function ShareArrow() {
  return (
    <svg
      width="14" height="16" viewBox="0 0 14 16"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline", verticalAlign: "middle", margin: "0 3px" }}
      aria-hidden="true"
    >
      <path d="M7 1v10M3 4l4-4 4 4" />
      <path d="M1 11v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function WizBack({ onClick }: { onClick: () => void }) {
  return (
    <button className="wiz-back" onClick={onClick} aria-label="Go back">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  );
}

function WizDots({ step }: { step: Step }) {
  const steps: Step[] = ["choose", "register", "avatar"];
  const idx = steps.indexOf(step);
  if (idx < 0) return null;
  return (
    <div className="wiz-dots" aria-label={`Step ${idx + 1} of ${steps.length}`}>
      {steps.map((_, i) => (
        <div
          key={i}
          className={`wiz-dot${i === idx ? " wiz-dot-active" : i < idx ? " wiz-dot-done" : ""}`}
        />
      ))}
    </div>
  );
}

function WizFeature({ icon, iconBg, text, sub }: { icon: React.ReactNode; iconBg?: string; text: string; sub: string }) {
  return (
    <div className="wiz-feature">
      <span
        className="wiz-feature-icon"
        style={iconBg ? { background: iconBg, borderRadius: 10 } : undefined}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{text}</div>
        <div style={{ fontSize: 13, color: "var(--ink-muted-48)", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("splash");
  const [dir, setDir] = useState<"forward" | "back">("forward");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gymLocation, setGymLocation] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[5]); // blue default
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);

  // PWA install detection
  const [installPlatform, setInstallPlatform] = useState<InstallPlatform>(null);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isInStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isIos && !isInStandalone) {
      // Only show for Safari (not Chrome/Firefox on iOS — they can't install anyway)
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
      if (isSafari) setInstallPlatform("ios");
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      if (!isInStandalone) setInstallPlatform("chrome");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleChromeInstall() {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
    if (outcome === "accepted") setInstallPlatform(null);
  }

  function go(next: Step, direction: "forward" | "back" = "forward") {
    setDir(direction);
    setError("");
    setStep(next);
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
    const { error: err } = await signInWithGoogle(redirectTo);
    if (err) { setError(err.message); setBusy(false); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await signInWithEmail(email, password);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.replace("/leaderboard");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setBusy(true);
    const { error: err } = await signUpWithEmail(
      email,
      password,
      username.trim(),
      gymLocation.trim() || undefined
    );
    setBusy(false);
    if (err) { setError(err.message); return; }
    go("avatar");
  }

  async function handleAvatarDone() {
    if (!user) { router.replace("/leaderboard"); return; }
    setBusy(true);
    const avatarVal = uploadedAvatarUrl ?? `color:${selectedColor}`;
    await upsertProfile(user.id, { avatar_url: avatarVal });
    await refreshProfile();
    setBusy(false);
    go("done");
    setTimeout(() => router.replace("/leaderboard"), 2400);
  }

  async function handleUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true);
    const { uploadAvatar } = await import("@/lib/auth");
    const url = await uploadAvatar(user.id, file);
    setBusy(false);
    if (url) setUploadedAvatarUrl(url);
  }

  const anim = dir === "forward" ? "wiz-enter-forward" : "wiz-enter-back";
  const initial = username[0]?.toUpperCase() ?? "?";

  return (
    <div className="wiz-shell">

      {/* ── PWA INSTALL SHEET ── */}
      {installPlatform && (
        <div
          className="install-sheet-backdrop"
          onClick={() => setInstallPlatform(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Install IronLog"
        >
          <div className="install-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grabber" />
            <div className="install-sheet-inner">
              <div className="install-app-icon">
                <IconDumbbell style={{ width: 34, height: 34, color: "#fff" }} />
              </div>

              <div>
                <h2 className="t-title" style={{ textAlign: "center" }}>Add to Home Screen</h2>
                <p className="muted" style={{ fontSize: 15, marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
                  Install IronLog for the full native app experience — free.
                </p>
              </div>

              {installPlatform === "ios" && (
                <div className="install-steps">
                  <div className="install-step-row">
                    <span className="install-step-num">1</span>
                    <span style={{ fontSize: 15 }}>
                      Tap the <ShareArrow /> Share button in Safari
                    </span>
                  </div>
                  <div className="install-step-row">
                    <span className="install-step-num">2</span>
                    <span style={{ fontSize: 15 }}>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
                  </div>
                  <div className="install-step-row">
                    <span className="install-step-num">3</span>
                    <span style={{ fontSize: 15 }}>Tap &ldquo;Add&rdquo; to confirm</span>
                  </div>
                </div>
              )}

              <div className="install-actions">
                {installPlatform === "chrome" && (
                  <button className="btn btn-primary btn-block" onClick={handleChromeInstall}>
                    Install IronLog
                  </button>
                )}
                <button className="btn btn-ghost btn-block" onClick={() => setInstallPlatform(null)}>
                  {installPlatform === "ios" ? "Got it" : "Maybe Later"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <WizDots step={step} />

      {/* ── SPLASH ── */}
      {step === "splash" && (
        <div className={`wiz-step ${anim}`}>
          <div className="wiz-splash-top">
            <TripleRings />
            <div className="wiz-splash-brand">
              <h1 className="wiz-headline">IronLog</h1>
              <p className="wiz-sub">Track gains. Compete. Climb.</p>
            </div>
          </div>

          <div className="wiz-features stagger">
            <WizFeature
              icon={<IconDumbbell style={{ width: 20, height: 20, color: "#ff375f" }} />}
              iconBg="rgba(255,59,48,0.18)"
              text="Log workouts & PRs"
              sub="Track every set with precision"
            />
            <WizFeature
              icon={<IconTrophy style={{ width: 20, height: 20, color: "#ffd60a" }} />}
              iconBg="rgba(255,214,10,0.18)"
              text="Global leaderboard"
              sub="See where you rank worldwide"
            />
            <WizFeature
              icon={<IconFlame style={{ width: 20, height: 20, color: "#a6ff00" }} />}
              iconBg="rgba(166,255,0,0.16)"
              text="Earn XP as you train"
              sub="Level up with every workout"
            />
            <WizFeature
              icon={<IconUsers style={{ width: 20, height: 20, color: "#00e5ff" }} />}
              iconBg="rgba(0,229,255,0.16)"
              text="Friends & rivals"
              sub="Add friends by code or username"
            />
          </div>

          <div className="wiz-actions">
            <button className="btn btn-primary btn-block" onClick={() => go("choose")}>
              Get started
            </button>
            <button className="btn btn-text wiz-hint" onClick={() => go("login")}>
              I already have an account
            </button>
          </div>
        </div>
      )}

      {/* ── CHOOSE ── */}
      {step === "choose" && (
        <div className={`wiz-step ${anim}`}>
          <WizBack onClick={() => go("splash", "back")} />
          <div className="wiz-hero">
            <h2 className="t-display">Join IronLog</h2>
            <p className="muted" style={{ fontSize: 16, textAlign: "center" }}>
              Create a free account to compete
            </p>
          </div>

          <div className="col gap-sm" style={{ width: "100%" }}>
            <button className="wiz-choice-card" onClick={() => go("register")}>
              <span className="wiz-choice-badge wiz-choice-badge-blue">
                <IconPlus style={{ width: 18, height: 18, color: "#fff" }} />
              </span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="t-headline">Create account</div>
                <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  Username, email &amp; password
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted-30)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <button className="wiz-choice-card" onClick={handleGoogle} disabled={busy}>
              <span className="wiz-choice-badge wiz-choice-badge-white">
                <GoogleIcon />
              </span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="t-headline">Continue with Google</div>
                <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  Fast · no password needed
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted-30)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <button className="btn btn-text" onClick={() => go("login")}>
            Sign in instead
          </button>
          {error && <p className="wiz-error">{error}</p>}
        </div>
      )}

      {/* ── REGISTER ── */}
      {step === "register" && (
        <div className={`wiz-step ${anim}`}>
          <WizBack onClick={() => go("choose", "back")} />
          <div className="wiz-hero" style={{ gap: 8 }}>
            <h2 className="t-display">Create account</h2>
            <p className="muted" style={{ fontSize: 15 }}>Step 1 of 2</p>
          </div>

          <form onSubmit={handleRegister} className="col gap-sm" style={{ width: "100%" }}>
            <div className="wiz-input-group">
              <label className="wiz-label">Username</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. ironmike"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="wiz-input-group">
              <label className="wiz-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="wiz-input-group">
              <label className="wiz-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="wiz-input-group">
              <label className="wiz-label">
                Gym location <span className="muted">(optional)</span>
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Vienna, Austria"
                value={gymLocation}
                onChange={(e) => setGymLocation(e.target.value)}
              />
            </div>
            {error && <p className="wiz-error">{error}</p>}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
              style={{ marginTop: 4 }}
            >
              {busy ? "Creating…" : "Continue →"}
            </button>
          </form>
        </div>
      )}

      {/* ── LOGIN ── */}
      {step === "login" && (
        <div className={`wiz-step ${anim}`}>
          <WizBack onClick={() => go("splash", "back")} />
          <div className="wiz-hero" style={{ gap: 8 }}>
            <h2 className="t-display">Welcome back</h2>
            <p className="muted" style={{ fontSize: 15 }}>Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="col gap-sm" style={{ width: "100%" }}>
            <div className="wiz-input-group">
              <label className="wiz-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="wiz-input-group">
              <label className="wiz-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="wiz-error">{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="auth-divider" style={{ width: "100%" }}>
            <span>or</span>
          </div>

          <button className="btn btn-ghost btn-block" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon />
            Continue with Google
          </button>

          <button className="btn btn-text" style={{ marginTop: 4 }} onClick={() => go("choose")}>
            No account? Create one
          </button>
        </div>
      )}

      {/* ── AVATAR ── */}
      {step === "avatar" && (
        <div className={`wiz-step ${anim}`}>
          <div className="wiz-hero" style={{ gap: 10 }}>
            <div className="wiz-avatar-preview">
              {uploadedAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadedAvatarUrl} alt="avatar" className="wiz-avatar-img" />
              ) : (
                <div
                  className="color-avatar"
                  style={{ background: selectedColor, fontSize: 40, borderRadius: "50%" }}
                >
                  {initial}
                </div>
              )}
            </div>
            <h2 className="t-display">Pick your color</h2>
            <p className="muted" style={{ fontSize: 15 }}>
              Step 2 of 2 · You can change this later
            </p>
          </div>

          <div className="color-swatch-grid">
            {COLOR_PRESETS.map((hex) => (
              <button
                key={hex}
                className={`color-swatch-btn${
                  selectedColor === hex && !uploadedAvatarUrl ? " color-swatch-active" : ""
                }`}
                style={{ background: hex }}
                onClick={() => { setSelectedColor(hex); setUploadedAvatarUrl(null); }}
                aria-label={`Select color ${hex}`}
              />
            ))}
          </div>

          <button
            className="btn btn-ghost btn-block"
            style={{ marginBottom: 8 }}
            onClick={() => fileRef.current?.click()}
          >
            Upload photo instead
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUploadAvatar} />

          <button className="btn btn-primary btn-block" onClick={handleAvatarDone} disabled={busy}>
            {busy ? "Saving…" : "Let's go →"}
          </button>
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && (
        <div className={`wiz-step wiz-step-done ${anim}`}>
          <div className="wiz-done-rings-wrap">
            <TripleRings complete />
            <div className="wiz-done-check">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 6.5" />
              </svg>
            </div>
          </div>
          <h2 className="t-display" style={{ textAlign: "center" }}>
            You&apos;re on the board!
          </h2>
          <p className="muted" style={{ fontSize: 16, textAlign: "center", lineHeight: 1.6 }}>
            Sync your workouts to start climbing the leaderboard.
          </p>
        </div>
      )}
    </div>
  );
}

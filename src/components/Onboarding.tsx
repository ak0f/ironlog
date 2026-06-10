"use client";

/**
 * First-launch onboarding (see user-flows.md). A premium, full-screen, multi-
 * step flow: welcome → privacy → Face ID → profile → split → photos → reveal.
 * On finish it writes profile settings, logs a starting bodyweight, generates
 * starter templates for the chosen split, and marks onboarding complete.
 */
import { useState } from "react";
import { useApp } from "./AppProvider";
import {
  IconCamera,
  IconCheck,
  IconChevron,
  IconDumbbell,
  IconFaceId,
  IconLock,
} from "./Icons";
import { MuscleIllustration } from "./MuscleIllustration";
import {
  isPlatformAuthenticatorAvailable,
  registerBiometric,
} from "@/lib/webauthn";
import { bodyweightRepo, templateRepo } from "@/lib/repo";
import { toKg, uid } from "@/lib/utils";
import { SPLITS, blueprintExercises, blueprintsFor, type SplitId } from "@/data/splits";
import type { TrainingGoal, Units } from "@/types";

const GOALS: { id: TrainingGoal; label: string; sub: string }[] = [
  { id: "bulk", label: "Build", sub: "Gain muscle" },
  { id: "maintain", label: "Maintain", sub: "Stay strong" },
  { id: "cut", label: "Cut", sub: "Lean down" },
];

export function Onboarding() {
  const { settings, ready, updateSettings, toast } = useApp();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);

  // profile state
  const [name, setName] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [bw, setBw] = useState("");
  const [goal, setGoal] = useState<TrainingGoal>("maintain");
  const [split, setSplit] = useState<SplitId>("ppl");
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioCred, setBioCred] = useState<string | undefined>();

  if (!ready || !settings || settings.onboarded) return null;

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  async function enableFaceId() {
    const ok = await isPlatformAuthenticatorAvailable();
    if (!ok) {
      toast("Biometrics not available on this device");
      go(3);
      return;
    }
    try {
      const cred = await registerBiometric();
      setBioCred(cred);
      setBioEnabled(true);
      if ("vibrate" in navigator) navigator.vibrate?.(20);
      go(3);
    } catch {
      toast("Skipped Face ID");
      go(3);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await updateSettings({
        units,
        displayName: name.trim() || undefined,
        trainingGoal: goal,
        biometricLockEnabled: bioEnabled,
        webauthnCredentialId: bioCred,
        bodyweightGoal:
          goal === "cut" && bw
            ? toKg(parseFloat(bw) * 0.95, units)
            : undefined,
        onboarded: true,
      });

      const w = parseFloat(bw);
      if (w > 0) {
        await bodyweightRepo.upsertForDay({ weight: toKg(w, units), date: Date.now() });
      }

      for (const bp of blueprintsFor(split)) {
        const now = Date.now();
        await templateRepo.save({
          id: uid(),
          title: bp.title,
          exercises: blueprintExercises(bp),
          createdAt: now,
          updatedAt: now,
        });
      }

      // Don't immediately re-greet with the daily check-in.
      try {
        const t = new Date();
        localStorage.setItem(
          "ironlog.lastCheckIn",
          `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
        );
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onb">
      {/* progress dots */}
      <div className="onb-dots">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`onb-dot${i === step ? " on" : ""}`} />
        ))}
      </div>

      <div key={step} className={`onb-step ${dir === 1 ? "in-right" : "in-left"}`}>
        {step === 0 && (
          <Hero
            icon={
              <div className="onb-logo">
                <IconDumbbell style={{ width: 56, height: 56, color: "#fff" }} />
              </div>
            }
            title="IronLog"
            body="Track strength. See progress. Own your data."
            cta="Continue"
            onCta={() => go(1)}
          />
        )}

        {step === 1 && (
          <Hero
            icon={<GlassIcon><IconLock style={{ width: 48, height: 48 }} /></GlassIcon>}
            title="Your data stays on your iPhone"
            body="No accounts. No cloud. No tracking. Everything is stored locally and encrypted on this device."
            cta="Continue"
            onCta={() => go(2)}
          />
        )}

        {step === 2 && (
          <Hero
            icon={<GlassIcon><IconFaceId style={{ width: 52, height: 52, color: "var(--primary)" }} /></GlassIcon>}
            title="Protect your gym history"
            body="Use Face ID or Touch ID to lock IronLog. You can change this anytime in Settings."
            cta="Enable Face ID"
            onCta={enableFaceId}
            secondary="Maybe later"
            onSecondary={() => go(3)}
          />
        )}

        {step === 3 && (
          <div className="onb-form">
            <h1 className="t-display">About you</h1>
            <p className="muted" style={{ marginBottom: 22 }}>
              This personalizes your dashboard. All optional.
            </p>

            <label className="t-caption-strong onb-label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nickname"
            />

            <label className="t-caption-strong onb-label">Units</label>
            <div className="segmented">
              <button className={units === "metric" ? "on" : ""} onClick={() => setUnits("metric")}>
                Kilograms
              </button>
              <button className={units === "imperial" ? "on" : ""} onClick={() => setUnits("imperial")}>
                Pounds
              </button>
            </div>

            <label className="t-caption-strong onb-label">
              Bodyweight ({units === "imperial" ? "lb" : "kg"})
            </label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              placeholder="Optional"
            />

            <label className="t-caption-strong onb-label">Goal</label>
            <div className="onb-goals">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  className={`onb-goal${goal === g.id ? " on" : ""}`}
                  onClick={() => setGoal(g.id)}
                >
                  <span className="onb-goal-label">{g.label}</span>
                  <span className="onb-goal-sub">{g.sub}</span>
                </button>
              ))}
            </div>

            <div className="onb-actions">
              <button className="btn btn-primary btn-block" onClick={() => go(4)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onb-form">
            <h1 className="t-display">Choose a split</h1>
            <p className="muted" style={{ marginBottom: 22 }}>
              We&apos;ll create starter templates you can edit anytime.
            </p>
            <div className="col gap-sm">
              {SPLITS.map((s) => (
                <button
                  key={s.id}
                  className={`onb-split${split === s.id ? " on" : ""}`}
                  onClick={() => setSplit(s.id)}
                >
                  <div className="grow" style={{ textAlign: "left" }}>
                    <div className="t-headline">{s.name}</div>
                    <span className="muted" style={{ fontSize: 13 }}>{s.description}</span>
                  </div>
                  <div className={`onb-radio${split === s.id ? " on" : ""}`}>
                    {split === s.id && <IconCheck style={{ width: 16, height: 16 }} />}
                  </div>
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <button className="btn btn-primary btn-block" onClick={() => go(5)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <Hero
            icon={
              <div className="onb-photo-demo">
                <MuscleIllustration group="chest" size={70} />
                <div className="onb-photo-ghost">
                  <MuscleIllustration group="chest" size={70} />
                </div>
              </div>
            }
            title="Progress photos"
            body="Capture front, side and back shots with a ghost overlay to line up every time. Fully local, only on this device."
            cta={busy ? "Setting up…" : "Start training"}
            onCta={finish}
            ctaIcon={<IconCamera style={{ width: 20, height: 20 }} />}
          />
        )}
      </div>

      {step > 0 && step < 5 && (
        <button className="onb-back" onClick={() => go(step - 1)} aria-label="Back">
          <IconChevron style={{ width: 22, height: 22, transform: "rotate(180deg)" }} />
        </button>
      )}
    </div>
  );
}

function Hero({
  icon,
  title,
  body,
  cta,
  onCta,
  ctaIcon,
  secondary,
  onSecondary,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  ctaIcon?: React.ReactNode;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="onb-hero">
      <div className="onb-hero-icon">{icon}</div>
      <h1 className="t-hero center" style={{ marginBottom: 12 }}>
        {title}
      </h1>
      <p className="onb-body">{body}</p>
      <div className="onb-actions">
        <button className="btn btn-primary btn-block" onClick={onCta}>
          {ctaIcon}
          {cta}
        </button>
        {secondary && (
          <button className="btn btn-text btn-block" style={{ marginTop: 4 }} onClick={onSecondary}>
            {secondary}
          </button>
        )}
      </div>
    </div>
  );
}

function GlassIcon({ children }: { children: React.ReactNode }) {
  return <div className="onb-glass-icon">{children}</div>;
}

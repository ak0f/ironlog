"use client";

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
import { translations } from "@/lib/i18n";
import type { Locale, TrainingGoal, Units } from "@/types";

const TOTAL_STEPS = 7; // 0=lang, 1=welcome, 2=privacy, 3=faceId, 4=profile, 5=split, 6=photos

export function Onboarding() {
  const { settings, ready, updateSettings, toast } = useApp();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);

  // profile state
  const [locale, setLocale] = useState<Locale>("en");
  const [name, setName] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [bw, setBw] = useState("");
  const [goal, setGoal] = useState<TrainingGoal>("maintain");
  const [split, setSplit] = useState<SplitId>("ppl");
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioCred, setBioCred] = useState<string | undefined>();

  if (!ready || !settings || settings.onboarded) return null;

  const t = translations[locale];
  const progress = step / (TOTAL_STEPS - 1);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  async function enableFaceId() {
    const ok = await isPlatformAuthenticatorAvailable();
    if (!ok) {
      toast(t.settings.biometricNotAvailable);
      go(4);
      return;
    }
    try {
      const cred = await registerBiometric();
      setBioCred(cred);
      setBioEnabled(true);
      if ("vibrate" in navigator) navigator.vibrate?.(20);
      go(4);
    } catch {
      toast(t.onboarding.maybeLater);
      go(4);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await updateSettings({
        units,
        language: locale,
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

      try {
        const today = new Date();
        localStorage.setItem(
          "ironlog.lastCheckIn",
          `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
        );
      } catch { /* ignore */ }
    } finally {
      setBusy(false);
    }
  }

  const unitLabel = units === "imperial" ? "lb" : "kg";

  const GOALS = [
    { id: "bulk" as TrainingGoal, label: t.goals.build, sub: t.goals.buildSub },
    { id: "maintain" as TrainingGoal, label: t.goals.maintain, sub: t.goals.maintainSub },
    { id: "cut" as TrainingGoal, label: t.goals.cut, sub: t.goals.cutSub },
  ];

  return (
    <div className="onb">
      {/* Background orbs */}
      <div className="onb-orb onb-orb-blue" />
      <div className="onb-orb onb-orb-purple" />
      <div className="onb-orb onb-orb-fire" />

      {/* Thin progress bar at top */}
      {step > 0 && (
        <div className="onb-progress" style={{ marginBottom: 16 }}>
          <div className="onb-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <div
        key={step}
        className={`onb-step ${dir === 1 ? "in-right" : "in-left"}`}
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* ── Step 0: Language ── */}
        {step === 0 && (
          <div className="onb-hero" style={{ maxWidth: 400, width: "100%" }}>
            {/* Wordmark */}
            <div style={{ marginBottom: 48, textAlign: "center" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 22,
                background: "linear-gradient(145deg, #0a84ff 0%, #5e5ce6 100%)",
                boxShadow: "0 0 40px rgba(10,132,255,0.35)",
                marginBottom: 20,
              }}>
                <IconDumbbell style={{ width: 36, height: 36, color: "#fff" }} />
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 12,
              }}>
                IronLog
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.6,
                color: "#fff",
                lineHeight: 1.2,
              }}>
                Choose your language<br />
                <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500, fontSize: 22 }}>
                  Wähle deine Sprache
                </span>
              </div>
            </div>

            {/* Language cards */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              {([
                { code: "en" as Locale, name: "English", sub: "Continue in English" },
                { code: "de" as Locale, name: "Deutsch", sub: "Auf Deutsch fortfahren" },
              ]).map(({ code, name, sub }) => {
                const active = locale === code;
                return (
                  <button
                    key={code}
                    onClick={() => setLocale(code)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "20px 22px",
                      borderRadius: 18,
                      border: `1.5px solid ${active ? "var(--primary)" : "rgba(255,255,255,0.09)"}`,
                      background: active ? "rgba(10,132,255,0.13)" : "rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.18s, background 0.18s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: -0.3,
                        marginBottom: 3,
                      }}>
                        {name}
                      </div>
                      <div style={{
                        fontSize: 14,
                        color: "rgba(255,255,255,0.38)",
                        fontWeight: 400,
                      }}>
                        {sub}
                      </div>
                    </div>
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: `2px solid ${active ? "var(--primary)" : "rgba(255,255,255,0.18)"}`,
                      background: active ? "var(--primary)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "border-color 0.18s, background 0.18s",
                    }}>
                      {active && <IconCheck style={{ width: 14, height: 14, color: "#fff" }} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="onb-actions" style={{ width: "100%", maxWidth: 400 }}>
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17, marginTop: 32 }}
                onClick={() => go(1)}
              >
                {t.common.continue}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="onb-hero">
            <div className="onb-hero-icon">
              <div className="onb-logo">
                <IconDumbbell style={{ width: 60, height: 60, color: "#fff" }} />
              </div>
            </div>
            <h1
              className="t-hero center"
              style={{
                marginBottom: 14,
                color: "#fff",
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: -1.5,
              }}
            >
              {t.onboarding.welcome}
            </h1>
            <p className="onb-body center" style={{ fontSize: 19, lineHeight: 1.5 }}>
              {t.onboarding.welcomeBody}
            </p>
            <div className="onb-actions">
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17, marginTop: 16 }}
                onClick={() => go(2)}
              >
                {t.common.continue}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Privacy ── */}
        {step === 2 && (
          <div className="onb-hero">
            <div className="onb-hero-icon">
              <GlassIcon>
                <IconLock style={{ width: 48, height: 48, color: "rgba(255,255,255,0.9)" }} />
              </GlassIcon>
            </div>
            <h1
              className="t-hero center"
              style={{ marginBottom: 14, color: "#fff", fontSize: 30, fontWeight: 700, letterSpacing: -0.8 }}
            >
              {t.onboarding.privacyTitle}
            </h1>
            <p className="onb-body center">{t.onboarding.privacyBody}</p>
            <div className="onb-actions">
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17 }}
                onClick={() => go(3)}
              >
                {t.common.continue}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Face ID ── */}
        {step === 3 && (
          <div className="onb-hero">
            <div className="onb-hero-icon">
              <GlassIcon>
                <IconFaceId style={{ width: 52, height: 52, color: "var(--primary)" }} />
              </GlassIcon>
            </div>
            <h1
              className="t-hero center"
              style={{ marginBottom: 14, color: "#fff", fontSize: 30, fontWeight: 700, letterSpacing: -0.8 }}
            >
              {t.onboarding.faceIdTitle}
            </h1>
            <p className="onb-body center">{t.onboarding.faceIdBody}</p>
            <div className="onb-actions">
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17 }}
                onClick={enableFaceId}
              >
                {t.onboarding.enableFaceId}
              </button>
              <button
                className="btn btn-text btn-block"
                style={{ marginTop: 4, color: "rgba(255,255,255,0.5)" }}
                onClick={() => go(4)}
              >
                {t.onboarding.maybeLater}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Profile ── */}
        {step === 4 && (
          <div className="onb-form">
            <h1
              className="t-display"
              style={{ color: "#fff", marginBottom: 6, fontSize: 30, fontWeight: 700 }}
            >
              {t.onboarding.aboutTitle}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 28, fontSize: 16 }}>
              {t.onboarding.aboutSub}
            </p>

            <FormLabel>{t.onboarding.name}</FormLabel>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.onboarding.namePlaceholder}
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
            />

            <FormLabel>{t.onboarding.unitsLabel}</FormLabel>
            <div className="segmented" style={{ background: "rgba(255,255,255,0.08)" }}>
              <button
                className={units === "metric" ? "on" : ""}
                onClick={() => setUnits("metric")}
                style={{ color: units === "metric" ? undefined : "rgba(255,255,255,0.5)" }}
              >
                {t.settings.kilograms}
              </button>
              <button
                className={units === "imperial" ? "on" : ""}
                onClick={() => setUnits("imperial")}
                style={{ color: units === "imperial" ? undefined : "rgba(255,255,255,0.5)" }}
              >
                {t.settings.pounds}
              </button>
            </div>

            <FormLabel>{t.onboarding.bodyweightLabel(unitLabel)}</FormLabel>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              placeholder={t.common.optional}
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
            />

            <FormLabel>{t.onboarding.goalLabel}</FormLabel>
            <div className="onb-goals">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  className={`onb-goal${goal === g.id ? " on" : ""}`}
                  onClick={() => setGoal(g.id)}
                  style={{
                    background: goal === g.id ? "rgba(10,132,255,0.2)" : "rgba(255,255,255,0.07)",
                    borderColor: goal === g.id ? "var(--primary)" : "transparent",
                  }}
                >
                  <span className="onb-goal-label" style={{ color: "#fff" }}>{g.label}</span>
                  <span className="onb-goal-sub" style={{ color: "rgba(255,255,255,0.45)" }}>{g.sub}</span>
                </button>
              ))}
            </div>

            <div className="onb-actions" style={{ marginTop: 28 }}>
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17 }}
                onClick={() => go(5)}
              >
                {t.common.continue}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Split ── */}
        {step === 5 && (
          <div className="onb-form">
            <h1
              className="t-display"
              style={{ color: "#fff", marginBottom: 6, fontSize: 30, fontWeight: 700 }}
            >
              {t.onboarding.splitTitle}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 24, fontSize: 16 }}>
              {t.onboarding.splitSub}
            </p>
            <div className="col gap-sm">
              {SPLITS.map((s) => {
                const splitT = t.splits[s.id];
                return (
                  <button
                    key={s.id}
                    className={`onb-split${split === s.id ? " on" : ""}`}
                    onClick={() => setSplit(s.id)}
                    style={{
                      background: split === s.id ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.07)",
                      borderColor: split === s.id ? "var(--primary)" : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="grow" style={{ textAlign: "left" }}>
                      <div className="t-headline" style={{ color: "#fff" }}>{splitT.name}</div>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                        {splitT.description}
                      </span>
                    </div>
                    <div
                      className={`onb-radio${split === s.id ? " on" : ""}`}
                      style={{
                        borderColor: split === s.id ? "var(--primary)" : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {split === s.id && <IconCheck style={{ width: 16, height: 16 }} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="onb-actions" style={{ marginTop: 28 }}>
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17 }}
                onClick={() => go(6)}
              >
                {t.common.continue}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Progress photos + Finish ── */}
        {step === 6 && (
          <div className="onb-hero">
            <div className="onb-hero-icon">
              <div
                style={{
                  position: "relative",
                  width: 110,
                  height: 130,
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                }}
              >
                <MuscleIllustration group="chest" size={70} />
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.28,
                  transform: "translateX(12px)",
                  color: "var(--primary)",
                }}>
                  <MuscleIllustration group="chest" size={70} />
                </div>
              </div>
            </div>
            <h1
              className="t-hero center"
              style={{ marginBottom: 14, color: "#fff", fontSize: 30, fontWeight: 700, letterSpacing: -0.8 }}
            >
              {t.onboarding.photosTitle}
            </h1>
            <p className="onb-body center">{t.onboarding.photosBody}</p>
            <div className="onb-actions">
              <button
                className="btn btn-primary btn-block"
                style={{ height: 54, fontSize: 17 }}
                onClick={finish}
                disabled={busy}
              >
                <IconCamera style={{ width: 20, height: 20 }} />
                {busy ? t.onboarding.settingUp : t.onboarding.startTraining}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Back button */}
      {step > 0 && step < 6 && (
        <button
          className="onb-back"
          onClick={() => go(step - 1)}
          aria-label={t.common.back}
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
        >
          <IconChevron style={{ width: 22, height: 22, transform: "rotate(180deg)" }} />
        </button>
      )}
    </div>
  );
}

function GlassIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 110,
        height: 110,
        borderRadius: 30,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.4)",
        margin: "20px 0 8px",
      }}
    >
      {children}
    </div>
  );
}

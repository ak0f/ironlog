"use client";

import { useState } from "react";
import { useApp } from "./AppProvider";
import {
  IconCheck,
  IconChevron,
  IconDumbbell,
  IconFaceId,
  IconLock,
} from "./Icons";
import {
  isPlatformAuthenticatorAvailable,
  registerBiometric,
} from "@/lib/webauthn";
import { bodyweightRepo, templateRepo } from "@/lib/repo";
import { toKg, uid } from "@/lib/utils";
import { SPLITS, blueprintExercises, blueprintsFor, type SplitId } from "@/data/splits";
import { translations } from "@/lib/i18n";
import type { Locale, TrainingGoal, Units } from "@/types";

const TOTAL_STEPS = 7;

/* ── Design tokens matching DESIGN.md ─────────────────────────────── */
const T = {
  heading: {
    fontSize: 40, fontWeight: 600, letterSpacing: "-0.5px",
    lineHeight: 1.1, color: "#fff", margin: 0,
  } as React.CSSProperties,
  body: {
    fontSize: 17, fontWeight: 400, lineHeight: 1.47,
    letterSpacing: "-0.374px", color: "rgba(255,255,255,0.55)",
    margin: 0,
  } as React.CSSProperties,
  caption: {
    fontSize: 13, fontWeight: 600, letterSpacing: "0.14em",
    textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)",
  } as React.CSSProperties,
};

const TILE: React.CSSProperties = {
  display: "flex", alignItems: "center",
  padding: "18px 20px", borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  cursor: "pointer", textAlign: "left", width: "100%",
  transition: "border-color 0.16s ease, background 0.16s ease",
};
const TILE_ACTIVE: React.CSSProperties = {
  ...TILE, borderColor: "#0066cc",
  background: "rgba(0,102,204,0.11)",
};

export function Onboarding() {
  const { settings, ready, updateSettings, toast } = useApp();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);

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

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); };

  async function enableFaceId() {
    const ok = await isPlatformAuthenticatorAvailable();
    if (!ok) { toast(t.settings.biometricNotAvailable); go(4); return; }
    try {
      const cred = await registerBiometric();
      setBioCred(cred); setBioEnabled(true);
      if ("vibrate" in navigator) navigator.vibrate?.(20);
      go(4);
    } catch { go(4); }
  }

  async function finish() {
    setBusy(true);
    try {
      await updateSettings({
        units, language: locale,
        displayName: name.trim() || undefined,
        trainingGoal: goal,
        biometricLockEnabled: bioEnabled,
        webauthnCredentialId: bioCred,
        bodyweightGoal: goal === "cut" && bw ? toKg(parseFloat(bw) * 0.95, units) : undefined,
        onboarded: true,
      });
      const w = parseFloat(bw);
      if (w > 0) await bodyweightRepo.upsertForDay({ weight: toKg(w, units), date: Date.now() });
      for (const bp of blueprintsFor(split)) {
        const now = Date.now();
        await templateRepo.save({ id: uid(), title: bp.title, exercises: blueprintExercises(bp), createdAt: now, updatedAt: now });
      }
      try {
        const today = new Date();
        localStorage.setItem("ironlog.lastCheckIn", `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`);
      } catch { /* ignore */ }
    } finally { setBusy(false); }
  }

  const unitLabel = units === "imperial" ? "lb" : "kg";

  const GOALS = [
    { id: "bulk" as TrainingGoal, label: t.goals.build, sub: t.goals.buildSub },
    { id: "maintain" as TrainingGoal, label: t.goals.maintain, sub: t.goals.maintainSub },
    { id: "cut" as TrainingGoal, label: t.goals.cut, sub: t.goals.cutSub },
  ];

  return (
    <div className="onb">
      {/* Progress bar — only after language step */}
      {step > 0 && (
        <div className="onb-progress" style={{ marginBottom: 0 }}>
          <div className="onb-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <div
        key={step}
        className={`onb-step ${dir === 1 ? "in-right" : "in-left"}`}
        style={{ alignItems: "center" }}
      >

        {/* ── 0 · Language ────────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ maxWidth: 390, width: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 52 }}>
              <p style={T.caption}>IronLog</p>
              <h1 style={{ ...T.heading, fontSize: 44, letterSpacing: "-0.8px", marginTop: 14 }}>
                Choose your<br />language
              </h1>
              <p style={{ ...T.body, marginTop: 10, color: "rgba(255,255,255,0.32)" }}>
                Wähle deine Sprache
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { code: "en" as Locale, name: "English", sub: "Continue in English" },
                { code: "de" as Locale, name: "Deutsch", sub: "Auf Deutsch fortfahren" },
              ]).map(({ code, name: lname, sub }) => {
                const active = locale === code;
                return (
                  <button key={code} onClick={() => setLocale(code)} style={active ? TILE_ACTIVE : TILE}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 19, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px", marginBottom: 2 }}>
                        {lname}
                      </div>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.36)" }}>{sub}</div>
                    </div>
                    <Radio active={active} />
                  </button>
                );
              })}
            </div>

            <Pill style={{ marginTop: 36 }} onClick={() => go(1)}>{t.common.continue}</Pill>
          </div>
        )}

        {/* ── 1 · Welcome ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ maxWidth: 390, width: "100%", textAlign: "center" }}>
            <div style={{ marginBottom: 40 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 64, height: 64, borderRadius: 18,
                background: "#0066cc", marginBottom: 32,
              }}>
                <IconDumbbell style={{ width: 32, height: 32, color: "#fff" }} />
              </div>
              <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-1.2px", lineHeight: 1.0, color: "#fff", margin: 0, marginBottom: 20 }}>
                {t.onboarding.welcome}
              </h1>
              <p style={{ fontSize: 21, fontWeight: 300, lineHeight: 1.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0", maxWidth: 280, margin: "0 auto" }}>
                {t.onboarding.welcomeBody}
              </p>
            </div>
            <Pill onClick={() => go(2)}>{t.common.continue}</Pill>
          </div>
        )}

        {/* ── 2 · Privacy ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ maxWidth: 390, width: "100%", textAlign: "center" }}>
            <IconLock style={{ width: 52, height: 52, color: "rgba(255,255,255,0.85)", marginBottom: 36 }} />
            <h1 style={{ ...T.heading, fontSize: 36, marginBottom: 16 }}>{t.onboarding.privacyTitle}</h1>
            <p style={{ ...T.body, maxWidth: 320, margin: "0 auto 40px" }}>{t.onboarding.privacyBody}</p>
            <Pill onClick={() => go(3)}>{t.common.continue}</Pill>
          </div>
        )}

        {/* ── 3 · Face ID ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ maxWidth: 390, width: "100%", textAlign: "center" }}>
            <IconFaceId style={{ width: 56, height: 56, color: "#0066cc", marginBottom: 36 }} />
            <h1 style={{ ...T.heading, fontSize: 36, marginBottom: 16 }}>{t.onboarding.faceIdTitle}</h1>
            <p style={{ ...T.body, maxWidth: 320, margin: "0 auto 40px" }}>{t.onboarding.faceIdBody}</p>
            <Pill onClick={enableFaceId}>{t.onboarding.enableFaceId}</Pill>
            <button
              onClick={() => go(4)}
              style={{ marginTop: 16, fontSize: 15, color: "rgba(255,255,255,0.36)", background: "none", border: "none", cursor: "pointer", padding: "8px 0", width: "100%" }}
            >
              {t.onboarding.maybeLater}
            </button>
          </div>
        )}

        {/* ── 4 · Profile ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ maxWidth: 420, width: "100%" }}>
            <h1 style={{ ...T.heading, fontSize: 36, marginBottom: 8 }}>{t.onboarding.aboutTitle}</h1>
            <p style={{ ...T.body, marginBottom: 36 }}>{t.onboarding.aboutSub}</p>

            <Label>{t.onboarding.name}</Label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.onboarding.namePlaceholder}
              style={inputStyle}
            />

            <Label>{t.onboarding.unitsLabel}</Label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["metric", "imperial"] as Units[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnits(u)}
                  style={{
                    ...TILE,
                    ...(units === u ? TILE_ACTIVE : {}),
                    flex: 1, justifyContent: "center",
                    padding: "14px 0", fontWeight: 600,
                    fontSize: 15, color: "#fff",
                  }}
                >
                  {u === "metric" ? "kg" : "lb"}
                </button>
              ))}
            </div>

            <Label>{t.onboarding.bodyweightLabel(unitLabel)}</Label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              placeholder={t.common.optional}
              style={inputStyle}
            />

            <Label>{t.onboarding.goalLabel}</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {GOALS.map((g) => {
                const active = goal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    style={{
                      ...(active ? TILE_ACTIVE : TILE),
                      flexDirection: "column", alignItems: "flex-start",
                      padding: "14px 16px", gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{g.label}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{g.sub}</span>
                  </button>
                );
              })}
            </div>

            <Pill style={{ marginTop: 36 }} onClick={() => go(5)}>{t.common.continue}</Pill>
          </div>
        )}

        {/* ── 5 · Split ───────────────────────────────────────────────── */}
        {step === 5 && (
          <div style={{ maxWidth: 420, width: "100%" }}>
            <h1 style={{ ...T.heading, fontSize: 36, marginBottom: 8 }}>{t.onboarding.splitTitle}</h1>
            <p style={{ ...T.body, marginBottom: 28 }}>{t.onboarding.splitSub}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SPLITS.map((s) => {
                const splitT = t.splits[s.id];
                const active = split === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSplit(s.id)}
                    style={active ? TILE_ACTIVE : TILE}
                  >
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{splitT.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>{splitT.description}</div>
                    </div>
                    <Radio active={active} />
                  </button>
                );
              })}
            </div>
            <Pill style={{ marginTop: 36 }} onClick={() => go(6)}>{t.common.continue}</Pill>
          </div>
        )}

        {/* ── 6 · Finish ──────────────────────────────────────────────── */}
        {step === 6 && (
          <div style={{ maxWidth: 390, width: "100%", textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: 18,
              background: "#0066cc", marginBottom: 36,
            }}>
              <IconDumbbell style={{ width: 32, height: 32, color: "#fff" }} />
            </div>
            <h1 style={{ ...T.heading, fontSize: 40, marginBottom: 16 }}>{t.onboarding.photosTitle}</h1>
            <p style={{ ...T.body, maxWidth: 320, margin: "0 auto 44px" }}>{t.onboarding.photosBody}</p>
            <Pill onClick={finish} disabled={busy}>
              {busy ? t.onboarding.settingUp : t.onboarding.startTraining}
            </Pill>
          </div>
        )}
      </div>

      {/* Back button */}
      {step > 0 && step < 6 && (
        <button
          className="onb-back"
          onClick={() => go(step - 1)}
          aria-label={t.common.back}
          style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
        >
          <IconChevron style={{ width: 20, height: 20, transform: "rotate(180deg)" }} />
        </button>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  color: "#fff",
  borderColor: "rgba(255,255,255,0.1)",
};

function Pill({
  children, onClick, disabled, style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      className="btn btn-block"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 50, fontSize: 17, fontWeight: 400, letterSpacing: "-0.374px",
        borderRadius: 9999, background: "#0066cc", color: "#fff",
        border: "none", cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1, transition: "transform 0.1s ease, opacity 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
      border: `2px solid ${active ? "#0066cc" : "rgba(255,255,255,0.2)"}`,
      background: active ? "#0066cc" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.16s ease", marginLeft: 12,
    }}>
      {active && <IconCheck style={{ width: 11, height: 11, color: "#fff" }} />}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", color: "rgba(255,255,255,0.36)",
      margin: "22px 0 8px",
    }}>
      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/Sheet";
import {
  IconChevron,
  IconDownload,
  IconFaceId,
  IconLock,
  IconUpload,
} from "@/components/Icons";
import { useApp, useI18n } from "@/components/AppProvider";
import {
  backupFilename,
  downloadBlob,
  exportBackup,
  importBackup,
} from "@/lib/backup";
import {
  isPlatformAuthenticatorAvailable,
  registerBiometric,
} from "@/lib/webauthn";
import { fromKg, toKg } from "@/lib/utils";
import type { Locale, Theme, Units } from "@/types";

export default function SettingsPage() {
  const { settings, updateSettings, toast } = useApp();
  const t = useI18n();
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importBytes = useRef<ArrayBuffer | null>(null);

  if (!settings) return <div className="spinner" />;
  const units = settings.units;

  async function setUnits(u: Units) {
    await updateSettings({ units: u });
  }
  async function setTheme(th: Theme) {
    await updateSettings({ theme: th });
  }
  async function setLanguage(lang: Locale) {
    await updateSettings({ language: lang });
  }

  async function doExport() {
    if (pass.length < 6) {
      toast(t.settings.passphraseMin);
      return;
    }
    setBusy(true);
    try {
      const blob = await exportBackup(pass);
      downloadBlob(blob, backupFilename());
      toast(t.settings.backupExported);
      setExportOpen(false);
      setPass("");
    } catch {
      toast(t.settings.exportFailed);
    } finally {
      setBusy(false);
    }
  }

  function pickImportFile() {
    fileRef.current?.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    importBytes.current = await file.arrayBuffer();
    e.target.value = "";
    setImportOpen(true);
  }
  async function doImport() {
    if (!importBytes.current) return;
    setBusy(true);
    try {
      const res = await importBackup(importBytes.current, pass, "replace");
      const migrated = res.migratedFrom
        ? ` (migrated from v${res.migratedFrom})`
        : "";
      toast(`Restored ${res.workouts} workouts, ${res.photos} photos${migrated}`);
      setImportOpen(false);
      setPass("");
      importBytes.current = null;
    } catch (err) {
      toast(err instanceof Error ? err.message : t.settings.importFailed);
    } finally {
      setBusy(false);
    }
  }

  async function enableBiometric() {
    const available = await isPlatformAuthenticatorAvailable();
    if (!available) {
      toast(t.settings.biometricNotAvailable);
      return;
    }
    try {
      const credentialId = await registerBiometric();
      await updateSettings({
        webauthnCredentialId: credentialId,
        biometricLockEnabled: true,
      });
      toast(t.settings.biometricEnabled);
    } catch {
      toast(t.settings.biometricError);
    }
  }
  async function disableBiometric() {
    await updateSettings({ biometricLockEnabled: false });
    toast(t.settings.biometricDisabled);
  }

  async function saveGoal() {
    const g = parseFloat(goal);
    await updateSettings({
      bodyweightGoal: g > 0 ? toKg(g, units) : undefined,
    });
    setGoalOpen(false);
    toast(g > 0 ? t.settings.goalUpdated : t.settings.goalCleared);
  }

  return (
    <>
      <TopBar title={t.settings.title} back />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 20 }}>
          {t.settings.title}
        </h1>

        {/* Language */}
        <Section title={t.settings.language}>
          <div className="list-group">
            {([
              { code: "en", label: "English", sub: "English" },
              { code: "de", label: "Deutsch", sub: "German" },
            ] as { code: Locale; label: string; sub: string }[]).map(({ code, label, sub }) => {
              const active = settings.language === code || (!settings.language && code === "en");
              return (
                <button
                  key={code}
                  className="list-row list-row-tap"
                  style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
                  onClick={() => setLanguage(code)}
                >
                  <div className="grow">
                    <div className="t-body" style={{ fontWeight: active ? 600 : 400 }}>{label}</div>
                    <span className="muted" style={{ fontSize: 13 }}>{sub}</span>
                  </div>
                  {active && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10.5l4.5 4.5 7.5-9" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Units */}
        <Section title={t.settings.units}>
          <div className="list-group">
            <div className="list-row">
              <span className="grow t-body">{t.settings.weightUnit}</span>
              <div className="segmented" style={{ width: 150 }}>
                <button className={units === "metric" ? "on" : ""} onClick={() => setUnits("metric")}>
                  kg
                </button>
                <button className={units === "imperial" ? "on" : ""} onClick={() => setUnits("imperial")}>
                  lb
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title={t.settings.appearance}>
          <div className="list-group">
            <div className="list-row col" style={{ alignItems: "stretch", gap: 10 }}>
              <span className="t-body">{t.settings.theme}</span>
              <div className="segmented">
                {(["system", "light", "dark"] as Theme[]).map((th) => (
                  <button
                    key={th}
                    className={settings.theme === th ? "on" : ""}
                    onClick={() => setTheme(th)}
                  >
                    {th === "system" ? t.settings.themeSystem : th === "light" ? t.settings.themeLight : t.settings.themeDark}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Goals */}
        <Section title={t.settings.goals}>
          <div className="list-group">
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={() => {
                setGoal(settings.bodyweightGoal ? String(fromKg(settings.bodyweightGoal, units)) : "");
                setGoalOpen(true);
              }}
            >
              <span className="grow t-body">{t.settings.bodyweightGoal}</span>
              <span className="muted">
                {settings.bodyweightGoal
                  ? `${fromKg(settings.bodyweightGoal, units)} ${units === "imperial" ? "lb" : "kg"}`
                  : t.common.notSet}
              </span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </button>
          </div>
        </Section>

        {/* Exercises */}
        <Section title={t.settings.library}>
          <div className="list-group">
            <Link href="/exercises" className="list-row list-row-tap">
              <span className="grow t-body">{t.settings.exerciseDatabase}</span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </Link>
          </div>
        </Section>

        {/* Security */}
        <Section title={t.settings.security}>
          <div className="list-group">
            <div className="list-row">
              <IconFaceId style={{ width: 22, height: 22, color: "var(--primary)" }} />
              <div className="grow">
                <div className="t-body">{t.settings.biometricLock}</div>
                <span className="muted" style={{ fontSize: 13 }}>
                  {t.settings.biometricLockDesc}
                </span>
              </div>
              {settings.biometricLockEnabled ? (
                <button className="btn btn-text btn-danger" onClick={disableBiometric}>
                  {t.common.disable}
                </button>
              ) : (
                <button className="btn btn-text" onClick={enableBiometric}>
                  {t.common.enable}
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* Data */}
        <Section title={t.settings.data}>
          <div className="list-group">
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={() => setExportOpen(true)}
            >
              <IconDownload style={{ width: 22, height: 22, color: "var(--primary)" }} />
              <span className="grow t-body">{t.settings.exportBackup}</span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </button>
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={pickImportFile}
            >
              <IconUpload style={{ width: 22, height: 22, color: "var(--primary)" }} />
              <span className="grow t-body">{t.settings.importBackup}</span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".ironlog,application/octet-stream" hidden onChange={onFile} />
        </Section>

        {/* Rest Timer */}
        <Section title={t.settings.restTimer}>
          <div className="list-group">
            <div className="list-row col" style={{ alignItems: "stretch", gap: 10 }}>
              <div className="chip-row">
                {([0, 60, 90, 120, 180, 300] as number[]).map((val) => {
                  const active = (settings.restTimerDuration ?? 90) === val;
                  const label =
                    val === 0
                      ? t.settings.restTimerOff
                      : val >= 60 && val % 60 === 0
                      ? t.settings.restTimerMin(val / 60)
                      : t.settings.restTimerSec(val);
                  return (
                    <button
                      key={val}
                      className={`chip${active ? " chip-active" : ""}`}
                      onClick={() => updateSettings({ restTimerDuration: val })}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Coming soon */}
        <Section title={t.settings.comingSoon}>
          <div className="list-group">
            <div className="list-row" style={{ opacity: 0.4, pointerEvents: "none" }}>
              <IconLock style={{ width: 20, height: 20 }} />
              <span className="grow t-body">{t.settings.iCloudSync}</span>
              <span className="muted" style={{ fontSize: 13 }}>{t.common.off}</span>
            </div>
            <div className="list-row" style={{ opacity: 0.4, pointerEvents: "none" }}>
              <IconLock style={{ width: 20, height: 20 }} />
              <span className="grow t-body">{t.settings.appleHealth}</span>
              <span className="muted" style={{ fontSize: 13 }}>{t.common.off}</span>
            </div>
          </div>
        </Section>

        <p className="muted center" style={{ fontSize: 13, marginTop: 24 }}>
          {t.settings.footer}
        </p>
      </div>

      {/* Export sheet */}
      <Sheet open={exportOpen} onClose={() => setExportOpen(false)} title={t.settings.exportTitle}>
        <div className="col gap-md">
          <p className="muted" style={{ fontSize: 14 }}>
            {t.settings.exportDesc}
          </p>
          <input
            className="input"
            type="password"
            placeholder={t.settings.passphrase}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={doExport} disabled={busy}>
            {busy ? t.settings.encrypting : t.settings.export}
          </button>
        </div>
      </Sheet>

      {/* Import sheet */}
      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title={t.settings.importTitle}>
        <div className="col gap-md">
          <p className="muted" style={{ fontSize: 14 }}>
            {t.settings.importDesc}
          </p>
          <input
            className="input"
            type="password"
            placeholder={t.settings.passphrase}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={doImport} disabled={busy}>
            {busy ? t.settings.restoring : t.settings.restore}
          </button>
        </div>
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title={t.settings.goalTitle}>
        <div className="col gap-md">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={t.settings.goalTarget(units === "imperial" ? "lb" : "kg")}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={saveGoal}>
            {t.common.save}
          </button>
        </div>
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="t-caption-strong" style={{ marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

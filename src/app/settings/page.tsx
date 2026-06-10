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
import { useApp } from "@/components/AppProvider";
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
import type { Theme, Units } from "@/types";

export default function SettingsPage() {
  const { settings, updateSettings, toast } = useApp();
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
  async function setTheme(t: Theme) {
    await updateSettings({ theme: t });
  }

  async function doExport() {
    if (pass.length < 6) {
      toast("Passphrase must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const blob = await exportBackup(pass);
      downloadBlob(blob, backupFilename());
      toast("Backup exported");
      setExportOpen(false);
      setPass("");
    } catch {
      toast("Export failed");
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
      toast(`Restored ${res.workouts} workouts, ${res.photos} photos`);
      setImportOpen(false);
      setPass("");
      importBytes.current = null;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function enableBiometric() {
    const available = await isPlatformAuthenticatorAvailable();
    if (!available) {
      toast("Biometric authentication isn't available on this device");
      return;
    }
    try {
      const credentialId = await registerBiometric();
      await updateSettings({
        webauthnCredentialId: credentialId,
        biometricLockEnabled: true,
      });
      toast("Biometric lock enabled");
    } catch {
      toast("Could not enable biometric lock");
    }
  }
  async function disableBiometric() {
    await updateSettings({ biometricLockEnabled: false });
    toast("Biometric lock disabled");
  }

  async function saveGoal() {
    const g = parseFloat(goal);
    await updateSettings({
      bodyweightGoal: g > 0 ? toKg(g, units) : undefined,
    });
    setGoalOpen(false);
    toast(g > 0 ? "Goal updated" : "Goal cleared");
  }

  return (
    <>
      <TopBar title="Settings" back />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 20 }}>
          Settings
        </h1>

        {/* Units */}
        <Section title="Units">
          <div className="list-group">
            <div className="list-row">
              <span className="grow t-body">Weight unit</span>
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
        <Section title="Appearance">
          <div className="list-group">
            <div className="list-row col" style={{ alignItems: "stretch", gap: 10 }}>
              <span className="t-body">Theme</span>
              <div className="segmented">
                {(["system", "light", "dark"] as Theme[]).map((t) => (
                  <button key={t} className={settings.theme === t ? "on" : ""} onClick={() => setTheme(t)} style={{ textTransform: "capitalize" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Goals */}
        <Section title="Goals">
          <div className="list-group">
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={() => {
                setGoal(settings.bodyweightGoal ? String(fromKg(settings.bodyweightGoal, units)) : "");
                setGoalOpen(true);
              }}
            >
              <span className="grow t-body">Bodyweight goal</span>
              <span className="muted">
                {settings.bodyweightGoal
                  ? `${fromKg(settings.bodyweightGoal, units)} ${units === "imperial" ? "lb" : "kg"}`
                  : "Not set"}
              </span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </button>
          </div>
        </Section>

        {/* Exercises */}
        <Section title="Library">
          <div className="list-group">
            <Link href="/exercises" className="list-row list-row-tap">
              <span className="grow t-body">Exercise database</span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </Link>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="list-group">
            <div className="list-row">
              <IconFaceId style={{ width: 22, height: 22, color: "var(--primary)" }} />
              <div className="grow">
                <div className="t-body">Biometric lock</div>
                <span className="muted" style={{ fontSize: 13 }}>
                  Face ID / Touch ID to open IronLog
                </span>
              </div>
              {settings.biometricLockEnabled ? (
                <button className="btn btn-text btn-danger" onClick={disableBiometric}>
                  Disable
                </button>
              ) : (
                <button className="btn btn-text" onClick={enableBiometric}>
                  Enable
                </button>
              )}
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13, padding: "8px 4px 0" }}>
            Photos are encrypted at rest with AES-GCM. Lock requires a device
            with a platform authenticator.
          </p>
        </Section>

        {/* Data */}
        <Section title="Data">
          <div className="list-group">
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={() => setExportOpen(true)}
            >
              <IconDownload style={{ width: 22, height: 22, color: "var(--primary)" }} />
              <span className="grow t-body">Export encrypted backup</span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </button>
            <button
              className="list-row list-row-tap"
              style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              onClick={pickImportFile}
            >
              <IconUpload style={{ width: 22, height: 22, color: "var(--primary)" }} />
              <span className="grow t-body">Import backup</span>
              <IconChevron style={{ width: 18, height: 18, color: "var(--ink-muted-30)" }} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".ironlog,application/octet-stream" hidden onChange={onFile} />
        </Section>

        {/* Future (architected, disabled) */}
        <Section title="Coming soon">
          <div className="list-group">
            <div className="list-row" style={{ opacity: 0.5 }}>
              <IconLock style={{ width: 20, height: 20 }} />
              <span className="grow t-body">iCloud sync</span>
              <span className="muted" style={{ fontSize: 13 }}>Off</span>
            </div>
            <div className="list-row" style={{ opacity: 0.5 }}>
              <IconLock style={{ width: 20, height: 20 }} />
              <span className="grow t-body">Apple Health</span>
              <span className="muted" style={{ fontSize: 13 }}>Off</span>
            </div>
          </div>
        </Section>

        <p className="muted center" style={{ fontSize: 13, marginTop: 24 }}>
          IronLog · Local-first · All data stays on this device
        </p>
      </div>

      {/* Export sheet */}
      <Sheet open={exportOpen} onClose={() => setExportOpen(false)} title="Export backup">
        <div className="col gap-md">
          <p className="muted" style={{ fontSize: 14 }}>
            Choose a passphrase to encrypt your backup. You&apos;ll need it to
            restore — it can&apos;t be recovered.
          </p>
          <input
            className="input"
            type="password"
            placeholder="Passphrase (min 6 characters)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={doExport} disabled={busy}>
            {busy ? "Encrypting…" : "Export"}
          </button>
        </div>
      </Sheet>

      {/* Import sheet */}
      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="Import backup">
        <div className="col gap-md">
          <p className="muted" style={{ fontSize: 14 }}>
            This replaces all current data with the backup contents. Enter the
            passphrase used to create it.
          </p>
          <input
            className="input"
            type="password"
            placeholder="Passphrase"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={doImport} disabled={busy}>
            {busy ? "Restoring…" : "Restore"}
          </button>
        </div>
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Bodyweight goal">
        <div className="col gap-md">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={`Target (${units === "imperial" ? "lb" : "kg"})`}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={saveGoal}>
            Save
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

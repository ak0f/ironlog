"use client";

/**
 * App-wide client context: loads settings, seeds the bundled exercise pack on
 * first run, applies the theme, and exposes a toast helper. Everything below
 * the provider can assume the DB is ready.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { exerciseRepo, settingsRepo } from "@/lib/repo";
import { BUNDLED_EXERCISES } from "@/data/exercises";
import { translations, type Locale } from "@/lib/i18n";
import type { Settings } from "@/types";

interface Toast {
  id: number;
  message: string;
}

interface AppContextValue {
  settings: Settings | null;
  ready: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  toast: (message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function applyTheme(theme: Settings["theme"]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await exerciseRepo.seed(BUNDLED_EXERCISES);
        let s = await settingsRepo.get();
        // Migrate: "system" was the old default — upgrade to explicit dark.
        if (s.theme === "system") {
          s = await settingsRepo.update({ theme: "dark" });
        }
        if (cancelled) return;
        applyTheme(s.theme);
        setSettings(s);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSettings = async () => {
    const s = await settingsRepo.get();
    applyTheme(s.theme);
    setSettings(s);
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    const s = await settingsRepo.update(patch);
    applyTheme(s.theme);
    setSettings(s);
  };

  const toast = (message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  return (
    <AppContext.Provider
      value={{ settings, ready, refreshSettings, updateSettings, toast }}
    >
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/** Convenience: current units with a safe default. */
export function useUnits(): "metric" | "imperial" {
  const { settings } = useApp();
  return settings?.units ?? "metric";
}

/** Convenience: returns the full translation object for the current locale. */
export function useI18n() {
  const { settings } = useApp();
  const locale: Locale = settings?.language ?? "en";
  return translations[locale];
}

/** Convenience: current locale. */
export function useLocale(): Locale {
  const { settings } = useApp();
  return settings?.language ?? "en";
}

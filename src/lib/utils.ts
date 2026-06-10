/** Small dependency-free helpers used across the app. */

/** Cryptographically-random id (URL-safe, sortable-ish prefix by time). */
export function uid(): string {
  const ts = Date.now().toString(36);
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${ts}-${rand}`;
}

/** Start-of-day epoch ms in local time. */
export function startOfDay(d: number | Date = Date.now()): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Whole-day difference between two epochs (local). */
export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(a) - startOfDay(b)) / 86_400_000);
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** "Today", "Yesterday", "3 days ago", or a date for older. */
export function relativeDay(ts: number, locale: "en" | "de" = "en"): string {
  const diff = daysBetween(ts, Date.now());
  if (diff === 0) return locale === "de" ? "Heute" : "Today";
  if (diff === -1) return locale === "de" ? "Gestern" : "Yesterday";
  if (diff > -7 && diff < 0) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(diff, "day");
  }
  return new Date(ts).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    day: "numeric",
    year:
      new Date(ts).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}
export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Display a stored-kg weight in the user's unit, rounded sensibly. */
export function formatWeight(kg: number, units: "metric" | "imperial"): string {
  const v = units === "imperial" ? kgToLb(kg) : kg;
  const rounded = Math.round(v * 10) / 10;
  const num = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${num} ${units === "imperial" ? "lb" : "kg"}`;
}

export function unitLabel(units: "metric" | "imperial"): string {
  return units === "imperial" ? "lb" : "kg";
}

/** Convert a user-entered weight (in their unit) into stored kg. */
export function toKg(value: number, units: "metric" | "imperial"): number {
  return units === "imperial" ? lbToKg(value) : value;
}

/** Convert a stored kg value into the user's unit for editing. */
export function fromKg(kg: number, units: "metric" | "imperial"): number {
  const v = units === "imperial" ? kgToLb(kg) : kg;
  return Math.round(v * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Exponentially-weighted moving average for smoothing trend lines. */
export function ema(values: number[], alpha = 0.25): number[] {
  if (values.length === 0) return [];
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

"use client";

/**
 * Clean anatomical illustrations per muscle group. A stylised front-facing
 * torso with the active group highlighted in the brand blue — used as the
 * exercise "image" throughout (illustration style, per spec).
 */
import type { MuscleGroup } from "@/types";

const HL = "var(--primary)";
const BASE = "var(--surface-chip)";
const STROKE = "var(--ink-muted-30)";

function fill(active: MuscleGroup, group: MuscleGroup): string {
  return active === group ? HL : BASE;
}

interface Props {
  group: MuscleGroup;
  size?: number;
}

export function MuscleIllustration({ group, size = 64 }: Props) {
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={(size * 120) / 100}
      role="img"
      aria-label={`${group} illustration`}
    >
      {/* Head */}
      <circle cx="50" cy="13" r="9" fill={BASE} stroke={STROKE} strokeWidth="1" />
      {/* Neck */}
      <rect x="45" y="21" width="10" height="6" fill={BASE} />

      {/* Shoulders */}
      <path
        d="M30 30 Q50 24 70 30 L72 40 Q50 34 28 40 Z"
        fill={fill(group, "shoulders")}
        stroke={STROKE}
        strokeWidth="0.8"
      />

      {/* Chest */}
      <path
        d="M34 40 Q50 36 66 40 L64 56 Q50 62 36 56 Z"
        fill={fill(group, "chest")}
        stroke={STROKE}
        strokeWidth="0.8"
      />

      {/* Biceps (upper arms) */}
      <rect x="22" y="40" width="9" height="22" rx="4" fill={fill(group, "biceps")} stroke={STROKE} strokeWidth="0.8" />
      <rect x="69" y="40" width="9" height="22" rx="4" fill={fill(group, "biceps")} stroke={STROKE} strokeWidth="0.8" />

      {/* Triceps (forearms area as proxy) */}
      <rect x="20" y="62" width="8" height="20" rx="4" fill={fill(group, "triceps")} stroke={STROKE} strokeWidth="0.8" />
      <rect x="72" y="62" width="8" height="20" rx="4" fill={fill(group, "triceps")} stroke={STROKE} strokeWidth="0.8" />

      {/* Abs */}
      <path
        d="M40 57 L60 57 L58 78 Q50 84 42 78 Z"
        fill={fill(group, "abs")}
        stroke={STROKE}
        strokeWidth="0.8"
      />

      {/* Back (rendered as subtle side lats framing the torso) */}
      <path
        d="M33 41 L36 57 L40 57 L38 41 Z M67 41 L64 57 L60 57 L62 41 Z"
        fill={fill(group, "back")}
        stroke={STROKE}
        strokeWidth="0.6"
      />

      {/* Legs */}
      <path
        d="M40 84 Q50 88 60 84 L58 116 L52 116 L50 92 L48 116 L42 116 Z"
        fill={fill(group, "legs")}
        stroke={STROKE}
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** Compact circular badge variant for list rows. */
export function MuscleBadge({ group, size = 40 }: Props) {
  return (
    <div
      className="muscle-badge"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <MuscleIllustration group={group} size={size * 0.72} />
    </div>
  );
}

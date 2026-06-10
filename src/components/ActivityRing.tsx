"use client";

/**
 * Apple Activity–style progress ring. Single concentric ring with a rounded
 * cap, animated sweep on mount, and a glowing tip when complete. Used on the
 * dashboard for the weekly training goal — the app's signature visual.
 */
import { useEffect, useState } from "react";

interface Props {
  /** 0..1 (values > 1 overshoot the ring, capped visually at full). */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ActivityRing({
  progress,
  size = 132,
  stroke = 14,
  color = "var(--primary)",
  trackColor = "var(--fill-track)",
  children,
}: Props) {
  const [animated, setAnimated] = useState(0);
  const clamped = Math.max(0, Math.min(1, progress));

  // Animate from 0 to target on mount / change.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * animated;
  const complete = clamped >= 1;

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{
            transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)",
            filter: complete
              ? `drop-shadow(0 0 6px ${color})`
              : undefined,
          }}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

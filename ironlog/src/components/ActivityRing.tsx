"use client";

import type { ReactNode } from "react";

interface Props {
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}

export function ActivityRing({ progress, size = 100, stroke = 12, children }: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="ring-wrap" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--fill-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s var(--spring)" }}
        />
      </svg>
      {children && (
        <div className="ring-center">
          {children}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Props {
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
  const clamped = Math.max(0, Math.min(1.5, progress));

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(Math.min(1, clamped)));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * animated;
  const complete = clamped >= 1;

  /* cap-dot position at the leading edge of the arc */
  const angle = animated * 2 * Math.PI - Math.PI / 2;
  const cx = size / 2 + r * Math.cos(angle);
  const cy = size / 2 + r * Math.sin(angle);

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Progress arc */}
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
            transition: "stroke-dasharray 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: complete
              ? `drop-shadow(0 0 7px ${color})`
              : undefined,
          }}
        />
        {/* Glowing dot at leading edge */}
        {animated > 0.04 && (
          <circle
            cx={cx}
            cy={cy}
            r={stroke / 2}
            fill={color}
            style={{
              filter: `drop-shadow(0 0 4px ${color})`,
              transition: "cx 1.1s cubic-bezier(0.22,1,0.36,1), cy 1.1s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        )}
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

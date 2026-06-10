"use client";

/**
 * Dependency-free smoothed SVG trend chart. Faint raw series + EMA-smoothed
 * primary line with a gradient fill, subtle gridlines, value labels, and a
 * glowing current-value dot. Single blue accent carries the line.
 */
import { useId, useMemo } from "react";
import { ema } from "@/lib/utils";

export interface Point {
  x: number; // epoch ms
  y: number;
}

interface Props {
  points: Point[];
  height?: number;
  goal?: number;
  formatY?: (y: number) => string;
}

const W = 340;
const PAD = { top: 16, right: 10, bottom: 22, left: 10 };

function smoothPath(coords: Array<[number, number]>): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0][0]} ${coords[0][1]}`;
  let d = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function LineChart({ points, height = 160, goal, formatY }: Props) {
  const gid = useId().replace(/:/g, "");
  const model = useMemo(() => {
    const H = height;
    if (points.length === 0) return null;
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const ys = sorted.map((p) => p.y);
    const smooth = ema(ys, 0.3);
    const allY = goal != null ? [...ys, ...smooth, goal] : [...ys, ...smooth];
    let lo = Math.min(...allY);
    let hi = Math.max(...allY);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.16;
    lo -= pad;
    hi += pad;

    const xs = sorted.map((p) => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const spanX = xMax - xMin || 1;

    const px = (x: number) =>
      PAD.left + ((x - xMin) / spanX) * (W - PAD.left - PAD.right);
    const py = (y: number) =>
      PAD.top + (1 - (y - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

    const rawCoords = sorted.map((p) => [px(p.x), py(p.y)] as [number, number]);
    const smoothCoords = sorted.map(
      (p, i) => [px(p.x), py(smooth[i])] as [number, number]
    );
    const smoothD = smoothPath(smoothCoords);
    const area =
      smoothD +
      ` L ${smoothCoords[smoothCoords.length - 1][0]} ${H - PAD.bottom}` +
      ` L ${smoothCoords[0][0]} ${H - PAD.bottom} Z`;

    const gridYs = [0.5].map((f) => PAD.top + f * (H - PAD.top - PAD.bottom));

    return {
      rawPath: smoothPath(rawCoords),
      smoothPathD: smoothD,
      areaPath: area,
      last: smoothCoords[smoothCoords.length - 1],
      first: smoothCoords[0],
      gridYs,
      hiLabel: hi - pad,
      loLabel: lo + pad,
      goalY: goal != null ? py(goal) : null,
      H,
    };
  }, [points, height, goal]);

  if (!model) {
    return (
      <div className="muted center" style={{ padding: "36px 0" }}>
        No data yet
      </div>
    );
  }

  const fmt = formatY ?? ((y: number) => String(Math.round(y)));

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend chart"
    >
      <defs>
        <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridline */}
      {model.gridYs.map((gy, i) => (
        <line
          key={i}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={gy}
          y2={gy}
          stroke="var(--hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {model.goalY != null && (
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={model.goalY}
          y2={model.goalY}
          stroke="var(--good)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
      )}

      <path d={model.areaPath} fill={`url(#fill-${gid})`} />
      <path
        d={model.rawPath}
        fill="none"
        stroke="var(--ink-muted-30)"
        strokeWidth={1}
        opacity={0.45}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={model.smoothPathD}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      <circle
        cx={model.last[0]}
        cy={model.last[1]}
        r={4.5}
        fill="var(--primary)"
        stroke="var(--surface-elevated)"
        strokeWidth={2.5}
      />

      {/* value labels */}
      <text
        x={PAD.left}
        y={PAD.top - 4}
        fill="var(--ink-muted-48)"
        fontSize="10"
        fontWeight="600"
        style={{ letterSpacing: "0.2px" }}
      >
        {fmt(model.hiLabel)}
      </text>
      <text
        x={PAD.left}
        y={model.H - PAD.bottom + 14}
        fill="var(--ink-muted-48)"
        fontSize="10"
        fontWeight="600"
        style={{ letterSpacing: "0.2px" }}
      >
        {fmt(model.loLabel)}
      </text>
    </svg>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/Sheet";
import { IconChevronDown } from "@/components/Icons";
import { photoRepo } from "@/lib/repo";
import { relativeDay } from "@/lib/utils";
import type { Photo, PhotoCategory } from "@/types";

type Mode = "side" | "slider";

export default function ComparePage() {
  const metas = useLiveQuery(() => photoRepo.allMeta(), [], []);
  const [cat, setCat] = useState<PhotoCategory>("front");
  const [mode, setMode] = useState<Mode>("slider");
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [split, setSplit] = useState(50);
  const [picking, setPicking] = useState<"left" | "right" | null>(null);

  const inCat = useMemo(
    () => (metas ?? []).filter((m) => m.category === cat),
    [metas, cat]
  );

  // Default selection: oldest on left, newest on right.
  useEffect(() => {
    if (inCat.length >= 2) {
      setLeftId(inCat[inCat.length - 1].id);
      setRightId(inCat[0].id);
    } else if (inCat.length === 1) {
      setLeftId(inCat[0].id);
      setRightId(inCat[0].id);
    } else {
      setLeftId(null);
      setRightId(null);
    }
  }, [cat, metas?.length]);

  const left = inCat.find((m) => m.id === leftId) ?? null;
  const right = inCat.find((m) => m.id === rightId) ?? null;

  return (
    <>
      <TopBar title="Compare" back />
      <div className="page">
        <div className="segmented" style={{ marginBottom: 12 }}>
          {(["front", "side", "back"] as PhotoCategory[]).map((c) => (
            <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)} style={{ textTransform: "capitalize" }}>
              {c}
            </button>
          ))}
        </div>

        <div className="segmented" style={{ marginBottom: 16, width: 200, marginLeft: "auto", marginRight: "auto" }}>
          <button className={mode === "slider" ? "on" : ""} onClick={() => setMode("slider")}>
            Slider
          </button>
          <button className={mode === "side" ? "on" : ""} onClick={() => setMode("side")}>
            Side by side
          </button>
        </div>

        {inCat.length < 2 ? (
          <div className="empty">
            <p>Take at least two {cat} photos to compare your progress.</p>
          </div>
        ) : mode === "slider" ? (
          <SliderCompare
            leftId={left?.id ?? null}
            rightId={right?.id ?? null}
            split={split}
            onSplit={setSplit}
          />
        ) : (
          <div className="row gap-sm" style={{ alignItems: "stretch" }}>
            <ComparePane id={left?.id ?? null} />
            <ComparePane id={right?.id ?? null} />
          </div>
        )}

        {/* Selectors */}
        <div className="row gap-sm" style={{ marginTop: 16 }}>
          <Selector label="Before" meta={left} onTap={() => setPicking("left")} />
          <Selector label="After" meta={right} onTap={() => setPicking("right")} />
        </div>
      </div>

      <Sheet open={!!picking} onClose={() => setPicking(null)} title="Choose photo">
        <PickerList
          metas={inCat}
          onPick={(id) => {
            if (picking === "left") setLeftId(id);
            else setRightId(id);
            setPicking(null);
          }}
        />
      </Sheet>
    </>
  );
}

function Selector({
  label,
  meta,
  onTap,
}: {
  label: string;
  meta: Omit<Photo, "blob"> | null;
  onTap: () => void;
}) {
  return (
    <button className="btn btn-ghost grow row-between" onClick={onTap} style={{ justifyContent: "space-between" }}>
      <span className="col" style={{ alignItems: "flex-start" }}>
        <span className="muted" style={{ fontSize: 12 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {meta ? relativeDay(meta.date) : "—"}
        </span>
      </span>
      <IconChevronDown style={{ width: 18, height: 18, color: "var(--ink-muted-48)" }} />
    </button>
  );
}

function usePhotoUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    if (id) {
      void photoRepo.objectUrl(id).then((x) => {
        u = x;
        setUrl(x);
      });
    } else setUrl(null);
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return url;
}

function ComparePane({ id }: { id: string | null }) {
  const url = usePhotoUrl(id);
  return (
    <div className="img-surface grow" style={{ aspectRatio: "3 / 4" }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </div>
  );
}

function SliderCompare({
  leftId,
  rightId,
  split,
  onSplit,
}: {
  leftId: string | null;
  rightId: string | null;
  split: number;
  onSplit: (n: number) => void;
}) {
  const leftUrl = usePhotoUrl(leftId);
  const rightUrl = usePhotoUrl(rightId);
  return (
    <div className="compare-wrap" style={{ ["--split" as string]: `${split}%` }}>
      {rightUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="compare-img" src={rightUrl} alt="After" />
      )}
      {leftUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="compare-img compare-top" src={leftUrl} alt="Before" />
      )}
      <div className="compare-handle" />
      <div className="compare-knob">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" />
        </svg>
      </div>
      <input
        className="compare-range"
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => onSplit(Number(e.target.value))}
        aria-label="Compare slider"
      />
    </div>
  );
}

function PickerList({
  metas,
  onPick,
}: {
  metas: Array<Omit<Photo, "blob">>;
  onPick: (id: string) => void;
}) {
  return (
    <div className="photo-grid">
      {metas.map((m) => (
        <PickerThumb key={m.id} meta={m} onPick={() => onPick(m.id)} />
      ))}
    </div>
  );
}

function PickerThumb({
  meta,
  onPick,
}: {
  meta: Omit<Photo, "blob">;
  onPick: () => void;
}) {
  const url = usePhotoUrl(meta.id);
  return (
    <button className="photo-cell" onClick={onPick} style={{ border: "none", padding: 0 }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" />
      )}
      <span className="photo-cell-date">{relativeDay(meta.date)}</span>
    </button>
  );
}

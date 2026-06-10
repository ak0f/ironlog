"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/Sheet";
import { IconChevronDown } from "@/components/Icons";
import { useI18n, useLocale } from "@/components/AppProvider";
import { photoRepo } from "@/lib/repo";
import { relativeDay } from "@/lib/utils";
import type { Photo, PhotoCategory } from "@/types";

type Mode = "side" | "slider";

export default function ComparePage() {
  const t = useI18n();
  const locale = useLocale();
  const metas = useLiveQuery(() => photoRepo.allMeta(), [], []);
  const [cat, setCat] = useState<PhotoCategory>("front");
  const [mode, setMode] = useState<Mode>("slider");
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [split, setSplit] = useState(50);
  const [picking, setPicking] = useState<"left" | "right" | null>(null);

  const CATS: { key: PhotoCategory; label: string }[] = [
    { key: "front", label: t.photos.front },
    { key: "side", label: t.photos.side },
    { key: "back", label: t.photos.back },
  ];

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
      <TopBar title={t.photos.compareTitle} back />
      <div className="page">
        <div className="segmented" style={{ marginBottom: 12 }}>
          {CATS.map((c) => (
            <button
              key={c.key}
              className={cat === c.key ? "on" : ""}
              onClick={() => setCat(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div
          className="segmented"
          style={{ marginBottom: 16, width: 200, marginLeft: "auto", marginRight: "auto" }}
        >
          <button className={mode === "slider" ? "on" : ""} onClick={() => setMode("slider")}>
            {t.photos.slider}
          </button>
          <button className={mode === "side" ? "on" : ""} onClick={() => setMode("side")}>
            {t.photos.sideBySide}
          </button>
        </div>

        {inCat.length < 2 ? (
          <div className="empty">
            <p>{t.photos.needTwo(cat)}</p>
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
          <Selector
            label={t.photos.before}
            meta={left}
            onTap={() => setPicking("left")}
            locale={locale}
          />
          <Selector
            label={t.photos.after}
            meta={right}
            onTap={() => setPicking("right")}
            locale={locale}
          />
        </div>
      </div>

      <Sheet open={!!picking} onClose={() => setPicking(null)} title={t.photos.choosePhoto}>
        <PickerList
          metas={inCat}
          onPick={(id) => {
            if (picking === "left") setLeftId(id);
            else setRightId(id);
            setPicking(null);
          }}
          locale={locale}
        />
      </Sheet>
    </>
  );
}

function Selector({
  label,
  meta,
  onTap,
  locale,
}: {
  label: string;
  meta: Omit<Photo, "blob"> | null;
  onTap: () => void;
  locale: string;
}) {
  return (
    <button
      className="btn btn-ghost grow row-between"
      onClick={onTap}
      style={{ justifyContent: "space-between" }}
    >
      <span className="col" style={{ alignItems: "flex-start" }}>
        <span className="muted" style={{ fontSize: 12 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {meta ? relativeDay(meta.date, locale as "en" | "de") : "—"}
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
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
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
  locale,
}: {
  metas: Array<Omit<Photo, "blob">>;
  onPick: (id: string) => void;
  locale: string;
}) {
  return (
    <div className="photo-grid">
      {metas.map((m) => (
        <PickerThumb key={m.id} meta={m} onPick={() => onPick(m.id)} locale={locale} />
      ))}
    </div>
  );
}

function PickerThumb({
  meta,
  onPick,
  locale,
}: {
  meta: Omit<Photo, "blob">;
  onPick: () => void;
  locale: string;
}) {
  const url = usePhotoUrl(meta.id);
  return (
    <button className="photo-cell" onClick={onPick} style={{ border: "none", padding: 0 }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" />
      )}
      <span className="photo-cell-date">{relativeDay(meta.date, locale as "en" | "de")}</span>
    </button>
  );
}

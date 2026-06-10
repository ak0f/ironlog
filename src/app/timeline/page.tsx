"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { MuscleBadge } from "@/components/MuscleIllustration";
import {
  IconCamera,
  IconDumbbell,
  IconScale,
  IconTimeline,
  IconTrophy,
} from "@/components/Icons";
import { useUnits } from "@/components/AppProvider";
import { buildTimeline, photoRepo } from "@/lib/repo";
import { formatWeight, relativeDay } from "@/lib/utils";
import type {
  BodyweightEntry,
  PRRecord,
  Photo,
  TimelineEvent,
  TimelineEventType,
  Workout,
} from "@/types";

const FILTERS: { key: TimelineEventType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "workout", label: "Workouts" },
  { key: "pr", label: "PRs" },
  { key: "bodyweight", label: "Weight" },
  { key: "photo", label: "Photos" },
];

const PAGE = 20;

export default function TimelinePage() {
  const units = useUnits();
  const events = useLiveQuery(() => buildTimeline(), [], []);
  const [filter, setFilter] = useState<TimelineEventType | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(
    () => (events ?? []).filter((e) => filter === "all" || e.type === filter),
    [events, filter]
  );
  const visible = filtered.slice(0, limit);

  useEffect(() => {
    setLimit(PAGE);
  }, [filter]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        setLimit((l) => (l < filtered.length ? l + PAGE : l));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [filtered.length]);

  return (
    <>
      <TopBar title="Timeline" />
      <div className="page">
        <h1 className="t-hero enter" style={{ marginBottom: 14 }}>
          Timeline
        </h1>
        <div className="chip-row" style={{ marginBottom: 20 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip${filter === f.key ? " chip-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <IconTimeline className="empty-icon" />
            <p>Nothing here yet. Your activity will appear in this feed.</p>
          </div>
        ) : (
          <div className="col stagger" style={{ gap: 10 }}>
            {visible.map((ev) => (
              <TimelineRow key={ev.id} event={ev} units={units} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TimelineRow({
  event,
  units,
}: {
  event: TimelineEvent;
  units: "metric" | "imperial";
}) {
  if (event.type === "workout") {
    const w = event.ref as Workout;
    const groups = Array.from(new Set(w.exercises.map((e) => e.muscleGroup)));
    return (
      <Link href={`/workout/view?id=${w.id}`} className="card card-tap" style={{ display: "block", padding: "14px 16px" }}>
        <div className="row gap-sm" style={{ alignItems: "center" }}>
          <Bullet color="var(--primary)">
            <IconDumbbell style={{ width: 19, height: 19 }} />
          </Bullet>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="t-headline" style={{ fontSize: 15, marginBottom: 1 }}>
              {w.title}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {w.exercises.length} exercises ·{" "}
              {w.exercises.reduce((n, e) => n + e.sets.length, 0)} sets
            </span>
          </div>
          <div className="row" style={{ gap: 3 }}>
            {groups.slice(0, 2).map((g) => (
              <MuscleBadge key={g} group={g} size={26} />
            ))}
          </div>
          <Day ts={event.date} />
        </div>
      </Link>
    );
  }

  if (event.type === "pr") {
    const pr = event.ref as PRRecord;
    return (
      <div className="card" style={{ padding: "14px 16px" }}>
        <div className="row gap-sm" style={{ alignItems: "center" }}>
          <Bullet color="var(--pr-gold)">
            <IconTrophy style={{ width: 19, height: 19 }} />
          </Bullet>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="t-headline" style={{ fontSize: 15, marginBottom: 1 }}>
              {pr.exerciseName}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {prLabel(pr, units)}
            </span>
          </div>
          <span
            className={`pr-badge pr-type-${pr.type}`}
            style={{ flexShrink: 0 }}
          >
            {pr.type}
          </span>
          <Day ts={event.date} />
        </div>
      </div>
    );
  }

  if (event.type === "bodyweight") {
    const b = event.ref as BodyweightEntry;
    return (
      <div className="card" style={{ padding: "14px 16px" }}>
        <div className="row gap-sm" style={{ alignItems: "center" }}>
          <Bullet color="var(--good)">
            <IconScale style={{ width: 19, height: 19 }} />
          </Bullet>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="t-headline" style={{ fontSize: 15, marginBottom: 1 }}>
              {formatWeight(b.weight, units)}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              Bodyweight{b.calories ? ` · ${b.calories} kcal` : ""}
            </span>
          </div>
          <Day ts={event.date} />
        </div>
      </div>
    );
  }

  const ph = event.ref as Photo;
  return <PhotoRow photo={ph} ts={event.date} />;
}

function PhotoRow({ photo, ts }: { photo: Photo; ts: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    void photoRepo.objectUrl(photo.id).then((x) => {
      u = x;
      setUrl(x);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [photo.id]);
  return (
    <Link href="/photos" className="card card-tap" style={{ display: "block", padding: "14px 16px" }}>
      <div className="row gap-sm" style={{ alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 52,
            borderRadius: "var(--r-sm)",
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--surface-chip)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <IconCamera
              style={{ width: 16, height: 16, color: "var(--ink-muted-30)" }}
            />
          )}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="t-headline" style={{ fontSize: 15, textTransform: "capitalize", marginBottom: 1 }}>
            {photo.category} photo
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            Progress photo
          </span>
        </div>
        <Day ts={ts} />
      </div>
    </Link>
  );
}

function Bullet({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "var(--r-md)",
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function Day({ ts }: { ts: number }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: "var(--ink-muted-48)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {relativeDay(ts)}
    </span>
  );
}

function prLabel(pr: PRRecord, units: "metric" | "imperial"): string {
  if (pr.type === "weight") return `Top weight · ${formatWeight(pr.weight, units)}`;
  if (pr.type === "reps") return `Rep PR · ${pr.reps} reps`;
  return `Volume PR · ${formatWeight(pr.weight, units)} × ${pr.reps}`;
}

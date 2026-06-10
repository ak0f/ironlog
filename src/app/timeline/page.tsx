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
import { useI18n, useLocale, useUnits } from "@/components/AppProvider";
import type { Locale } from "@/types";
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

const PAGE = 20;

export default function TimelinePage() {
  const units = useUnits();
  const t = useI18n();
  const locale = useLocale();
  const events = useLiveQuery(() => buildTimeline(), [], []);
  const [filter, setFilter] = useState<TimelineEventType | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const FILTERS: { key: TimelineEventType | "all"; label: string }[] = [
    { key: "all", label: t.timeline.all },
    { key: "workout", label: t.timeline.workouts },
    { key: "pr", label: t.timeline.prs },
    { key: "bodyweight", label: t.timeline.weight },
    { key: "photo", label: t.timeline.photos },
  ];

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
      <TopBar title={t.timeline.title} />
      <div className="page">
        <h1 className="t-hero enter" style={{ marginBottom: 14 }}>
          {t.timeline.title}
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
            <p>{t.timeline.empty}</p>
          </div>
        ) : (
          <div className="col stagger" style={{ gap: 10 }}>
            {visible.map((ev) => (
              <TimelineRow key={ev.id} event={ev} units={units} locale={locale} t={t} />
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
  locale,
  t,
}: {
  event: TimelineEvent;
  units: "metric" | "imperial";
  locale: Locale;
  t: ReturnType<typeof useI18n>;
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
              {t.workout.exercises(w.exercises.length)} ·{" "}
              {t.workout.sets(w.exercises.reduce((n, e) => n + e.sets.length, 0))}
            </span>
          </div>
          <div className="row" style={{ gap: 3 }}>
            {groups.slice(0, 2).map((g) => (
              <MuscleBadge key={g} group={g} size={26} />
            ))}
          </div>
          <Day ts={event.date} locale={locale} />
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
              {prLabel(pr, units, t)}
            </span>
          </div>
          <span
            className={`pr-badge pr-type-${pr.type}`}
            style={{ flexShrink: 0 }}
          >
            {pr.type}
          </span>
          <Day ts={event.date} locale={locale} />
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
              {t.timeline.bodyweight}{b.calories ? ` · ${b.calories} ${t.timeline.kcal}` : ""}
            </span>
          </div>
          <Day ts={event.date} locale={locale} />
        </div>
      </div>
    );
  }

  const ph = event.ref as Photo;
  return <PhotoRow photo={ph} ts={event.date} locale={locale} t={t} />;
}

function PhotoRow({ photo, ts, locale, t }: { photo: Photo; ts: number; locale: Locale; t: ReturnType<typeof useI18n> }) {
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
            {photo.category} {t.timeline.photos.toLowerCase().replace(/s$/, "")}
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {t.timeline.progressPhoto}
          </span>
        </div>
        <Day ts={ts} locale={locale} />
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

function Day({ ts, locale }: { ts: number; locale: Locale }) {
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
      {relativeDay(ts, locale)}
    </span>
  );
}

function prLabel(pr: PRRecord, units: "metric" | "imperial", t: ReturnType<typeof useI18n>): string {
  if (pr.type === "weight") return `${t.pr.topWeight} · ${formatWeight(pr.weight, units)}`;
  if (pr.type === "reps") return `${t.pr.repPR} · ${pr.reps} ${t.common.reps.toLowerCase()}`;
  return `${t.pr.volume} · ${formatWeight(pr.weight, units)} × ${pr.reps}`;
}

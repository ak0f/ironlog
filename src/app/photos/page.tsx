"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TopBar } from "@/components/TopBar";
import { Camera } from "@/components/Camera";
import { Sheet } from "@/components/Sheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { IconCamera, IconTrash, IconUpload } from "@/components/Icons";
import { useApp, useI18n, useLocale } from "@/components/AppProvider";
import { photoRepo } from "@/lib/repo";
import { processFile, type ProcessedPhoto } from "@/lib/photo";
import { relativeDay } from "@/lib/utils";
import type { Photo, PhotoCategory } from "@/types";

export default function PhotosPage() {
  const { toast } = useApp();
  const t = useI18n();
  const locale = useLocale();
  const metas = useLiveQuery(() => photoRepo.allMeta(), [], []);
  const [cat, setCat] = useState<PhotoCategory | "all">("all");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [viewer, setViewer] = useState<Omit<Photo, "blob"> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const CATS: { key: PhotoCategory | "all"; label: string }[] = [
    { key: "all", label: t.photos.all },
    { key: "front", label: t.photos.front },
    { key: "side", label: t.photos.side },
    { key: "back", label: t.photos.back },
  ];

  const filtered = useMemo(
    () => (metas ?? []).filter((m) => cat === "all" || m.category === cat),
    [metas, cat]
  );

  async function onCapture(processed: ProcessedPhoto, category: PhotoCategory) {
    await photoRepo.create(
      {
        category,
        date: Date.now(),
        width: processed.width,
        height: processed.height,
      },
      processed.blob
    );
    setCameraOpen(false);
    toast(t.photos.photoSaved);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const processed = await processFile(file);
    await photoRepo.create(
      {
        category: cat === "all" ? "front" : cat,
        date: Date.now(),
        width: processed.width,
        height: processed.height,
      },
      processed.blob
    );
    e.target.value = "";
    toast(t.photos.photoAdded);
  }

  return (
    <>
      <TopBar
        title={t.photos.title}
        right={
          <div className="row gap-xs">
            <Link href="/photos/compare" className="btn btn-text" style={{ fontSize: 15 }}>
              {t.photos.compare}
            </Link>
          </div>
        }
      />
      <div className="page">
        <h1 className="t-hero" style={{ marginBottom: 14 }}>
          {t.photos.title}
        </h1>

        <div className="row gap-sm" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-primary grow"
            onClick={() => setCameraOpen(true)}
          >
            <IconCamera style={{ width: 20, height: 20 }} /> {t.photos.takePhoto}
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} aria-label="Upload">
            <IconUpload style={{ width: 20, height: 20 }} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onUpload}
          />
        </div>

        <div className="chip-row" style={{ marginBottom: 16 }}>
          {CATS.map((c) => (
            <button
              key={c.key}
              className={`chip${cat === c.key ? " chip-active" : ""}`}
              onClick={() => setCat(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <IconCamera className="empty-icon" />
            <p>{t.photos.empty}</p>
          </div>
        ) : (
          <div className="photo-grid">
            {filtered.map((m) => (
              <PhotoThumb key={m.id} meta={m} onOpen={() => setViewer(m)} locale={locale} />
            ))}
          </div>
        )}
      </div>

      <Camera
        open={cameraOpen}
        initialCategory={cat === "all" ? "front" : cat}
        onClose={() => setCameraOpen(false)}
        onCapture={onCapture}
      />

      <PhotoViewer
        meta={viewer}
        onClose={() => setViewer(null)}
        onDeleted={() => setViewer(null)}
        locale={locale}
      />
    </>
  );
}

function PhotoThumb({
  meta,
  onOpen,
  locale,
}: {
  meta: Omit<Photo, "blob">;
  onOpen: () => void;
  locale: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    void photoRepo.objectUrl(meta.id).then((x) => {
      u = x;
      setUrl(x);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [meta.id]);
  return (
    <button className="photo-cell" onClick={onOpen} style={{ border: "none", padding: 0 }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${meta.category} progress`} loading="lazy" />
      )}
      <span className="photo-cell-date">{relativeDay(meta.date, locale as "en" | "de")}</span>
    </button>
  );
}

function PhotoViewer({
  meta,
  onClose,
  onDeleted,
  locale,
}: {
  meta: Omit<Photo, "blob"> | null;
  onClose: () => void;
  onDeleted: () => void;
  locale: string;
}) {
  const t = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let u: string | null = null;
    if (meta) {
      void photoRepo.objectUrl(meta.id).then((x) => {
        u = x;
        setUrl(x);
      });
    }
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [meta?.id]);

  async function remove() {
    if (!meta) return;
    await photoRepo.remove(meta.id);
    onDeleted();
  }

  return (
    <>
      <Sheet
        open={!!meta}
        onClose={onClose}
        title={
          meta
            ? `${meta.category[0].toUpperCase()}${meta.category.slice(1)} · ${relativeDay(meta.date, locale as "en" | "de")}`
            : ""
        }
      >
        {url && (
          <div className="img-surface" style={{ marginBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Progress" style={{ width: "100%", display: "block" }} />
          </div>
        )}
        <button
          className="btn btn-ghost btn-danger btn-block"
          onClick={() => setConfirmOpen(true)}
        >
          <IconTrash style={{ width: 20, height: 20 }} /> {t.photos.deleteBtn}
        </button>
      </Sheet>

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        title={t.photos.deleteConfirm}
        danger
      />
    </>
  );
}

"use client";

/**
 * Full-screen progress-photo camera.
 *  - Live front/back camera via getUserMedia.
 *  - 3-2-1 countdown shutter.
 *  - Ghost overlay of the previous photo in the same category for alignment.
 *  - Pose alignment guide (centre + thirds).
 * Captured frames are compressed to WebP by the caller-supplied onCapture.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { IconClose } from "./Icons";
import { captureFrame, type ProcessedPhoto } from "@/lib/photo";
import { photoRepo } from "@/lib/repo";
import type { PhotoCategory } from "@/types";

const CATEGORIES: PhotoCategory[] = ["front", "side", "back"];

interface Props {
  open: boolean;
  initialCategory?: PhotoCategory;
  onClose: () => void;
  onCapture: (photo: ProcessedPhoto, category: PhotoCategory) => void;
}

export function Camera({ open, initialCategory = "front", onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [category, setCategory] = useState<PhotoCategory>(initialCategory);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [count, setCount] = useState<number | null>(null);
  const [ghostUrl, setGhostUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1707 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch {
      setError("Camera unavailable. Grant permission or upload a photo instead.");
    }
  }, [facing]);

  // Start / restart on open + facing change.
  useEffect(() => {
    if (!open) return;
    void start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  // Load ghost (latest in category) for alignment.
  useEffect(() => {
    if (!open) return;
    let url: string | null = null;
    void photoRepo.byCategory(category).then(async (list) => {
      if (list[0]) {
        url = await photoRepo.objectUrl(list[0].id);
        setGhostUrl(url);
      } else {
        setGhostUrl(null);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, category]);

  const mirror = facing === "user";

  async function shoot() {
    if (!videoRef.current || !ready || count !== null) return;
    // 3-2-1 countdown.
    for (let n = 3; n >= 1; n--) {
      setCount(n);
      await new Promise((r) => setTimeout(r, 800));
    }
    setCount(null);
    const processed = await captureFrame(videoRef.current, mirror);
    onCapture(processed, category);
  }

  if (!open) return null;

  return (
    <div className="camera-stage">
      <div className="camera-video-wrap">
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          style={{ transform: mirror ? "scaleX(-1)" : undefined }}
        />
        {ghostUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="camera-ghost" src={ghostUrl} alt="" />
        )}

        {/* Pose alignment guide */}
        <svg className="camera-guide" viewBox="0 0 100 133" preserveAspectRatio="none">
          <line x1="33.3" y1="0" x2="33.3" y2="133" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.3" />
          <line x1="66.6" y1="0" x2="66.6" y2="133" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.3" />
          <line x1="0" y1="44.3" x2="100" y2="44.3" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.3" />
          <line x1="0" y1="88.6" x2="100" y2="88.6" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.3" />
          <line x1="50" y1="0" x2="50" y2="133" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.3" strokeDasharray="2 2" />
        </svg>

        {count !== null && <div className="camera-countdown">{count}</div>}

        <button
          className="btn btn-icon-circular"
          onClick={() => {
            stop();
            onClose();
          }}
          aria-label="Close camera"
          style={{
            position: "absolute",
            top: "calc(16px + var(--safe-top))",
            left: 16,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconClose style={{ width: 24, height: 24 }} />
        </button>

        {error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              textAlign: "center",
              padding: 32,
              background: "rgba(0,0,0,0.7)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div className="camera-cat">
        <div className="segmented" style={{ width: 240 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={category === c ? "on" : ""}
              onClick={() => setCategory(c)}
              style={{ textTransform: "capitalize" }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="camera-controls">
        <button
          className="btn btn-text"
          style={{ color: "#fff", width: 64 }}
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        >
          Flip
        </button>
        <button
          className="shutter"
          onClick={shoot}
          disabled={!ready || count !== null}
          aria-label="Capture photo"
        />
        <div style={{ width: 64 }} />
      </div>
    </div>
  );
}

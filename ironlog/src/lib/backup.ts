/**
 * Export / Import — full encrypted backup.
 *
 * Format: a ZIP archive containing `data.json` (the structured dataset) plus
 * `photos/<id>.webp` (decrypted image bytes). The whole ZIP is then encrypted
 * with AES-GCM using a user passphrase (see crypto.ts) and written as a single
 * `.ironlog` file. Import decrypts, unzips, validates with Zod, and restores.
 *
 * Versioned via `schemaVersion` so future migrations can transform on import.
 */
import JSZip from "jszip";
import { db } from "./db";
import { decryptBlobAtRest, decryptBytes, encryptBytes } from "./crypto";
import { exportPayloadSchema, SCHEMA_VERSION } from "./schema";
import type { ExportPayload, Photo } from "@/types";
import type { StoredPhoto } from "./db";

const MAGIC = "IRONLOG1"; // header so we can detect/validate our own files

export interface ImportResult {
  exercises: number;
  workouts: number;
  templates: number;
  bodyweight: number;
  prs: number;
  photos: number;
}

/** Build the encrypted backup blob. */
export async function exportBackup(passphrase: string): Promise<Blob> {
  const d = db();
  const [exercises, workouts, templates, bodyweight, prs, settings, photos] =
    await Promise.all([
      d.exercises.toArray(),
      d.workouts.toArray(),
      d.templates.toArray(),
      d.bodyweight.toArray(),
      d.prs.toArray(),
      d.settings.get("singleton"),
      d.photos.toArray(),
    ]);

  const zip = new JSZip();
  const photoDir = zip.folder("photos")!;

  const photoIndex: ExportPayload["data"]["photoIndex"] = [];
  for (const p of photos) {
    const file = `${p.id}.webp`;
    const plain = await decryptBlobAtRest(p.blob);
    photoDir.file(file, plain);
    const { blob: _b, ...meta } = p;
    photoIndex.push({ ...meta, file: `photos/${file}` });
  }

  const payload: ExportPayload = {
    app: "IronLog",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    data: {
      exercises,
      workouts,
      templates,
      bodyweight,
      prs,
      settings: settings ?? null,
      photoIndex,
    },
  };

  zip.file("data.json", JSON.stringify(payload));
  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const encrypted = await encryptBytes(zipBytes, passphrase);
  // Prepend magic header (plaintext) so import can sanity-check the file.
  const magicBytes = new TextEncoder().encode(MAGIC);
  const out = new Uint8Array(magicBytes.length + encrypted.length);
  out.set(magicBytes, 0);
  out.set(encrypted, magicBytes.length);

  return new Blob([out as BlobPart], { type: "application/octet-stream" });
}

/** Decrypt + restore a backup. Replaces existing data (full restore). */
export async function importBackup(
  fileBytes: ArrayBuffer,
  passphrase: string,
  mode: "replace" | "merge" = "replace"
): Promise<ImportResult> {
  const all = new Uint8Array(fileBytes);
  const magic = new TextDecoder().decode(all.slice(0, MAGIC.length));
  if (magic !== MAGIC) {
    throw new Error("Not a valid IronLog backup file.");
  }
  const envelope = all.slice(MAGIC.length);

  let zipBytes: Uint8Array;
  try {
    zipBytes = await decryptBytes(envelope, passphrase);
  } catch {
    throw new Error("Wrong passphrase or corrupted file.");
  }

  const zip = await JSZip.loadAsync(zipBytes);
  const dataFile = zip.file("data.json");
  if (!dataFile) throw new Error("Backup is missing data.json.");
  const json = JSON.parse(await dataFile.async("string"));
  const parsed = exportPayloadSchema.parse(json);

  // Re-import photos: read bytes, re-encrypt at rest on this device.
  const { encryptBlobAtRest } = await import("./crypto");
  const storedPhotos: StoredPhoto[] = [];
  for (const meta of parsed.data.photoIndex) {
    const entry = zip.file(meta.file);
    if (!entry) continue;
    const bytes = await entry.async("uint8array");
    const blob = new Blob([bytes as BlobPart], { type: "image/webp" });
    const encrypted = await encryptBlobAtRest(blob);
    const { file: _f, ...photoMeta } = meta;
    storedPhotos.push({ ...(photoMeta as Omit<Photo, "blob">), blob: encrypted });
  }

  const d = db();
  await d.transaction(
    "rw",
    [d.exercises, d.workouts, d.templates, d.bodyweight, d.prs, d.photos, d.settings],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          d.exercises.clear(),
          d.workouts.clear(),
          d.templates.clear(),
          d.bodyweight.clear(),
          d.prs.clear(),
          d.photos.clear(),
        ]);
      }
      await d.exercises.bulkPut(parsed.data.exercises);
      await d.workouts.bulkPut(parsed.data.workouts);
      await d.templates.bulkPut(parsed.data.templates);
      await d.bodyweight.bulkPut(parsed.data.bodyweight);
      await d.prs.bulkPut(parsed.data.prs);
      await d.photos.bulkPut(storedPhotos);
      if (parsed.data.settings) await d.settings.put(parsed.data.settings);
    }
  );

  return {
    exercises: parsed.data.exercises.length,
    workouts: parsed.data.workouts.length,
    templates: parsed.data.templates.length,
    bodyweight: parsed.data.bodyweight.length,
    prs: parsed.data.prs.length,
    photos: storedPhotos.length,
  };
}

/** Trigger a browser download of the backup blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `ironlog-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.ironlog`;
}

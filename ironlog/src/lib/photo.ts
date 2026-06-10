/**
 * Photo processing — capture a video frame and compress to WebP.
 *
 * Compression keeps IndexedDB small (and the at-rest encryption fast). We cap
 * the long edge so portrait gym photos stay light while remaining sharp.
 */

const MAX_EDGE = 1280;
const QUALITY = 0.82;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/webp",
      QUALITY
    );
  });
}

/** Draw a video element's current frame, downscale, and return a WebP blob. */
export async function captureFrame(
  video: HTMLVideoElement,
  mirror = false
): Promise<ProcessedPhoto> {
  return processSource(video, video.videoWidth, video.videoHeight, mirror);
}

/** Process an arbitrary image source (video/image) into a compressed WebP. */
async function processSource(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  mirror: boolean
): Promise<ProcessedPhoto> {
  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, w, h);
  const blob = await canvasToWebp(canvas);
  return { blob, width: w, height: h };
}

/** Compress an uploaded File (gallery import) to WebP. */
export async function processFile(file: File): Promise<ProcessedPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return processSource(img, img.naturalWidth, img.naturalHeight, false);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

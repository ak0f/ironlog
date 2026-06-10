/**
 * Generates PWA PNG icons with zero image dependencies.
 * Draws the IronLog mark: a white dumbbell on the brand-blue tile.
 * Pure Node: rasterises RGBA in JS, encodes PNG via zlib.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BLUE = [0, 102, 204];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function rounded(x, y, w, h, cx, cy, rw, rh, radius) {
  // distance to nearest corner region for rounded rect membership
  const left = cx - rw / 2,
    right = cx + rw / 2,
    top = cy - rh / 2,
    bottom = cy + rh / 2;
  if (x < left || x > right || y < top || y > bottom) return false;
  const ix = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const iy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
  const dx = x - ix,
    dy = y - iy;
  return dx * dx + dy * dy <= radius * radius;
}

function drawIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2,
    cy = size / 2;
  // Dumbbell geometry scaled to icon
  const handleW = size * 0.42,
    handleH = size * 0.085;
  const innerPlateW = size * 0.085,
    innerPlateH = size * 0.30;
  const outerPlateW = size * 0.085,
    outerPlateH = size * 0.20;
  const innerGap = size * 0.20; // distance from center to inner plate center
  const outerGap = size * 0.27;
  const tileRadius = maskable ? size : size * 0.22; // maskable = full bleed square-ish

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let col = BLUE;
      let alpha = 255;

      const inTile = maskable
        ? true
        : rounded(x, y, 0, 0, cx, cy, size, size, tileRadius);
      if (!inTile) {
        alpha = 0;
      }

      // dumbbell parts (white)
      const onHandle = rounded(x, y, 0, 0, cx, cy, handleW, handleH, handleH / 2);
      const onInnerL = rounded(x, y, 0, 0, cx - innerGap, cy, innerPlateW, innerPlateH, size * 0.02);
      const onInnerR = rounded(x, y, 0, 0, cx + innerGap, cy, innerPlateW, innerPlateH, size * 0.02);
      const onOuterL = rounded(x, y, 0, 0, cx - outerGap, cy, outerPlateW, outerPlateH, size * 0.02);
      const onOuterR = rounded(x, y, 0, 0, cx + outerGap, cy, outerPlateW, outerPlateH, size * 0.02);
      if (alpha && (onHandle || onInnerL || onInnerR || onOuterL || onOuterR)) {
        col = WHITE;
      }

      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = alpha;
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url);

writeFileSync(out("icon-192.png"), drawIcon(192, false));
writeFileSync(out("icon-512.png"), drawIcon(512, false));
writeFileSync(out("icon-maskable-512.png"), drawIcon(512, true));
writeFileSync(out("apple-touch-icon.png"), drawIcon(180, true));
writeFileSync(new URL("../public/apple-touch-icon.png", import.meta.url), drawIcon(180, true));

console.log("Icons generated.");

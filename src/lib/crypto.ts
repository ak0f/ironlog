/**
 * WebCrypto AES-GCM encryption layer.
 *
 * Used to:
 *  1. Encrypt sensitive blobs (progress photos) at rest in IndexedDB.
 *  2. Encrypt the full dataset export (password-derived key).
 *
 * Keys are derived with PBKDF2 from a passphrase. For at-rest photo
 * encryption the app derives a device key from a stored random secret so
 * that photos are never written as plaintext, while the export flow uses a
 * user-supplied passphrase so the archive is portable and self-contained.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const base64 = { encode: toBase64, decode: fromBase64 };

async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Envelope: [salt(16)][iv(12)][ciphertext]. Returns combined bytes. */
export async function encryptBytes(
  plaintext: ArrayBuffer | Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const data =
    plaintext instanceof Uint8Array ? plaintext : new Uint8Array(plaintext);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  const ctBytes = new Uint8Array(ct);
  const out = new Uint8Array(salt.length + iv.length + ctBytes.length);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(ctBytes, salt.length + iv.length);
  return out;
}

export async function decryptBytes(
  envelope: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  const salt = envelope.slice(0, SALT_BYTES);
  const iv = envelope.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ct = envelope.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource
  );
  return new Uint8Array(pt);
}

export async function encryptString(
  text: string,
  passphrase: string
): Promise<Uint8Array> {
  return encryptBytes(enc.encode(text), passphrase);
}

export async function decryptString(
  envelope: Uint8Array,
  passphrase: string
): Promise<string> {
  const bytes = await decryptBytes(envelope, passphrase);
  return dec.decode(bytes);
}

/**
 * Device secret: a persistent random passphrase kept in localStorage, used to
 * derive the at-rest key for photo blobs. This keeps photo bytes encrypted in
 * IndexedDB without prompting the user. (For a higher security bar this could
 * be wrapped behind the WebAuthn PRF extension — architected, see SECURITY.md.)
 */
const DEVICE_SECRET_KEY = "ironlog.deviceSecret";

export function getDeviceSecret(): string {
  if (typeof localStorage === "undefined") return "ironlog-fallback-secret";
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = toBase64(bytes);
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  return secret;
}

export async function encryptBlobAtRest(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const envelope = await encryptBytes(buf, getDeviceSecret());
  return new Blob([envelope as BlobPart], { type: "application/octet-stream" });
}

export async function decryptBlobAtRest(
  encrypted: Blob,
  mime = "image/webp"
): Promise<Blob> {
  const buf = new Uint8Array(await encrypted.arrayBuffer());
  const plain = await decryptBytes(buf, getDeviceSecret());
  return new Blob([plain as BlobPart], { type: mime });
}

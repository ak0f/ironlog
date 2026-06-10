/**
 * WebAuthn biometric gate (Face ID / Touch ID).
 *
 * This is a *local* authenticator binding — there is no server. We register a
 * platform credential and, on each app open, require a `get()` assertion to
 * unlock the UI. The credential id is stored in settings so we can scope the
 * assertion. This proves user presence + biometric, gating access to the app
 * shell; it is not a cryptographic data key (the at-rest photo key is separate,
 * see crypto.ts — and SECURITY.md describes upgrading to the WebAuthn PRF
 * extension to derive the data key from the biometric).
 */
import { base64 } from "./crypto";

const RP_NAME = "IronLog";

function rpId(): string {
  // Platform credentials are scoped to the effective domain.
  return typeof location !== "undefined" ? location.hostname : "localhost";
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof PublicKeyCredential !== "undefined" &&
    !!navigator.credentials
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Register a platform credential. Returns the base64url credential id. */
export async function registerBiometric(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: rpId() },
      user: {
        id: userId,
        name: "ironlog-local",
        displayName: "IronLog",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("Registration cancelled");
  return base64.encode(new Uint8Array(cred.rawId));
}

/** Verify the user via biometric assertion. Returns true on success. */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: rpId(),
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [
          {
            type: "public-key",
            id: base64.decode(credentialId) as BufferSource,
          },
        ],
      },
    })) as PublicKeyCredential | null;
    return !!assertion;
  } catch {
    return false;
  }
}

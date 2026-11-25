import { b64url, hmac, randomToken, safeEqual, sha256 } from './crypto.ts';

export const POW_BITS = 15;
export const POW_TTL_MS = 10 * 60 * 1000;
export const POW_MIN_AGE_MS = 1500;

export function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) { bits += 8; continue; }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

export interface IssuedChallenge { challenge: string; salt: string; bits: number; expires: number; }

/** challenge = v1.<issuedAt>.<salt>.<bits>.<signature>; the signature stops clients from inventing their own easier challenges. */
export async function issueChallenge(secret: string, now = Date.now(), bits = POW_BITS): Promise<IssuedChallenge> {
  const salt = randomToken(12);
  const body = `v1.${now}.${salt}.${bits}`;
  const sig = b64url(await hmac(secret, body));
  return { challenge: `${body}.${sig}`, salt, bits, expires: now + POW_TTL_MS };
}

export type PowResult = { ok: true; salt: string; expires: number } | { ok: false; reason: 'format' | 'signature' | 'expired' | 'too-fast' | 'work' };

export async function checkSolution(secret: string, challenge: unknown, nonce: unknown, now = Date.now()): Promise<PowResult> {
  if (typeof challenge !== 'string' || typeof nonce !== 'string' || nonce.length > 24 || challenge.length > 200) return { ok: false, reason: 'format' };
  const parts = challenge.split('.');
  if (parts.length !== 5 || parts[0] !== 'v1') return { ok: false, reason: 'format' };
  const [, issuedText, salt, bitsText, sig] = parts;
  const issued = Number(issuedText), bits = Number(bitsText);
  if (!Number.isInteger(issued) || !Number.isInteger(bits) || bits < 8 || bits > 24) return { ok: false, reason: 'format' };
  const expected = b64url(await hmac(secret, `v1.${issuedText}.${salt}.${bitsText}`));
  if (!(await safeEqual(expected, sig))) return { ok: false, reason: 'signature' };
  if (now - issued > POW_TTL_MS || issued > now + 5000) return { ok: false, reason: 'expired' };
  if (now - issued < POW_MIN_AGE_MS) return { ok: false, reason: 'too-fast' };
  const digest = await sha256(`${challenge}:${nonce}`);
  if (leadingZeroBits(digest) < bits) return { ok: false, reason: 'work' };
  return { ok: true, salt, expires: issued + POW_TTL_MS };
}

/** Reference solver used by tests; the browser client uses the same hash input. */
export async function solve(challenge: string, bits: number, limit = 5_000_000): Promise<string> {
  for (let n = 0; n < limit; n++) {
    if (leadingZeroBits(await sha256(`${challenge}:${n}`)) >= bits) return String(n);
  }
  throw new Error('no solution');
}

/** Browser solver: hashes batches in parallel; the hash input is exactly `${challenge}:${nonce}`. */
export async function solveParallel(challenge: string, bits: number, batch = 256, limit = 8_000_000): Promise<string> {
  for (let start = 0; start < limit; start += batch) {
    const digests = await Promise.all(Array.from({ length: batch }, (_, i) => sha256(`${challenge}:${start + i}`)));
    const hit = digests.findIndex(d => leadingZeroBits(d) >= bits);
    if (hit >= 0) return String(start + hit);
  }
  throw new Error('no solution');
}

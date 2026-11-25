import { b64url, fromB64url, safeEqual, sha256 } from './crypto.ts';

const decoder = new TextDecoder();

interface ClientData { type: string; challenge: string; origin: string; crossOrigin?: boolean }

function readClientData(clientDataJSON: Uint8Array): ClientData | null {
  try {
    const data = JSON.parse(decoder.decode(clientDataJSON));
    return data && typeof data === 'object' ? data : null;
  } catch { return null; }
}

/** Converts an ASN.1 DER ECDSA signature to the raw r||s form that Web Crypto expects. */
export function derToRaw(der: Uint8Array, size = 32): Uint8Array | null {
  if (der.length < 8 || der[0] !== 0x30) return null;
  let i = 2;
  if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
  const out = new Uint8Array(size * 2);
  for (let part = 0; part < 2; part++) {
    if (der[i] !== 0x02) return null;
    let length = der[i + 1];
    let start = i + 2;
    if (start + length > der.length) return null;
    while (length > 0 && der[start] === 0) { start++; length--; }
    if (length > size) return null;
    out.set(der.subarray(start, start + length), part * size + (size - length));
    i = start + length;
  }
  return out;
}

export interface RegistrationInput { id: string; publicKey: string; clientDataJSON: string }

export async function verifyRegistration(input: RegistrationInput, challenge: string, origin: string) {
  if (!input || typeof input.id !== 'string' || typeof input.publicKey !== 'string' || typeof input.clientDataJSON !== 'string') return { ok: false as const, reason: 'format' };
  if (!/^[A-Za-z0-9_-]{16,1400}$/.test(input.id) || input.publicKey.length > 400) return { ok: false as const, reason: 'format' };
  let data: ClientData | null;
  let spki: Uint8Array;
  try {
    data = readClientData(fromB64url(input.clientDataJSON));
    spki = fromB64url(input.publicKey);
  } catch { return { ok: false as const, reason: 'format' }; }
  if (!data || data.type !== 'webauthn.create') return { ok: false as const, reason: 'type' };
  if (!(await safeEqual(String(data.challenge), challenge))) return { ok: false as const, reason: 'challenge' };
  if (data.origin !== origin || data.crossOrigin === true) return { ok: false as const, reason: 'origin' };
  try {
    await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  } catch { return { ok: false as const, reason: 'key' }; }
  return { ok: true as const, id: input.id, publicKey: input.publicKey };
}

export interface AssertionInput { id: string; clientDataJSON: string; authenticatorData: string; signature: string }
export interface StoredKey { publicKey: string; counter: number }

export async function verifyAssertion(input: AssertionInput, challenge: string, origin: string, rpId: string, stored: StoredKey) {
  try {
    const clientDataBytes = fromB64url(input.clientDataJSON);
    const authData = fromB64url(input.authenticatorData);
    const signature = fromB64url(input.signature);
    const data = readClientData(clientDataBytes);
    if (!data || data.type !== 'webauthn.get') return { ok: false as const, reason: 'type' };
    if (!(await safeEqual(String(data.challenge), challenge))) return { ok: false as const, reason: 'challenge' };
    if (data.origin !== origin || data.crossOrigin === true) return { ok: false as const, reason: 'origin' };
    if (authData.length < 37) return { ok: false as const, reason: 'format' };
    const rpHash = await sha256(rpId);
    if (!(await safeEqual(b64url(authData.subarray(0, 32)), b64url(rpHash)))) return { ok: false as const, reason: 'rp' };
    const flags = authData[32];
    if (!(flags & 0x01) || !(flags & 0x04)) return { ok: false as const, reason: 'presence' };
    const counter = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0);
    if ((counter !== 0 || stored.counter !== 0) && counter <= stored.counter) return { ok: false as const, reason: 'counter' };
    const raw = derToRaw(signature);
    if (!raw) return { ok: false as const, reason: 'signature' };
    const key = await crypto.subtle.importKey('spki', fromB64url(stored.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const signed = new Uint8Array(authData.length + 32);
    signed.set(authData, 0);
    signed.set(await sha256(clientDataBytes), authData.length);
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, raw, signed);
    return valid ? { ok: true as const, counter } : { ok: false as const, reason: 'signature' };
  } catch { return { ok: false as const, reason: 'format' }; }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { b64url, fromB64url, safeEqual, sha256 } from '../src/worker/crypto.ts';
import { checkSolution, issueChallenge, leadingZeroBits, solve } from '../src/worker/pow.ts';
import { clean, parseMessage } from '../src/worker/validate.ts';
import { derToRaw, verifyAssertion, verifyRegistration } from '../src/worker/webauthn.ts';
import { readCookie, readJson, sameOrigin } from '../src/worker/http.ts';
import { addrBucket } from '../src/worker/net.ts';
import { router } from '../src/worker/router.ts';

const secret = 'test-secret';

test('proof of work accepts a real solution once the minimum age has passed', async () => {
  const t0 = 1_000_000;
  const issued = await issueChallenge(secret, t0, 10);
  const nonce = await solve(issued.challenge, 10);
  assert.deepEqual(await checkSolution(secret, issued.challenge, nonce, t0 + 100), { ok: false, reason: 'too-fast' });
  const ok = await checkSolution(secret, issued.challenge, nonce, t0 + 3000);
  assert.equal(ok.ok, true);
  assert.equal(ok.salt, issued.salt);
});

test('proof of work rejects forged, expired and weak solutions', async () => {
  const t0 = 5_000_000;
  const issued = await issueChallenge(secret, t0, 12);
  const nonce = await solve(issued.challenge, 12);
  assert.equal((await checkSolution('other-secret', issued.challenge, nonce, t0 + 3000)).reason, 'signature');
  const easier = issued.challenge.replace('.12.', '.8.');
  assert.equal((await checkSolution(secret, easier, nonce, t0 + 3000)).reason, 'signature');
  assert.equal((await checkSolution(secret, issued.challenge, nonce, t0 + 11 * 60_000)).reason, 'expired');
  const weak = await sha256(`${issued.challenge}:x`);
  if (leadingZeroBits(weak) < 12) assert.equal((await checkSolution(secret, issued.challenge, 'x', t0 + 3000)).reason, 'work');
  assert.equal((await checkSolution(secret, 42, 'x')).reason, 'format');
});

test('leadingZeroBits counts across byte boundaries', () => {
  assert.equal(leadingZeroBits(new Uint8Array([0, 0, 0x10])), 19);
  assert.equal(leadingZeroBits(new Uint8Array([0x80])), 0);
  assert.equal(leadingZeroBits(new Uint8Array([0, 0xff])), 8);
});

test('message validation trims, limits and flags spam without losing real text', () => {
  const ok = parseMessage({ name: '  Ada   Lovelace ', contact: 'ada@example.org', message: 'Hello,\r\n\r\n你好 — great work.', public: true, lang: 'zh', website: '' });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.name, 'Ada Lovelace');
  assert.equal(ok.value.body, 'Hello,\n\n你好 — great work.');
  assert.equal(ok.value.wantPublic, true);
  assert.equal(ok.value.lang, 'zh');
  assert.deepEqual(ok.value.spamSignals, []);
  assert.equal(parseMessage({ message: ' ' }).error, 'empty');
  assert.equal(parseMessage({ message: 'x'.repeat(2001) }).error, 'too-long');
  assert.equal(parseMessage({ message: 'hi there', contact: '<script>' }).error, 'bad-contact');
  assert.equal(parseMessage('nope').error, 'format');
  assert.equal(parseMessage({ message: 'hi there', website: 'http://spam' }).value.honeypot, true);
  const spam = parseMessage({ message: 'see http://a.com http://b.com http://c.com' });
  assert.deepEqual(spam.value.spamSignals, ['links']);
  assert.equal(parseMessage({ message: 'x'.repeat(2000) }).ok, true);
  assert.equal(clean('a‮b\u0000c', 10), 'abc');
  assert.equal(clean('😀'.repeat(5), 3), '😀😀😀');
  assert.equal(parseMessage({ message: 'public by default?' }).value.wantPublic, false);
});

test('cookies and origins', () => {
  const request = new Request('https://donglinli.com/api/x', { method: 'POST', headers: { cookie: 'a=1; __Host-dl_desk=tok; b=2', origin: 'https://donglinli.com' } });
  assert.equal(readCookie(request, '__Host-dl_desk'), 'tok');
  assert.equal(readCookie(request, 'missing'), null);
  assert.equal(sameOrigin(request, 'https://donglinli.com'), true);
  assert.equal(sameOrigin(new Request('https://donglinli.com/', { headers: { origin: 'https://evil.example' } }), 'https://donglinli.com'), false);
  assert.equal(sameOrigin(new Request('https://donglinli.com/'), 'https://donglinli.com'), false);
});

test('safeEqual compares whole strings', async () => {
  assert.equal(await safeEqual('abc', 'abc'), true);
  assert.equal(await safeEqual('abc', 'abd'), false);
  assert.equal(await safeEqual('abc', 'abcd'), false);
});

// ---- WebAuthn with a software authenticator ----
const origin = 'https://donglinli.com', rpId = 'donglinli.com';
const enc = new TextEncoder();

function rawToDer(raw) {
  const part = bytes => {
    let i = 0; while (i < bytes.length - 1 && bytes[i] === 0) i++;
    let v = bytes.slice(i); if (v[0] & 0x80) v = Uint8Array.from([0, ...v]);
    return Uint8Array.from([0x02, v.length, ...v]);
  };
  const r = part(raw.slice(0, 32)), s = part(raw.slice(32));
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s]);
}

async function authenticator() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
  async function assert_(challenge, { counter = 1, flags = 0x05, rp = rpId, org = origin, type = 'webauthn.get' } = {}) {
    const authData = new Uint8Array(37);
    authData.set(await sha256(rp), 0); authData[32] = flags;
    new DataView(authData.buffer).setUint32(33, counter);
    const clientDataJSON = enc.encode(JSON.stringify({ type, challenge, origin: org }));
    const signed = new Uint8Array([...authData, ...(await sha256(clientDataJSON))]);
    const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, signed));
    return { id: 'cred', clientDataJSON: b64url(clientDataJSON), authenticatorData: b64url(authData), signature: b64url(rawToDer(raw)) };
  }
  return { publicKey: b64url(spki), assert: assert_ };
}

test('a valid passkey assertion verifies and the counter must advance', async () => {
  const a = await authenticator();
  const stored = { publicKey: a.publicKey, counter: 0 };
  const good = await verifyAssertion(await a.assert('chal'), 'chal', origin, rpId, stored);
  assert.deepEqual(good, { ok: true, counter: 1 });
  assert.equal((await verifyAssertion(await a.assert('chal', { counter: 1 }), 'chal', origin, rpId, { ...stored, counter: 1 })).reason, 'counter');
  assert.equal((await verifyAssertion(await a.assert('chal', { counter: 0 }), 'chal', origin, rpId, stored)).ok, true); // synced passkeys keep the counter at zero
});

test('assertions are rejected for the wrong challenge, origin, site, presence or key', async () => {
  const a = await authenticator(), b = await authenticator();
  const stored = { publicKey: a.publicKey, counter: 0 };
  assert.equal((await verifyAssertion(await a.assert('one'), 'two', origin, rpId, stored)).reason, 'challenge');
  assert.equal((await verifyAssertion(await a.assert('c', { org: 'https://evil.example' }), 'c', origin, rpId, stored)).reason, 'origin');
  assert.equal((await verifyAssertion(await a.assert('c', { rp: 'evil.example' }), 'c', origin, rpId, stored)).reason, 'rp');
  assert.equal((await verifyAssertion(await a.assert('c', { flags: 0x01 }), 'c', origin, rpId, stored)).reason, 'presence');
  assert.equal((await verifyAssertion(await a.assert('c', { type: 'webauthn.create' }), 'c', origin, rpId, stored)).reason, 'type');
  assert.equal((await verifyAssertion(await b.assert('c'), 'c', origin, rpId, stored)).reason, 'signature');
  const tampered = await a.assert('c');
  const sig = fromB64url(tampered.signature); sig[sig.length - 1] ^= 1;
  assert.equal((await verifyAssertion({ ...tampered, signature: b64url(sig) }, 'c', origin, rpId, stored)).ok, false);
  assert.equal((await verifyAssertion({ id: 'x' }, 'c', origin, rpId, stored)).ok, false);
});

test('registration checks the ceremony and that the key is a P-256 key', async () => {
  const a = await authenticator();
  const clientDataJSON = b64url(enc.encode(JSON.stringify({ type: 'webauthn.create', challenge: 'reg', origin })));
  assert.equal((await verifyRegistration({ id: 'c'.repeat(22), publicKey: a.publicKey, clientDataJSON }, 'reg', origin)).ok, true);
  assert.equal((await verifyRegistration({ id: 'c'.repeat(22), publicKey: a.publicKey, clientDataJSON }, 'other', origin)).reason, 'challenge');
  assert.equal((await verifyRegistration({ id: 'c'.repeat(22), publicKey: a.publicKey, clientDataJSON }, 'reg', 'https://evil.example')).reason, 'origin');
  assert.equal((await verifyRegistration({ id: 'c'.repeat(22), publicKey: b64url(enc.encode('not a key')), clientDataJSON }, 'reg', origin)).reason, 'key');
  assert.equal((await verifyRegistration({ id: 'c'.repeat(22), publicKey: a.publicKey, clientDataJSON: b64url(enc.encode(JSON.stringify({ type: 'webauthn.get', challenge: 'reg', origin }))) }, 'reg', origin)).reason, 'type');
});

test('DER signatures with leading zeros and short integers convert to 64 bytes', () => {
  const raw = new Uint8Array(64); raw[0] = 0x80; raw[63] = 1;
  assert.deepEqual([...derToRaw(rawToDer(raw))], [...raw]);
  const small = new Uint8Array(64); small[31] = 5; small[63] = 7;
  assert.deepEqual([...derToRaw(rawToDer(small))], [...small]);
  assert.equal(derToRaw(new Uint8Array([1, 2, 3])), null);
});

test('registration refuses credential ids that could not be removed again', async () => {
  const a = await authenticator();
  const clientDataJSON = b64url(enc.encode(JSON.stringify({ type: 'webauthn.create', challenge: 'reg', origin })));
  for (const id of ['x.y', 'a+b/c=d' + 'e'.repeat(12), 'short', 'a'.repeat(1401)]) {
    assert.equal((await verifyRegistration({ id, publicKey: a.publicKey, clientDataJSON }, 'reg', origin)).reason, 'format', id);
  }
});

test('IPv6 addresses are limited per /64 and IPv4 per address', () => {
  assert.equal(addrBucket('203.0.113.9'), '203.0.113.9');
  assert.equal(addrBucket('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), '2001:0db8:0001:0002::/64');
  assert.equal(addrBucket('2001:db8:1:2:1::1'), '2001:0db8:0001:0002::/64');
  assert.equal(addrBucket('2001:DB8::1'), '2001:0db8:0000:0000::/64');
  assert.equal(addrBucket('::1'), '0000:0000:0000:0000::/64');
  assert.equal(addrBucket('::ffff:198.51.100.7'), '198.51.100.7');
});

test('JSON bodies are capped while streaming, with or without a declared length', async () => {
  const json = { 'content-type': 'application/json' };
  const make = (body, headers = json) => new Request('https://x.test/', { method: 'POST', headers, body });
  assert.deepEqual(await readJson(make('{"a":1}')), { a: 1 });
  assert.equal(await readJson(make('{"a":"' + 'x'.repeat(100) + '"}'), 50), null);
  assert.equal(await readJson(make('{"a":1}', { 'content-type': 'text/plain' })), null);
  assert.equal(await readJson(make('[1]')), null);
  assert.equal(await readJson(make('not json')), null);
  const stream = new ReadableStream({ start(c) { for (let i = 0; i < 10; i++) c.enqueue(enc.encode('x'.repeat(100))); c.close(); } });
  const chunked = new Request('https://x.test/', { method: 'POST', headers: json, body: stream, duplex: 'half' });
  assert.equal(await readJson(chunked, 300), null, 'a chunked body without content-length is cut off at the limit');
});

test('router blocks /desk/ and gates all /api/desk/* routes behind Cloudflare Access headers while keeping public APIs open', async () => {
  let hubHits = 0;
  const env = {
    ORIGIN: 'https://donglinli.com',
    PGR_ORIGIN: 'https://pgr.donglinli.com',
    ASSETS: { async fetch() { return new Response('asset', { status: 200 }); } },
    HUB: { idFromName: () => 'id', get: () => ({ async fetch() { hubHits += 1; return new Response('{}', { status: 200 }); } }) },
  };

  for (const deskPath of ['/desk', '/desk/', '/desk/desk.js']) {
    const res = await router.fetch(new Request('https://donglinli.com' + deskPath), env);
    assert.equal(res.status, 404, deskPath);
  }

  const deskApiPaths = [
    ['GET', '/api/desk/state'],
    ['POST', '/api/desk/login/key'],
    ['POST', '/api/desk/login/password'],
    ['GET', '/api/desk/login/passkey-options'],
    ['POST', '/api/desk/login/passkey'],
    ['POST', '/api/desk/logout'],
    ['POST', '/api/desk/logout-all'],
    ['GET', '/api/desk/overview'],
    ['GET', '/api/desk/passkeys'],
    ['GET', '/api/desk/passkeys/options'],
    ['PUT', '/api/desk/password'],
    ['GET', '/api/desk/messages'],
    ['GET', '/api/desk/export'],
    ['GET', '/api/desk/feedback'],
    ['GET', '/api/desk/feedback/export'],
    ['GET', '/api/desk/tasks'],
    ['POST', '/api/desk/tasks/clear-done'],
    ['GET', '/api/desk/note'],
  ];
  for (const [method, path] of deskApiPaths) {
    const headers = method === 'GET' ? {} : { origin: 'https://donglinli.com' };
    const res = await router.fetch(new Request('https://donglinli.com' + path, { method, headers }), env);
    assert.equal(res.status, 403, `${method} ${path} must fail closed without Access headers`);
  }
  assert.equal(hubHits, 0, 'unauthenticated /api/desk/* requests must not reach Durable Object');

  assert.equal((await router.fetch(new Request('https://donglinli.com/api/wall'), env)).status, 200);
  assert.equal((await router.fetch(new Request('https://donglinli.com/api/message/challenge'), env)).status, 200);
  assert.equal(hubHits, 2);
});

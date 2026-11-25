// Live API check against `npm run preview` (wrangler dev) with the .dev.vars from README. Not part of `node --test`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solveParallel } from '../src/worker/pow.ts';

const base = process.env.BASE || 'http://localhost:8787';
const origin = process.env.ORIGIN || base;
const key = process.env.DESK_KEY || 'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(path, { method = 'GET', body, cookie, headers = {}, raw } = {}) {
  const res = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(method !== 'GET' ? { origin } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let data = null; try { data = JSON.parse(text); } catch {}
  return { status: res.status, data, res, text };
}

async function submit(fields) {
  const { data: c } = await call('/api/message/challenge');
  const nonce = await solveParallel(c.challenge, c.bits);
  await sleep(1600);
  return call('/api/message', { method: 'POST', body: { ...fields, pow: { challenge: c.challenge, nonce } } });
}

// --- public side
let r = await call('/api/message', { method: 'POST', body: { message: 'no proof of work here' } });
assert.equal(r.status, 400); assert.equal(r.data.error, 'challenge');
r = await call('/api/message', { method: 'POST', headers: { origin: 'https://evil.example' }, body: { message: 'cross-site' } });
assert.equal(r.status, 403);

r = await submit({ name: 'Ada', contact: 'ada@example.org', message: 'Hello from the API test, private.', public: false, lang: 'en' });
assert.equal(r.status, 200, r.text);
r = await submit({ name: 'Grace', contact: 'grace@example.org', message: '你好，这是一条愿意公开的留言。', public: true, lang: 'zh' });
assert.equal(r.status, 200, r.text);
r = await submit({ name: 'Bot', message: 'spam spam spam http://a.test http://b.test http://c.test', public: true });
assert.equal(r.status, 200);
r = await submit({ name: 'Honey', message: 'I am a bot', website: 'filled' });
assert.equal(r.status, 200);

// the same proof of work cannot be reused
const { data: c } = await call('/api/message/challenge');
const nonce = await solveParallel(c.challenge, c.bits); await sleep(1600);
const first = await call('/api/message', { method: 'POST', body: { message: 'one use only', pow: { challenge: c.challenge, nonce } } });
const again = await call('/api/message', { method: 'POST', body: { message: 'second use', pow: { challenge: c.challenge, nonce } } });
assert.equal(first.status, 200); assert.equal(again.status, 400); assert.equal(again.data.reason, 'reused');

r = await call('/api/wall');
assert.equal(r.status, 200); assert.deepEqual(r.data.messages, [], 'nothing is public before approval');

// --- desk is closed without a session
for (const p of ['/api/desk/messages', '/api/desk/tasks', '/api/desk/export', '/api/desk/overview', '/api/desk/note']) assert.equal((await call(p)).status, 401, p);
r = await call('/api/desk/login/key', { method: 'POST', body: { key: 'WRONG-KEY' } });
assert.equal(r.status, 401);

// --- login with the access key
r = await call('/api/desk/login/key', { method: 'POST', body: { key } });
assert.equal(r.status, 200, r.text);
const setCookie = r.res.headers.get('set-cookie');
assert.match(setCookie, /^__Host-dl_desk=[\w-]{40,}; Path=\/; Secure; HttpOnly; SameSite=Strict/);
const cookie = setCookie.split(';')[0];

r = await call('/api/desk/messages?filter=all', { cookie });
assert.equal(r.status, 200);
const byName = n => r.data.messages.find(m => m.name === n);
assert.equal(r.data.messages.length, 4, 'Ada, Grace, the spam and the single-use probe; the honeypot one is not stored');
assert.ok(!byName('Honey'));
assert.equal(byName('Bot').status, 'spam');
assert.equal(byName('Ada').wantPublic, false);
assert.equal(r.data.counts.unread, 3);
const ada = byName('Ada'), grace = byName('Grace');

// private message can never be published
r = await call('/api/desk/messages/' + ada.id, { method: 'PATCH', cookie, body: { approved: true } });
assert.equal(r.status, 400); assert.equal(r.data.error, 'not-public');
// public one: approve + reply
r = await call('/api/desk/messages/' + grace.id, { method: 'PATCH', cookie, body: { approved: true, reply: '谢谢你！' } });
assert.equal(r.status, 200); assert.equal(r.data.message.approved, true); assert.equal(r.data.message.status, 'read');
r = await call('/api/wall');
assert.equal(r.data.messages.length, 1);
assert.equal(r.data.messages[0].name, 'Grace'); assert.equal(r.data.messages[0].reply, '谢谢你！');
assert.ok(!('contact' in r.data.messages[0]), 'contact is never public');
// spam/archive pulls it back off the wall
r = await call('/api/desk/messages/' + grace.id, { method: 'PATCH', cookie, body: { status: 'archived' } });
assert.equal(r.data.message.approved, false);
assert.equal((await call('/api/wall')).data.messages.length, 0);

r = await call('/api/desk/messages?filter=all&q=' + encodeURIComponent('100%_'), { cookie });
assert.equal(r.data.messages.length, 0, 'LIKE wildcards are escaped');
r = await call('/api/desk/messages?filter=inbox&q=Hello', { cookie });
assert.equal(r.data.messages.length, 1);

// export neutralises spreadsheet formulas
await submit({ name: '=HYPERLINK("x")', message: 'formula injection check' });
r = await call('/api/desk/export?format=csv', { cookie, raw: true });
const csv = await r.text();
assert.match(csv, /"'=HYPERLINK/); assert.match(r.headers.get('content-disposition'), /messages\.csv/);

// --- tasks and note
r = await call('/api/desk/tasks', { method: 'POST', cookie, body: { text: '  写论文  ', due: '2030-01-01' } });
assert.equal(r.data.tasks[0].text, '写论文');
const id = r.data.tasks[0].id;
r = await call('/api/desk/tasks/' + id, { method: 'PATCH', cookie, body: { done: true } });
assert.equal(r.data.tasks[0].done, true);
r = await call('/api/desk/tasks/clear-done', { method: 'POST', cookie, body: {} });
assert.equal(r.data.tasks.length, 0);
r = await call('/api/desk/note', { method: 'PUT', cookie, body: { text: 'hello\nworld' } });
assert.equal(r.status, 200);
assert.equal((await call('/api/desk/note', { cookie })).data.text, 'hello\nworld');

// --- PGR feedback box. wrangler dev passes cf-connecting-ip through, which stands in for separate senders;
// in production Cloudflare sets that header itself.
const A = '203.0.113.10', B = '198.51.100.20', C = '203.0.113.30';
const from = ip => ({ 'cf-connecting-ip': ip });
async function feedback(fields, ip = A) {
  const { data: c } = await call('/api/feedback/challenge', { headers: from(ip) });
  const nonce = await solveParallel(c.challenge, c.bits);
  await sleep(1600);
  return call('/api/feedback', { method: 'POST', headers: from(ip), body: { ...fields, pow: { challenge: c.challenge, nonce } } });
}
r = await call('/api/feedback/challenge', { headers: from(A) });
assert.equal(r.status, 200); assert.equal(r.data.bits, 15, 'base difficulty while the box is quiet');
r = await call('/api/feedback/challenge', { headers: { ...from(A), 'sec-fetch-site': 'cross-site' } });
assert.equal(r.status, 403, 'other sites cannot spend a visitor’s challenge allowance');
r = await call('/api/feedback', { method: 'POST', body: { category: 'other', message: 'no proof of work here' } });
assert.equal(r.status, 400); assert.equal(r.data.error, 'challenge');
r = await call('/api/feedback', { method: 'POST', headers: { origin: 'https://evil.example' }, body: { category: 'other', message: 'cross-site' } });
assert.equal(r.status, 403);
r = await call('/api/feedback', { method: 'POST', headers: { origin: '' }, body: { category: 'other', message: 'no origin' } });
assert.equal(r.status, 403);
for (const [fields, error] of [
  [{ message: 'no topic' }, 'category'], [{ category: 'constructor', message: 'not a topic' }, 'category'], [{ category: 'other', message: '  ' }, 'empty'],
  [{ category: 'other', message: 'x'.repeat(3001) }, 'too-long'], [{ category: 'other', message: 'hello', email: 'not-an-email' }, 'bad-email'],
  [{ category: 'other', message: 'x'.repeat(25000) }, 'format'], // larger than the 20 KB body cap
]) {
  r = await call('/api/feedback', { method: 'POST', body: fields });
  assert.equal(r.status, 400, JSON.stringify(fields).slice(0, 60)); assert.equal(r.data.error, error);
}
const deskText = 'Desk space in the PGR office runs out by 10am on most weekdays.';
r = await feedback({ category: 'facilities', message: deskText });
assert.equal(r.status, 200, r.text);
r = await feedback({ category: 'supervision', message: 'Supervision meeting notes template would help.', name: '=HYPERLINK("x")', email: 'pgr@example.org', quote: true });
assert.equal(r.status, 200, r.text);
r = await feedback({ category: 'facilities', message: deskText });
assert.equal(r.status, 200, 'a resend by the same sender is accepted once'); // and neither stored nor counted
r = await feedback({ category: 'other', message: 'I am a bot', website: 'filled' });
assert.equal(r.status, 200, 'the honeypot is told it worked');
r = await feedback({ category: 'wellbeing', message: '希望每学期有一次面向博士生的身心健康讲座。', quote: true });
assert.equal(r.status, 200, r.text);
r = await feedback({ category: 'events', message: 'A fourth submission within the hour.' });
assert.equal(r.status, 429); assert.equal(r.data.error, 'rate', 'tests-e2e/.dev.vars sets FEEDBACK_PER_HOUR=3');
r = await feedback({ category: 'facilities', message: deskText }, B);
assert.equal(r.status, 200, 'the same text from another sender is kept');
r = await feedback({ category: 'other', message: 'cheap http://a.test http://b.test http://c.test' }, B);
assert.equal(r.status, 200);
{ // a proof of work is spent once, across the message board and the feedback box
  const { data: c } = await call('/api/feedback/challenge', { headers: from(C) });
  assert.equal(c.bits, 16, 'five items in the last hour add one bit of work');
  const nonce = await solveParallel(c.challenge, c.bits); await sleep(1600);
  const body = { category: 'events', message: 'Single-use proof check.', pow: { challenge: c.challenge, nonce } };
  assert.equal((await call('/api/feedback', { method: 'POST', headers: from(C), body })).status, 200);
  const again = await call('/api/feedback', { method: 'POST', headers: from(C), body: { ...body, message: 'second use' } });
  assert.equal(again.status, 400); assert.equal(again.data.reason, 'reused');
}

// owner side: closed without a session
for (const [p, method] of [['/api/desk/feedback', 'GET'], ['/api/desk/feedback/export?format=csv', 'GET'], ['/api/desk/feedback/export?format=md', 'GET'], ['/api/desk/feedback/1', 'PATCH'], ['/api/desk/feedback/1', 'DELETE']]) {
  assert.equal((await call(p, { method, body: method === 'PATCH' ? { status: 'handled' } : undefined })).status, 401, method + ' ' + p);
}
r = await call('/api/desk/feedback', { cookie });
assert.equal(r.status, 200);
assert.equal(r.data.feedback.length, 5, 'new by default: three from A, one from B, one from C; the resend, honeypot and spam are not listed');
assert.equal(r.data.counts.unhandled, 5); assert.equal(r.data.counts.status.spam, 1); assert.equal(r.data.counts.status.all, 5);
for (const item of r.data.feedback) assert.deepEqual(Object.keys(item).sort(), ['body', 'category', 'createdAt', 'email', 'handledAt', 'id', 'mayQuote', 'name', 'note', 'status']);
const fbByText = t => r.data.feedback.filter(f => f.body.startsWith(t));
assert.equal(fbByText('Desk space').length, 2);
const anonymous = fbByText('Desk space')[0], sup = fbByText('Supervision')[0];
assert.equal(anonymous.name, ''); assert.equal(anonymous.email, ''); assert.equal(anonymous.mayQuote, false);
assert.equal(sup.email, 'pgr@example.org'); assert.equal(sup.mayQuote, true);
assert.equal((await call('/api/desk/feedback?status=all&category=facilities', { cookie })).data.feedback.length, 2);
assert.equal((await call('/api/desk/feedback?status=all&category=facilities', { cookie })).data.counts.category.wellbeing, 1, 'topic counts ignore the topic filter');
assert.equal((await call('/api/desk/feedback?status=all&category=__proto__', { cookie })).data.feedback.length, 5, 'unknown topics are ignored');
assert.equal((await call('/api/desk/feedback?status=spam', { cookie })).data.feedback.length, 1);

r = await call('/api/desk/feedback/' + sup.id, { method: 'PATCH', cookie, body: { status: 'handled', note: '  Raised at the\r\nstaff-student meeting  ' } });
assert.equal(r.status, 200, r.text);
assert.equal(r.data.item.status, 'handled'); assert.equal(typeof r.data.item.handledAt, 'number');
assert.equal(r.data.item.note, 'Raised at the\nstaff-student meeting'); assert.equal(r.data.unhandled, 4);
assert.equal((await call('/api/desk/feedback/' + sup.id, { method: 'PATCH', cookie, body: { status: 'closed' } })).status, 400);
assert.equal((await call('/api/desk/feedback/' + sup.id, { method: 'PATCH', cookie, body: { note: 5 } })).status, 400);
assert.equal((await call('/api/desk/feedback/' + sup.id, { method: 'PATCH', cookie, body: {} })).status, 400);
assert.equal((await call('/api/desk/feedback/999999', { method: 'PATCH', cookie, body: { status: 'handled' } })).status, 404);
assert.equal((await call('/api/desk/feedback/' + sup.id, { method: 'PATCH', cookie, headers: { origin: 'https://evil.example' }, body: { status: 'new' } })).status, 403);
assert.equal((await call('/api/desk/feedback?status=handled', { cookie })).data.feedback.length, 1);
r = await call('/api/desk/feedback/' + anonymous.id, { method: 'PATCH', cookie, body: { note: 'y'.repeat(2500) } });
assert.equal(r.data.item.note.length, 2000, 'notes are capped');

r = await call('/api/desk/feedback/export?format=csv', { cookie, raw: true });
let text = await r.text();
assert.match(r.headers.get('content-type'), /text\/csv/); assert.match(r.headers.get('content-disposition'), /pgr-feedback\.csv/);
assert.match(text, /"'=HYPERLINK/); assert.ok(text.includes('pgr@example.org') && text.includes('staff-student meeting'));
assert.ok(!text.includes('http://a.test'), 'spam is left out of the default export');
r = await call('/api/desk/feedback/export?format=md&category=supervision', { cookie, raw: true });
text = await r.text();
assert.match(r.headers.get('content-type'), /text\/markdown/); assert.match(text, /^# PGR feedback\n/); assert.match(text, /## Supervision/);
assert.ok(!text.includes('Desk space'), 'the export follows the topic filter');
r = await call('/api/desk/feedback/export?format=md&quotable=1', { cookie, raw: true });
text = await r.text();
assert.match(r.headers.get('content-disposition'), /pgr-feedback-quotable\.md/);
assert.ok(text.includes('身心健康讲座') && text.includes('Supervision meeting notes'), 'quotable items are included');
assert.ok(!text.includes('Desk space') && !text.includes('pgr@example.org') && !text.includes('HYPERLINK') && !text.includes('staff-student'), 'no unquotable items, names, emails or notes');

const spam = (await call('/api/desk/feedback?status=spam', { cookie })).data.feedback[0];
assert.equal((await call('/api/desk/feedback/' + spam.id, { method: 'DELETE', cookie })).status, 200);
assert.equal((await call('/api/desk/feedback?status=spam', { cookie })).data.feedback.length, 0);

// anonymous storage: read the local Durable Object database and check that no address reached it
const doDir = path.join(process.env.STATE || path.join(os.tmpdir(), 'dl-site-e2e-state'), 'v3/do/donglin-li-homepage-Hub');
if (fs.existsSync(doDir)) {
  const { DatabaseSync } = await import('node:sqlite');
  const file = fs.readdirSync(doDir).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  const db = new DatabaseSync(path.join(doDir, file), { readOnly: true });
  assert.deepEqual(db.prepare('PRAGMA table_info(feedback)').all().map(c => c.name), ['id', 'created_at', 'category', 'body', 'name', 'email', 'may_quote', 'status', 'note', 'handled_at']);
  const addresses = [A, B, C, '127.0.0.1'];
  for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
    const all = db.prepare(`SELECT * FROM "${name}"`);
    all.setReadBigInts(true); // the runtime's own metadata keeps the alarm time in nanoseconds
    for (const row of all.all()) {
      const flat = JSON.stringify(row, (_, v) => (typeof v === 'bigint' ? String(v) : v));
      for (const ip of addresses) assert.ok(!flat.includes(ip), `table ${name} holds ${ip}`);
    }
  }
  for (const f of fs.readdirSync(doDir)) { // including the write-ahead log, which holds older page versions
    const bytes = fs.readFileSync(path.join(doDir, f)).toString('latin1');
    for (const ip of addresses) assert.ok(!bytes.includes(ip), `${f} holds ${ip}`);
  }
  // feedback limits run in memory: no per-sender row, hash or salt is written anywhere
  const hitBuckets = db.prepare('SELECT DISTINCT bucket FROM hits').all().map(row => row.bucket);
  assert.ok(hitBuckets.every(b => /^(chal|msg-h|msg-d|keyfail|pwfail|pk|pkfail):/.test(b) || b === 'pwfail:all'), 'only the message board and login limits use stored hits: ' + hitBuckets.join(' '));
  assert.deepEqual(db.prepare('SELECT key FROM config').all().map(row => row.key).filter(k => k !== 'password'), []);
  db.close();
} else console.log('storage scan skipped: no local state at', doDir);

// --- per-address message limit (tests-e2e/.dev.vars sets 6 per hour; 5 were used above)
r = await submit({ message: 'sixth message is still fine' });
assert.equal(r.status, 200, r.text);
r = await submit({ message: 'seventh message is refused' });
assert.equal(r.status, 429); assert.equal(r.data.error, 'rate');

// --- csrf, logout
r = await call('/api/desk/tasks', { method: 'POST', cookie, headers: { origin: 'https://evil.example' }, body: { text: 'csrf' } });
assert.equal(r.status, 403);
r = await call('/api/desk/logout', { method: 'POST', cookie, body: {} });
assert.equal(r.status, 200);
assert.equal((await call('/api/desk/messages', { cookie })).status, 401, 'session is revoked server-side');

// --- brute force is throttled per address, but the right key always works
let last;
for (let i = 0; i < 7; i++) last = await call('/api/desk/login/key', { method: 'POST', body: { key: 'ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ' } });
assert.equal(last.status, 429);
r = await call('/api/desk/login/key', { method: 'POST', body: { key } });
assert.equal(r.status, 200, 'the correct key is never refused because of other failures');
const cookie2 = r.res.headers.get('set-cookie').split(';')[0];

// --- passkey registration hardening and misc input handling
r = await call('/api/desk/passkeys/options', { cookie: cookie2 });
assert.equal(r.status, 200);
r = await call('/api/desk/passkeys', { method: 'POST', cookie: cookie2, body: { id: 'x.y', publicKey: 'AAAA', clientDataJSON: 'AAAA' } });
assert.equal(r.status, 400);
assert.equal((await call('/api/desk/messages?filter=constructor', { cookie: cookie2 })).status, 200, 'prototype names are not filters');
assert.equal((await call('/api/desk/messages?filter=__proto__', { cookie: cookie2 })).status, 200);
assert.equal((await call('/api/nope')).status, 404);
assert.equal((await call('/api/desk/messages', { method: 'OPTIONS', cookie: cookie2, headers: { origin } })).status, 405);

// --- the owner's own password: set with a fresh session, sign in with it, guesses are throttled before checking
const ownPassword = '我的工作台 password 2026';
assert.equal((await call('/api/desk/state')).data.password, false);
assert.equal((await call('/api/desk/password', { method: 'PUT', body: { password: ownPassword } })).status, 401, 'needs a session');
assert.equal((await call('/api/desk/password', { method: 'PUT', cookie: cookie2, body: { password: 'short' } })).status, 400);
r = await call('/api/desk/password', { method: 'PUT', cookie: cookie2, body: { password: ownPassword } });
assert.equal(r.status, 200, r.text);
assert.equal((await call('/api/desk/state')).data.password, true);
assert.equal((await call('/api/desk/login/password', { method: 'POST', body: { password: 'not the password' } })).status, 401);
r = await call('/api/desk/login/password', { method: 'POST', body: { password: ownPassword } });
assert.equal(r.status, 200, r.text);
const cookie3 = r.res.headers.get('set-cookie').split(';')[0];
assert.equal((await call('/api/desk/messages', { cookie: cookie3 })).status, 200);
for (let i = 0; i < 5; i++) last = await call('/api/desk/login/password', { method: 'POST', body: { password: 'guess number ' + i } });
assert.equal(last.status, 429, 'password guesses are limited per address');
assert.equal((await call('/api/desk/login/password', { method: 'POST', body: { password: ownPassword } })).status, 429, 'a throttled address waits even with the right password');

r = await call('/api/desk/logout-all', { method: 'POST', cookie: cookie2, body: { passkeys: true } });
assert.equal(r.status, 200);
assert.equal((await call('/api/desk/messages', { cookie: cookie2 })).status, 401);
assert.equal((await call('/api/desk/messages', { cookie: cookie3 })).status, 401);
assert.equal((await call('/api/desk/state')).data.password, false, 'the full reset also removes the password');

console.log('api ok');

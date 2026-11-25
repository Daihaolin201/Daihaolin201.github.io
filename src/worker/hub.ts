import { DurableObject } from 'cloudflare:workers';
import { b64url, fromB64url, hashPassword, hmac, randomToken, safeEqual, sha256Hex, verifyPassword } from './crypto.ts';
import { clearedCookie, COOKIE, json, readCookie, readJson, sameOrigin, SESSION_SECONDS, sessionCookie } from './http.ts';
import { addrBucket } from './net.ts';
import { checkSolution, issueChallenge, POW_BITS } from './pow.ts';
import { clean, isEmail, LIMITS, MESSAGE_STATUSES, parseFeedback, parseMessage } from './validate.ts';
import { verifyAssertion, verifyRegistration } from './webauthn.ts';
import { buildFeedbackNotice, buildNotice } from './notify.ts';
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_IDS, FEEDBACK_STATUSES, feedbackCsv, feedbackMarkdown, type FeedbackItem, categoryLabel } from './feedback.ts';

interface Env { SESSION_SECRET: string; DESK_KEY_SHA256: string; RP_ID: string; ORIGIN: string; MSG_PER_HOUR?: string; FEEDBACK_PER_HOUR?: string;
  // optional email alert: a `send_email` binding plus the sender (a routing-domain address) and the verified destination
  NOTIFY?: { send(message: unknown): Promise<void> }; NOTIFY_FROM?: string; NOTIFY_TO?: string;
  // optional phone push: the owner's notify service (Bark behind it) and a publisher token kept as a secret
  PUSH_URL?: string; PUSH_TOKEN?: string;
  PGR_ORIGIN?: string } // the feedback box's own subdomain; only /api/feedback* accept it
type Row = Record<string, any>;

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
const FILTERS: Record<string, string> = {
  inbox: "status IN ('new','read')",
  unread: "status = 'new'",
  starred: "starred = 1 AND status != 'spam'",
  wall: 'approved = 1',
  pending: "want_public = 1 AND approved = 0 AND status IN ('new','read')",
  archived: "status = 'archived'",
  spam: "status = 'spam'",
  all: '1 = 1',
};
const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/** One instance holds all site state: visitor messages, PGR feedback, the owner's tasks and note, passkeys and sessions. */
export class Hub extends DurableObject<Env> {
  private sql: any;

  constructor(ctx: any, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS messages(
          id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en', want_public INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'new', starred INTEGER NOT NULL DEFAULT 0, approved INTEGER NOT NULL DEFAULT 0,
          reply TEXT, replied_at INTEGER, body_hash TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS messages_created ON messages(created_at);
        CREATE TABLE IF NOT EXISTS feedback(
          id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, category TEXT NOT NULL, body TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', may_quote INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '', handled_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS feedback_created ON feedback(created_at);
        CREATE TABLE IF NOT EXISTS tasks(
          id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
          pinned INTEGER NOT NULL DEFAULT 0, due TEXT, done_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS note(id INTEGER PRIMARY KEY CHECK (id = 1), text TEXT NOT NULL, updated_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS passkeys(
          id TEXT PRIMARY KEY, public_key TEXT NOT NULL, counter INTEGER NOT NULL DEFAULT 0, label TEXT NOT NULL,
          created_at INTEGER NOT NULL, last_used INTEGER
        );
        CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, method TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, kind TEXT NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS hits(bucket TEXT NOT NULL, ts INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS hits_bucket ON hits(bucket, ts);
        CREATE INDEX IF NOT EXISTS hits_ts ON hits(ts);
        CREATE INDEX IF NOT EXISTS sessions_exp ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS challenges_exp ON challenges(expires_at);
      `);
    });
  }

  // ---------- small SQL helpers ----------
  private rows(query: string, ...args: unknown[]): Row[] { return this.sql.exec(query, ...args).toArray() as Row[]; }
  private one(query: string, ...args: unknown[]): Row | undefined { return this.rows(query, ...args)[0]; }
  private run(query: string, ...args: unknown[]) { this.sql.exec(query, ...args); }

  private lastPurge = 0;
  private purge() {
    const now = Date.now();
    if (now - this.lastPurge < 10 * MINUTE) return; // expired rows are harmless in between
    this.lastPurge = now;
    this.run('DELETE FROM hits WHERE ts < ?', now - 2 * DAY);
    this.run('DELETE FROM sessions WHERE expires_at < ?', now);
    this.run('DELETE FROM challenges WHERE expires_at < ?', now);
  }

  /** Sliding-window limiter. With count=false it only checks, so failures can be recorded separately. */
  private allow(bucket: string, limit: number, windowMs: number, count = true): boolean {
    const now = Date.now();
    const used = this.one('SELECT COUNT(*) AS c FROM hits WHERE bucket = ? AND ts > ?', bucket, now - windowMs)!.c as number;
    if (used >= limit) return false;
    if (count) this.run('INSERT INTO hits(bucket, ts) VALUES(?, ?)', bucket, now);
    return true;
  }
  private record(bucket: string) { this.run('INSERT INTO hits(bucket, ts) VALUES(?, ?)', bucket, Date.now()); }

  private async ipKey(request: Request): Promise<string> {
    const ip = request.headers.get('x-client-ip') ?? '0';
    const day = new Date().toISOString().slice(0, 10);
    // The address is only used as a daily-rotating hash for rate limiting and is never stored with a message.
    return b64url(await hmac(this.env.SESSION_SECRET, `ip|${addrBucket(ip)}|${day}`)).slice(0, 22);
  }

  /**
   * PGR feedback limits are kept in memory only, so nothing about a sender's address is ever written to storage, where
   * it could later link an anonymous item to a named one. The key is an HMAC under a random salt that also lives only in
   * memory and is replaced every UTC day; when the object is evicted the salt and counts are gone. The cost is that
   * per-sender counts restart after eviction; the global caps and the proof of work, both based on stored rows, still hold.
   */
  private fbSalt = { day: '', value: '' };
  private fbSeen = new Map<string, number[]>();
  private async feedbackKey(request: Request): Promise<string> {
    const day = utcDay();
    if (this.fbSalt.day !== day || this.fbSeen.size > 20_000) { this.fbSalt = { day, value: randomToken(32) }; this.fbSeen.clear(); }
    const ip = request.headers.get('x-client-ip') ?? '0';
    return b64url(await hmac(this.fbSalt.value, addrBucket(ip))).slice(0, 22);
  }
  /** Same sliding window as allow(), in memory. */
  private fbAllow(bucket: string, limit: number, windowMs: number, count = true): boolean {
    const now = Date.now();
    const recent = (this.fbSeen.get(bucket) ?? []).filter(t => t > now - windowMs);
    const ok = recent.length < limit;
    if (ok && count) recent.push(now);
    this.fbSeen.set(bucket, recent);
    return ok;
  }
  private fbRecord(bucket: string) { this.fbSeen.set(bucket, [...(this.fbSeen.get(bucket) ?? []), Date.now()]); }

  private async authed(request: Request): Promise<boolean> {
    const token = readCookie(request, COOKIE);
    if (!token || token.length > 80) return false;
    const row = this.one('SELECT expires_at FROM sessions WHERE hash = ?', await sha256Hex(token));
    return !!row && (row.expires_at as number) > Date.now();
  }

  private async startSession(method: string): Promise<Response> {
    const token = randomToken(32);
    const now = Date.now();
    this.run('INSERT INTO sessions(hash, created_at, expires_at, method) VALUES(?, ?, ?, ?)', await sha256Hex(token), now, now + SESSION_SECONDS * 1000, method);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token) });
  }

  private consumeChallenge(id: string, kind: string): boolean {
    const row = this.one('SELECT expires_at FROM challenges WHERE id = ? AND kind = ?', id, kind);
    if (!row) return false;
    this.run('DELETE FROM challenges WHERE id = ?', id);
    return (row.expires_at as number) > Date.now();
  }

  private clientChallenge(clientDataJSON: unknown): string {
    try {
      const data = JSON.parse(new TextDecoder().decode(fromB64url(String(clientDataJSON))));
      return typeof data.challenge === 'string' ? data.challenge : '';
    } catch { return ''; }
  }

  // ---------- routing ----------
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const method = request.method;
    if (typeof this.env.SESSION_SECRET !== 'string' || this.env.SESSION_SECRET.length < 32) return json({ error: 'config' }, 503); // fail closed rather than sign with a weak key
    this.purge();
    const feedbackRoute = path === '/api/feedback' || path === '/api/feedback/challenge';
    const originOk = sameOrigin(request, this.env.ORIGIN) || (feedbackRoute && !!this.env.PGR_ORIGIN && sameOrigin(request, this.env.PGR_ORIGIN));
    if (method !== 'GET' && method !== 'HEAD' && !originOk) return json({ error: 'origin' }, 403);

    if (path === '/api/message/challenge' && method === 'GET') return this.messageChallenge(request);
    if (path === '/api/message' && method === 'POST') return this.postMessage(request);
    if (path === '/api/feedback/challenge' && method === 'GET') return this.feedbackChallenge(request);
    if (path === '/api/feedback' && method === 'POST') return this.postFeedback(request);
    if (path === '/api/wall' && method === 'GET') return this.wall();
    if (path === '/api/desk' || path.startsWith('/api/desk/')) {
      const accessEmail = request.headers.get('cf-access-authenticated-user-email')?.trim();
      const accessJwt = request.headers.get('cf-access-jwt-assertion')?.trim();
      if (!accessEmail || !accessJwt) return json({ error: 'access' }, 403);
    }
    if (path === '/api/desk/state' && method === 'GET') return json({ authenticated: await this.authed(request), passkeys: (this.one('SELECT COUNT(*) AS c FROM passkeys')!.c as number), password: !!this.passwordHash() });
    if (path === '/api/desk/login/key' && method === 'POST') return this.loginWithKey(request);
    if (path === '/api/desk/login/password' && method === 'POST') return this.loginWithPassword(request);
    if (path === '/api/desk/login/passkey-options' && method === 'GET') return this.passkeyLoginOptions(request);
    if (path === '/api/desk/login/passkey' && method === 'POST') return this.passkeyLogin(request);

    if (!path.startsWith('/api/desk/')) return json({ error: 'not-found' }, 404);
    if (!(await this.authed(request))) return json({ error: 'auth' }, 401);

    if (path === '/api/desk/logout' && method === 'POST') {
      const token = readCookie(request, COOKIE);
      if (token) this.run('DELETE FROM sessions WHERE hash = ?', await sha256Hex(token));
      return json({ ok: true }, 200, { 'set-cookie': clearedCookie() });
    }
    if (path === '/api/desk/logout-all' && method === 'POST') {
      this.run('DELETE FROM sessions');
      if ((await readJson(request, 1024))?.passkeys === true) { this.run('DELETE FROM passkeys'); this.clearPassword(); } // full reset after a suspected compromise
      return json({ ok: true }, 200, { 'set-cookie': clearedCookie() });
    }
    if (path === '/api/desk/overview' && method === 'GET') return this.overview();
    if (path === '/api/desk/passkeys' && method === 'GET') return json({ passkeys: this.passkeyList() });
    if (path === '/api/desk/passkeys/options' && method === 'GET') return (await this.freshSession(request)) ? this.passkeyRegisterOptions() : json({ error: 'reauth' }, 403);
    if (path === '/api/desk/passkeys' && method === 'POST') return this.passkeyRegister(request);
    if (path === '/api/desk/password' && method === 'PUT') return this.setPassword(request);
    if (path === '/api/desk/password' && method === 'DELETE') {
      if (!(await this.freshSession(request))) return json({ error: 'reauth' }, 403);
      this.clearPassword();
      return json({ ok: true });
    }
    let m = path.match(/^\/api\/desk\/passkeys\/([\w-]{1,1400})$/);
    if (m && method === 'DELETE') {
      if ((this.one('SELECT COUNT(*) AS c FROM passkeys')!.c as number) < 1) return json({ error: 'not-found' }, 404);
      this.run('DELETE FROM passkeys WHERE id = ?', m[1]);
      return json({ ok: true });
    }
    if (path === '/api/desk/messages' && method === 'GET') return this.listMessages(url);
    m = path.match(/^\/api\/desk\/messages\/(\d{1,12})$/);
    if (m && method === 'PATCH') return this.patchMessage(Number(m[1]), request);
    if (m && method === 'DELETE') { this.run('DELETE FROM messages WHERE id = ?', Number(m[1])); return json({ ok: true }); }
    if (path === '/api/desk/export' && method === 'GET') return this.exportMessages(url);
    if (path === '/api/desk/feedback' && method === 'GET') return this.listFeedback(url);
    if (path === '/api/desk/feedback/export' && method === 'GET') return this.exportFeedback(url);
    m = path.match(/^\/api\/desk\/feedback\/(\d{1,12})$/);
    if (m && method === 'PATCH') return this.patchFeedback(Number(m[1]), request);
    if (m && method === 'DELETE') { this.run('DELETE FROM feedback WHERE id = ?', Number(m[1])); return json({ ok: true, unhandled: this.unhandledFeedback() }); }
    if (path === '/api/desk/tasks' && method === 'GET') return json({ tasks: this.taskList() });
    if (path === '/api/desk/tasks' && method === 'POST') return this.addTask(request);
    if (path === '/api/desk/tasks/clear-done' && method === 'POST') { this.run('DELETE FROM tasks WHERE done = 1'); return json({ tasks: this.taskList() }); }
    m = path.match(/^\/api\/desk\/tasks\/(\d{1,12})$/);
    if (m && method === 'PATCH') return this.patchTask(Number(m[1]), request);
    if (m && method === 'DELETE') { this.run('DELETE FROM tasks WHERE id = ?', Number(m[1])); return json({ ok: true }); }
    if (path === '/api/desk/note' && method === 'GET') return json(this.one('SELECT text, updated_at AS updatedAt FROM note WHERE id = 1') ?? { text: '', updatedAt: 0 });
    if (path === '/api/desk/note' && method === 'PUT') return this.putNote(request);
    return json({ error: 'not-found' }, 404);
  }

  // ---------- public: messages ----------
  private async messageChallenge(request: Request) {
    const ip = await this.ipKey(request);
    if (!this.allow(`chal:${ip}`, 40, HOUR)) return json({ error: 'rate' }, 429);
    const issued = await issueChallenge(this.env.SESSION_SECRET);
    return json({ challenge: issued.challenge, bits: issued.bits });
  }

  private async postMessage(request: Request) {
    const body = await readJson(request);
    if (!body) return json({ error: 'format' }, 400);
    const parsed = parseMessage(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const msg = parsed.value;
    const refused = await this.spendProof(body.pow);
    if (refused) return refused;
    if (msg.honeypot) return json({ ok: true }); // bots are told it worked and nothing is stored
    const ip = await this.ipKey(request);
    const perHour = Number(this.env.MSG_PER_HOUR) || 3;
    if (!this.allow(`msg-h:${ip}`, perHour, HOUR, false) || !this.allow(`msg-d:${ip}`, perHour * 3, DAY, false)) return json({ error: 'rate' }, 429);
    if ((this.one('SELECT COUNT(*) AS c FROM messages WHERE created_at > ?', Date.now() - DAY)!.c as number) >= 150) return json({ error: 'busy' }, 429);
    this.record(`msg-h:${ip}`); this.record(`msg-d:${ip}`);
    const hash = await sha256Hex(msg.body.toLowerCase());
    if (this.one('SELECT 1 AS x FROM messages WHERE body_hash = ? AND created_at > ?', hash, Date.now() - DAY)) return json({ ok: true });
    const status = msg.spamSignals.length ? 'spam' : 'new';
    this.run('INSERT INTO messages(created_at, name, contact, body, lang, want_public, status, body_hash) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
      Date.now(), msg.name, msg.contact, msg.body, msg.lang, msg.wantPublic ? 1 : 0, status, hash);
    if (status === 'new') this.ctx.waitUntil(this.alert('message', (from, to, now, id) => buildNotice(msg, from, to, now, id),
      { title: '网站新留言', body: '到 desk 查看', group: '网站' })); // never delays or fails the visitor's request
    return json({ ok: true });
  }

  /** Checks a proof of work and spends it. Returns the refusal, or null when the proof is valid and unused. */
  private async spendProof(value: unknown): Promise<Response | null> {
    const pow = (value ?? {}) as Record<string, unknown>;
    const solved = await checkSolution(this.env.SESSION_SECRET, pow.challenge, pow.nonce);
    if (!solved.ok) return json({ error: 'challenge', reason: solved.reason }, 400);
    if (this.one('SELECT 1 AS x FROM challenges WHERE id = ?', `pow:${solved.salt}`)) return json({ error: 'challenge', reason: 'reused' }, 400);
    this.run('INSERT INTO challenges(id, kind, expires_at) VALUES(?, ?, ?)', `pow:${solved.salt}`, 'pow', solved.expires + MINUTE);
    return null;
  }

  /** Emails the owner and pushes to their phone when configured; otherwise does nothing. Pushes carry no visitor text. */
  private async alert(what: string, build: (from: string, to: string, now: Date, id: string) => string,
                      push?: { title: string; body: string; group: string }) {
    const { NOTIFY, NOTIFY_FROM, NOTIFY_TO, PUSH_URL, PUSH_TOKEN } = this.env;
    const email = !!(NOTIFY && NOTIFY_FROM && NOTIFY_TO), phone = !!(push && PUSH_URL && PUSH_TOKEN);
    if (!email && !phone) return;
    // A flood should not become a flood of alerts; feedback has its own budget so it cannot silence message alerts.
    if (!this.allow(what === 'message' ? 'notify' : `notify-${what}`, 30, DAY)) return;
    if (email) {
      try {
        // @ts-ignore cloudflare:email exists only in the Workers runtime
        const { EmailMessage } = await import('cloudflare:email');
        await NOTIFY!.send(new EmailMessage(NOTIFY_FROM!, NOTIFY_TO!, build(NOTIFY_FROM!, NOTIFY_TO!, new Date(), randomToken(12))));
      } catch (error) { console.log(`${what} alert failed`, String(error)); }
    }
    if (phone) {
      try {
        const reply = await fetch(PUSH_URL!, { method: 'POST', body: JSON.stringify(push),
          headers: { authorization: `Bearer ${PUSH_TOKEN}`, 'content-type': 'application/json' } });
        if (!reply.ok) console.log(`${what} push refused`, reply.status);
      } catch (error) { console.log(`${what} push failed`, String(error)); }
    }
  }

  // ---------- public: PGR feedback ----------
  private feedbackSince(window: number) { return this.one('SELECT COUNT(*) AS c FROM feedback WHERE created_at > ?', Date.now() - window)!.c as number; }

  private async feedbackChallenge(request: Request) {
    // Another site could embed this GET many times to use up a visitor's (possibly shared) allowance.
    if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'origin' }, 403);
    const key = await this.feedbackKey(request);
    if (!this.fbAllow(`${key}:c`, 120, HOUR)) return json({ error: 'rate' }, 429);
    // The work grows with the last hour's volume (one bit per five items, up to five), so filling the global cap gets slower.
    const issued = await issueChallenge(this.env.SESSION_SECRET, Date.now(), POW_BITS + Math.min(5, Math.floor(this.feedbackSince(HOUR) / 5)));
    return json({ challenge: issued.challenge, bits: issued.bits });
  }

  private async postFeedback(request: Request) {
    const body = await readJson(request, 20 * 1024);
    if (!body) return json({ error: 'format' }, 400);
    const parsed = parseFeedback(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const fb = parsed.value;
    const refused = await this.spendProof(body.pow);
    if (refused) return refused;
    if (fb.honeypot) return json({ ok: true }); // bots are told it worked and nothing is stored
    const key = await this.feedbackKey(request);
    // A resend of the same text by the same sender on the same day is accepted once; identical text from others is kept.
    const repeat = `${key}:b:${(await sha256Hex(fb.category + '\n' + fb.body.toLowerCase())).slice(0, 16)}`;
    if (!this.fbAllow(repeat, 1, DAY, false)) return json({ ok: true });
    // Generous per sender, because many students share one campus or VPN address; the global caps bound the total.
    const perHour = Number(this.env.FEEDBACK_PER_HOUR) || 10;
    if (!this.fbAllow(`${key}:h`, perHour, HOUR, false) || !this.fbAllow(`${key}:d`, perHour * 2, DAY, false)) return json({ error: 'rate' }, 429);
    if (this.feedbackSince(HOUR) >= 30 || this.feedbackSince(DAY) >= 100) return json({ error: 'busy' }, 429);
    for (const bucket of [`${key}:h`, `${key}:d`, repeat]) this.fbRecord(bucket);
    const status = fb.spamSignals.length ? 'spam' : 'new';
    this.run('INSERT INTO feedback(created_at, category, body, name, email, may_quote, status) VALUES(?, ?, ?, ?, ?, ?, ?)',
      Date.now(), fb.category, fb.body, fb.name, fb.email, fb.mayQuote ? 1 : 0, status);
    const notice = { category: fb.category, hasEmail: !!fb.email, mayQuote: fb.mayQuote };
    const topic = categoryLabel(fb.category, 'zh');
    if (status === 'new') this.ctx.waitUntil(this.alert('feedback', (from, to, now, id) => buildFeedbackNotice(notice, from, to, now, id),
      { title: 'PGR 新意见', body: `类别：${topic}`, group: 'PGR' }));
    return json({ ok: true });
  }

  private wall() {
    const rows = this.rows(`SELECT id, created_at AS createdAt, name, body, reply, replied_at AS repliedAt FROM messages
      WHERE approved = 1 AND want_public = 1 AND status != 'spam' ORDER BY created_at DESC LIMIT 50`);
    return json({ messages: rows }, 200, { 'cache-control': 'public, max-age=20' });
  }

  // ---------- desk: login ----------
  private async loginWithKey(request: Request) {
    const body = await readJson(request, 1024);
    const key = typeof body?.key === 'string' ? body.key.toUpperCase().replace(/[^A-Z2-7]/g, '') : '';
    // The key is checked first: with 125 bits it cannot be guessed online, so a correct key is never refused because others failed.
    if (key.length >= 20 && await safeEqual(await sha256Hex(key), String(this.env.DESK_KEY_SHA256 ?? ''))) return this.startSession('key');
    const ip = await this.ipKey(request);
    if (!this.allow(`keyfail:${ip}`, 5, 15 * MINUTE, false)) return json({ error: 'rate' }, 429);
    this.record(`keyfail:${ip}`);
    return json({ error: 'key' }, 401);
  }

  private passwordHash(): string | undefined {
    return this.one("SELECT value FROM config WHERE key = 'password'")?.value as string | undefined;
  }
  private clearPassword() { this.run("DELETE FROM config WHERE key = 'password'"); }

  /** A chosen password can be guessed, unlike the access key, so the limits are checked before the password is. */
  private async loginWithPassword(request: Request) {
    const ip = await this.ipKey(request);
    if (!this.allow(`pwfail:${ip}`, 5, 15 * MINUTE, false) || !this.allow('pwfail:all', 20, HOUR, false)) return json({ error: 'rate' }, 429);
    const body = await readJson(request, 1024);
    const password = typeof body?.password === 'string' ? body.password : '';
    const stored = this.passwordHash();
    if (stored && password.length > 0 && password.length <= 200 && await verifyPassword(password, stored)) return this.startSession('password');
    this.record(`pwfail:${ip}`); this.record('pwfail:all');
    return json({ error: 'password' }, 401);
  }

  private async setPassword(request: Request) {
    if (!(await this.freshSession(request))) return json({ error: 'reauth' }, 403);
    const body = await readJson(request, 1024);
    const password = typeof body?.password === 'string' ? body.password : '';
    const length = [...password].length;
    if (length < 10 || length > 200 || !password.trim()) return json({ error: 'length' }, 400);
    this.run("INSERT OR REPLACE INTO config(key, value) VALUES('password', ?)", await hashPassword(password));
    return json({ ok: true });
  }

  private async passkeyLoginOptions(request: Request) {
    const ip = await this.ipKey(request);
    if (!this.allow(`pk:${ip}`, 30, HOUR)) return json({ error: 'rate' }, 429);
    const challenge = randomToken(32);
    this.run('INSERT INTO challenges(id, kind, expires_at) VALUES(?, ?, ?)', challenge, 'login', Date.now() + 5 * MINUTE);
    return json({ challenge, rpId: this.env.RP_ID });
  }

  private async passkeyLogin(request: Request) {
    const ip = await this.ipKey(request);
    if (!this.allow(`pkfail:${ip}`, 8, 15 * MINUTE, false)) return json({ error: 'rate' }, 429);
    const body = await readJson(request, 8 * 1024);
    const fail = () => { this.record(`pkfail:${ip}`); return json({ error: 'passkey' }, 401); };
    if (!body || typeof body.id !== 'string') return fail();
    const challenge = this.clientChallenge(body.clientDataJSON);
    if (!challenge || !this.consumeChallenge(challenge, 'login')) return fail();
    const stored = this.one('SELECT public_key, counter FROM passkeys WHERE id = ?', body.id);
    if (!stored) return fail();
    const result = await verifyAssertion(body as any, challenge, this.env.ORIGIN, this.env.RP_ID, { publicKey: stored.public_key, counter: stored.counter });
    if (!result.ok) return fail();
    this.run('UPDATE passkeys SET counter = ?, last_used = ? WHERE id = ?', result.counter, Date.now(), body.id);
    return this.startSession('passkey');
  }

  // ---------- desk: passkeys ----------
  private passkeyList() {
    return this.rows('SELECT id, label, created_at AS createdAt, last_used AS lastUsed FROM passkeys ORDER BY created_at');
  }

  /** Adding a passkey or setting a password outlives the session, so it needs a login from the last ten minutes. */
  private async freshSession(request: Request): Promise<boolean> {
    const token = readCookie(request, COOKIE);
    const row = token ? this.one('SELECT created_at FROM sessions WHERE hash = ?', await sha256Hex(token)) : undefined;
    return !!row && Date.now() - (row.created_at as number) < 10 * MINUTE;
  }

  private passkeyRegisterOptions() {
    if ((this.one('SELECT COUNT(*) AS c FROM passkeys')!.c as number) >= 6) return json({ error: 'limit' }, 400);
    const challenge = randomToken(32);
    this.run('INSERT INTO challenges(id, kind, expires_at) VALUES(?, ?, ?)', challenge, 'register', Date.now() + 5 * MINUTE);
    return json({
      challenge, rpId: this.env.RP_ID, userId: b64url(new TextEncoder().encode('dl-desk-owner')),
      excludeIds: this.rows('SELECT id FROM passkeys').map(r => r.id),
    });
  }

  private async passkeyRegister(request: Request) {
    if (!(await this.freshSession(request))) return json({ error: 'reauth' }, 403);
    const body = await readJson(request, 8 * 1024);
    if (!body) return json({ error: 'format' }, 400);
    const challenge = this.clientChallenge(body.clientDataJSON);
    if (!challenge || !this.consumeChallenge(challenge, 'register')) return json({ error: 'challenge' }, 400);
    const result = await verifyRegistration(body as any, challenge, this.env.ORIGIN);
    if (!result.ok) return json({ error: 'passkey', reason: result.reason }, 400);
    const label = clean(body.label, 40) || 'Passkey';
    this.run('INSERT OR REPLACE INTO passkeys(id, public_key, counter, label, created_at) VALUES(?, ?, 0, ?, ?)', result.id, result.publicKey, label, Date.now());
    return json({ ok: true, passkeys: this.passkeyList() });
  }

  // ---------- desk: messages ----------
  private shape(r: Row) {
    return {
      id: r.id, createdAt: r.created_at, name: r.name, contact: r.contact, body: r.body, lang: r.lang,
      wantPublic: !!r.want_public, status: r.status, starred: !!r.starred, approved: !!r.approved, reply: r.reply ?? '', repliedAt: r.replied_at ?? null,
    };
  }

  private counts() {
    const c = (where: string) => this.one(`SELECT COUNT(*) AS c FROM messages WHERE ${where}`)!.c as number;
    return { unread: c(FILTERS.unread), pending: c(FILTERS.pending), inbox: c(FILTERS.inbox), starred: c(FILTERS.starred), wall: c(FILTERS.wall), archived: c(FILTERS.archived), spam: c(FILTERS.spam), all: c(FILTERS.all) };
  }

  private listMessages(url: URL) {
    const wanted = url.searchParams.get('filter') ?? 'inbox';
    const filter = Object.hasOwn(FILTERS, wanted) ? FILTERS[wanted] : FILTERS.inbox;
    const q = clean(url.searchParams.get('q'), 80);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const before = Number(url.searchParams.get('before')) || 0;
    const args: unknown[] = [];
    let where = filter;
    if (q) {
      const like = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
      where += " AND (body LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\')";
      args.push(like, like, like);
    }
    if (before) { where += ' AND id < ?'; args.push(before); }
    const rows = this.rows(`SELECT * FROM messages WHERE ${where} ORDER BY id DESC LIMIT ?`, ...args, limit + 1);
    return json({ messages: rows.slice(0, limit).map(r => this.shape(r)), more: rows.length > limit, counts: this.counts() });
  }

  private async patchMessage(id: number, request: Request) {
    const body = await readJson(request, 8 * 1024);
    const row = this.one('SELECT * FROM messages WHERE id = ?', id);
    if (!body || !row) return json({ error: 'not-found' }, row ? 400 : 404);
    const sets: string[] = [], args: unknown[] = [];
    if ('status' in body) {
      if (!(MESSAGE_STATUSES as readonly string[]).includes(String(body.status))) return json({ error: 'format' }, 400);
      sets.push('status = ?'); args.push(body.status);
      if (body.status === 'spam' || body.status === 'archived') { sets.push('approved = 0'); }
    }
    if ('starred' in body) { sets.push('starred = ?'); args.push(body.starred ? 1 : 0); }
    if ('approved' in body) {
      if (body.approved && !row.want_public) return json({ error: 'not-public' }, 400); // visitors who chose private are never published
      sets.push('approved = ?'); args.push(body.approved ? 1 : 0);
      if (body.approved && row.status === 'new') { sets.push("status = 'read'"); }
    }
    if ('reply' in body) {
      const reply = clean(body.reply, LIMITS.reply, true);
      sets.push('reply = ?', 'replied_at = ?'); args.push(reply || null, reply ? Date.now() : null);
    }
    if (!sets.length) return json({ error: 'format' }, 400);
    this.run(`UPDATE messages SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
    return json({ message: this.shape(this.one('SELECT * FROM messages WHERE id = ?', id)!), counts: this.counts() });
  }

  private exportMessages(url: URL) {
    const rows = this.rows('SELECT * FROM messages ORDER BY id').map(r => this.shape(r));
    if (url.searchParams.get('format') === 'csv') {
      const esc = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
      const head = ['id', 'time', 'name', 'contact', 'language', 'wants_public', 'status', 'starred', 'on_wall', 'message', 'reply'];
      const lines = rows.map(r => [r.id, new Date(r.createdAt).toISOString(), r.name, r.contact, r.lang, r.wantPublic, r.status, r.starred, r.approved, r.body, r.reply].map(esc).join(','));
      return new Response('﻿' + [head.join(','), ...lines].join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="messages.csv"', 'cache-control': 'no-store' } });
    }
    return new Response(JSON.stringify(rows, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="messages.json"', 'cache-control': 'no-store' } });
  }

  // ---------- desk: PGR feedback ----------
  private feedbackShape(r: Row): FeedbackItem {
    return { id: r.id, createdAt: r.created_at, category: r.category, body: r.body, name: r.name, email: r.email, mayQuote: !!r.may_quote, status: r.status, note: r.note, handledAt: r.handled_at ?? null };
  }

  private unhandledFeedback() { return this.one("SELECT COUNT(*) AS c FROM feedback WHERE status = 'new'")!.c as number; }

  /** status: new | handled | spam | all (everything but spam); category: one topic or every topic; quotable=1: only items that may be quoted. */
  private feedbackFilter(url: URL, fallback: string) {
    const status = url.searchParams.get('status') ?? fallback;
    const category = url.searchParams.get('category') ?? '';
    const statusClause = (FEEDBACK_STATUSES as readonly string[]).includes(status) ? `status = '${status}'` : status === 'all' ? "status != 'spam'" : "status = 'new'";
    const categoryClause = FEEDBACK_CATEGORY_IDS.includes(category) ? `category = '${category}'` : '1 = 1'; // both come from fixed lists, never from the request text
    const quotable = url.searchParams.get('quotable') === '1' ? " AND may_quote = 1 AND status != 'spam'" : '';
    return { statusClause, categoryClause, where: `${statusClause} AND ${categoryClause}${quotable}` };
  }

  private feedbackCounts(statusClause: string, categoryClause: string) {
    const status: Record<string, number> = { new: 0, handled: 0, spam: 0, all: 0 };
    for (const r of this.rows(`SELECT status, COUNT(*) AS c FROM feedback WHERE ${categoryClause} GROUP BY status`)) {
      status[r.status] = r.c;
      if (r.status !== 'spam') status.all += r.c as number;
    }
    const category: Record<string, number> = Object.fromEntries(FEEDBACK_CATEGORIES.map(c => [c.id, 0]));
    for (const r of this.rows(`SELECT category, COUNT(*) AS c FROM feedback WHERE ${statusClause} GROUP BY category`)) category[r.category] = r.c;
    return { status, category, unhandled: this.unhandledFeedback() };
  }

  private listFeedback(url: URL) {
    const { statusClause, categoryClause, where } = this.feedbackFilter(url, 'new');
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const before = Number(url.searchParams.get('before')) || 0;
    const rows = this.rows(`SELECT * FROM feedback WHERE ${where}${before ? ' AND id < ?' : ''} ORDER BY id DESC LIMIT ?`, ...(before ? [before] : []), limit + 1);
    return json({ feedback: rows.slice(0, limit).map(r => this.feedbackShape(r)), more: rows.length > limit, counts: this.feedbackCounts(statusClause, categoryClause) });
  }

  private async patchFeedback(id: number, request: Request) {
    if (!this.one('SELECT 1 AS x FROM feedback WHERE id = ?', id)) return json({ error: 'not-found' }, 404);
    const body = await readJson(request, LIMITS.feedbackNote * 4 + 1024);
    if (!body) return json({ error: 'format' }, 400);
    const sets: string[] = [], args: unknown[] = [];
    if ('status' in body) {
      if (!(FEEDBACK_STATUSES as readonly string[]).includes(String(body.status))) return json({ error: 'format' }, 400);
      sets.push('status = ?', 'handled_at = ?'); args.push(body.status, body.status === 'handled' ? Date.now() : null);
    }
    if ('note' in body) {
      if (typeof body.note !== 'string') return json({ error: 'format' }, 400);
      sets.push('note = ?'); args.push(clean(body.note, LIMITS.feedbackNote, true));
    }
    if (!sets.length) return json({ error: 'format' }, 400);
    this.run(`UPDATE feedback SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
    return json({ item: this.feedbackShape(this.one('SELECT * FROM feedback WHERE id = ?', id)!), unhandled: this.unhandledFeedback() });
  }

  private exportFeedback(url: URL) {
    const anonymous = url.searchParams.get('quotable') === '1';
    const items = this.rows(`SELECT * FROM feedback WHERE ${this.feedbackFilter(url, 'all').where} ORDER BY id`).map(r => this.feedbackShape(r));
    const markdown = url.searchParams.get('format') === 'md';
    const file = (anonymous ? 'pgr-feedback-quotable' : 'pgr-feedback') + (markdown ? '.md' : '.csv');
    return new Response(markdown ? feedbackMarkdown(items, new Date(), anonymous) : feedbackCsv(items, anonymous), { headers: {
      'content-type': markdown ? 'text/markdown; charset=utf-8' : 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${file}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    } });
  }

  private overview() {
    const day = Date.now() - DAY, week = Date.now() - 7 * DAY;
    const since = (t: number) => this.one('SELECT COUNT(*) AS c FROM messages WHERE created_at > ? AND status != ?', t, 'spam')!.c as number;
    return json({
      counts: this.counts(), today: since(day), week: since(week),
      tasksOpen: this.one('SELECT COUNT(*) AS c FROM tasks WHERE done = 0')!.c, passkeys: this.passkeyList().length,
      databaseBytes: this.sql.databaseSize,
    });
  }

  // ---------- desk: tasks and note ----------
  private taskList() {
    return this.rows('SELECT id, text, done, pinned, due, created_at AS createdAt FROM tasks ORDER BY done, pinned DESC, due IS NULL, due, id DESC LIMIT 300')
      .map(r => ({ ...r, done: !!r.done, pinned: !!r.pinned }));
  }

  private validDue(value: unknown): string | null { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }

  private async addTask(request: Request) {
    const body = await readJson(request, 4 * 1024);
    const text = clean(body?.text, LIMITS.task);
    if (!text) return json({ error: 'empty' }, 400);
    if ((this.one('SELECT COUNT(*) AS c FROM tasks')!.c as number) >= 300) return json({ error: 'limit' }, 400);
    this.run('INSERT INTO tasks(created_at, text, due) VALUES(?, ?, ?)', Date.now(), text, this.validDue(body?.due));
    return json({ tasks: this.taskList() });
  }

  private async patchTask(id: number, request: Request) {
    const body = await readJson(request, 4 * 1024);
    if (!body || !this.one('SELECT 1 AS x FROM tasks WHERE id = ?', id)) return json({ error: 'not-found' }, 404);
    const sets: string[] = [], args: unknown[] = [];
    if ('done' in body) { sets.push('done = ?', 'done_at = ?'); args.push(body.done ? 1 : 0, body.done ? Date.now() : null); }
    if ('pinned' in body) { sets.push('pinned = ?'); args.push(body.pinned ? 1 : 0); }
    if ('text' in body) { const t = clean(body.text, LIMITS.task); if (!t) return json({ error: 'empty' }, 400); sets.push('text = ?'); args.push(t); }
    if ('due' in body) { sets.push('due = ?'); args.push(this.validDue(body.due)); }
    if (!sets.length) return json({ error: 'format' }, 400);
    this.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
    return json({ tasks: this.taskList() });
  }

  private async putNote(request: Request) {
    const body = await readJson(request, LIMITS.note * 4 + 1024);
    if (!body || typeof body.text !== 'string') return json({ error: 'format' }, 400);
    const text = body.text.normalize('NFC').slice(0, LIMITS.note);
    const now = Date.now();
    this.run('INSERT INTO note(id, text, updated_at) VALUES(1, ?, ?) ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at', text, now);
    return json({ ok: true, updatedAt: now });
  }
}

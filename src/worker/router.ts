/** Request routing for the site Worker; kept free of Workers-only imports so tests can load it in Node. */

export interface Env {
  ORIGIN: string;
  PGR_ORIGIN?: string;
  TELEMETRY_URL?: string;
  TELEMETRY_TOKEN?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
  HUB: { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface TelemetryEvent {
  host: string;
  path: string;
  method: string;
  status: number;
  latency_ms: number;
  ip: string;
  country: string;
  region: string;
  city: string;
  timezone: string;
  user_agent: string;
  referer: string;
  error?: string;
  ts: number;
}

const ROUTES = /^\/api\/(message(\/challenge)?|feedback(\/challenge)?|wall|desk(\/[\w/-]*)?)\/?$/;
const DESK_API = /^\/api\/desk(\/|$)/;
const FEEDBACK_ROUTES = /^\/api\/feedback(\/challenge)?\/?$/;
const OLD_PGR = /^\/(zh\/)?pgr\/?(index\.html)?$/;
const DECOY_ROUTE = /^\/(?:d|t)\/([A-Za-z0-9_-]{8,64})$/;
const DECOY_PATH_PREFIX = /^\/(?:d|t)(?:\/|$)/;
const DECOY_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Archived Reference Note</title>
</head>
<body>
  <main>
    <h1>Archived Reference Note</h1>
    <p>This temporary reference note has been archived and is no longer listed in the main index.</p>
  </main>
</body>
</html>
`;
const prefersChinese = (request: Request) => /^zh\b/i.test((request.headers.get('accept-language') ?? '').trim());
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
const reject = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });
const decoyNotFound = () =>
  new Response(null, {
    status: 404,
    headers: {
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
const decoyOk = (method: string) =>
  new Response(method === 'HEAD' ? null : DECOY_HTML, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
    },
  });
const hasCloudflareAccess = (request: Request) =>
  Boolean(request.headers.get('cf-access-authenticated-user-email')?.trim() && request.headers.get('cf-access-jwt-assertion')?.trim());

const STATIC_EXT = /\.(?:css|js|mjs|cjs|map|png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|woff2?|ttf|otf|eot|wasm)$/i;
const STATIC_CT = /^(?:text\/css|text\/javascript|application\/javascript|image\/|font\/|application\/font-|application\/vnd\.ms-fontobject)/i;

function shouldTrackRequest(pathname: string, response: Response): boolean {
  if (STATIC_EXT.test(pathname)) return false;
  if (pathname.startsWith('/api/')) return true;
  if (response.status >= 300 && response.status < 400) return true;
  const ct = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (ct && STATIC_CT.test(ct)) return false;
  return true;
}

function cfString(cf: Record<string, unknown> | undefined, key: string): string {
  const val = cf?.[key];
  return typeof val === 'string' ? val.slice(0, 128) : '';
}

function cleanReferer(raw: string | null): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    parsed.username = '';
    parsed.password = '';
    return parsed.href.slice(0, 512);
  } catch {
    return raw.slice(0, 512);
  }
}

export function scrubError(err: unknown, status: number, secretToken?: string): string {
  let msg = err !== undefined
    ? (err instanceof Error ? `${err.name}: ${err.message}` : String(err))
    : status >= 500 ? `HTTP ${status}` : '';
  if (!msg) return '';
  if (secretToken) msg = msg.split(secretToken).join('[REDACTED]');
  msg = msg
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi, '$1 [REDACTED]')
    .replace(/(__Host-dl_desk|set-cookie|cookie|authorization|x-hub-secret|api[_-]?key|token|secret|password|passwd|session)\s*[:=]\s*[^\s,;'"}\]]+/gi, '$1=[REDACTED]')
    .replace(/\b(?:dln_[A-Za-z0-9_-]{12,}|[0-9a-f]{32,})\b/gi, '[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
  return msg.slice(0, 500);
}

function buildTelemetryPayload(
  request: Request,
  url: URL,
  status: number,
  started: number,
): TelemetryEvent {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf;
  return {
    host: url.hostname,
    path: url.pathname,
    method: request.method,
    status,
    latency_ms: Math.max(0, Math.round(performance.now() - started)),
    ip: request.headers.get('cf-connecting-ip') ?? '',
    country: cfString(cf, 'country'),
    region: cfString(cf, 'region'),
    city: cfString(cf, 'city'),
    timezone: cfString(cf, 'timezone'),
    user_agent: (request.headers.get('user-agent') ?? '').slice(0, 512),
    referer: cleanReferer(request.headers.get('referer')),
    ts: Math.floor(Date.now() / 1000),
  };
}

function sendTelemetry(url: string, token: string | undefined, payload: TelemetryEvent): Promise<void> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    }).then(() => {}, () => {});
  } catch {
    return Promise.resolve();
  }
}

async function handleDecoyRequest(
  request: Request,
  url: URL,
  env: Env,
  started: number,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return decoyNotFound();
  }
  const telemetryUrl = env.TELEMETRY_URL?.trim();
  if (!telemetryUrl) return decoyNotFound();

  const payload = buildTelemetryPayload(request, url, 200, started);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.TELEMETRY_TOKEN) headers.authorization = `Bearer ${env.TELEMETRY_TOKEN}`;

  try {
    const resp = await fetch(telemetryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2500),
    });
    if (!resp.ok) return decoyNotFound();
    const data = (await resp.json()) as { decoy_hit?: unknown } | null;
    if (!data || typeof data !== 'object' || data.decoy_hit !== true) {
      return decoyNotFound();
    }
    return decoyOk(request.method);
  } catch {
    return decoyNotFound();
  }
}

export const router = {
  async fetch(request: Request, env: Env, ctx?: ExecutionContextLike): Promise<Response> {
    const started = performance.now();
    const url = new URL(request.url);
    const originHost = new URL(env.ORIGIN).hostname;

    if (url.hostname === originHost && DECOY_ROUTE.test(url.pathname)) {
      return handleDecoyRequest(request, url, env, started);
    }
    if (DECOY_PATH_PREFIX.test(url.pathname)) {
      return decoyNotFound();
    }

    let response: Response;
    let uncaught: unknown;
    try {
      response = await routeRequest(request, url, env);
    } catch (err) {
      uncaught = err;
      response = new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    const telemetryUrl = env.TELEMETRY_URL?.trim();
    if (telemetryUrl && (uncaught !== undefined || response.status >= 500 || shouldTrackRequest(url.pathname, response))) {
      const payload = buildTelemetryPayload(request, url, response.status, started);
      if (uncaught !== undefined || response.status >= 500) {
        payload.error = scrubError(uncaught, response.status, env.TELEMETRY_TOKEN);
      }
      const beacon = sendTelemetry(telemetryUrl, env.TELEMETRY_TOKEN, payload);
      if (ctx?.waitUntil) ctx.waitUntil(beacon);
      else void beacon;
    }

    return response;
  },
};

async function routeRequest(request: Request, url: URL, env: Env): Promise<Response> {
  const pgrHost = env.PGR_ORIGIN ? new URL(env.PGR_ORIGIN).hostname : '';
  if (pgrHost && url.hostname === pgrHost) return pgr(request, url, env);
  // The feedback box moved to its own subdomain; old addresses keep working.
  if (pgrHost && url.hostname === new URL(env.ORIGIN).hostname && OLD_PGR.test(url.pathname))
    return Response.redirect(env.PGR_ORIGIN + '/' + (url.pathname.startsWith('/zh/') ? '?lang=zh' : ''), 301);
  if (url.pathname === '/desk' || url.pathname.startsWith('/desk/')) return reject(404);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  // Turn away traffic that can never succeed here, so it does not spend Durable Object requests.
  if (url.hostname !== new URL(env.ORIGIN).hostname) return reject(404); // e.g. the workers.dev address: the API lives on the real domain only
  if (!ROUTES.test(url.pathname)) return reject(404);
  if (DESK_API.test(url.pathname) && !hasCloudflareAccess(request)) return reject(403);
  if (!METHODS.has(request.method)) return reject(405);
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.headers.get('origin') !== env.ORIGIN) return reject(403);
  const headers = new Headers(request.headers);
  headers.set('x-client-ip', request.headers.get('cf-connecting-ip') ?? '0.0.0.0');
  return env.HUB.get(env.HUB.idFromName('owner')).fetch(new Request(request, { headers }));
}

/** pgr.<domain>: the feedback page at "/", in the visitor's language (?lang= overrides), its API and static files. */
async function pgr(request: Request, url: URL, env: Env): Promise<Response> {
  if (url.pathname.startsWith('/api/')) {
    if (!FEEDBACK_ROUTES.test(url.pathname)) return reject(404);
    if (!METHODS.has(request.method)) return reject(405);
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.headers.get('origin') !== env.PGR_ORIGIN) return reject(403);
    const headers = new Headers(request.headers);
    headers.set('x-client-ip', request.headers.get('cf-connecting-ip') ?? '0.0.0.0');
    return env.HUB.get(env.HUB.idFromName('owner')).fetch(new Request(request, { headers }));
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const asked = url.searchParams.get('lang');
    const zh = asked ? asked === 'zh' : prefersChinese(request);
    const page = await env.ASSETS.fetch(new Request(new URL(zh ? '/zh/pgr/' : '/pgr/', url), request));
    const reply = new Response(page.body, page);
    reply.headers.set('vary', 'accept-language');
    return reply;
  }
  // Static files the page needs; any other page belongs to the main site.
  if (/\.[a-z0-9]{1,8}$/i.test(url.pathname)) return env.ASSETS.fetch(request);
  return Response.redirect(env.ORIGIN + url.pathname + url.search, 301);
}

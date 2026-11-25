import test from 'node:test';
import assert from 'node:assert/strict';
import { router, scrubError } from '../src/worker/router.ts';

function makeEnv(overrides = {}) {
  const seen = { assets: [], hub: [] };
  return {
    seen,
    ORIGIN: 'https://donglinli.com',
    PGR_ORIGIN: 'https://pgr.donglinli.com',
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        seen.assets.push(path);
        const ct = path.endsWith('.css') ? 'text/css'
          : path.endsWith('.js') ? 'application/javascript'
          : path.endsWith('.png') ? 'image/png'
          : path.endsWith('.bib') ? 'application/x-bibtex; charset=utf-8'
          : 'text/html; charset=utf-8';
        return new Response('ok', { status: 200, headers: { 'content-type': ct } });
      },
    },
    HUB: {
      idFromName: () => 'id',
      get: () => ({
        async fetch(request) {
          seen.hub.push(new URL(request.url).pathname);
          return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
        },
      }),
    },
    ...overrides,
  };
}

function makeCtx() {
  const tasks = [];
  return { tasks, waitUntil(p) { tasks.push(p); } };
}

test('telemetry: no-op when TELEMETRY_URL is unset', async () => {
  const origFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async () => { called += 1; return new Response('ok'); };
  try {
    const ctx = makeCtx();
    const res = await router.fetch(new Request('https://donglinli.com/'), makeEnv(), ctx);
    assert.equal(res.status, 200);
    await Promise.all(ctx.tasks);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('telemetry: beacons HTML, /publications.bib and /api/* across both hosts with expected payload', async () => {
  const origFetch = globalThis.fetch;
  const beacons = [];
  globalThis.fetch = async (url, init) => {
    beacons.push({ url, init, body: JSON.parse(init.body) });
    return new Response('ok', { status: 202 });
  };
  try {
    const env = makeEnv({
      TELEMETRY_URL: 'https://hub.example/api/telemetry',
      TELEMETRY_TOKEN: 'super-secret-telemetry-token',
    });

    const ctx1 = makeCtx();
    const req1 = new Request('https://donglinli.com/zh/cv/?print=1', {
      headers: {
        'cf-connecting-ip': '203.0.113.42',
        'user-agent': 'Mozilla/5.0 TestBrowser',
        referer: 'https://user:pass@scholar.google.com/citations',
      },
    });
    req1.cf = { country: 'GB', region: 'England', city: 'Manchester', timezone: 'Europe/London' };
    const r1 = await router.fetch(req1, env, ctx1);
    assert.equal(r1.status, 200);
    await Promise.all(ctx1.tasks);
    assert.equal(beacons.length, 1);
    assert.equal(beacons[0].url, 'https://hub.example/api/telemetry');
    assert.equal(beacons[0].init.method, 'POST');
    assert.equal(beacons[0].init.headers.authorization, 'Bearer super-secret-telemetry-token');
    assert.ok(beacons[0].init.signal instanceof AbortSignal);

    const b1 = beacons[0].body;
    assert.equal(b1.host, 'donglinli.com');
    assert.equal(b1.path, '/zh/cv/');
    assert.equal(b1.method, 'GET');
    assert.equal(b1.status, 200);
    assert.equal(typeof b1.latency_ms, 'number');
    assert.equal(b1.ip, '203.0.113.42');
    assert.equal(b1.country, 'GB');
    assert.equal(b1.region, 'England');
    assert.equal(b1.city, 'Manchester');
    assert.equal(b1.timezone, 'Europe/London');
    assert.equal(b1.user_agent, 'Mozilla/5.0 TestBrowser');
    assert.equal(b1.referer, 'https://scholar.google.com/citations');
    assert.equal('error' in b1, false);
    assert.equal(typeof b1.ts, 'number');

    const ctx2 = makeCtx();
    const r2 = await router.fetch(new Request('https://pgr.donglinli.com/'), env, ctx2);
    assert.equal(r2.status, 200);
    await Promise.all(ctx2.tasks);
    assert.equal(beacons.length, 2);
    assert.equal(beacons[1].body.host, 'pgr.donglinli.com');
    assert.equal(beacons[1].body.path, '/');

    const ctx3 = makeCtx();
    const r3 = await router.fetch(new Request('https://donglinli.com/publications.bib'), env, ctx3);
    assert.equal(r3.status, 200);
    await Promise.all(ctx3.tasks);
    assert.equal(beacons.length, 3);
    assert.equal(beacons[2].body.path, '/publications.bib');

    const ctx4 = makeCtx();
    const r4 = await router.fetch(new Request('https://pgr.donglinli.com/api/feedback', {
      method: 'POST',
      headers: { origin: 'https://pgr.donglinli.com', 'cf-connecting-ip': '198.51.100.9' },
      body: '{}',
    }), env, ctx4);
    assert.equal(r4.status, 200);
    await Promise.all(ctx4.tasks);
    assert.equal(beacons.length, 4);
    assert.equal(beacons[3].body.host, 'pgr.donglinli.com');
    assert.equal(beacons[3].body.path, '/api/feedback');
    assert.equal(beacons[3].body.method, 'POST');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('telemetry: skips static font/css/js/image assets on both hosts', async () => {
  const origFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => { count += 1; return new Response('ok'); };
  try {
    const env = makeEnv({ TELEMETRY_URL: 'https://hub.example/api/telemetry', TELEMETRY_TOKEN: 'tok' });
    const ctx = makeCtx();
    for (const url of [
      'https://donglinli.com/_astro/main.abc123.css',
      'https://donglinli.com/assets/effects.js',
      'https://donglinli.com/images/avatar-256.jpg',
      'https://donglinli.com/favicon.ico',
      'https://donglinli.com/fonts/inter.woff2',
      'https://pgr.donglinli.com/_astro/app.xyz.css',
      'https://pgr.donglinli.com/images/dl-touch.png',
    ]) {
      const r = await router.fetch(new Request(url), env, ctx);
      assert.equal(r.status, 200);
    }
    const extLessCssEnv = makeEnv({
      TELEMETRY_URL: 'https://hub.example/api/telemetry',
      ASSETS: { async fetch() { return new Response('body{}', { headers: { 'content-type': 'text/css; charset=utf-8' } }); } },
    });
    await router.fetch(new Request('https://donglinli.com/theme-bundle'), extLessCssEnv, ctx);
    await Promise.all(ctx.tasks);
    assert.equal(count, 0);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('telemetry: captures uncaught Worker errors with scrubbed secrets and never blocks response', async () => {
  const origFetch = globalThis.fetch;
  const beacons = [];
  globalThis.fetch = async (_url, init) => {
    beacons.push(JSON.parse(init.body));
    return Promise.reject(new Error('telemetry receiver offline'));
  };
  try {
    const env = makeEnv({
      TELEMETRY_URL: 'https://hub.example/api/telemetry',
      TELEMETRY_TOKEN: 'secret-beacon-tok',
      HUB: {
        idFromName: () => 'id',
        get: () => ({
          async fetch() {
            throw new Error('DO failure with Bearer tok123 and __Host-dl_desk=cookieval999 and secret-beacon-tok');
          },
        }),
      },
    });
    const ctx = makeCtx();
    const res = await router.fetch(new Request('https://donglinli.com/api/wall'), env, ctx);
    assert.equal(res.status, 500);
    await Promise.all(ctx.tasks);
    assert.equal(beacons.length, 1);
    assert.equal(beacons[0].status, 500);
    assert.ok(beacons[0].error.includes('DO failure'));
    assert.ok(!beacons[0].error.includes('tok123'));
    assert.ok(!beacons[0].error.includes('cookieval999'));
    assert.ok(!beacons[0].error.includes('secret-beacon-tok'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('telemetry: 5xx downstream response reports error without throwing when fetch throws synchronously', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new TypeError('invalid telemetry URL'); };
  try {
    const env = makeEnv({
      TELEMETRY_URL: 'not-a-valid-url',
      HUB: { idFromName: () => 'id', get: () => ({ async fetch() { return new Response('err', { status: 503 }); } }) },
    });
    const ctx = makeCtx();
    const res = await router.fetch(new Request('https://donglinli.com/api/wall'), env, ctx);
    assert.equal(res.status, 503);
    await Promise.all(ctx.tasks);
    assert.equal(scrubError(undefined, 503), 'HTTP 503');
  } finally {
    globalThis.fetch = origFetch;
  }
});

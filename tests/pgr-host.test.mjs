import test from 'node:test';
import assert from 'node:assert/strict';
import { router as worker } from '../src/worker/router.ts';

function env() {
  const seen = { assets: [], hub: [] };
  return {
    seen,
    ORIGIN: 'https://donglinli.com',
    PGR_ORIGIN: 'https://pgr.donglinli.com',
    ASSETS: { async fetch(request) { seen.assets.push(new URL(request.url).pathname); return new Response('page', { headers: { 'content-type': 'text/html' } }); } },
    HUB: { idFromName: () => 'id', get: () => ({ async fetch(request) { seen.hub.push([new URL(request.url).pathname, request.headers.get('x-client-ip')]); return new Response('{}'); } }) },
  };
}
const call = (e, url, init = {}) => worker.fetch(new Request(url, init), e);

test('pgr subdomain serves the page in the visitor language, ?lang= overrides', async () => {
  let e = env();
  await call(e, 'https://pgr.donglinli.com/', { headers: { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' } });
  await call(e, 'https://pgr.donglinli.com/', { headers: { 'accept-language': 'en-GB,en;q=0.9' } });
  await call(e, 'https://pgr.donglinli.com/?lang=zh', { headers: { 'accept-language': 'en-GB' } });
  const reply = await call(e, 'https://pgr.donglinli.com/?lang=en', { headers: { 'accept-language': 'zh-CN' } });
  assert.deepEqual(e.seen.assets, ['/zh/pgr/', '/pgr/', '/zh/pgr/', '/pgr/']);
  assert.equal(reply.headers.get('vary'), 'accept-language');
});

test('pgr subdomain API: feedback only, own origin only', async () => {
  const e = env();
  const post = (path, origin) => call(e, 'https://pgr.donglinli.com' + path, { method: 'POST', headers: { origin, 'cf-connecting-ip': '203.0.113.7' }, body: '{}' });
  assert.equal((await post('/api/feedback', 'https://pgr.donglinli.com')).status, 200);
  assert.deepEqual(e.seen.hub.at(-1), ['/api/feedback', '203.0.113.7']);
  assert.equal((await post('/api/feedback', 'https://donglinli.com')).status, 403);
  assert.equal((await post('/api/message', 'https://pgr.donglinli.com')).status, 404);
  assert.equal((await call(e, 'https://pgr.donglinli.com/api/desk/state')).status, 404);
  assert.equal(e.seen.hub.length, 1);
});

test('other pages on the subdomain go back to the main site; static files are served', async () => {
  const e = env();
  const away = await call(e, 'https://pgr.donglinli.com/lab/');
  assert.equal(away.status, 301);
  assert.equal(away.headers.get('location'), 'https://donglinli.com/lab/');
  await call(e, 'https://pgr.donglinli.com/_astro/app.abc123.css');
  assert.deepEqual(e.seen.assets, ['/_astro/app.abc123.css']);
});

test('old /pgr/ addresses redirect to the subdomain', async () => {
  const e = env();
  const en = await call(e, 'https://donglinli.com/pgr/');
  const zh = await call(e, 'https://donglinli.com/zh/pgr/');
  assert.equal(en.status, 301); assert.equal(en.headers.get('location'), 'https://pgr.donglinli.com/');
  assert.equal(zh.headers.get('location'), 'https://pgr.donglinli.com/?lang=zh');
  await call(e, 'https://donglinli.com/');
  assert.deepEqual(e.seen.assets, ['/']);
});

test('without PGR_ORIGIN (local dev) /pgr/ is served as before', async () => {
  const e = env(); delete e.PGR_ORIGIN;
  await call(e, 'http://localhost:8787/pgr/');
  assert.deepEqual(e.seen.assets, ['/pgr/']);
});

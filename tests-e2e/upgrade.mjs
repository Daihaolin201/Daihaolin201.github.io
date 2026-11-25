import assert from 'node:assert/strict';
import { PROJECTS } from '../src/data/projects.ts';
import { projectContent } from '../src/data/projectContent.ts';
// CV page, citations, contact actions, game links and metadata: node tests-e2e/upgrade.mjs
// Works against any server for dist/ (BASE, default http://localhost:8787); PW=<playwright index.mjs>.
const { chromium } = await import(process.env.PW || 'playwright');
const base = process.env.BASE || 'http://localhost:8787';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const issues = [];
const watch = p => { p.on('pageerror', e => issues.push(e.message)); p.on('console', m => { if (m.type() === 'error') issues.push(m.text()); }); };

// Files a visitor downloads
for (const [path, type, check] of [
  ['/publications.bib', /bibtex/, t => (t.match(/^@\w+\{/gm) ?? []).length === 4],
  ['/donglin-li.vcf', /vcard/, t => t.includes('EMAIL;TYPE=INTERNET,WORK:hello@donglinli.com') && t.includes('X-ABLabel:ORCID')],
  ['/sitemap.xml', /xml/, t => t.includes('<loc>https://donglinli.com/zh/cv/</loc>') && !t.includes('/desk/')],
]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  if (!base.includes('8790')) assert.match(r.headers.get('content-type') ?? '', type, path);
  assert.ok(check(await r.text()), path);
}

for (const [name, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: name === 'phone', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); watch(p);

  for (const [prefix, lang] of [['/', 'en'], ['/zh/', 'zh']]) {
    // CV: every section of the home page's record, a working print button, no sideways scroll
    await p.goto(base + prefix + 'cv/');
    assert.equal(await p.locator('.cv-sec h2').count(), 9, lang + ' CV sections');
    assert.equal(await p.locator('.cv-pubs > li').count(), 4);
    assert.equal(await p.locator('.cv-projects > li').count(), 8, 'all projects on the CV');
    const cvProjectTitles = await p.locator('.cv-projects > li h3').allInnerTexts();
    const expectedTitles = PROJECTS.map(m => projectContent(lang).find(item => item.id === m.id).title);
    assert.deepEqual(cvProjectTitles, expectedTitles, lang + ' CV lists all 8 projects');
    assert.ok(await p.locator('[data-print]').isVisible(), 'print button shown with JS');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + lang + ' CV overflow');
    const ld = JSON.parse(await p.locator('script[type="application/ld+json"]').textContent());
    assert.equal(ld.mainEntity['@type'], 'Person');
    assert.ok(Array.isArray(ld.mainEntity.knowsAbout) && ld.mainEntity.knowsAbout.length >= 4);
    await p.emulateMedia({ media: 'print' });
    assert.equal(await p.locator('.mast').isVisible(), false, 'no page header on paper');
    assert.equal(await p.locator('.cv-bar').isVisible(), false);
    await p.emulateMedia({ media: 'screen' });

    // Home: CV link in the first screen, structured data, absolute language alternates
    await p.goto(base + prefix);
    assert.ok(await p.locator(`#about a[href="${prefix}cv/"]`).isVisible(), 'CV in the first screen');
    const home = JSON.parse(await p.locator('script[type="application/ld+json"]').textContent());
    assert.equal(home['@type'], 'ProfilePage');
    assert.ok((await p.locator('link[hreflang="x-default"]').getAttribute('href')).startsWith('https://donglinli.com/'));

    // Citation: plain text and BibTeX reach the clipboard, with a confirmation
    const ccc = p.locator('#ccc-2026');
    await ccc.locator('button[data-copy="text"]').click();
    const text = await p.evaluate(() => navigator.clipboard.readText());
    assert.ok(text.includes('Dual Control for Multi-Robot Source Seeking') && text.includes('CCC 2026'), 'plain citation copied');
    assert.notEqual((await ccc.locator('[role="status"]').textContent()).trim(), '');
    await ccc.locator('button[data-copy="bibtex"]').click();
    assert.match(await p.evaluate(() => navigator.clipboard.readText()), /^@misc\{li2026consensus,/);
    assert.equal(await p.locator('#neurocomputing-2026 a.doi').getAttribute('href'), 'https://doi.org/10.1016/j.neucom.2026.134973');

    // Contact: copy the address, save the card
    await p.locator('#contact .copy-mail').click();
    assert.equal(await p.evaluate(() => navigator.clipboard.readText()), 'hello@donglinli.com');
    assert.equal(await p.locator('#contact a[download="Donglin-Li.vcf"]').count(), 1);

    // Games: the shortcut opens the game of the shown project; a #<id>-game link opens it on arrival,
    // even when a filter would hide that project
    await p.locator('#hackabot-2026 [data-open-game]').click();
    await p.waitForTimeout(300);
    assert.equal(await p.locator('#hackabot-2026-game').evaluate(d => d.open), true, 'shortcut opens the game');
    assert.ok(await p.locator('#hackabot-2026-game .play-body > *').count() > 0, 'game mounted');
    await p.goto(base + prefix + '#esp-buggy-game');
    await p.waitForTimeout(400);
    assert.equal(await p.locator('#esp-buggy').evaluate(e => e.hasAttribute('data-active')), true);
    assert.equal(await p.locator('#esp-buggy-game').evaluate(d => d.open), true, 'deep link opens the game');
    await p.locator('.pb-filter[data-filter="tool"]').click();
    await p.evaluate(() => { location.hash = 'traffic-cones-game'; });
    await p.waitForTimeout(300);
    assert.equal(await p.locator('#traffic-cones-game').evaluate(d => d.open), true, 'deep link clears a hiding filter');
    assert.equal(await p.locator('.pb-filter[data-filter="all"]').getAttribute('aria-pressed'), 'true');
  }
  await ctx.close();
}

// Light theme: the copy confirmation is readable on the light panel
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); watch(p);
  await p.goto(base + '/');
  await p.locator('#ccc-2026 button[data-copy="text"]').click();
  const color = await p.locator('#ccc-2026 [role="status"]').evaluate(e => getComputedStyle(e).color);
  assert.equal(color, 'rgb(15, 118, 110)', 'status uses the light teal ink');
  await ctx.close();
}

// Effects with motion on: the spotlight follows the mouse on its own layer, the progress bar scales,
// and on a touch screen a tap ripples while a swipe (scrolling) does not.
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  const p = await ctx.newPage(); watch(p);
  await p.goto(base + '/');
  await p.mouse.move(300, 200); await p.mouse.move(640, 400);
  await p.waitForTimeout(100);
  assert.notEqual(await p.locator('.spotlight').evaluate(e => e.style.getPropertyValue('--mx')), '');
  assert.equal(await p.evaluate(() => document.documentElement.style.getPropertyValue('--mx')), '', 'no page-wide restyle per mouse move');
  await p.mouse.wheel(0, 2000); await p.waitForTimeout(200);
  assert.match(await p.locator('#scroll-progress').evaluate(e => e.style.transform), /^scaleX\(0\.\d+\)$/);
  await p.waitForTimeout(1500);
  assert.equal(await p.evaluate(() => window.__fx.parts.length + window.__fx.rings.length), 0, 'trail fades out');
  await ctx.close();
  const touch = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  const t = await touch.newPage(); watch(t);
  await t.goto(base + '/');
  const cdp = await touch.newCDPSession(t);
  const point = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await point('touchStart', 200, 700); for (let y = 680; y > 400; y -= 40) await point('touchMove', 200, y); await point('touchEnd');
  await t.waitForTimeout(50);
  assert.equal(await t.evaluate(() => window.__fx.rings.length), 0, 'a swipe sets off no ripple');
  await t.evaluate(() => scrollTo(0, 0)); await t.waitForTimeout(100);
  await point('touchStart', 200, 330); await point('touchEnd');
  await t.waitForTimeout(50);
  assert.equal(await t.evaluate(() => window.__fx.rings.length), 1, 'a tap ripples');
  await touch.close();
}

await b.close();
assert.deepEqual(issues, []);
console.log('upgrade ok');

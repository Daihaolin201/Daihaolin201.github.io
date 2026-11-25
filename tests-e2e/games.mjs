// Opens every project in the project browser, plays its game for a moment and checks it closes cleanly.
// Server from tests-e2e/dev.sh; PW=<playwright index.mjs> optional. Detailed rules are unit-tested in tests/game-*.test.mjs.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PW || 'playwright');
const base = process.env.BASE || 'http://localhost:8787', shots = process.argv[2];
const ids = ['hackabot-2026', 'openclaw-2026', 'hackabot-2025', 'puzzlethon-2024', 'traffic-cones', 'esp-buggy', 'software-tools-2026', 'local-workbenches'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const issues = [];
try {
  for (const [w, h, prefix] of [[1280, 900, '/'], [390, 844, '/zh/']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500 });
    const page = await ctx.newPage();
    page.on('pageerror', e => issues.push(e.message)); page.on('console', m => { if (m.type() === 'error') issues.push(m.text()); });
    await page.goto(base + prefix);
    assert.equal(await page.locator('.pb-panel').count(), ids.length);
    for (const id of ids) {
      await page.locator(`[data-pb-item="${id}"]`).click();
      const panel = page.locator('#' + id);
      assert.ok(await panel.isVisible(), id + ' panel shows');
      assert.equal(await page.locator('.pb-panel[data-active]').count(), 1, 'one project at a time');
      for (const step of ['3', '2', '1']) { await panel.locator(`.pb-step[data-step="${step}"]`).click(); assert.equal(await panel.getAttribute('data-stage'), step); }
      const game = panel.locator('details.play');
      await game.locator('summary').click();
      await game.locator('.play-body > :not(style)').first().waitFor({ timeout: 5000 });
      const start = game.locator('[data-gm-start]').first();
      if (await start.count()) await start.click();
      await page.waitForTimeout(600);
      assert.ok((await game.locator('.gm-status').first().innerText()).trim().length > 0, id + ' explains the goal or state');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${prefix}${id} overflows at ${w}px`);
      if (shots && w > 500) await game.screenshot({ path: `${shots}/game-${id}.png` });
      await game.locator('summary').click();
      await game.locator('.play-body > *').first().waitFor({ state: 'detached', timeout: 3000 });
    }
    // switching projects stops a game that is still open
    await page.locator('[data-pb-item="esp-buggy"]').click();
    await page.locator('#esp-buggy details.play summary').click();
    await page.locator('#esp-buggy .play-body > :not(style)').first().waitFor();
    await page.locator('[data-pb-item="hackabot-2026"]').click();
    assert.equal(await page.locator('#esp-buggy details.play').evaluate(d => d.open), false);
    // filters
    await page.locator('.pb-filter[data-filter="tool"]').click();
    assert.equal(await page.locator('.pb-list li:not([hidden])').count(), 2);
    assert.ok(await page.locator('#software-tools-2026').isVisible(), 'filter moves to the first matching project');
    // topic filter combines with the category filter; an empty combination says so
    await page.locator('.pb-filter[data-filter="all"]').click();
    await page.locator('.pb-filter[data-tag-filter="vision"]').click();
    assert.equal(await page.locator('.pb-list li:not([hidden])').count(), 3);
    await page.locator('.pb-filter[data-filter="tool"]').click();
    assert.equal(await page.locator('.pb-list li:not([hidden])').count(), 0);
    assert.ok(await page.locator('.pb-empty').isVisible(), 'empty combination is explained');
    await page.locator('.pb-filter[data-tag-filter="all"]').click();
    await page.locator('.pb-filter[data-filter="all"]').click();
    assert.equal(await page.locator('.pb-list li:not([hidden])').count(), ids.length);
    await ctx.close();
  }
  assert.deepEqual(issues, []);
  console.log('games ok');
} finally { await browser.close(); }

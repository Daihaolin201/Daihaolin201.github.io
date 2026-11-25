// Touch play check: node tests-e2e/touch.mjs  (BASE=<server>, PW=<playwright index.mjs>).
// Real touch events (Playwright touch emulation and CDP multi-touch): two fingers on the trolley pads,
// tap-through of the week planner and cone round 1, the buggy lap, and the sign pad.
import assert from 'node:assert/strict';
import * as week from '../src/lib/games/week.logic.ts';
import * as cones from '../src/lib/games/cones.logic.ts';
const { chromium } = await import(process.env.PW || 'playwright');
const base = process.env.BASE || 'http://localhost:8787';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const issues = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  page.on('pageerror', e => issues.push(e.message));
  await page.goto(base + '/zh/');
  const open = async id => {
    await page.locator(`[data-pb-item="${id}"]`).tap();
    await page.locator(`#${id} details.play summary`).tap();
    await page.locator(`#${id} .play-body > :not(style)`).first().waitFor();
    return page.locator(`#${id} .play-body`);
  };
  const status = body => body.locator('.gm-status').first().innerText();
  const centre = async loc => { await loc.scrollIntoViewIfNeeded(); const r = await loc.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const waitStatus = async (body, re, tries = 80) => { let s = ''; for (let i = 0; i < tries; i++) { s = await status(body); if (re.test(s)) return s; await page.waitForTimeout(250); } return s; };
  const close = id => page.locator(`#${id} details.play summary`).tap();

  { // trolley level 1: both pads held at once with two fingers
    const body = await open('hackabot-2026');
    await body.locator('[data-gm-start]').tap();
    const pts = [await centre(body.locator('.gm-trolley-pad').nth(0)), await centre(body.locator('.gm-trolley-pad').nth(1))];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts.map((p, i) => ({ ...p, id: i + 1 })) });
    const s = await waitStatus(body, /通过|撞|时间到/);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.match(s, /通过/, 'trolley level 1 cleared with two fingers: ' + s);
    await close('hackabot-2026');
  }
  { // week planner: every level by taps
    const body = await open('local-workbenches');
    for (let li = 0; li < week.LEVELS.length; li++) {
      await body.locator('.gm-week-tab').nth(li).tap();
      for (const it of week.solve(week.LEVELS[li]).filter(i => i.kind !== 'fixed')) {
        if (week.LEVELS[li].items.find(x => x.id === it.id).day !== undefined) continue;
        await body.locator('.gm-job').first().tap();
        await body.locator('.gm-week-cell').nth((it.hour - week.WEEK.first) * week.WEEK.days + it.day).tap();
      }
      assert.ok(await body.locator('.gm-week-banner.show').count(), `week level ${li + 1} solved by touch`);
    }
    await close('local-workbenches');
  }
  { // traffic cones round 1: tap a cone, tap its slot
    const body = await open('traffic-cones'), cv = body.locator('canvas').first();
    await body.locator('.gm-btn.primary.big').tap();
    const rd = cones.newRound(0);
    for (let k = 0; k < rd.cones.length; k++) for (const p of [rd.cones[k], rd.slots[k]]) {
      await cv.scrollIntoViewIfNeeded(); const r = await cv.boundingBox();
      await page.touchscreen.tap(r.x + p.x * r.width / cones.W, r.y + p.y * r.height / cones.H);
    }
    assert.match(await waitStatus(body, /车道封闭|急刹|紧急制动/), /车道封闭/, 'cone round 1 closed by touch');
    await close('traffic-cones');
  }
  { // buggy: example gains by tap, one lap
    const body = await open('esp-buggy');
    await body.locator('button:has-text("阻尼")').first().tap().catch(() => body.locator('.gm-buggy-lab + button').last().tap());
    assert.match(await waitStatus(body, /用时|离线/, 120), /用时/, 'buggy lap finished');
    await close('esp-buggy');
  }
  { // signs: the three answer buttons take taps and a round runs to its end
    const body = await open('puzzlethon-2024');
    await body.locator('[data-gm-start]').tap();
    let s = '', n = 0;
    for (let i = 0; i < 200 && !/本局结束|Round over/.test(s); i++) { await body.locator('.gm-signs-pad .gm-btn').nth(n++ % 3).tap({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); s = await status(body); }
    assert.match(s, /本局结束|Round over/, 'sign round ends: ' + s);
  }
  assert.deepEqual(issues, []);
  console.log('touch ok');
} finally { await browser.close(); }

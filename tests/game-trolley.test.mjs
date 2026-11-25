import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/trolley.logic.ts';

const DT = 1 / 60;
/** Drive with constant target pushes (through the push ramp) until the run ends. */
function drive(lv, targetFor, max = 3000) {
  let s = g.newTrolley(lv), pA = 0, pB = 0;
  for (let i = 0; i < max && s.state === 'run'; i++) { const [ta, tb] = targetFor(s); pA = g.slew(pA, ta, DT); pB = g.slew(pB, tb, DT); s = g.stepTrolley(s, pA, pB, DT, lv); }
  return s;
}
const auto = lv => s => { const t = g.autoPush(s, lv); return [t.a, t.b]; };

test('trolley: holding raises a push, releasing lets it decay, both within 0..100', () => {
  let p = 0; for (let i = 0; i < 30; i++) p = g.slew(p, 100, DT);
  assert.ok(p > 60 && p < 100, 'ramping, not instant: ' + p);
  for (let i = 0; i < 300; i++) p = g.slew(p, 100, DT);
  assert.equal(p, 100);
  const q = g.slew(100, 0, DT); assert.ok(q < 100 && q > 90);
  for (let i = 0; i < 300; i++) p = g.slew(p, 0, DT);
  assert.equal(p, 0);
});

test('trolley: equal pushes go straight, a harder top push turns it down, a harder bottom push turns it up', () => {
  const lv = g.LEVELS[0];
  let s = g.newTrolley(lv); for (let i = 0; i < 120; i++) s = g.stepTrolley(s, 80, 80, DT, lv);
  assert.equal(s.a, 0); assert.equal(s.y, lv.start.y); assert.ok(s.x > lv.start.x + 100);
  let d = g.newTrolley(lv); for (let i = 0; i < 30; i++) d = g.stepTrolley(d, 90, 50, DT, lv);
  assert.ok(d.a > 0.05, 'top harder turns towards +y (down on screen): ' + d.a);
  let u = g.newTrolley(lv); for (let i = 0; i < 30; i++) u = g.stepTrolley(u, 50, 90, DT, lv);
  assert.ok(u.a < -0.05, 'bottom harder turns up: ' + u.a);
  let z = g.newTrolley(lv); for (let i = 0; i < 600; i++) z = g.stepTrolley(z, 0, 0, DT, lv);
  assert.equal(z.state, 'run'); assert.equal(z.x, lv.start.x);
  assert.equal(g.stepTrolley({ ...g.newTrolley(lv), state: 'won' }, 10, 90, 1, lv).state, 'won', 'a finished run stays finished');
});

test('trolley level 1: full push straight wins, a lopsided push ends at the wall', () => {
  const lv = g.LEVELS[0];
  const w = drive(lv, () => [100, 100]); assert.equal(w.state, 'won'); assert.ok(w.t > 3 && w.t < 6, 'time ' + w.t);
  const c = drive(lv, () => [100, 60]); assert.equal(c.state, 'crashed'); assert.equal(c.why, 'wall');
});

test('trolley level 2: the straight line hits a pillar, collision uses the hexagon shape', () => {
  const lv = g.LEVELS[1];
  const c = drive(lv, () => [100, 100]); assert.equal(c.state, 'crashed'); assert.equal(c.why, 'pillar');
  const h = lv.hexes[0];
  assert.equal(g.hitsHex({ x: h.x, y: h.y, a: 0 }, h), true);
  assert.equal(g.hitsHex({ x: h.x - 100, y: h.y, a: 0 }, h), false);
  // Just clear of the flat top edge (apothem = r * sqrt(3) / 2): body half-width plus the apothem.
  const clear = h.y - h.r * Math.sqrt(3) / 2 - g.BODY.hw - 1;
  assert.equal(g.hitsHex({ x: h.x, y: clear, a: 0 }, h), false);
  assert.equal(g.hitsHex({ x: h.x, y: clear + 3, a: 0 }, h), true);
});

test('trolley level 3: straight line clips the gate, running out the clock ends the run', () => {
  const lv = g.LEVELS[2];
  const c = drive(lv, () => [100, 100]); assert.equal(c.state, 'crashed'); assert.equal(c.why, 'gate');
  const slow = drive(lv, () => [18, 18]); assert.equal(slow.state, 'crashed'); assert.equal(slow.why, 'time'); assert.ok(Math.abs(slow.t - lv.limit) < 0.05);
});

test('trolley: arriving crooked at the goal does not count', () => {
  const lv = g.LEVELS[0];
  const s = g.stepTrolley({ ...g.newTrolley(lv), x: lv.goal.x - 0.1, a: 0.8 }, 100, 100, DT, lv);
  assert.equal(s.state, 'crashed'); assert.ok(['crooked', 'wall'].includes(s.why));
});

test('trolley: the coordinated autopilot clears every level and earns 3 stars', () => {
  for (const lv of g.LEVELS) {
    const s = drive(lv, auto(lv)); assert.equal(s.state, 'won', `level ${lv.id}: ${s.why}`);
    assert.equal(g.starsFor(lv, s.t), 3, `level ${lv.id} time ${s.t}`);
    assert.ok(Math.abs(s.a) < 0.5);
  }
});

test('trolley: stars follow the par times and levels get harder', () => {
  const lv = g.LEVELS[1];
  assert.equal(g.starsFor(lv, lv.par[0]), 3); assert.equal(g.starsFor(lv, lv.par[0] + 0.01), 2);
  assert.equal(g.starsFor(lv, lv.par[1]), 2); assert.equal(g.starsFor(lv, lv.par[1] + 0.01), 1);
  assert.deepEqual(g.LEVELS.map(l => l.hexes.length), [0, 2, 0]); assert.ok(g.LEVELS[2].gate && g.LEVELS[2].limit);
});

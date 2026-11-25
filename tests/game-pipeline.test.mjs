import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/pipeline.logic.ts';

const rng = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const run = (p, secs, rand, each) => { for (let k = 0; k < secs * 10 && !p.finished; k++) { each?.(p); g.tickPipe(p, 0.1, rand); } };
/** A reasonable player: runs every free stage, clears stuck stages, answers complaints, buys upgrades. */
const player = p => {
  for (let i = 0; i < 4; i++) g.startStage(p, i);
  g.unblock(p); g.sendBack(p);
  for (let i = 0; i < 4; i++) g.buyAuto(p, i);
  for (let i = 0; i < 4; i++) g.buyWorker(p, i);
};

test('pipeline: one idea passes four agents by hand, pays out and costs nothing to run', () => {
  const p = g.newPipe(); p.spawnT = 99; p.nextEvent = 999; p.stages[0].q = 1;
  for (let i = 0; i < 4; i++) { assert.equal(g.startStage(p, i), true); run(p, 2, () => 0.99); }
  assert.equal(p.mrr, g.gain(0)); assert.equal(p.cash, g.PIPE.startCash + g.gain(0)); assert.equal(p.completed, 1);
  assert.equal(g.startStage(p, 0), false, 'nothing queued');
});

test('pipeline: feedback sends an idea back to Product with a higher version', () => {
  const p = g.newPipe(); p.spawnT = 99; p.nextEvent = 999; p.stages[0].q = 1;
  for (let i = 0; i < 4; i++) { g.startStage(p, i); run(p, 2, () => 0.0); }
  assert.equal(p.quality, 1); assert.equal(p.stages[0].q, 1); assert.equal(p.iterations, 1);
  assert.ok(g.gain(1) > g.gain(0), 'a better version earns more');
});

test('pipeline: upgrades cost cash, the price rises, a second worker runs two jobs at once', () => {
  const p = g.newPipe(); p.nextEvent = 999;
  assert.equal(g.buyAuto(p, 1), false, 'not enough cash');
  p.cash = 100; const c1 = g.autoCost(p);
  assert.equal(g.buyAuto(p, 1), true); assert.equal(p.cash, 100 - c1); assert.ok(g.autoCost(p) > c1);
  assert.equal(g.buyAuto(p, 1), false, 'already automated');
  assert.equal(g.buyWorker(p, 0), true); assert.equal(g.buyWorker(p, 0), false, 'one extra worker per stage');
  p.stages[0].q = 3; assert.equal(g.startStage(p, 0), true); assert.equal(g.startStage(p, 0), true); assert.equal(g.startStage(p, 0), false);
  const a = g.newPipe(); a.nextEvent = 999; a.spawnT = 99; a.stages[1].auto = true; a.stages[1].q = 2;
  run(a, 5, () => 0.5); assert.equal(a.stages[1].q, 0, 'an automated stage starts its own jobs');
  assert.equal(a.stages[2].q, 2);
});

test('pipeline: events arrive every 8 to 12 s from the seeded random source', () => {
  const p = g.newPipe(); const rand = rng(7); const times = [];
  run(p, 120, rand, q => { for (const f of q.fx.splice(0)) if (f.t === 'event') times.push(q.time); });
  assert.ok(times.length >= 8 && times.length <= 15, `events: ${times.length}`);
  assert.ok(times[0] >= g.PIPE.firstEvent - 0.2 && times[0] <= g.PIPE.firstEvent + 0.3);
  for (let i = 1; i < times.length; i++) { const gap = times[i] - times[i - 1]; assert.ok(gap >= 7.8 && gap <= 12.3, `gap ${gap}`); }
  const again = g.newPipe(); const t2 = []; const r2 = rng(7);
  run(again, 120, r2, q => { for (const f of q.fx.splice(0)) if (f.t === 'event') t2.push(q.time); });
  assert.deepEqual(t2, times, 'same seed, same events');
});

test('pipeline: viral post adds ideas, an outage pauses operations, a stuck stage waits for the manager', () => {
  const p = g.newPipe(); p.nextEvent = 999; p.spawnT = 99;
  p.outage = 3; p.stages[3].q = 1; assert.equal(g.startStage(p, 3), false, 'operations is down');
  run(p, 3.2, () => 0.5); assert.equal(g.startStage(p, 3), true, 'back up');
  const s = g.newPipe(); s.nextEvent = 999; s.spawnT = 99; s.stages[2].stuck = 15; s.stages[2].q = 1; s.stages[2].auto = true;
  run(s, 5, () => 0.5); assert.equal(s.stages[2].q, 1, 'stuck stage does nothing');
  assert.equal(g.unblock(s), 1); run(s, 3, () => 0.5); assert.equal(s.stages[3].q, 1, 'moves on after the manager clears it');
  assert.equal(g.unblock(s), 0);
  const v = g.newPipe(); v.nextEvent = 0.1; v.spawnT = 99; const picks = [];
  for (let seed = 1; seed < 60 && picks.length < 4; seed++) { const q = g.newPipe(); q.mrr = 50; q.nextEvent = 0.01; q.spawnT = 99; g.tickPipe(q, 0.05, rng(seed)); const e = q.fx.find(f => f.t === 'event'); if (e && !picks.includes(e.kind)) picks.push(e.kind); }
  assert.deepEqual([...picks].sort(), ['complaint', 'outage', 'stuck', 'viral']);
});

test('pipeline: a complaint is turned into a better version if sent back in time, otherwise it costs revenue', () => {
  const a = g.newPipe(); a.nextEvent = 999; a.spawnT = 99; a.mrr = 40; a.quality = 2; a.complaint = 8;
  assert.equal(g.sendBack(a), true); assert.equal(a.quality, 3); assert.equal(a.stages[0].q, 1); assert.equal(a.mrr, 40); assert.equal(g.sendBack(a), false);
  const b = g.newPipe(); b.nextEvent = 999; b.spawnT = 99; b.mrr = 40; b.quality = 2; b.complaint = 8;
  run(b, 8.3, () => 0.5); assert.equal(b.quality, 1); assert.equal(b.mrr, 37); assert.equal(b.complaint, 0);
  assert.ok(b.fx.some(f => f.t === 'lapsed'));
});

test('pipeline: milestones are timed and starred; a player who keeps up reaches $500, one who idles does not', () => {
  assert.deepEqual([g.stars(0, 60), g.stars(0, 90), g.stars(0, 200)], [3, 2, 1]);
  for (const seed of [1, 2, 3]) {
    const p = g.newPipe(); run(p, g.PIPE.limit, rng(seed), player);
    assert.ok(p.won, `seed ${seed} won at ${p.time.toFixed(0)} s, mrr ${p.mrr}`);
    assert.ok(p.ms[0] < p.ms[1] && p.ms[1] < p.ms[2]);
    assert.ok(p.ms[0] < 100 && p.ms[2] < g.PIPE.limit);
  }
  const idle = g.newPipe(); run(idle, g.PIPE.limit, rng(4)); assert.equal(idle.won, false); assert.equal(idle.finished, true); assert.equal(idle.mrr, 0);
});

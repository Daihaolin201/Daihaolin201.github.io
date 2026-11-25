import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/maze.logic.ts';

const DT = 1 / 60;
function run(track, drive, max = 8000) {
  let r = g.newRunner(track), loading = 0;
  for (let i = 0; i < max && r.phase !== 'done' && r.phase !== 'out'; i++) { r = g.stepRunner(r, ...drive(r, track)); if (r.phase === 'loading') loading++; }
  return { r, loading };
}
const ghost = (r, t) => [0, DT, t, { auto: true, pace: g.MAZE.ghostPace }];

test('maze: geometry helpers', () => {
  const t = g.TRACKS[0];
  assert.ok(g.nearestOnPath(t.path, { x: 100, y: 140 }).d < 0.01);
  assert.deepEqual(g.pointAhead(t.path, 0, 0, 70 + 10), { x: 100, y: 180 });
});

test('maze: tracks are ordered by difficulty and their tape never runs close to itself', () => {
  assert.deepEqual(g.TRACKS.map(t => t.id), [1, 2, 3]);
  const lens = g.TRACKS.map(t => g.arcs(t.path).at(-1)); assert.ok(lens[0] < lens[1] && lens[1] < lens[2], lens.join());
  for (const t of g.TRACKS) {
    for (let s = 0; s < t.cum.at(-1); s += 4) {
      const p = g.pointAhead(t.path, 0, 0, s), n = g.nearestOnPath(t.path, p);
      assert.ok(n.d < 0.01);
      // away from its own neighbourhood (ahead/behind by 60 px of tape) the tape is at least 26 px away
      const far = t.path.flatMap((a, i) => i ? Array.from({ length: 20 }, (_, k) => ({ s: t.cum[i - 1] + (t.cum[i] - t.cum[i - 1]) * k / 20, q: { x: t.path[i - 1].x + (a.x - t.path[i - 1].x) * k / 20, y: t.path[i - 1].y + (a.y - t.path[i - 1].y) * k / 20 } })) : []).filter(o => Math.abs(o.s - s) > 60);
      for (const o of far) assert.ok(Math.hypot(o.q.x - p.x, o.q.y - p.y) >= 26, `track ${t.id} at s=${s}`);
    }
    assert.ok(t.cps.length >= 4 && t.cps[0] === 0); assert.deepEqual([...t.cps].sort((a, b) => a - b), t.cps);
  }
});

test('maze: the ghost autopilot delivers on every track without leaving the tape, pausing at Pickup', () => {
  for (const t of g.TRACKS) {
    const { r, loading } = run(t, ghost);
    assert.equal(r.phase, 'done', `track ${t.id}`); assert.equal(r.strikes, 0); assert.equal(r.picked, true);
    assert.ok(loading > g.MAZE.pause * 60 - 3 && loading < g.MAZE.pause * 60 + 3, 'pause frames ' + loading);
    assert.ok(Math.abs(g.ghostTime(t) - g.total(r)) < 1e-6, 'ghostTime matches');
  }
  const times = g.TRACKS.map(t => g.ghostTime(t)); assert.ok(times[0] < times[1] && times[1] < times[2], times.join());
});

test('maze: driving straight leaves the tape; a strike respawns at the last checkpoint with a penalty, the third ends the run', () => {
  const t = g.TRACKS[0];
  let r = g.newRunner(t), seen = null;
  for (let i = 0; i < 2000 && r.phase !== 'out'; i++) {
    const before = r.strikes; r = g.stepRunner(r, 0, DT, t);
    if (r.strikes > before && !seen) seen = { ...r };
  }
  assert.equal(r.phase, 'out'); assert.equal(r.strikes, g.MAZE.maxStrikes); assert.equal(r.penalty, g.MAZE.penalty * 3);
  assert.equal(seen.phase, 'recover'); assert.equal(seen.penalty, g.MAZE.penalty);
  assert.ok(g.nearestOnPath(t.path, seen).d < 0.5, 'respawned on the tape');
  // first strike on track 1 happens on the first straight, so the respawn is at the start checkpoint
  assert.deepEqual({ x: seen.x, y: seen.y }, t.path[0]);
  assert.ok(g.total(r) > r.time);
});

test('maze: respawn goes to the latest checkpoint passed, and the pause is not repeated', () => {
  const t = g.TRACKS[0];
  let r = g.newRunner(t);
  // follow the ghost until past the pickup and the corner after it, then steer off the tape
  while (r.prog < t.cps.at(-1) + 5) r = g.stepRunner(r, 0, DT, t, { auto: true });
  assert.equal(r.picked, true); assert.ok(r.cp >= 3);
  const cpS = t.cps[r.cp];
  for (let i = 0; i < 600 && r.strikes === 0; i++) r = g.stepRunner(r, 1, DT, t);
  assert.equal(r.strikes, 1); assert.equal(r.phase, 'recover');
  const p = g.pointAhead(t.path, 0, 0, cpS); assert.ok(Math.hypot(p.x - r.x, p.y - r.y) < 1e-6);
  assert.equal(r.picked, true); assert.equal(r.prog, cpS);
});

test('maze: Slow halves the speed and the turning radius; the hairpin needs it', () => {
  const t = g.TRACKS[0];
  const a = g.stepRunner(g.newRunner(t), 0, 1, t, {}), b = g.stepRunner(g.newRunner(t), 0, 1, t, { slow: true });
  assert.ok(Math.abs((b.x - t.path[0].x) * 2 - (a.x - t.path[0].x)) < 1e-9);
  const hair = g.TRACKS[2];
  const fast = run(hair, (r, tr) => [g.autoSteer(r, tr).steer, DT, tr, { slow: false }]);
  const slow = run(hair, (r, tr) => [g.autoSteer(r, tr).steer, DT, tr, { slow: true }]);
  assert.ok(fast.r.strikes > 0, 'full speed through the hairpin leaves the tape');
  assert.equal(slow.r.phase, 'done'); assert.equal(slow.r.strikes, 0);
});

test('maze: a careful human proxy (full speed on straights, slow in corners) beats the ghost on every track', () => {
  const human = (r, t) => {
    const n = g.nearestOnPath(t.path, r), tg = g.pointAhead(t.path, n.i, n.t, 20);
    const e = Math.atan2(Math.sin(Math.atan2(tg.y - r.y, tg.x - r.x) - r.h), Math.cos(Math.atan2(tg.y - r.y, tg.x - r.x) - r.h));
    return [Math.abs(e) < 0.08 ? 0 : Math.sign(e), DT, t, { slow: Math.abs(e) > 0.8 }];
  };
  for (const t of g.TRACKS) {
    const { r } = run(t, human); assert.equal(r.phase, 'done', `track ${t.id}`);
    assert.equal(g.starsFor(r, g.ghostTime(t)), r.strikes === 0 ? 3 : 2, `track ${t.id} ${g.total(r)} vs ${g.ghostTime(t)}`);
  }
});

test('maze: stars', () => {
  const done = (time, strikes) => ({ ...g.newRunner(g.TRACKS[0]), phase: 'done', time, penalty: strikes * 3, strikes });
  assert.equal(g.starsFor(done(10, 0), 12), 3);
  assert.equal(g.starsFor(done(10, 1), 14), 2);   // 13 total beats 14 but has a strike
  assert.equal(g.starsFor(done(10, 0), 10), 1);   // a tie is not a win
  assert.equal(g.starsFor(done(20, 0), 12), 1);
  assert.equal(g.starsFor({ ...done(5, 0), phase: 'out' }, 12), 0);
});

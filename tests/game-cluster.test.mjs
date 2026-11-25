import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/cluster.logic.ts';

const idle = (st, steps) => { for (let i = 0; i < steps && !st.over; i++) g.advance(st, false); };
const J = (id, rows, cols, extra = {}) => ({ id, kind: 'post', rows, cols, urgent: false, left: 0, mult: 1, ...extra });

test('cluster: placement stays inside the window and never overlaps', () => {
  const st = g.createGame('normal', 7);
  st.queue = [J(1, 2, 4), J(2, 1, 8), J(3, 4, 2)];
  assert.equal(g.canPlace(st, st.queue[0], 0, 0), true);
  assert.equal(g.place(st, 1, 0, 0), true);
  assert.equal(g.canPlace(st, J(2, 1, 8), 1, 2), false, 'overlaps the first job');
  assert.equal(g.canPlace(st, J(2, 1, 8), 2, 0), true);
  assert.equal(g.canPlace(st, J(2, 1, 8), 2, 5), false, 'runs past the visible window');
  assert.equal(g.canPlace(st, J(3, 4, 2), 1, 0), false, 'below the last node');
  assert.equal(g.canPlace(st, J(3, 4, 2), 0, -1), false);
  assert.deepEqual(g.anchor(st, J(3, 4, 2), 3, 11), { r: 0, c: 10 }, 'edge taps slide back inside');
});

test('cluster: an hour scores busy nodes, counts idle ones as waste, and finished jobs scroll away', () => {
  const st = g.createGame('easy', 3);
  st.nextArrival = 1e9;
  st.queue = [J(1, 2, 2)];
  g.place(st, 1, 0, 0);
  const hourSteps = g.LEVELS.easy.hourSteps;
  idle(st, hourSteps);
  assert.equal(st.t, 1); assert.equal(st.score, 2); assert.equal(st.ran, 2); assert.equal(st.waste, 2);
  assert.equal(g.utilisation(st), 0.5);
  idle(st, hourSteps);
  assert.equal(st.t, 2); assert.equal(st.score, 4); assert.equal(st.finished, 1); assert.equal(st.placed.length, 0);
  assert.equal(g.canPlace(st, J(9, 1, 1), 0, 1), false, 'the past cannot be scheduled');
  assert.equal(g.canPlace(st, J(9, 1, 1), 0, 2), true);
});

test('cluster: a job can be taken back until it starts, and only if the queue has room', () => {
  const st = g.createGame('easy', 3);
  st.nextArrival = 1e9;
  st.queue = [J(1, 1, 3)]; g.place(st, 1, 0, 0);
  idle(st, g.LEVELS.easy.hourSteps);
  assert.equal(g.takeBack(st, 1), false, 'already running');
  st.queue = [J(2, 1, 2)]; g.place(st, 2, 1, 5);
  assert.equal(g.takeBack(st, 2), true); assert.equal(st.placed.some(j => j.id === 2), false);
  g.place(st, 2, 1, 5);
  st.queue = Array.from({ length: g.MAX_QUEUE }, (_, i) => J(20 + i, 1, 1));
  assert.equal(g.takeBack(st, 2), false, 'queue full');
});

test('cluster: urgent job counts double if placed in time, and expires otherwise', () => {
  const st = g.createGame('normal', 11);
  st.nextArrival = 1e9;
  st.queue = [J(1, 1, 2, { urgent: true, left: g.LEVELS.normal.urgentSec }), J(2, 1, 2, { urgent: true, left: 1 })];
  g.place(st, 1, 0, 0);
  assert.equal(st.queue.find(j => j.id === 1), undefined);
  assert.equal(st.urgentHit, 1);
  idle(st, 4 * 2);
  assert.equal(st.missed, 1, 'second urgent job ran out of seconds');
  assert.equal(st.queue.length, 0);
  idle(st, g.LEVELS.normal.hourSteps - 8);
  assert.equal(st.t, 1);
  assert.equal(st.score, 2, 'one node for one hour, doubled');
});

test('cluster: a sixth waiting job ends the round', () => {
  const st = g.createGame('hard', 5);
  st.queue = Array.from({ length: g.MAX_QUEUE }, (_, i) => J(30 + i, 1, 1));
  st.nextArrival = g.clockOf(st) + g.STEP;
  const ev = g.advance(st, false);
  assert.equal(st.over, 'overflow'); assert.ok(ev.includes('overflow'));
  const frozen = st.step; g.advance(st, false); assert.equal(st.step, frozen, 'nothing moves after the end');
});

test('cluster: the same seed gives the same arrivals, whoever plays', () => {
  const a = g.createGame('normal', 42), b = g.createGame('normal', 42), c = g.createGame('normal', 43);
  for (let i = 0; i < 400; i++) { g.advance(a, true); g.advance(b, false); g.advance(c, true); }
  const n = Math.min(a.arrived.length, b.arrived.length);
  assert.ok(n >= 4);
  assert.deepEqual(a.arrived.slice(0, n), b.arrived.slice(0, n));
  assert.notDeepEqual(c.arrived.slice(0, n), a.arrived.slice(0, n));
});

test('cluster: greedy scheduler plays a full valid round on every level', () => {
  for (const lv of ['easy', 'normal', 'hard']) for (const seed of [1, 2, 3, 4, 5]) {
    const st = g.simulate(lv, seed);
    assert.equal(st.over, 'done', `${lv} seed ${seed} ended as ${st.over}`);
    assert.equal(st.t, g.LEVELS[lv].hours);
    assert.equal(st.ran + st.waste, g.LEVELS[lv].hours * g.ROWS);
    assert.ok(st.score > 0 && g.utilisation(st) > 0.45 && g.utilisation(st) <= 1);
    assert.equal(g.simulate(lv, seed).score, st.score, 'deterministic');
  }
  assert.ok(g.simulate('hard', 1).score > g.simulate('easy', 1).score, 'harder levels offer more work');
});

test('cluster: an idle player overflows the queue', () => {
  const st = g.createGame('hard', 9);
  idle(st, 4000);
  assert.equal(st.over, 'overflow'); assert.equal(st.score, 0);
});

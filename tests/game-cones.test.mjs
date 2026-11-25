import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/cones.logic.ts';

const cone = (x, y, path = []) => ({ x, y, path, slot: -1, stopped: false });
const play = (r, secs, each) => { for (let k = 0; k < secs * 60 && r.car.state !== 'gone'; k++) { each?.(r, k / 60); g.tickRound(r, 1 / 60); } };

test('cones: a cone stops for another cone straight ahead and never touches it', () => {
  let a = cone(0, 0, [{ x: 200, y: 0 }]), b = cone(60, 0, [{ x: -140, y: 0 }]);
  for (let i = 0; i < 600; i++) { const na = g.stepCone(a, [b], null, 1 / 60), nb = g.stepCone(b, [a], null, 1 / 60); a = na; b = nb; }
  assert.ok(a.stopped && b.stopped); assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 20, 'no collision');
  let lone = cone(0, 0, [{ x: 100, y: 50 }]); for (let i = 0; i < 300; i++) lone = g.stepCone(lone, [], null, 1 / 60);
  assert.ok(Math.hypot(lone.x - 100, lone.y - 50) < 1.5 && lone.path.length === 0);
  const side = g.stepCone(cone(0, 0, [{ x: 100, y: 0 }]), [cone(10, 30)], null, 1 / 60);
  assert.equal(side.stopped, false, 'a cone off to the side is not in the sensor beam');
});

test('cones: the parked van stops a cone that drives at it, and a waypoint gets it around', () => {
  const r = g.newRound(2); const van = r.obstacle;
  let direct = cone(140, 262, [{ x: 270, y: 224 }]);
  for (let i = 0; i < 300; i++) direct = g.stepCone(direct, [], van, 1 / 60);
  assert.equal(direct.stopped, true); assert.ok(direct.x < van.x, 'stopped before the van');
  let routed = cone(100, 262, [g.VIA, { x: 270, y: 224 }]);
  for (let i = 0; i < 600; i++) routed = g.stepCone(routed, [], van, 1 / 60);
  assert.ok(Math.hypot(routed.x - 270, routed.y - 224) < 1.5, 'reached the slot via the waypoint');
});

test('cones: a slot belongs to one cone, and the lane is closed only when every slot has its own cone', () => {
  const r = g.newRound(0);
  assert.equal(g.assign(r, 0, 1), true); assert.equal(g.assign(r, 1, 1), true);
  assert.equal(r.cones[0].slot, -1, 'the first cone let go of the slot');
  assert.equal(g.assign(r, 0, 9), false); assert.equal(g.assign(r, 7, 0), false);
  const done = g.newRound(0);
  done.cones.forEach((c, k) => { c.x = done.slots[k].x + 1; c.y = done.slots[k].y; c.slot = k; });
  assert.equal(g.laneClosed(done), true);
  done.cones[2].slot = 1; assert.equal(g.laneClosed(done), false, 'two cones on one slot leave another slot empty');
  const near = g.newRound(0); near.cones[0] = { ...near.cones[0], x: near.slots[0].x, y: near.slots[0].y, slot: 0, path: [near.slots[1]] };
  assert.equal(g.slotFilled(near, 0), false, 'a cone still on its way does not count');
});

test('cones: the car waits for the countdown, then merges if the lane is closed and brakes hard if it is not', () => {
  const idle = g.newRound(0); g.tickRound(idle, 1);
  assert.equal(idle.car.state, 'wait'); assert.equal(idle.car.x, g.CAR.startX);
  play(idle, 40);
  assert.equal(idle.result, 'fail'); assert.equal(idle.car.v, 0);
  assert.ok(idle.car.x >= g.CAR.decideX && idle.car.x < idle.slots[0].x - 20, 'stopped in front of the work zone');
  assert.equal(g.starsFor(idle), 0);
  const ok = g.newRound(0);
  ok.cones.forEach((c, k) => { c.x = ok.slots[k].x; c.y = ok.slots[k].y; c.slot = k; });
  play(ok, 40);
  assert.equal(ok.result, 'safe'); assert.equal(ok.car.state, 'gone'); assert.ok(Math.abs(ok.car.y - g.ROAD.laneB) < 1, 'merged into the other lane');
  assert.equal(g.starsFor(ok), 3);
  const late = g.newRound(0); // closing after the car has reached the decision point is too late
  play(late, late.decideAt + 0.5); late.cones.forEach((c, k) => { c.x = late.slots[k].x; c.y = late.slots[k].y; c.slot = k; });
  g.tickRound(late, 1 / 60); assert.equal(late.result, 'fail');
});

test('cones: stars follow the share of time left, and every round can be won by sending cones one after another', () => {
  const r = g.newRound(0); r.result = 'safe'; r.decideAt = 10;
  r.closedAt = 5; assert.equal(g.starsFor(r), 3); r.closedAt = 7; assert.equal(g.starsFor(r), 2); r.closedAt = 9.5; assert.equal(g.starsFor(r), 1);
  const perms = a => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));
  g.ROUNDS.forEach((def, ri) => {
    let wins = 0, best = 0, total = 0;
    for (const perm of perms([...Array(def.slots).keys()])) for (const rev of [false, true]) {
      const round = g.newRound(ri), order = [...Array(def.slots).keys()]; if (rev) order.reverse();
      let sent = 0;
      play(round, 40, rr => { if (sent < order.length && rr.t >= 0.5 + sent * 1.5) { const ci = order[sent++]; g.assign(rr, ci, perm[ci], rr.obstacle ? [g.VIA] : []); } });
      total++; if (round.result === 'safe') { wins++; best = Math.max(best, g.starsFor(round)); }
    }
    assert.ok(wins >= total / 4, `round ${ri + 1}: ${wins}/${total} orders win`);
    assert.equal(best, 3, `round ${ri + 1} can earn three stars`);
  });
  assert.ok(g.ROUNDS[1].slots > g.ROUNDS[0].slots && g.ROUNDS[2].slots > g.ROUNDS[1].slots);
  assert.ok(g.decisionTime(g.ROUNDS[1]) < g.decisionTime(g.ROUNDS[0]), 'round 2 gives less time than round 1');
  assert.equal(g.ROUNDS[2].obstacle, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/signs.logic.ts';

const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const play = (round, steps, answerWith) => { for (let i = 0; i < steps && !round.over; i++) { round.tick(0.05); const t = round.target; if (t && answerWith) round.answer(answerWith(t)); } };
const right = (t) => g.ANSWER[t.kind];

test('signs: lights and signs map to the right response, amber is slow', () => {
  assert.equal(g.judge('red', 'stop'), true); assert.equal(g.judge('green', 'go'), true);
  assert.equal(g.judge('stop', 'stop'), true); assert.equal(g.judge('slow', 'slow'), true);
  assert.equal(g.judge('amber', 'slow'), true); assert.equal(g.judge('amber', 'go'), false);
  assert.equal(g.judge('green', 'stop'), false); assert.equal(g.judge('red', 'go'), false);
  const seen = new Set(); for (let i = 0; i < 400; i++) seen.add(g.pickSign(Math.random)); assert.equal(seen.size, 4);
  assert.equal(g.pickSign(() => 0.9999999), 'slow');
});

test('signs: level rises every ten correct answers and the road speeds up', () => {
  assert.equal(g.levelFor(0), 1); assert.equal(g.levelFor(9), 1); assert.equal(g.levelFor(10), 2); assert.equal(g.levelFor(35), 4);
  for (let l = 1; l < 8; l++) assert.ok(g.approachTime(l + 1) <= g.approachTime(l) && g.spawnGap(l + 1) <= g.spawnGap(l));
  assert.ok(g.approachTime(2) < g.approachTime(1));
  assert.ok(g.approachTime(50) >= 1.5, 'never impossible');
});

test('signs: combo multiplier steps up and is capped', () => {
  assert.deepEqual([0, 3, 4, 8, 12, 16, 99].map(g.multiplier), [1, 1, 2, 3, 4, 5, 5]);
});

test('signs: harder cases arrive at later levels', () => {
  assert.ok(!g.kindsFor(1).includes('amber') && g.kindsFor(2).includes('amber'));
  assert.deepEqual(g.condsFor(2), ['clear']); assert.ok(g.condsFor(3).includes('tree') && g.condsFor(3).includes('dark'));
  assert.equal(g.pairChance(3), 0); assert.ok(g.pairChance(4) > 0);
  const r = new g.Round(seeded(7)); let pairs = 0, odd = 0;
  r.correct = 30;
  for (let i = 0; i < 400; i++) { r.tick(0.05); if (r.items.length > 1) pairs++; if (r.items.some(x => x.cond !== 'clear')) odd++; r.items = r.items.filter(x => x.p < 0.5); }
  assert.ok(pairs > 0 && odd > 0);
  const early = new g.Round(seeded(7)); for (let i = 0; i < 300; i++) { early.tick(0.05); assert.ok(early.items.every(x => x.cond === 'clear' && x.kind !== 'amber')); early.items = []; }
});

test('signs: correct answers score with the multiplier and build the combo', () => {
  const r = new g.Round(seeded(1)); let gained = [];
  for (let i = 0; i < 2000 && gained.length < 9; i++) { r.tick(0.05); const t = r.target; if (t) { const o = r.answer(right(t)); gained.push(o.points); } }
  assert.deepEqual(gained, [10, 10, 10, 20, 20, 20, 20, 30, 30]);
  assert.equal(r.score, 170); assert.equal(r.combo, 9); assert.equal(r.lives, 3); assert.equal(r.accuracy, 1);
});

test('signs: a wrong answer costs a life and the combo; three lives end the round', () => {
  const r = new g.Round(seeded(2)); const wrongOf = (t) => (t.kind === 'green' ? 'stop' : 'go');
  const outs = [];
  for (let i = 0; i < 400 && !r.over; i++) { r.tick(0.05); const t = r.target; if (t) outs.push(r.answer(wrongOf(t))); }
  assert.equal(r.over, true); assert.equal(r.lives, 0); assert.equal(r.score, 0);
  assert.equal(outs.length, 3); assert.ok(outs.every(o => o.type === 'wrong'));
  assert.equal(r.answer('go'), null, 'no answers after the end'); assert.deepEqual(r.tick(1), []);
  const c = new g.Round(seeded(3)); let guard = 0;
  while (c.combo < 5 && guard++ < 500) { c.tick(0.05); const t = c.target; if (t) c.answer(right(t)); }
  assert.ok(c.combo >= 5); const t = (() => { while (!c.target) c.tick(0.05); return c.target; })();
  const o = c.answer(t.kind === 'green' ? 'stop' : 'go'); assert.equal(o.type, 'wrong'); assert.equal(c.combo, 0); assert.equal(c.lives, 2); assert.equal(c.bestCombo >= 5, true);
});

test('signs: an unanswered sign that reaches the car is a miss and costs a life', () => {
  const r = new g.Round(seeded(4)); const events = [];
  for (let i = 0; i < 400 && !r.over; i++) events.push(...r.tick(0.05));
  assert.equal(r.over, true); assert.equal(events.length, 3); assert.ok(events.every(e => e.type === 'miss'));
  assert.equal(r.missed, 3); assert.equal(r.accuracy, 0);
});

test('signs: with two items the nearer one is answered first', () => {
  const q = new g.Round(() => 0.1); q.correct = 30; q.spawn = 0; q.tick(0.05);
  assert.equal(q.items.length, 2, 'the low random value triggers a pair at level 4');
  const [a, b] = q.items; const nearer = a.p > b.p ? a : b, farther = nearer === a ? b : a;
  assert.equal(q.target.id, nearer.id);
  const o = q.answer(g.ANSWER[nearer.kind]); assert.equal(o.item.id, nearer.id); assert.equal(q.target.id, farther.id);
  assert.notEqual(a.side, b.side, 'the two items sit on opposite sides');
});

test('signs: accuracy and average reaction time are tracked', () => {
  const r = new g.Round(seeded(6));
  while (!r.target) r.tick(0.05);
  r.tick(0.5); const t = r.target; const age = t.age; r.answer(g.ANSWER[t.kind]);
  assert.ok(Math.abs(r.avgReaction - age) < 1e-9 && age >= 0.5);
  while (!r.target) r.tick(0.05);
  r.answer(r.target.kind === 'green' ? 'stop' : 'go');
  assert.equal(r.accuracy, 0.5);
});

test('signs: the same seed gives the same round', () => {
  const sig = (s) => { const r = new g.Round(seeded(s)); const log = []; for (let i = 0; i < 300; i++) { r.tick(0.05); const t = r.target; if (t) log.push(t.kind + t.cond + r.answer(g.ANSWER[t.kind]).points); } return log.join(); };
  assert.equal(sig(9), sig(9)); assert.notEqual(sig(9), sig(10));
});

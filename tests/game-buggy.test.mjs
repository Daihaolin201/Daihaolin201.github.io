import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/buggy.logic.ts';

test('buggy: the model still separates good and bad gains on the S-bends track', () => {
  const good = g.simulateLap(2, 3, 60, 'sbend'); assert.equal(good.finished, true, JSON.stringify({ t: good.time, off: good.offTime }));
  assert.equal(g.simulateLap(0.5, 0, 60, 'sbend').finished, false, 'too weak for the bends');
  assert.equal(g.simulateLap(8, 0, 60, 'sbend').finished, false, 'oscillates without damping');
  assert.equal(g.simulateLap(2, 6, 120, 'sbend').finished, true, 'more damping holds a faster buggy');
  assert.ok(g.simulateLap(2, 6, 90, 'sbend').time < g.simulateLap(2, 6, 60, 'sbend').time, 'a faster buggy laps sooner');
  assert.ok(good.points.length > 50);
});

test('buggy: the default is the original track, and every track stays on the canvas', () => {
  assert.equal(g.trackY(200), g.trackFn.sbend(200));
  for (const id of g.TRACK_IDS) for (let x = g.TRACK.x0; x <= g.TRACK.x1; x += 4) { const y = g.trackY(x, id); assert.ok(y > 30 && y < g.TRACK.h - 30, `${id} at ${x}: ${y}`); }
});

test('buggy: frames are recorded for playback and end where the lap ends', () => {
  const r = g.simulateLap(2, 4, 60, 'gentle');
  assert.ok(r.frames.length > 300);
  const last = r.frames[r.frames.length - 1];
  assert.ok(Math.abs(last.t - r.time) < 1e-9 && last.x >= g.TRACK.x1);
  assert.ok(r.frames.every(f => Math.abs(f.seen) <= 12 && Math.abs(f.cmd) <= 5));
});

test('buggy: the hairpin is the hardest, and a damped set finishes all of them', () => {
  for (const id of g.TRACK_IDS) assert.equal(g.simulateLap(2, 6, 60, id).finished, true, id);
  assert.equal(g.simulateLap(8, 0, 60, 'gentle').finished, false, 'twitchy gains fail even the easy track');
  assert.ok(g.trackLength('gentle') < g.trackLength('sbend'));
  assert.ok(g.timeTarget('sbend', 60) > g.timeTarget('gentle', 60));
  assert.equal(g.simulateLap(2, 3, 60, 'hairpin').finished, false, 'the hairpin needs more damping than the other tracks');
  assert.ok(g.timeTarget('gentle', 120) < g.timeTarget('gentle', 40));
});

test('buggy: stars for finishing, beating the target, and staying on the line', () => {
  const t = g.timeTarget('gentle', 60);
  assert.equal(g.stars({ finished: false, time: 40, offTime: 9 }, 'gentle', 60), 0);
  assert.equal(g.stars({ finished: true, time: t + 3, offTime: 0.6 }, 'gentle', 60), 1);
  assert.equal(g.stars({ finished: true, time: t - 0.2, offTime: 0.6 }, 'gentle', 60), 2);
  assert.equal(g.stars({ finished: true, time: t + 3, offTime: 0 }, 'gentle', 60), 2);
  assert.equal(g.stars({ finished: true, time: t - 0.2, offTime: 0 }, 'gentle', 60), 3);
  const clean = g.simulateLap(2, 4, 60, 'gentle'); assert.equal(g.stars(clean, 'gentle', 60), 3);
  const sloppy = g.simulateLap(0.5, 0, 40, 'gentle'); assert.equal(sloppy.finished, true); assert.ok(g.stars(sloppy, 'gentle', 40) < 3);
});

test('buggy: the badge needs one gain set and one speed to finish all three tracks', () => {
  const a = (track, finished, kp = 2, kd = 4, speed = 60) => ({ kp, kd, speed, track, finished });
  assert.equal(g.allTracksBadge([]), false);
  assert.equal(g.allTracksBadge([a('gentle', true), a('sbend', true)]), false);
  assert.equal(g.allTracksBadge([a('gentle', true), a('sbend', true, 3), a('hairpin', true)]), false, 'different gains do not count');
  assert.equal(g.allTracksBadge([a('gentle', true), a('sbend', true), a('hairpin', true, 2, 4, 90)]), false, 'different speeds do not count');
  assert.equal(g.allTracksBadge([a('gentle', true), a('sbend', false), a('sbend', true), a('hairpin', true)]), true);
});

test('buggy: hint presets behave as their names say', () => {
  const h = g.HINTS;
  assert.equal(g.simulateLap(h.twitchy.kp, h.twitchy.kd, 60, 'sbend').finished, false);
  assert.equal(g.simulateLap(h.weak.kp, h.weak.kd, 60, 'sbend').finished, false);
  assert.equal(g.simulateLap(h.damped.kp, h.damped.kd, 60, 'sbend').finished, true);
});

test('buggy: diagnose tells wobble from a turn that is too slow', () => {
  assert.equal(g.diagnose(g.simulateLap(2, 6, 60, 'sbend')), 'ok');
  assert.equal(g.diagnose(g.simulateLap(8, 0, 60, 'sbend')), 'wobble');
  assert.equal(g.diagnose(g.simulateLap(0.5, 0, 60, 'sbend')), 'weak');
});

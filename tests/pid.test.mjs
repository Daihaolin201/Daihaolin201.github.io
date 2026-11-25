import test from 'node:test';
import assert from 'node:assert/strict';
import { cart, initialGains, plotGeometry, readGains, readScenario, writeScenario, runCart } from '../src/lib/pid.ts';

test('shared settings use the slider bounds and step', () => {
  assert.deepEqual(readGains(new URLSearchParams('kp=Infinity&ki=x&kd=')), initialGains);
  assert.deepEqual(readGains(new URLSearchParams('kp=-1&ki=1.24&kd=99')), { kp: 0, ki: 1.2, kd: 12 });
});

test('a shared winning run reproduces its trajectory and challenge score', () => {
  const run = runCart({ kp: 8, ki: 1, kd: 4 });
  assert.equal(run.passed, true);
  assert.equal(run.settling.toFixed(2), '1.43');
  assert.equal(run.overshoot.toFixed(1), '1.7');
  assert.deepEqual(runCart(readGains(new URLSearchParams('kp=8.0&ki=1.0&kd=4.0'))), run);
  assert.equal(runCart(initialGains).passed, false);
});

test('unpowered cart follows the closed-form solution under load and drag', () => {
  const run = runCart({ kp: 0, ki: 0, kd: 0 });
  const tau = cart.mass / cart.drag;
  const x = -cart.load / cart.drag * (cart.duration - tau * (1 - Math.exp(-cart.duration / tau)));
  assert.ok(Math.abs(run.positions.at(-1) - x) < 0.005);
  assert.equal(run.settling, null);
});

test('plot covers the trajectory and the target throughout the gain ranges', () => {
  for (const kp of [0, 2, 6, 8, 15, 24]) for (const ki of [0, 0.1, 1, 3, 8]) for (const kd of [0, 0.5, 4, 8, 12]) {
    const { positions } = runCart({ kp, ki, kd });
    const { ticks, targetY } = plotGeometry(positions);
    assert.ok(positions.every(Number.isFinite));
    assert.ok(ticks[0].value >= Math.max(...positions));
    assert.ok(ticks.at(-1).value <= Math.min(...positions));
    assert.ok(targetY > 0 && targetY < 100);
  }
});

test('delivery options round-trip without changing legacy gain links', () => {
  const legacy = new URLSearchParams('kp=8&ki=1&kd=4');
  assert.equal(readScenario(legacy).mona, false);
  const options = { mona: true, payload: 0.25, compare: false };
  writeScenario(legacy, options);
  assert.deepEqual(readScenario(legacy), options);
  writeScenario(legacy, { ...options, mona: false });
  assert.equal(legacy.toString(), 'kp=8&ki=1&kd=4');
  assert.deepEqual(readScenario(new URLSearchParams('scenario=mona&payload=-1')), {
    mona: true, payload: 0.5, compare: true
  });
});

test('payload changes inertia on the same approach and can change the challenge result', () => {
  const gains = { kp: 8, ki: 1, kd: 4 };
  const empty = runCart(gains), loaded = runCart(gains, 0.5);
  assert.equal(empty.passed, true);
  assert.equal(loaded.passed, false);
  assert.ok(loaded.positions[1] < empty.positions[1]);
  assert.equal(loaded.overshoot.toFixed(1), '6.4');
  assert.ok(loaded.settling > empty.settling);
  const trace = plotGeometry(loaded.positions, empty.positions);
  const reversed = plotGeometry(empty.positions, loaded.positions);
  assert.equal(trace.path, reversed.comparisonPath);
  assert.equal(trace.comparisonPath, reversed.path);
  assert.deepEqual(trace.ticks, reversed.ticks);
  assert.ok(runCart({ kp: 10, ki: 1, kd: 6 }, 0.5).passed);
});

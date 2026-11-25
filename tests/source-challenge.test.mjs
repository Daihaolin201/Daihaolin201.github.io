import test from 'node:test';
import assert from 'node:assert/strict';
import { createChallenge, locateFromProbes, PROBE_LIMIT } from '../src/lib/sourceSearch.ts';

const points = Array.from({ length: PROBE_LIMIT }, (_, i) => ({ x: 12 + i * 9, y: (13 + i * 17) % 60 }));

test('a round hides the source, enforces eight measurements, and commits one guess', () => {
  const round = createChallenge(7702);
  assert.equal(round.reveal(points[0]), null);
  const probes = points.map(point => round.probe(point));
  assert(probes.every(p => Number.isInteger(p.level) && p.level >= 0 && p.level <= 100));
  assert.equal(round.probe(points[0]), null);
  const result = round.reveal(points[0]);
  assert.deepEqual(result.robot, locateFromProbes(probes));
  assert.equal(result.humanError, Math.hypot(result.source.x - points[0].x, result.source.y - points[0].y));
  assert.equal(result.robotError, Math.hypot(result.source.x - result.robot.x, result.source.y - result.robot.y));
  assert.deepEqual(round.reveal(points[1]), result);
  assert.equal(round.probe(points[1]), null);
});

test('same seed and actions replay exactly, and a new field changes the round', () => {
  function play(seed) {
    const round = createChallenge(seed);
    return { probes: points.map(p => round.probe(p)), result:round.reveal(points[2]) };
  }
  assert.deepEqual(play(8802), play(8802));
  assert.notDeepEqual(play(8802).result.source, play(8803).result.source);
});

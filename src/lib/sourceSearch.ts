// Distances are in map units. A robot only receives a noisy scalar field reading.
export interface Point { x: number; y: number }
export type SearchMode = 'independent' | 'shared';
export const FIELD = { width: 100, height: 62, radius: 3.4, limit: 100 };
export const STARTS: Point[] = [{ x: 9, y: 10 }, { x: 12, y: 32 }, { x: 9, y: 52 }];
export const INITIAL_SOURCE = { x: 73, y: 27 };
export const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const signal = (d: number) => 1 / (1 + (d / 28) ** 2);
const candidates: Point[] = [];
for (let x = 2; x <= 98; x += 4) {
  for (let y = 2; y <= 60; y += 4) candidates.push({ x, y });
}

// Draws are indexed by robot and step so both strategies see matched noise.
function noiseDraw(seed: number, robot: number, step: number) {
  let state = (seed ^ Math.imul(step + 1, 0x9e3779b1) ^ Math.imul(robot + 1, 0x85ebca6b)) >>> 0;
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    sum += state / 4294967296;
  }
  return (sum - 3) * Math.SQRT2;
}

function observe(cost: Float64Array, from: Point, reading: number) {
  for (let i = 0; i < candidates.length; i++) {
    const delta = reading - signal(distance(from, candidates[i]));
    cost[i] += delta * delta;
  }
}

function estimate(cost: Float64Array, sigma: number): Point {
  let min = Infinity;
  for (const value of cost) min = Math.min(min, value);
  let x = 0, y = 0, sum = 0;
  for (let i = 0; i < cost.length; i++) {
    const weight = Math.exp(-(cost[i] - min) / (2 * sigma ** 2));
    x += candidates[i].x * weight;
    y += candidates[i].y * weight;
    sum += weight;
  }
  return { x: x / sum, y: y / sum };
}

export function search(source: Point, sigma: number, seed: number, mode: SearchMode) {
  const paths = STARTS.map(start => [{ ...start }]);
  const costs = Array.from({ length: mode === 'shared' ? 1 : STARTS.length }, () => new Float64Array(candidates.length));
  let step = 0;
  let foundBy = paths.findIndex(path => distance(path[0], source) <= FIELD.radius);
  while (foundBy < 0 && step < FIELD.limit) {
    const positions = paths.map(path => path[step]);
    positions.forEach((point, robot) => {
      const reading = signal(distance(point, source)) + sigma * noiseDraw(seed, robot, step);
      observe(costs[mode === 'shared' ? 0 : robot], point, reading);
    });
    const targets = costs.map(cost => estimate(cost, sigma));
    positions.forEach((point, robot) => {
      const target = targets[mode === 'shared' ? 0 : robot];
      const phase = step * 0.48 + robot * Math.PI * 2 / 3;
      // Small probing turns provide measurements from different bearings.
      const dx = target.x - point.x + 4 * Math.cos(phase);
      const dy = target.y - point.y + 4 * Math.sin(phase);
      const scale = Math.min(1, 1.45 / Math.max(0.01, Math.hypot(dx, dy)));
      paths[robot].push({ x: clamp(point.x + scale * dx, 1, 99), y: clamp(point.y + scale * dy, 1, 61) });
    });
    step++;
    foundBy = paths.findIndex(path => distance(path[step], source) <= FIELD.radius);
  }
  return { paths, steps: step, foundBy };
}

export const PROBE_LIMIT = 8;
const challengeSigma = 0.055;
export interface Probe extends Point { level: number }
export interface ChallengeResult { source: Point; guess: Point; robot: Point; humanError: number; robotError: number }

export function locateFromProbes(probes: readonly Probe[]): Point {
  const cost = new Float64Array(candidates.length);
  for (const probe of probes) observe(cost, probe, probe.level / 100);
  return estimate(cost, challengeSigma);
}

export function createChallenge(seed: number) {
  // Hash each coordinate separately. The target never enters the display state before reveal.
  function mix(n: number) {
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const source = { x: 2 + mix(seed) % 97, y: 2 + mix(seed ^ 0x510e527f) % 59 };
  const probes: Probe[] = [];
  let result: ChallengeResult | null = null;
  return {
    probe(point: Point): Probe | null {
      if (result || probes.length >= PROBE_LIMIT) return null;
      const reading = signal(distance(point, source)) + challengeSigma * noiseDraw(seed, 0, probes.length);
      const probe = { ...point, level: Math.round(100 * clamp(reading, 0, 1)) };
      probes.push(probe);
      return { ...probe };
    },
    reveal(guess: Point): ChallengeResult | null {
      if (!probes.length) return null;
      if (result) return result;
      const robot = locateFromProbes(probes);
      result = { source, guess: { ...guess }, robot, humanError: distance(guess, source), robotError: distance(robot, source) };
      return result;
    },
  };
}

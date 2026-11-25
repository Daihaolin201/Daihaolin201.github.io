import { clamp, dist, wrap, type Pt } from './geom.ts';
export type { Pt };

/* ---------------- Hack-a-Bot 2025: MONA line-following delivery ---------------- */
export const MAZE = {
  w: 360, h: 230, tape: 7, off: 10, speed: 60, turn: 2.6,
  /** Speed factor while "slow" is held: same turn rate, half the turning radius. */
  slow: 0.5, pause: 1.2, recover: 0.8, penalty: 3, maxStrikes: 3,
  /** The ghost drives a little below full pace so a clean human run can beat it. */
  ghostPace: 0.8,
};

export function nearestOnPath(path: Pt[], p: Pt) {
  let best = { d: Infinity, i: 0, t: 0, q: path[0] };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1), q = { x: a.x + dx * t, y: a.y + dy * t }, d = dist(p, q);
    if (d < best.d) best = { d, i, t, q };
  }
  return best;
}
export function pointAhead(path: Pt[], i: number, t: number, ahead: number): Pt {
  let seg = i, pos = t * dist(path[i], path[i + 1]) + ahead;
  while (seg < path.length - 1) {
    const len = dist(path[seg], path[seg + 1]);
    if (pos <= len) { const u = pos / len; return { x: path[seg].x + (path[seg + 1].x - path[seg].x) * u, y: path[seg].y + (path[seg + 1].y - path[seg].y) * u }; }
    pos -= len; seg++;
  }
  return path[path.length - 1];
}
/** Cumulative arc length at each vertex. */
export const arcs = (path: Pt[]) => path.reduce<number[]>((a, p, i) => (a.push(i ? a[i - 1] + dist(path[i - 1], p) : 0), a), []);
const arcOf = (path: Pt[], cum: number[], p: Pt) => { const n = nearestOnPath(path, p); return cum[n.i] + n.t * dist(path[n.i], path[n.i + 1]); };

export interface Track {
  id: 1 | 2 | 3; path: Pt[]; pickup: Pt; drop: Pt;
  /** Arc length of each checkpoint, ascending (start, corners, pickup). */
  cps: number[]; cum: number[];
}
function mk(id: Track['id'], path: Pt[], pickup: Pt, cpVerts: number[]): Track {
  const cum = arcs(path);
  const cps = [0, ...cpVerts.map(i => cum[i]), arcOf(path, cum, pickup)].sort((a, b) => a - b);
  return { id, path, pickup, drop: path[path.length - 1], cps, cum };
}
const P = (...v: number[]) => v.reduce<Pt[]>((a, n, i) => (i % 2 ? (a[a.length - 1].y = n) : a.push({ x: n, y: 0 }), a), []);
export const TRACKS: Track[] = [
  mk(1, P(30, 190, 100, 190, 100, 90, 180, 90, 180, 170, 250, 170, 250, 60, 330, 60), { x: 180, y: 130 }, [2, 4, 6]),
  mk(2, P(30, 40, 110, 40, 110, 120, 60, 120, 60, 200, 160, 200, 160, 110, 230, 110, 230, 190, 330, 190, 330, 70), { x: 160, y: 160 }, [2, 4, 6, 8]),
  // The last stretch is a hairpin whose legs are 30 px apart: too tight at full speed, fine with "slow".
  mk(3, P(30, 200, 120, 200, 120, 120, 60, 120, 60, 40, 150, 40, 150, 150, 220, 150, 220, 60, 330, 60, 330, 185, 300, 185, 300, 95), { x: 150, y: 95 }, [2, 4, 6, 8, 10]),
];

export interface Runner {
  x: number; y: number; h: number;
  /** Driving time, penalties not included. */
  time: number; penalty: number; strikes: number;
  prog: number; cp: number; picked: boolean; wait: number;
  phase: 'drive' | 'loading' | 'recover' | 'done' | 'out';
}
export const total = (r: Runner) => r.time + r.penalty;
const headingAt = (track: Track, s: number) => { const a = pointAhead(track.path, 0, 0, s), b = pointAhead(track.path, 0, 0, s + 6); return Math.atan2(b.y - a.y, b.x - a.x); };
export function newRunner(track: Track): Runner {
  const p = track.path[0];
  return { x: p.x, y: p.y, h: headingAt(track, 0), time: 0, penalty: 0, strikes: 0, prog: 0, cp: 0, picked: false, wait: 0, phase: 'drive' };
}

/** Look-ahead steering along the tape; it slows down for sharp corners, as a line follower does. */
export function autoSteer(r: Runner, track: Track): { steer: number; slow: boolean } {
  const n = nearestOnPath(track.path, r);
  const slowNow = Math.abs(wrap(Math.atan2(pointAhead(track.path, n.i, n.t, 30).y - r.y, pointAhead(track.path, n.i, n.t, 30).x - r.x) - r.h)) > 0.55;
  const target = pointAhead(track.path, n.i, n.t, slowNow ? 14 : 26);
  return { steer: clamp(wrap(Math.atan2(target.y - r.y, target.x - r.x) - r.h) * 3, -1, 1), slow: slowNow };
}

export interface Drive { slow?: boolean; pace?: number; auto?: boolean }
export function stepRunner(r: Runner, steer: number, dt: number, track: Track, o: Drive = {}): Runner {
  if (r.phase === 'done' || r.phase === 'out') return r;
  if (r.phase === 'loading' || r.phase === 'recover') { const wait = r.wait - dt; return { ...r, time: r.time + dt, wait, phase: wait <= 0 ? 'drive' : r.phase }; }
  let slow = !!o.slow;
  if (o.auto) ({ steer, slow } = autoSteer(r, track));
  const v = MAZE.speed * (slow ? MAZE.slow : 1) * (o.pace ?? 1);
  const h = r.h + clamp(steer, -1, 1) * MAZE.turn * dt;
  const next: Runner = { ...r, x: r.x + Math.cos(h) * v * dt, y: r.y + Math.sin(h) * v * dt, h, time: r.time + dt };
  const n = nearestOnPath(track.path, next);
  if (n.d > MAZE.off) {
    const strikes = r.strikes + 1, penalty = r.penalty + MAZE.penalty;
    if (strikes >= MAZE.maxStrikes) return { ...next, strikes, penalty, phase: 'out' };
    const s = track.cps[r.cp], p = pointAhead(track.path, 0, 0, s);
    return { ...next, x: p.x, y: p.y, h: headingAt(track, s), strikes, penalty, prog: s, wait: MAZE.recover, phase: 'recover' };
  }
  let { prog, cp } = next;
  prog = Math.max(prog, track.cum[n.i] + n.t * dist(track.path[n.i], track.path[n.i + 1]));
  while (cp + 1 < track.cps.length && prog >= track.cps[cp + 1]) cp++;
  const moved: Runner = { ...next, prog, cp };
  if (!r.picked && dist(next, track.pickup) < 12) return { ...moved, picked: true, phase: 'loading', wait: MAZE.pause };
  if (r.picked && dist(next, track.drop) < 12) return { ...moved, phase: 'done' };
  return moved;
}

/** Stars: 1 for delivering, 2 for also finishing ahead of the ghost, 3 for doing that with no strikes. Totals include penalties. */
export function starsFor(me: Runner, ghostTotal: number): number {
  if (me.phase !== 'done') return 0;
  return total(me) < ghostTotal ? (me.strikes === 0 ? 3 : 2) : 1;
}

/** The ghost's finishing time for a track (it is deterministic), simulated at a fixed step. */
export function ghostTime(track: Track): number {
  let r = newRunner(track);
  for (let i = 0; i < 20000 && r.phase !== 'done' && r.phase !== 'out'; i++) r = stepRunner(r, 0, 1 / 60, track, { auto: true, pace: MAZE.ghostPace });
  return total(r);
}

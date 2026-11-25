import { clamp, wrap, type Pt } from './geom.ts';
export type { Pt };

/* ---------------- Hack-a-Bot 2026: two robots push one trolley ---------------- */
export const ARENA = { w: 600, h: 300, wall: 22 };
/** Half length and half width of the trolley body. */
export const BODY = { hl: 28, hw: 20 };
export interface Hex { x: number; y: number; r: number }
export interface Gate { x: number; cy: number; gap: number; thick: number }
export interface Level {
  id: 1 | 2 | 3;
  start: Pt;
  /** The trolley centre must cross x >= goal.x while within cy +/- half. */
  goal: { x: number; cy: number; half: number };
  hexes: Hex[];
  gate?: Gate;
  /** Time limit in seconds (none when undefined). */
  limit?: number;
  /** Time (s) for 3 stars and for 2 stars. */
  par: [number, number];
  /** Waypoints for the autopilot, ending at the goal. */
  way: Pt[];
}
export const LEVELS: Level[] = [
  { id: 1, start: { x: 70, y: 150 }, goal: { x: 520, cy: 150, half: 70 }, hexes: [], par: [5, 8], way: [{ x: 560, y: 150 }] },
  {
    id: 2, start: { x: 70, y: 150 }, goal: { x: 520, cy: 150, half: 70 }, par: [6.5, 10],
    hexes: [{ x: 215, y: 108, r: 26 }, { x: 375, y: 206, r: 26 }],
    way: [{ x: 215, y: 184 }, { x: 375, y: 136 }, { x: 560, y: 150 }],
  },
  {
    id: 3, start: { x: 70, y: 220 }, goal: { x: 520, cy: 110, half: 70 }, hexes: [],
    gate: { x: 420, cy: 110, gap: 40, thick: 14 }, limit: 11, par: [7, 9.5],
    way: [{ x: 260, y: 110 }, { x: 560, y: 110 }],
  },
];

export interface Trolley {
  x: number; y: number; a: number; w: number; t: number;
  state: 'run' | 'won' | 'crashed';
  why?: 'wall' | 'pillar' | 'gate' | 'crooked' | 'time';
}
export const newTrolley = (lv: Level): Trolley => ({ x: lv.start.x, y: lv.start.y, a: 0, w: 0, t: 0, state: 'run' });

export const PUSH = { up: 150, down: 110, speed: 1.5, turn: 0.02, lag: 0.15 };
/** A robot's push rises while its button is held (target 100) and decays when released (target 0). */
export const slew = (p: number, target: number, dt: number) =>
  target > p ? Math.min(target, p + PUSH.up * dt) : Math.max(target, p - PUSH.down * dt);

/** Corners and edge points of the trolley body, in arena coordinates. */
export function bodyPoints(s: { x: number; y: number; a: number }): Pt[] {
  const c = Math.cos(s.a), n = Math.sin(s.a), { hl, hw } = BODY;
  const local: Pt[] = [];
  for (const u of [-1, -0.5, 0, 0.5, 1]) local.push({ x: u * hl, y: -hw }, { x: u * hl, y: hw });
  local.push({ x: -hl, y: 0 }, { x: hl, y: 0 });
  return local.map(p => ({ x: s.x + p.x * c - p.y * n, y: s.y + p.x * n + p.y * c }));
}
export function hexVerts(h: Hex): Pt[] {
  return Array.from({ length: 6 }, (_, i) => ({ x: h.x + h.r * Math.cos(i * Math.PI / 3), y: h.y + h.r * Math.sin(i * Math.PI / 3) }));
}
function inConvex(poly: Pt[], p: Pt) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const cr = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cr !== 0) { if (sign && Math.sign(cr) !== sign) return false; sign = Math.sign(cr); }
  }
  return true;
}
export function hitsHex(s: { x: number; y: number; a: number }, h: Hex) {
  const poly = hexVerts(h);
  if (bodyPoints(s).some(p => inConvex(poly, p))) return true;
  const c = Math.cos(s.a), n = Math.sin(s.a);
  return poly.some(v => { const dx = v.x - s.x, dy = v.y - s.y; return Math.abs(dx * c + dy * n) <= BODY.hl && Math.abs(-dx * n + dy * c) <= BODY.hw; });
}
const inRect = (p: Pt, b: { x0: number; y0: number; x1: number; y1: number }) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
/** The two solid blocks of a gate (above and below the opening). */
export function gateBlocks(g: Gate) {
  return [
    { x0: g.x - g.thick / 2, x1: g.x + g.thick / 2, y0: 0, y1: g.cy - g.gap },
    { x0: g.x - g.thick / 2, x1: g.x + g.thick / 2, y0: g.cy + g.gap, y1: ARENA.h },
  ];
}

/** pA is the top robot's push and pB the bottom robot's, both 0..100. A harder top push turns the trolley downwards. */
export function stepTrolley(s: Trolley, pA: number, pB: number, dt: number, lv: Level): Trolley {
  if (s.state !== 'run') return s;
  const w = s.w + ((pA - pB) * PUSH.turn - s.w) * Math.min(1, dt / PUSH.lag);
  const a = s.a + w * dt, v = ((pA + pB) / 2) * PUSH.speed;
  const x = s.x + Math.cos(a) * v * dt, y = s.y + Math.sin(a) * v * dt, t = s.t + dt;
  const n: Trolley = { x, y, a, w, t, state: 'run' };
  const fail = (why: NonNullable<Trolley['why']>): Trolley => ({ ...n, state: 'crashed', why });
  const pts = bodyPoints(n);
  if (pts.some(p => p.y < ARENA.wall || p.y > ARENA.h - ARENA.wall || p.x < 0 || p.x > ARENA.w)) return fail('wall');
  if (lv.hexes.some(h => hitsHex(n, h))) return fail('pillar');
  if (lv.gate && gateBlocks(lv.gate).some(b => pts.some(p => inRect(p, b)))) return fail('gate');
  if (x >= lv.goal.x) return Math.abs(wrap(a)) < 0.5 && Math.abs(y - lv.goal.cy) <= lv.goal.half ? { ...n, state: 'won' } : fail('crooked');
  if (lv.limit !== undefined && t >= lv.limit) return fail('time');
  return n;
}

/** Point `ahead` px further along a polyline than the point nearest to p. */
function pursuit(path: Pt[], p: Pt, ahead: number): Pt {
  let bi = 0, bt = 0, bd = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    const d = Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
    if (d < bd) { bd = d; bi = i; bt = t; }
  }
  let seg = bi, pos = bt * Math.hypot(path[bi + 1].x - path[bi].x, path[bi + 1].y - path[bi].y) + ahead;
  while (seg < path.length - 1) {
    const a = path[seg], b = path[seg + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (pos <= len) return { x: a.x + (b.x - a.x) * pos / len, y: a.y + (b.y - a.y) * pos / len };
    pos -= len; seg++;
  }
  return path[path.length - 1];
}

/** What coordinated control does: look ahead along the planned route and trim both pushes by the heading error. Returns target pushes. */
export function autoPush(s: Trolley, lv: Level): { a: number; b: number } {
  const wp = pursuit([lv.start, ...lv.way], s, 70);
  const err = wrap(Math.atan2(wp.y - s.y, wp.x - s.x) - s.a);
  const diff = clamp(110 * err - 18 * s.w, -70, 70);
  const base = 94 - 30 * Math.min(1, Math.abs(err) * 1.5);
  return { a: clamp(base + diff / 2, 0, 100), b: clamp(base - diff / 2, 0, 100) };
}

export const starsFor = (lv: Level, t: number) => (t <= lv.par[0] ? 3 : t <= lv.par[1] ? 2 : 1);

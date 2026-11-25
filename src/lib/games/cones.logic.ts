import { dist, type Pt } from './geom.ts';
export type { Pt };

/* ---------------- Smart traffic cones: close the lane before the car arrives ---------------- */
export const W = 480, H = 300;
export const ROAD = { top: 70, mid: 150, bottom: 230, laneA: 190, laneB: 110 }; // lane A (lower) is the one to close
export const CAR = { startX: -34, decideX: 215, len: 34, brake: 130 };
export const CONES = { speed: 78, sense: 26, side: 9, slot: 11, near: 12 };
export interface Cone { x: number; y: number; path: Pt[]; slot: number; stopped: boolean }
export interface Box { x: number; y: number; w: number; h: number }
export interface RoundDef { slots: number; cd: number; speed: number; obstacle: boolean; stars: [number, number] }
/** stars: fraction of the available time still left when the lane closed (3 stars / 2 stars). */
export const ROUNDS: RoundDef[] = [
  { slots: 3, cd: 6, speed: 30, obstacle: false, stars: [0.4, 0.2] },
  { slots: 4, cd: 5, speed: 34, obstacle: false, stars: [0.3, 0.15] },
  { slots: 5, cd: 5, speed: 30, obstacle: true, stars: [0.25, 0.1] },
];
export const OBSTACLE: Box = { x: 160, y: 220, w: 60, h: 80 };
export const VIA: Pt = { x: 172, y: 152 };

export type CarState = 'wait' | 'drive' | 'merge' | 'brake' | 'gone';
export interface Round {
  def: RoundDef; slots: Pt[]; cones: Cone[]; obstacle: Box | null; t: number;
  car: { x: number; y: number; v: number; state: CarState }; closedAt: number | null;
  result: null | 'safe' | 'fail'; decideAt: number; mergeT: number; ev: { t: 'filled'; slot: number }[]; filled: boolean[];
}
export function slotPoints(n: number): Pt[] {
  return Array.from({ length: n }, (_, k) => ({ x: 270 + (100 * k) / (n - 1), y: 224 - (68 * k) / (n - 1) }));
}
export function decisionTime(def: RoundDef) { return def.cd + (CAR.decideX - CAR.startX) / def.speed; }
export function newRound(i: number): Round {
  const def = ROUNDS[i];
  return {
    def, slots: slotPoints(def.slots), obstacle: def.obstacle ? { ...OBSTACLE } : null, t: 0,
    cones: Array.from({ length: def.slots }, (_, k) => ({ x: 18 + k * 26, y: k % 2 ? 282 : 262, path: [], slot: -1, stopped: false })),
    car: { x: CAR.startX, y: ROAD.laneA, v: 0, state: 'wait' }, closedAt: null, result: null, decideAt: decisionTime(def), mergeT: 0,
    ev: [], filled: Array(def.slots).fill(false),
  };
}

const inBox = (p: Pt, b: Box, pad: number) => p.x > b.x - pad && p.x < b.x + b.w + pad && p.y > b.y - pad && p.y < b.y + b.h + pad;
/** The ultrasonic sensor looks straight ahead along the heading. It stops the cone for another cone or the parked van. */
export function sensed(c: Cone, ux: number, uy: number, others: Cone[], obstacle: Box | null): boolean {
  if (others.some(o => { const ox = o.x - c.x, oy = o.y - c.y, ahead = ox * ux + oy * uy, side = Math.abs(-ox * uy + oy * ux); return ahead > 0 && ahead < CONES.sense && side < CONES.side; })) return true;
  if (obstacle) for (let d = 4; d <= CONES.sense; d += 4) if (inBox({ x: c.x + ux * d, y: c.y + uy * d }, obstacle, 7)) return true;
  return false;
}
export function stepCone(c: Cone, others: Cone[], obstacle: Box | null, dt: number): Cone {
  if (!c.path.length) return c.stopped ? { ...c, stopped: false } : c;
  const t = c.path[0], dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy);
  if (d < 1.5) return { ...c, x: t.x, y: t.y, path: c.path.slice(1), stopped: false };
  const ux = dx / d, uy = dy / d;
  if (sensed(c, ux, uy, others, obstacle)) return { ...c, stopped: true };
  const s = Math.min(d, CONES.speed * dt);
  return { ...c, x: c.x + ux * s, y: c.y + uy * s, stopped: false };
}
/** Send a cone to a slot, optionally through waypoints. Another cone that held the slot lets go of it. */
export function assign(r: Round, ci: number, slot: number, via: Pt[] = []): boolean {
  if (r.result || !r.cones[ci] || slot < 0 || slot >= r.slots.length) return false;
  r.cones.forEach((c, k) => { if (k !== ci && c.slot === slot) { c.slot = -1; c.path = []; } });
  r.cones[ci] = { ...r.cones[ci], slot, path: [...via.slice(0, 2), r.slots[slot]], stopped: false };
  r.filled[slot] = false; return true;
}
export function slotFilled(r: Round, k: number) {
  return r.cones.some(c => c.slot === k && !c.path.length && dist(c, r.slots[k]) < CONES.near);
}
export const laneClosed = (r: Round) => r.slots.every((_, k) => slotFilled(r, k));

export function tickRound(r: Round, dt: number) {
  if (r.result && r.car.state === 'gone') return;
  r.t += dt;
  if (!r.result) r.cones = r.cones.map((c, i) => stepCone(c, r.cones.filter((_, k) => k !== i), r.obstacle, dt));
  r.slots.forEach((_, k) => { const f = slotFilled(r, k); if (f && !r.filled[k]) r.ev.push({ t: 'filled', slot: k }); r.filled[k] = f; });
  if (r.closedAt === null && !r.result && laneClosed(r)) { r.closedAt = r.t; r.result = 'safe'; }
  const car = r.car;
  if (car.state === 'wait' && r.t >= r.def.cd) { car.state = 'drive'; car.v = r.def.speed; }
  if (car.state === 'drive') {
    car.x += car.v * dt;
    if (car.x >= CAR.decideX) {
      if (r.result === 'safe') { car.state = 'merge'; r.mergeT = 0; }
      else { car.state = 'brake'; r.result = 'fail'; }
    }
  } else if (car.state === 'merge') {
    r.mergeT += dt; car.x += car.v * dt;
    const u = Math.min(1, r.mergeT / 0.9); car.y = ROAD.laneA + (ROAD.laneB - ROAD.laneA) * u * u * (3 - 2 * u);
    if (car.x > W + CAR.len) car.state = 'gone';
  } else if (car.state === 'brake') {
    car.v = Math.max(0, car.v - CAR.brake * dt); car.x += car.v * dt; if (car.v === 0) car.state = 'gone';
  }
}
/** 0 stars means the lane was not closed in time. */
export function starsFor(r: Round): number {
  if (r.result !== 'safe' || r.closedAt === null) return 0;
  const left = (r.decideAt - r.closedAt) / r.decideAt;
  return left >= r.def.stars[0] ? 3 : left >= r.def.stars[1] ? 2 : 1;
}
export const timeLeft = (r: Round) => (r.closedAt === null ? 0 : Math.max(0, r.decideAt - r.closedAt));

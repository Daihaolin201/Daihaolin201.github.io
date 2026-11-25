/* ---------------- Research software: keep the cluster busy ----------------
   Rules only, no DOM. Time moves in fixed steps of STEP seconds so a round is reproducible:
   the same seed gives the same job arrivals whether a person or the greedy scheduler plays. */
export const ROWS = 4;        // nodes
export const WINDOW = 12;     // hours visible ahead
export const MAX_QUEUE = 5;   // a sixth waiting job ends the round
export const STEP = 0.25;     // seconds per simulation step

export type KindId = 'matlab' | 'gpu' | 'mc' | 'cfd' | 'post' | 'ctrl';
export type LevelId = 'easy' | 'normal' | 'hard';
export interface Shape { kind: KindId; rows: number; cols: number }
export interface Level { hourSteps: number; arrMin: number; arrMax: number; hours: number; urgentP: number; urgentSec: number; pool: Shape[] }

const s = (kind: KindId, rows: number, cols: number): Shape => ({ kind, rows, cols });
export const LEVELS: Record<LevelId, Level> = {
  easy: { hourSteps: 16, arrMin: 4.5, arrMax: 7.5, hours: 24, urgentP: 0.08, urgentSec: 8,
    pool: [s('matlab', 1, 3), s('matlab', 2, 2), s('gpu', 1, 4), s('post', 1, 2), s('post', 1, 1), s('ctrl', 2, 2), s('mc', 4, 1), s('cfd', 2, 3)] },
  normal: { hourSteps: 12, arrMin: 3.8, arrMax: 6.5, hours: 30, urgentP: 0.12, urgentSec: 7,
    pool: [s('matlab', 2, 4), s('matlab', 1, 3), s('gpu', 1, 6), s('gpu', 1, 4), s('mc', 4, 2), s('cfd', 3, 3), s('ctrl', 2, 3), s('post', 1, 2), s('ctrl', 2, 2)] },
  hard: { hourSteps: 10, arrMin: 3.2, arrMax: 5.4, hours: 36, urgentP: 0.15, urgentSec: 5,
    pool: [s('matlab', 2, 4), s('matlab', 3, 3), s('gpu', 1, 6), s('gpu', 2, 4), s('mc', 4, 2), s('mc', 4, 3), s('cfd', 3, 4), s('cfd', 3, 3), s('ctrl', 2, 3), s('post', 1, 2)] },
};

export interface Job extends Shape { id: number; urgent: boolean; left: number; mult: 1 | 2; at?: { r: number; c: number } }
export type Over = null | 'done' | 'overflow';
export interface State {
  level: LevelId; seed: number; rand: () => number;
  step: number; sub: number; t: number; nextArrival: number;
  queue: Job[]; placed: Job[]; arrived: (Shape & { urgent: boolean })[];
  score: number; ran: number; waste: number; missed: number; urgentHit: number; finished: number; nextId: number;
  over: Over;
}
export type Event = 'hour' | 'missed' | 'overflow' | 'done';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const clockOf = (st: State) => st.step * STEP;
const gap = (st: State) => { const l = LEVELS[st.level]; return l.arrMin + st.rand() * (l.arrMax - l.arrMin); };

function arrive(st: State): Event | null {
  if (st.queue.length >= MAX_QUEUE) { st.over = 'overflow'; return 'overflow'; }
  const l = LEVELS[st.level];
  const shape = l.pool[Math.floor(st.rand() * l.pool.length)];
  const urgent = st.arrived.length >= 2 && st.rand() < l.urgentP;
  st.arrived.push({ ...shape, urgent });
  st.queue.push({ ...shape, id: st.nextId++, urgent, left: urgent ? l.urgentSec : 0, mult: 1 });
  return null;
}

export function createGame(level: LevelId, seed: number, rand: () => number = mulberry32(seed)): State {
  const st: State = { level, seed, rand, step: 0, sub: 0, t: 0, nextArrival: 0, queue: [], placed: [], arrived: [],
    score: 0, ran: 0, waste: 0, missed: 0, urgentHit: 0, finished: 0, nextId: 1, over: null };
  arrive(st); arrive(st);
  st.nextArrival = gap(st);
  return st;
}

export const area = (j: Shape) => j.rows * j.cols;
export function occupant(st: State, r: number, c: number): Job | undefined {
  return st.placed.find(j => j.at && r >= j.at.r && r < j.at.r + j.rows && c >= j.at.c && c < j.at.c + j.cols);
}
export function canPlace(st: State, job: Shape & { id: number }, r: number, c: number) {
  if (r < 0 || r + job.rows > ROWS || c < st.t || c + job.cols > st.t + WINDOW) return false;
  return st.placed.every(o => o.id === job.id || !o.at || o.at.r + o.rows <= r || r + job.rows <= o.at.r || o.at.c + o.cols <= c || c + job.cols <= o.at.c);
}
/** Slide a requested top-left cell back inside the window so a tap near an edge still lands. */
export function anchor(st: State, job: Shape, r: number, c: number) {
  return { r: Math.max(0, Math.min(r, ROWS - job.rows)), c: Math.max(st.t, Math.min(c, st.t + WINDOW - job.cols)) };
}
export function place(st: State, id: number, r: number, c: number): boolean {
  if (st.over) return false;
  const i = st.queue.findIndex(j => j.id === id); if (i < 0) return false;
  const job = st.queue[i]; if (!canPlace(st, job, r, c)) return false;
  st.queue.splice(i, 1);
  if (job.urgent && job.mult === 1) { job.mult = 2; st.urgentHit++; }
  job.at = { r, c }; st.placed.push(job); return true;
}
export const canTakeBack = (st: State, job: Job) => !!job.at && job.at.c >= st.t;
export function takeBack(st: State, id: number): boolean {
  if (st.over || st.queue.length >= MAX_QUEUE) return false;
  const i = st.placed.findIndex(j => j.id === id); if (i < 0 || !canTakeBack(st, st.placed[i])) return false;
  const [job] = st.placed.splice(i, 1); job.at = undefined; st.queue.push(job); return true;
}

export const utilisation = (st: State) => (st.ran + st.waste ? st.ran / (st.ran + st.waste) : 0);

function endHour(st: State) {
  for (let r = 0; r < ROWS; r++) { const j = occupant(st, r, st.t); if (j) { st.score += j.mult; st.ran++; } else st.waste++; }
  st.t++;
  const keep: Job[] = [];
  for (const j of st.placed) { if (j.at!.c + j.cols <= st.t) st.finished++; else keep.push(j); }
  st.placed = keep;
  if (st.t >= LEVELS[st.level].hours) st.over = 'done';
}

/** First fit, earliest start; urgent jobs first, then the biggest. Places at most one job. */
export function greedyOnce(st: State): boolean {
  const order = [...st.queue].sort((a, b) => (Number(b.urgent && b.mult === 1) - Number(a.urgent && a.mult === 1)) || area(b) - area(a) || a.id - b.id);
  for (const j of order) for (let c = st.t; c + j.cols <= st.t + WINDOW; c++) for (let r = 0; r + j.rows <= ROWS; r++) if (canPlace(st, j, r, c)) return place(st, j.id, r, c);
  return false;
}

/** Advance STEP seconds. With auto, the greedy scheduler acts once a second. */
export function advance(st: State, auto = false): Event[] {
  const ev: Event[] = [];
  if (st.over) return ev;
  st.step++;
  const clock = clockOf(st);
  st.queue = st.queue.filter(j => { if (j.urgent && j.mult === 1) { j.left -= STEP; if (j.left <= 0) { st.missed++; ev.push('missed'); return false; } } return true; });
  while (!st.over && clock >= st.nextArrival) {
    const e = arrive(st); if (e) { ev.push(e); break; }
    st.nextArrival += gap(st);
  }
  if (st.over) return ev;
  if (auto && st.step % 4 === 0) greedyOnce(st);
  st.sub++;
  if (st.sub >= LEVELS[st.level].hourSteps) { st.sub = 0; endHour(st); ev.push(st.over === 'done' ? 'done' : 'hour'); }
  return ev;
}

/** Run a whole round headlessly; used for the "same seed" comparison. */
export function simulate(level: LevelId, seed: number, rand?: () => number): State {
  const st = createGame(level, seed, rand);
  const l = LEVELS[level], cap = l.hours * l.hourSteps + 8;
  for (let i = 0; i < cap && !st.over; i++) advance(st, true);
  return st;
}

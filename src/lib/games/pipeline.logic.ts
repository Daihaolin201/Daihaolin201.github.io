/* ---------------- OperatorOne: four agents hand ideas along until revenue arrives ---------------- */
export type Rand = () => number;
export const PIPE = {
  base: 1.4, autoSlow: 2.0, autoCost: 14, workerCost: 22, maxWorkers: 2,
  feedback: 0.3, maxQuality: 4, cap: 8, startCash: 6,
  milestones: [100, 250, 500], limit: 360,
  stars: [[60, 95], [105, 150], [175, 250]] as number[][],
  firstEvent: 7, eventGap: [8, 12] as [number, number],
  stuckMax: 15, outageFor: 4, complaintFor: 8, viralFor: 6, viralIdeas: 4,
};
export type EventKind = 'viral' | 'outage' | 'stuck' | 'complaint';
export type Fx =
  | { t: 'spawn' } | { t: 'move'; from: number; to: number } | { t: 'back' }
  | { t: 'sale'; gain: number } | { t: 'event'; kind: EventKind; stage?: number }
  | { t: 'resolved' } | { t: 'lapsed' } | { t: 'unblock' } | { t: 'milestone'; k: number }
  | { t: 'bought'; stage: number; what: 'auto' | 'worker' };
export interface Job { t: number; d: number }
export interface Stage { q: number; jobs: Job[]; workers: number; auto: boolean; stuck: number }
export interface Pipe {
  stages: Stage[]; cash: number; mrr: number; quality: number; iterations: number; completed: number;
  time: number; finished: boolean; won: boolean; ms: (number | null)[];
  spawnT: number; nextEvent: number; outage: number; viral: number; complaint: number;
  hist: number[]; histT: number; fx: Fx[];
}
export function newPipe(): Pipe {
  return {
    stages: [0, 1, 2, 3].map(() => ({ q: 0, jobs: [], workers: 1, auto: false, stuck: 0 })),
    cash: PIPE.startCash, mrr: 0, quality: 0, iterations: 0, completed: 0, time: 0, finished: false, won: false,
    ms: PIPE.milestones.map(() => null), spawnT: 1.2, nextEvent: PIPE.firstEvent, outage: 0, viral: 0, complaint: 0,
    hist: [0], histT: 0, fx: [],
  };
}
export const gain = (quality: number) => 3 + quality;
export const spawnGap = (p: Pipe) => Math.max(1.1, 3.0 - p.mrr / 250) * (p.viral > 0 ? 0.5 : 1);
export const autoCost = (p: Pipe) => PIPE.autoCost + 6 * p.stages.filter(s => s.auto).length;
export const workerCost = (p: Pipe) => PIPE.workerCost + 8 * p.stages.filter(s => s.workers > 1).length;
export const paused = (p: Pipe, i: number) => p.stages[i].stuck > 0 || (i === 3 && p.outage > 0);
export const stars = (k: number, time: number) => (time <= PIPE.stars[k][0] ? 3 : time <= PIPE.stars[k][1] ? 2 : 1);

export function startStage(p: Pipe, i: number, auto = false): boolean {
  const s = p.stages[i];
  if (p.finished || paused(p, i) || s.q <= 0 || s.jobs.length >= s.workers) return false;
  s.q--; s.jobs.push({ t: 0, d: auto ? PIPE.autoSlow : PIPE.base }); return true;
}
export function buyAuto(p: Pipe, i: number): boolean {
  const c = autoCost(p), s = p.stages[i];
  if (p.finished || s.auto || p.cash < c) return false;
  p.cash -= c; s.auto = true; p.fx.push({ t: 'bought', stage: i, what: 'auto' }); return true;
}
export function buyWorker(p: Pipe, i: number): boolean {
  const c = workerCost(p), s = p.stages[i];
  if (p.finished || s.workers >= PIPE.maxWorkers || p.cash < c) return false;
  p.cash -= c; s.workers++; p.fx.push({ t: 'bought', stage: i, what: 'worker' }); return true;
}
/** The manager clears every stuck stage. Returns how many were freed. */
export function unblock(p: Pipe): number {
  let n = 0; for (const s of p.stages) if (s.stuck > 0) { s.stuck = 0; n++; }
  if (n) p.fx.push({ t: 'unblock' }); return n;
}
/** Send the open complaint back to Product: it becomes a better version instead of a loss. */
export function sendBack(p: Pipe): boolean {
  if (p.finished || p.complaint <= 0) return false;
  p.complaint = 0; p.quality = Math.min(PIPE.maxQuality, p.quality + 1); p.iterations++;
  p.stages[0].q++; p.fx.push({ t: 'back' }, { t: 'resolved' }); return true;
}

function complete(p: Pipe, i: number, rand: Rand) {
  if (i < 3) { p.stages[i + 1].q++; p.fx.push({ t: 'move', from: i, to: i + 1 }); return; }
  const g = gain(p.quality); p.mrr += g; p.cash += g; p.completed++;
  p.fx.push({ t: 'sale', gain: g });
  if (rand() < PIPE.feedback && p.quality < PIPE.maxQuality) { p.quality++; p.iterations++; p.stages[0].q++; p.fx.push({ t: 'back' }); }
  PIPE.milestones.forEach((m, k) => { if (p.ms[k] === null && p.mrr >= m) { p.ms[k] = p.time; p.fx.push({ t: 'milestone', k }); } });
  if (p.ms[PIPE.milestones.length - 1] !== null) { p.finished = true; p.won = true; p.hist.push(p.mrr); }
}

function fireEvent(p: Pipe, rand: Rand) {
  const open: EventKind[] = [];
  if (p.viral <= 0) open.push('viral');
  if (p.outage <= 0) open.push('outage');
  if (p.stages.some(s => s.stuck <= 0)) open.push('stuck');
  if (p.complaint <= 0 && p.mrr >= 8) open.push('complaint');
  const kind = open[Math.floor(rand() * open.length)];
  if (kind === 'viral') { p.viral = PIPE.viralFor; p.stages[0].q = Math.min(PIPE.cap + PIPE.viralIdeas, p.stages[0].q + PIPE.viralIdeas); p.fx.push({ t: 'event', kind }); }
  else if (kind === 'outage') { p.outage = PIPE.outageFor; p.fx.push({ t: 'event', kind, stage: 3 }); }
  else if (kind === 'complaint') { p.complaint = PIPE.complaintFor; p.fx.push({ t: 'event', kind }); }
  else if (kind === 'stuck') {
    const free = p.stages.map((s, i) => (s.stuck <= 0 ? i : -1)).filter(i => i >= 0);
    const i = free[Math.floor(rand() * free.length)]; p.stages[i].stuck = PIPE.stuckMax; p.fx.push({ t: 'event', kind, stage: i });
  }
}

export function tickPipe(p: Pipe, dt: number, rand: Rand) {
  if (p.finished) return;
  p.time += dt;
  if (p.time >= PIPE.limit) { p.finished = true; p.hist.push(p.mrr); return; }
  p.nextEvent -= dt;
  if (p.nextEvent <= 0) { fireEvent(p, rand); p.nextEvent = PIPE.eventGap[0] + rand() * (PIPE.eventGap[1] - PIPE.eventGap[0]); }
  p.viral = Math.max(0, p.viral - dt); p.outage = Math.max(0, p.outage - dt);
  if (p.complaint > 0) {
    p.complaint -= dt;
    if (p.complaint <= 0) {
      p.complaint = 0; p.mrr = Math.max(0, p.mrr - Math.max(3, Math.round(p.mrr * 0.05)));
      p.quality = Math.max(0, p.quality - 1); p.fx.push({ t: 'lapsed' });
    }
  }
  p.spawnT -= dt;
  if (p.spawnT <= 0) { if (p.stages[0].q < PIPE.cap) { p.stages[0].q++; p.fx.push({ t: 'spawn' }); } p.spawnT += spawnGap(p); }
  for (let i = 0; i < 4 && !p.finished; i++) {
    const s = p.stages[i];
    if (s.stuck > 0) s.stuck = Math.max(0, s.stuck - dt);
    if (paused(p, i)) continue;
    if (s.auto) while (startStage(p, i, true));
    for (const j of s.jobs) j.t += dt;
    const done = s.jobs.filter(j => j.t >= j.d); s.jobs = s.jobs.filter(j => j.t < j.d);
    for (let k = 0; k < done.length; k++) complete(p, i, rand);
  }
  p.histT += dt; while (p.histT >= 1) { p.histT -= 1; p.hist.push(p.mrr); }
}

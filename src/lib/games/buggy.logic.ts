import { clamp, type Pt } from './geom.ts';
export type { Pt };

/* ---------------- ESP buggy: tune a line follower ---------------- */
export const TRACK = { w: 600, h: 260, x0: 24, x1: 576 };
export type TrackId = 'gentle' | 'sbend' | 'hairpin';
export const TRACK_IDS: TrackId[] = ['gentle', 'sbend', 'hairpin'];
export const SPEEDS = [40, 60, 90, 120];
const bump = (x: number, c0: number, c1: number, k: number) => Math.tanh((x - c0) / k) - Math.tanh((x - c1) / k);
/** Line height at x for each track. The S-bends track is the original calibrated winding line. */
export const trackFn: Record<TrackId, (x: number) => number> = {
  gentle: x => 130 + 36 * Math.sin(x / 85),
  sbend: x => 130 + 50 * Math.sin(x / 62) + 8 * Math.sin(x / 30 + 1),
  hairpin: x => 130 + 12 * Math.sin(x / 80) + 30 * bump(x, 250, 360, 24) - 14 * bump(x, 420, 560, 28),
};
export const trackY = (x: number, id: TrackId = 'sbend') => trackFn[id](x);

/** Length of a track's line; used to set the time target. */
export function trackLength(id: TrackId) {
  let len = 0;
  for (let x = TRACK.x0; x < TRACK.x1; x += 2) len += Math.hypot(2, trackY(x + 2, id) - trackY(x, id));
  return len;
}
/** Time target: the line's length at the chosen speed plus about 12 percent for cornering. */
export const timeTarget = (id: TrackId, speed: number) => Math.round(trackLength(id) / speed * 1.12 * 10) / 10;

export interface Frame { x: number; y: number; h: number; t: number; seen: number; cmd: number; off: boolean }
export interface LapResult { finished: boolean; time: number; offTime: number; points: Pt[]; frames: Frame[] }
/** A buggy with a row of five sensors reads its sideways error in steps; steering follows Kp*e + Kd*de/dt through a small motor lag. */
export function simulateLap(kp: number, kd: number, speed: number, id: TrackId = 'sbend'): LapResult {
  const ty = trackFn[id];
  const dt = 1 / 60;
  let x = TRACK.x0, y = ty(x), h = Math.atan2(ty(x + 1) - ty(x), 1), prev = 0, smooth = 0, t = 0, off = 0, omega = 0;
  const points: Pt[] = [], frames: Frame[] = [];
  while (x < TRACK.x1 && t < 40) {
    // sideways error to the line in the buggy's own frame (positive = line is on the left)
    let e = 0, bestD = Infinity;
    for (let k = -30; k <= 30; k += 1) { const qx = x + k, qy = ty(qx), d = Math.hypot(qx - x, qy - y); if (d < bestD) { bestD = d; e = -((qx - x) * Math.sin(h) - (qy - y) * Math.cos(h)); } }
    // the sensor row only sees the line within ±12 px, in 3 px steps; beyond that the reading saturates
    const seen = clamp(Math.round(e / 3) * 3, -12, 12);
    smooth += (seen - smooth) * 0.25; // the firmware smooths the stepped reading before differentiating it
    const de = (smooth - prev) / dt; prev = smooth;
    const command = clamp(kp * 0.12 * smooth + kd * 0.012 * de, -5, 5);
    omega += (command - omega) * Math.min(1, dt / 0.09);
    h += omega * dt; x += Math.cos(h) * speed * dt; y += Math.sin(h) * speed * dt; t += dt;
    const isOff = Math.abs(y - ty(x)) > 11;
    if (isOff) off += dt;
    frames.push({ x, y, h, t, seen, cmd: command, off: isOff });
    if (Math.round(t / dt) % 3 === 0) points.push({ x, y });
    if (y < 0 || y > TRACK.h) break;
  }
  return { finished: x >= TRACK.x1 && off < 1.2, time: t, offTime: off, points, frames };
}

/** 1 star for finishing, 2 for finishing under the time target, 3 for never leaving the line. */
export function stars(r: Pick<LapResult, 'finished' | 'time' | 'offTime'>, id: TrackId, speed: number) {
  if (!r.finished) return 0;
  return 1 + (r.time <= timeTarget(id, speed) ? 1 : 0) + (r.offTime < 0.05 ? 1 : 0);
}

export interface Attempt { kp: number; kd: number; speed: number; track: TrackId; finished: boolean }
/** Badge: one gain set (same Kp, Kd and speed) that has finished every track. */
export function allTracksBadge(history: Attempt[]) {
  const ok = new Map<string, Set<TrackId>>();
  for (const a of history) if (a.finished) { const k = `${a.kp}|${a.kd}|${a.speed}`; (ok.get(k) ?? ok.set(k, new Set()).get(k)!).add(a.track); }
  return [...ok.values()].some(s => s.size === TRACK_IDS.length);
}

/** Teaching presets: the gains behind the hints. */
export const HINTS = { weak: { kp: 0.5, kd: 0 }, twitchy: { kp: 8, kd: 0 }, damped: { kp: 2, kd: 3 } } as const;

/** What went wrong, read from the steering command: flips between left and right mean wobble, otherwise the turn was too slow. */
export function diagnose(r: LapResult): 'ok' | 'wobble' | 'weak' {
  if (r.finished) return 'ok';
  let flips = 0, last = 0;
  for (const f of r.frames) { const s = Math.abs(f.cmd) < 0.5 ? 0 : Math.sign(f.cmd); if (s && last && s !== last) flips++; if (s) last = s; }
  return flips >= 6 ? 'wobble' : 'weak';
}

// Shared geometry helpers for the mini-game logic modules.
export type Pt = { x: number; y: number };
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

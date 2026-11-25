/* ---------------- PuzzleThon: you are the vision module ---------------- */
export type SignKind = 'red' | 'green' | 'amber' | 'stop' | 'slow';
export type Action = 'stop' | 'slow' | 'go';
/** How an item is hard to see; the right answer never changes. */
export type Cond = 'clear' | 'tree' | 'dark';
export const ANSWER: Record<SignKind, Action> = { red: 'stop', stop: 'stop', slow: 'slow', amber: 'slow', green: 'go' };
export const judge = (sign: SignKind, action: Action) => ANSWER[sign] === action;
export const KINDS: SignKind[] = ['red', 'green', 'stop', 'slow'];
export const pickSign = (rand: () => number): SignKind => KINDS[Math.floor(rand() * KINDS.length) % KINDS.length];

export const LIVES = 3, PER_LEVEL = 10;
/** Level goes up every ten correct answers. */
export const levelFor = (correct: number) => 1 + Math.floor(correct / PER_LEVEL);
/** Seconds a sign takes to reach the car; shorter at higher levels. */
export const approachTime = (level: number) => Math.max(1.5, 3.6 - 0.4 * (level - 1));
/** Seconds between spawns. */
export const spawnGap = (level: number) => Math.max(0.9, 1.7 - 0.12 * (level - 1));
/** Combo multiplier: x1, then one more for every four correct answers in a row, up to x5. */
export const multiplier = (combo: number) => Math.min(5, 1 + Math.floor(combo / 4));
/** Level 2 adds the amber light, level 3 signs behind a tree or in the dark, level 4 two items at once. */
export const kindsFor = (level: number): SignKind[] => (level >= 2 ? [...KINDS, 'amber'] : KINDS);
export const condsFor = (level: number): Cond[] => (level >= 3 ? ['clear', 'clear', 'tree', 'dark'] : ['clear']);
export const pairChance = (level: number) => (level >= 4 ? Math.min(0.6, 0.3 + 0.1 * (level - 4)) : 0);

export interface Item { id: number; kind: SignKind; cond: Cond; side: -1 | 1; p: number; age: number; done: boolean }
export type Outcome = { type: 'right' | 'wrong' | 'miss'; item: Item; action?: Action; points: number; levelUp: boolean };

export class Round {
  items: Item[] = []; lives = LIVES; score = 0; combo = 0; bestCombo = 0; correct = 0; answered = 0; missed = 0; time = 0;
  reactionSum = 0; over = false;
  spawn = 0.4; nextId = 1; rand: () => number;
  constructor(rand: () => number) { this.rand = rand; }
  get level() { return levelFor(this.correct); }
  get mult() { return multiplier(this.combo); }
  get accuracy() { const n = this.answered + this.missed; return n ? this.correct / n : 0; }
  get avgReaction() { return this.answered ? this.reactionSum / this.answered : 0; }
  /** The item the next answer applies to: the nearest one that is still open. */
  get target(): Item | undefined { let t: Item | undefined; for (const i of this.items) if (!i.done && (!t || i.p > t.p)) t = i; return t; }
  make(p: number, side: -1 | 1): Item {
    const kinds = kindsFor(this.level), conds = condsFor(this.level);
    return { id: this.nextId++, kind: kinds[Math.floor(this.rand() * kinds.length) % kinds.length], cond: conds[Math.floor(this.rand() * conds.length) % conds.length], side, p, age: 0, done: false };
  }
  lose(o: Outcome[], kind: 'wrong' | 'miss', item: Item, action?: Action) {
    this.combo = 0; this.lives--; if (this.lives <= 0) this.over = true;
    o.push({ type: kind, item, action, points: 0, levelUp: false });
  }
  /** Advance the road by dt seconds; returns the misses that happened. */
  tick(dt: number): Outcome[] {
    const out: Outcome[] = [];
    if (this.over) return out;
    this.time += dt; this.spawn -= dt;
    if (this.spawn <= 0 && this.items.filter(i => !i.done).length < 3) {
      const side: -1 | 1 = this.rand() < 0.5 ? -1 : 1;
      if (this.rand() < pairChance(this.level)) { this.items.push(this.make(0.22, side), this.make(0, side === 1 ? -1 : 1)); }
      else this.items.push(this.make(0, side));
      this.spawn = spawnGap(this.level);
    }
    const v = 1 / approachTime(this.level);
    for (const it of this.items) {
      it.p += dt * v; it.age += dt;
      if (it.p >= 1 && !it.done) { it.done = true; this.missed++; this.lose(out, 'miss', it); }
    }
    this.items = this.items.filter(i => i.p < 1.15);
    return out;
  }
  /** Answer the nearest open item. Returns null if there is none or the round is over. */
  answer(action: Action): Outcome | null {
    const t = this.target;
    if (!t || this.over) return null;
    t.done = true; this.answered++; this.reactionSum += t.age;
    const out: Outcome[] = [];
    if (judge(t.kind, action)) {
      const before = this.level;
      this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      const points = 10 * this.mult; this.score += points; this.correct++;
      return { type: 'right', item: t, action, points, levelUp: this.level > before };
    }
    this.lose(out, 'wrong', t, action);
    return out[0];
  }
}

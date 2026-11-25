/* ---------------- Local-first teaching tools: plan the week ----------------
   A small constraint puzzle (rules and checker, no DOM) plus the .ics export. */
export const WEEK = { days: 5, first: 9, last: 17 };
export const LUNCH = 12; // 12:00-13:00 stays free

export type Kind = 'teach' | 'prep' | 'note' | 'fixed';
export interface Item { id: string; kind: Kind; len: number; day?: number; hour?: number }
export type Rule =
  | { type: 'window'; item: string; days: number[]; from: number; to: number }   // student only free then
  | { type: 'cap'; max: number }                                                 // teaching hours per day
  | { type: 'before'; pairs: [string, string][] }                                // first ends before second starts
  | { type: 'after'; pairs: [string, string][] }                                 // second: same day, after the first
  | { type: 'lunch' }                                                            // nothing in 12:00-13:00
  | { type: 'clear' };                                                           // nothing overlaps
export interface Level { id: 1 | 2 | 3; items: Item[]; rules: Rule[] }
export type Status = 'ok' | 'bad' | 'wait';
export interface Result { rule: Rule; status: Status; bad: string[] }

const it = (id: string, kind: Kind, len: number, extra: Partial<Item> = {}): Item => ({ id, kind, len, ...extra });
export const LEVELS: Level[] = [
  { id: 1,
    items: [it('m', 'teach', 2), it('pm', 'prep', 1), it('p', 'teach', 1), it('ck', 'note', 1)],
    rules: [{ type: 'window', item: 'm', days: [1, 3], from: 13, to: 17 }, { type: 'before', pairs: [['pm', 'm']] }, { type: 'lunch' }, { type: 'clear' }] },
  { id: 2,
    items: [it('m', 'teach', 2), it('p', 'teach', 1), it('c', 'teach', 2), it('pm', 'prep', 1), it('pc', 'prep', 1), it('fm', 'note', 1)],
    rules: [{ type: 'window', item: 'm', days: [1, 3], from: 13, to: 17 }, { type: 'window', item: 'p', days: [0, 2], from: 9, to: 12 }, { type: 'cap', max: 3 },
      { type: 'before', pairs: [['pm', 'm'], ['pc', 'c']] }, { type: 'after', pairs: [['m', 'fm']] }, { type: 'lunch' }, { type: 'clear' }] },
  { id: 3,
    items: [it('m', 'teach', 2), it('p', 'teach', 2), it('c', 'teach', 2), it('pm', 'prep', 1), it('pp', 'prep', 1), it('pc', 'prep', 1), it('fm', 'note', 1), it('fc', 'note', 1),
      it('mtg', 'fixed', 2, { day: 3, hour: 13 })],
    rules: [{ type: 'window', item: 'm', days: [1, 3], from: 13, to: 17 }, { type: 'window', item: 'p', days: [0, 2], from: 9, to: 12 }, { type: 'window', item: 'c', days: [0, 4], from: 13, to: 17 },
      { type: 'cap', max: 3 }, { type: 'before', pairs: [['pm', 'm'], ['pp', 'p'], ['pc', 'c']] }, { type: 'after', pairs: [['m', 'fm'], ['c', 'fc']] }, { type: 'lunch' }, { type: 'clear' }] },
];
export const freshItems = (level: Level): Item[] => level.items.map(i => ({ ...i }));

export const isPlaced = (i: Item) => i.day !== undefined && i.hour !== undefined;
const start = (i: Item) => i.day! * 24 + i.hour!;
const overlaps = (a: Item, b: Item) => a.day === b.day && a.hour! < b.hour! + b.len && b.hour! < a.hour! + a.len;
const byId = (items: Item[], id: string) => items.find(i => i.id === id)!;

export function check(rule: Rule, items: Item[]): Result {
  const bad = new Set<string>();
  let missing = false;
  const movable = items.filter(i => i.kind !== 'fixed');
  switch (rule.type) {
    case 'window': {
      const i = byId(items, rule.item);
      if (!isPlaced(i)) missing = true;
      else if (!rule.days.includes(i.day!) || i.hour! < rule.from || i.hour! + i.len > rule.to) bad.add(i.id);
      break;
    }
    case 'cap': {
      const hrs = new Map<number, number>();
      const teach = items.filter(i => i.kind === 'teach');
      for (const i of teach) { if (!isPlaced(i)) missing = true; else hrs.set(i.day!, (hrs.get(i.day!) || 0) + i.len); }
      for (const i of teach) if (isPlaced(i) && (hrs.get(i.day!) || 0) > rule.max) bad.add(i.id);
      break;
    }
    case 'before': case 'after':
      for (const [a, b] of rule.pairs) {
        const x = byId(items, a), y = byId(items, b);
        if (!isPlaced(x) || !isPlaced(y)) { missing = true; continue; }
        const ok = rule.type === 'before' ? start(x) + x.len <= start(y) : x.day === y.day && y.hour! >= x.hour! + x.len;
        if (!ok) { bad.add(a); bad.add(b); }
      }
      break;
    case 'lunch':
      for (const i of items) if (isPlaced(i) && i.hour! < LUNCH + 1 && i.hour! + i.len > LUNCH) bad.add(i.id);
      if (movable.some(i => !isPlaced(i))) missing = true;
      break;
    case 'clear': {
      const on = items.filter(isPlaced);
      for (const a of on) for (const b of on) if (a.id < b.id && overlaps(a, b)) { bad.add(a.id); bad.add(b.id); }
      if (movable.some(i => !isPlaced(i))) missing = true;
      break;
    }
  }
  return { rule, status: bad.size ? 'bad' : missing ? 'wait' : 'ok', bad: [...bad] };
}

export function evaluate(level: Level, items: Item[]) {
  const results = level.rules.map(r => check(r, items));
  const bad = new Set(results.flatMap(r => r.bad));
  return { results, bad, solved: results.every(r => r.status === 'ok') };
}

/** Depth-first search with pruning; returns the items with a full placement, or null. Used to prove levels are solvable. */
export function solve(level: Level): Item[] | null {
  const items = freshItems(level);
  const todo = items.filter(i => !isPlaced(i));
  const spots = (i: Item) => { const out: [number, number][] = []; for (let d = 0; d < WEEK.days; d++) for (let h = WEEK.first; h + i.len <= WEEK.last; h++) out.push([d, h]); return out; };
  const walk = (k: number): boolean => {
    if (k === todo.length) return evaluate(level, items).solved;
    const i = todo[k];
    for (const [d, h] of spots(i)) {
      i.day = d; i.hour = h;
      if (!evaluate(level, items).results.some(r => r.status === 'bad') && walk(k + 1)) return true;
    }
    i.day = undefined; i.hour = undefined; return false;
  };
  return walk(0) ? items : null;
}

/* ---------------- Export ---------------- */
export interface Lesson { id: string; title: string; len: number; day?: number; hour?: number }
/** Ids of placed items that overlap another placed item. */
export function conflicts(items: Pick<Lesson, 'id' | 'len' | 'day' | 'hour'>[]): Set<string> {
  const bad = new Set<string>(), placed = items.filter(l => l.day !== undefined && l.hour !== undefined);
  for (const a of placed) for (const b of placed) if (a.id < b.id && a.day === b.day && a.hour! < b.hour! + b.len && b.hour! < a.hour! + a.len) { bad.add(a.id); bad.add(b.id); }
  return bad;
}
const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
export function buildIcs(items: Lesson[], monday: Date, stamp: Date): string {
  const f = (d: Date, hour: number) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}0000`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//donglinli.com//Plan the week//EN', 'CALSCALE:GREGORIAN'];
  for (const l of items) {
    if (l.day === undefined || l.hour === undefined) continue;
    const d = new Date(monday); d.setDate(d.getDate() + l.day);
    lines.push('BEGIN:VEVENT', `UID:${l.id}-${f(d, l.hour)}@donglinli.com`,
      `DTSTAMP:${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`,
      `DTSTART:${f(d, l.hour)}`, `DTEND:${f(d, l.hour + l.len)}`, `SUMMARY:${esc(l.title)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
export function nextMonday(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d;
}

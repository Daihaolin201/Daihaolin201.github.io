import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/lib/games/week.logic.ts';

const put = (items, id, day, hour) => { const i = items.find(x => x.id === id); i.day = day; i.hour = hour; };
const status = (level, items, type) => g.evaluate(level, items).results.find(r => r.rule.type === type).status;

test('week: every level can be solved, and starts unsolved', () => {
  for (const lv of g.LEVELS) {
    assert.equal(g.evaluate(lv, g.freshItems(lv)).solved, false, `level ${lv.id} must not start solved`);
    const sol = g.solve(lv);
    assert.ok(sol, `level ${lv.id} has a solution`);
    assert.equal(g.evaluate(lv, sol).solved, true);
    assert.ok(sol.every(i => g.isPlaced(i)));
  }
});

test('week: window rule, only the student\'s free afternoons', () => {
  const lv = g.LEVELS[0], items = g.freshItems(lv);
  assert.equal(status(lv, items, 'window'), 'wait');
  put(items, 'm', 0, 14); assert.equal(status(lv, items, 'window'), 'bad', 'Monday is not free');
  put(items, 'm', 1, 11); assert.equal(status(lv, items, 'window'), 'bad', 'morning');
  put(items, 'm', 1, 16); assert.equal(status(lv, items, 'window'), 'bad', 'would run past 17:00');
  put(items, 'm', 1, 15); assert.equal(status(lv, items, 'window'), 'ok');
});

test('week: prep must end before its lesson, feedback must follow on the same day', () => {
  const lv = g.LEVELS[1], items = g.freshItems(lv);
  put(items, 'm', 1, 13); put(items, 'pm', 1, 13); assert.equal(status(lv, items, 'before'), 'bad', 'same hour overlaps');
  put(items, 'pm', 1, 12); assert.equal(status(lv, items, 'before'), 'wait', 'second pair still open');
  put(items, 'pm', 0, 16); assert.equal(status(lv, items, 'before'), 'wait');
  put(items, 'c', 2, 10); put(items, 'pc', 2, 9); assert.equal(status(lv, items, 'before'), 'ok', 'earlier day counts too');
  put(items, 'fm', 2, 15); assert.equal(status(lv, items, 'after'), 'bad', 'different day');
  put(items, 'fm', 1, 14); assert.equal(status(lv, items, 'after'), 'bad', 'overlaps the lesson');
  put(items, 'fm', 1, 15); assert.equal(status(lv, items, 'after'), 'ok');
  put(items, 'fm', 1, 9); assert.equal(status(lv, items, 'after'), 'bad', 'before the lesson');
});

test('week: at most three teaching hours a day, prep and notes do not count', () => {
  const lv = g.LEVELS[1], items = g.freshItems(lv);
  put(items, 'm', 1, 13); put(items, 'c', 1, 15);
  const r = g.check({ type: 'cap', max: 3 }, items);
  assert.equal(r.status, 'bad'); assert.deepEqual(r.bad.sort(), ['c', 'm']);
  put(items, 'c', 2, 9); put(items, 'pm', 1, 9); put(items, 'pc', 1, 10); put(items, 'fm', 1, 15);
  assert.equal(g.check({ type: 'cap', max: 3 }, items).status, 'wait', 'physics is still unplaced');
  put(items, 'p', 1, 11);
  assert.equal(g.check({ type: 'cap', max: 3 }, items).status, 'ok', 'exactly three on Tuesday is allowed');
  put(items, 'p', 2, 12); assert.equal(g.check({ type: 'cap', max: 3 }, items).status, 'ok', 'Wednesday: control 2 + physics 1');
  put(items, 'c', 1, 9); assert.equal(g.check({ type: 'cap', max: 3 }, items).status, 'bad', 'Tuesday: maths 2 + control 2');
});

test('week: lunch hour stays free and overlaps are flagged', () => {
  const lv = g.LEVELS[0], items = g.freshItems(lv);
  put(items, 'p', 0, 12); assert.equal(status(lv, items, 'lunch'), 'bad');
  put(items, 'p', 0, 11); put(items, 'm', 1, 11); assert.equal(status(lv, items, 'lunch'), 'bad', 'two-hour lesson reaches into lunch');
  put(items, 'm', 1, 13); assert.equal(status(lv, items, 'lunch'), 'wait');
  put(items, 'pm', 1, 13); put(items, 'ck', 3, 9);
  assert.equal(status(lv, items, 'lunch'), 'ok');
  const e = g.evaluate(lv, items);
  assert.equal(e.results.find(x => x.rule.type === 'clear').status, 'bad'); assert.deepEqual(e.results.find(x => x.rule.type === 'clear').bad.sort(), ['m', 'pm']);
  assert.equal(e.solved, false);
});

test('week: the fixed meeting blocks its hours on level 3', () => {
  const lv = g.LEVELS[2], items = g.freshItems(lv);
  const mtg = items.find(i => i.id === 'mtg'); assert.deepEqual([mtg.day, mtg.hour, mtg.len], [3, 13, 2]);
  put(items, 'm', 3, 14);
  const clear = g.check({ type: 'clear' }, items);
  assert.equal(clear.status, 'bad'); assert.deepEqual(clear.bad.sort(), ['m', 'mtg']);
  put(items, 'm', 3, 15); assert.equal(g.check({ type: 'clear' }, items).status, 'wait');
});

test('week: schedule overlaps are flagged and .ics is valid and escaped', () => {
  const items = [{ id: 'a', title: 'Maths, year 10; room 2', len: 2, day: 0, hour: 9 }, { id: 'b', title: 'Physics', len: 1, day: 0, hour: 10 }, { id: 'c', title: 'Prep', len: 1, day: 1, hour: 10 }, { id: 'd', title: 'Unplaced', len: 1 }];
  assert.deepEqual([...g.conflicts(items)].sort(), ['a', 'b']);
  const monday = new Date(2026, 10, 23);
  const ics = g.buildIcs(items, monday, new Date(Date.UTC(2026, 10, 22, 12, 0, 0)));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.ok(ics.includes('DTSTART:20261123T090000') && ics.includes('DTEND:20261123T110000') && ics.includes('DTSTART:20261124T100000'));
  assert.ok(ics.includes('SUMMARY:Maths\\, year 10\\; room 2') && ics.includes('DTSTAMP:20261122T120000Z'));
  assert.equal(g.nextMonday(new Date(2026, 10, 22)).getDate(), 23); assert.equal(g.nextMonday(new Date(2026, 10, 23)).getDate(), 30);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { search, FIELD, INITIAL_SOURCE, STARTS } from '../src/lib/sourceSearch.ts';

test('both strategies replay the same scenario independently of execution order', () => {
  const independent = search(INITIAL_SOURCE, .055, 42, 'independent');
  const shared = search(INITIAL_SOURCE, .055, 42, 'shared');
  assert.deepEqual(search(INITIAL_SOURCE, .055, 42, 'independent'), independent);
  assert.deepEqual(search(INITIAL_SOURCE, .055, 42, 'shared'), shared);
  assert.notDeepEqual(independent.paths, shared.paths);
  for (const run of [independent, shared]) {
    assert.ok(run.foundBy >= 0 && run.steps <= FIELD.limit);
    for (const [i, path] of run.paths.entries()) {
      assert.deepEqual(path[0], STARTS[i]);
      assert.equal(path.length, run.steps + 1);
    }
    const end = run.paths[run.foundBy].at(-1);
    assert.ok(Math.hypot(end.x - INITIAL_SOURCE.x, end.y - INITIAL_SOURCE.y) <= FIELD.radius);
  }
});

test('a source within range at the start is discovered at step zero', () => {
  const run = search(STARTS[1], .055, 42, 'shared');
  assert.equal(run.steps, 0);
  assert.equal(run.foundBy, 1);
});

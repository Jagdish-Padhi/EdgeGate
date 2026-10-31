import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoundedKV } from '../../src/kv/index.js';
import { ManualClock } from '../../src/shared/index.js';

function makeKv(overrides = {}) {
  const clock = new ManualClock(0);
  const kv = new BoundedKV({ maxEntries: 2, idleTtlMs: 1000, clock, ...overrides });
  return { kv, clock };
}

test('evicts the least recently used entry when full', () => {
  const { kv } = makeKv();
  kv.set('a', 1);
  kv.set('b', 2);
  kv.get('a');
  kv.set('c', 3);
  assert.equal(kv.get('b'), undefined);
  assert.equal(kv.get('a'), 1);
  assert.equal(kv.get('c'), 3);
});

test('never evicts entries that are pinned', () => {
  const { kv } = makeKv({ canEvict: (value) => value !== 'pinned' });
  kv.set('a', 'pinned');
  kv.set('b', 'x');
  kv.set('c', 'y');
  assert.equal(kv.get('a'), 'pinned');
  assert.equal(kv.size, 2);
});

test('exceeds the soft cap rather than drop pinned entries', () => {
  const { kv } = makeKv({ canEvict: () => false });
  kv.set('a', 1);
  kv.set('b', 2);
  kv.set('c', 3);
  assert.equal(kv.size, 3);
});

test('expires idle entries on read and on sweep', () => {
  const { kv, clock } = makeKv({ maxEntries: 10 });
  kv.set('a', 1);
  kv.set('b', 2);
  clock.advance(1500);
  assert.equal(kv.get('a'), undefined);
  assert.equal(kv.sweep(), 1);
  assert.equal(kv.size, 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TokenBucket } from '../../src/engine/index.js';

test('starts full and rejects once the burst is spent', () => {
  const bucket = new TokenBucket({ capacity: 3, refillPerSec: 1 }, 0);
  assert.equal(bucket.tryTake(0), true);
  assert.equal(bucket.tryTake(0), true);
  assert.equal(bucket.tryTake(0), true);
  assert.equal(bucket.tryTake(0), false);
});

test('refills at the configured rate and never exceeds capacity', () => {
  const bucket = new TokenBucket({ capacity: 2, refillPerSec: 2 }, 0);
  bucket.tryTake(0);
  bucket.tryTake(0);
  assert.equal(bucket.available(500), 1);
  assert.equal(bucket.available(60_000), 2);
});

test('reports how long to wait for the next token', () => {
  const bucket = new TokenBucket({ capacity: 1, refillPerSec: 4 }, 0);
  bucket.tryTake(0);
  assert.equal(bucket.waitMs(0), 250);
  assert.equal(bucket.waitMs(250), 0);
});

test('reconfigure clamps tokens to the new capacity', () => {
  const bucket = new TokenBucket({ capacity: 10, refillPerSec: 1 }, 0);
  bucket.reconfigure({ capacity: 4, refillPerSec: 1 }, 0);
  assert.equal(bucket.available(0), 4);
});

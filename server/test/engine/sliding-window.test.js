import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SlidingWindowCounter, slidingEstimate } from '../../src/engine/index.js';

const WINDOW = 60_000;

test('previous window is weighted by its remaining overlap', () => {
  const estimate = slidingEstimate({ current: 10, previous: 40, elapsedMs: 15_000, windowMs: WINDOW });
  assert.equal(estimate, 10 + 40 * 0.75);
});

test('counts roll forward and expire after two idle windows', () => {
  const counter = new SlidingWindowCounter(WINDOW, 0);
  counter.add(0, 8);
  assert.equal(counter.estimate(WINDOW), 8);
  assert.equal(counter.estimate(WINDOW + 30_000), 4);
  assert.equal(counter.estimate(3 * WINDOW), 0);
});

test('stops the boundary burst that a fixed window lets through', () => {
  const limit = 10;

  // Fixed window: ten requests at the end of one window, ten at the start of the next.
  const fixed = new Map();
  const fixedAdmit = (time) => {
    const id = Math.floor(time / WINDOW);
    if ((fixed.get(id) ?? 0) >= limit) return false;
    fixed.set(id, (fixed.get(id) ?? 0) + 1);
    return true;
  };

  const sliding = new SlidingWindowCounter(WINDOW, 0);
  const slidingAdmit = (time) => {
    if (!sliding.has(time, limit)) return false;
    sliding.add(time);
    return true;
  };

  const times = [
    ...Array.from({ length: 10 }, () => WINDOW - 1000),
    ...Array.from({ length: 10 }, () => WINDOW + 1000),
  ];
  const fixedAdmitted = times.filter(fixedAdmit).length;
  const slidingAdmitted = times.filter(slidingAdmit).length;

  assert.equal(fixedAdmitted, 20);
  assert.ok(slidingAdmitted <= limit + 1, `sliding admitted ${slidingAdmitted}`);
});

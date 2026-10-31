import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FaultInjector } from '../../src/chaos/index.js';

test('latency jitter stays within the configured range', async () => {
  const delays = [];
  const faults = new FaultInjector({
    rng: () => 1,
    sleep: async (delay) => delays.push(delay),
    latencyMs: 40,
    jitterMs: 20,
  });

  await faults.call(async () => 'ok');

  assert.deepEqual(delays, [60]);
});

test('negative jitter cannot create a negative delay', async () => {
  const delays = [];
  const faults = new FaultInjector({
    rng: () => 0,
    sleep: async (delay) => delays.push(delay),
    latencyMs: 10,
    jitterMs: 20,
  });

  await faults.call(async () => 'ok');

  assert.deepEqual(delays, []);
});

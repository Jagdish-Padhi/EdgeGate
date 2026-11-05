import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocateLease } from '../../src/engine/index.js';

test('splits evenly when nobody has shown demand', () => {
  const demand = new Map([['a', 0], ['b', 0], ['c', 0]]);
  assert.equal(allocateLease({ available: 30, demandByNode: demand, nodeId: 'a' }), 10);
});

test('busy nodes receive a larger share than idle ones', () => {
  const demand = new Map([['a', 90], ['b', 0], ['c', 0]]);
  const busy = allocateLease({ available: 100, demandByNode: demand, nodeId: 'a' });
  const idle = allocateLease({ available: 100, demandByNode: demand, nodeId: 'b' });
  assert.ok(busy > 80);
  assert.ok(idle >= 1 && idle < 5);
});

test('never grants more than is available', () => {
  const demand = new Map([['a', 5]]);
  assert.equal(allocateLease({ available: 2, demandByNode: demand, nodeId: 'a' }), 2);
  assert.equal(allocateLease({ available: 0, demandByNode: demand, nodeId: 'a' }), 0);
});

test('a node absent from the demand map still gets a share', () => {
  const demand = new Map([['a', 10]]);
  assert.ok(allocateLease({ available: 20, demandByNode: demand, nodeId: 'new' }) >= 1);
});

test('peers that have not reported yet still reserve a share', () => {
  const demand = new Map();
  const first = allocateLease({ available: 30, demandByNode: demand, nodeId: 'a', peers: 3 });
  assert.equal(first, 10);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCluster } from '../../harness/cluster.js';

const LIMIT = 20;

function batch(overrides = {}) {
  return {
    nodeId: 'edge-0',
    epoch: 'e1',
    seq: 0,
    intervalMs: 1000,
    peers: 3,
    rulesVersion: 1,
    reports: [
      { key: 'public-api|tenant:acme', ruleId: 'public-api', tier: 'free', admitted: 0, denied: 0 },
    ],
    ...overrides,
  };
}

test('grants stay within the limit across nodes syncing in sequence', async () => {
  const { service } = await createCluster();
  let granted = 0;
  for (const nodeId of ['edge-0', 'edge-1', 'edge-2']) {
    const { grants } = await service.handleSync(batch({ nodeId }));
    granted += grants[0].size;
  }
  assert.ok(granted <= LIMIT, `granted ${granted}`);
  assert.ok(granted >= LIMIT / 2, `granted only ${granted}`);
});

test('a replayed batch is counted once', async () => {
  const { service } = await createCluster();
  const report = { key: 'public-api|tenant:acme', ruleId: 'public-api', tier: 'free', admitted: 6, denied: 0 };
  await service.handleSync(batch({ reports: [report] }));
  await service.handleSync(batch({ reports: [report] }));
  const usage = await service.describeKey(report.key);
  assert.equal(usage.used, 6);
});

test('a new epoch with the same sequence number is a different batch', async () => {
  const { service } = await createCluster();
  const report = { key: 'public-api|tenant:acme', ruleId: 'public-api', tier: 'free', admitted: 4, denied: 0 };
  await service.handleSync(batch({ epoch: 'e1', reports: [report] }));
  await service.handleSync(batch({ epoch: 'e2', reports: [report] }));
  assert.equal((await service.describeKey(report.key)).used, 8);
});

test('leases abandoned by a crashed node are reclaimed after they expire', async () => {
  const { service, clock } = await createCluster();
  await service.handleSync(batch({ nodeId: 'edge-0' }));
  await service.handleSync(batch({ nodeId: 'edge-1' }));
  const key = 'public-api|tenant:acme';
  const held = await service.describeKey(key);
  assert.deepEqual(held.leases.map((lease) => lease.nodeId).sort(), ['edge-0', 'edge-1']);

  clock.advance(4000);
  await service.handleSync(batch({ nodeId: 'edge-1', seq: 1 }));
  const after = await service.describeKey(key);
  assert.deepEqual(after.leases.map((lease) => lease.nodeId), ['edge-1']);
});

test('concurrent syncs for one key cannot over-allocate', async () => {
  const { service } = await createCluster({ nodes: 5 });
  const responses = await Promise.all(
    ['a', 'b', 'c', 'd', 'e'].map((nodeId) => service.handleSync(batch({ nodeId })))
  );
  const total = responses.reduce((sum, response) => sum + response.grants[0].size, 0);
  assert.ok(total <= LIMIT, `granted ${total}`);
});

test('malformed batches are rejected', async () => {
  const { service } = await createCluster();
  await assert.rejects(() => service.handleSync(batch({ seq: -1 })), /seq/);
  await assert.rejects(() => service.handleSync(batch({ reports: [{ key: 1 }] })), /report/);
});

test('rules are pushed only to nodes with a stale version', async () => {
  const { service } = await createCluster();
  assert.equal((await service.handleSync(batch({ rulesVersion: 1 }))).rules, undefined);
  assert.equal((await service.handleSync(batch({ seq: 1, rulesVersion: 0 }))).rules.version, 1);
});

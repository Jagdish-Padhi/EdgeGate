import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCluster } from '../../harness/cluster.js';
import { burst } from '../helpers/requests.js';

const LIMIT = 20;
const PEERS = 3;
const LOCAL_SHARE = Math.floor(LIMIT / PEERS);
const KEY = 'public-api|tenant:acme';

/** Every edge sends a burst each second for `seconds`, syncing after each round. */
async function sustainedBurst(cluster, seconds, perEdge = 30) {
  let admitted = 0;
  for (let second = 0; second < seconds; second += 1) {
    for (let edge = 0; edge < cluster.edges.length; edge += 1) {
      admitted += await burst(cluster, edge, perEdge);
    }
    await cluster.syncAll();
    cluster.advance(1000);
  }
  return admitted;
}

test('the global limit holds when every edge is hammered', async () => {
  const cluster = await createCluster();
  const admitted = await sustainedBurst(cluster, 20);
  assert.ok(admitted <= LIMIT, `admitted ${admitted}`);
  assert.ok(admitted >= LIMIT - 4, `only admitted ${admitted}`);
});

test('a single edge cannot spend more than its burst in one instant', async () => {
  const cluster = await createCluster();
  const pro = { apiKey: 'key-pro-globex' };
  const admitted = await burst(cluster, 0, 150, pro);
  assert.ok(admitted <= 50, `admitted ${admitted}`);
  assert.equal((await cluster.request(0, pro)).reason, 'burst');
});

test('quota freed by idle edges moves to the edge that needs it', async () => {
  const cluster = await createCluster();
  let admitted = 0;
  for (let second = 0; second < 30; second += 1) {
    admitted += await burst(cluster, 0, 8);
    await cluster.syncAll();
    cluster.advance(1000);
  }
  assert.ok(admitted <= LIMIT, `admitted ${admitted}`);
  assert.ok(admitted >= LIMIT - 3, `a lone busy edge only got ${admitted}`);
});

test('identities have independent budgets', async () => {
  const cluster = await createCluster();
  const acme = await burst(cluster, 0, 50, { apiKey: 'key-free-acme' });
  const globex = await burst(cluster, 0, 80, { apiKey: 'key-pro-globex' });
  assert.ok(globex > acme);

  const login = (ip) => burst(cluster, 0, 20, { method: 'POST', path: '/auth/login', ip });
  const first = await login('203.0.113.1');
  const second = await login('203.0.113.2');
  assert.ok(first >= 1 && second >= 1);
});

test('a partitioned edge falls back to its local share and usage reconciles after healing', async () => {
  const cluster = await createCluster();
  cluster.edges[1].faults.configure({ partitioned: true });

  const admitted = await sustainedBurst(cluster, 10);
  assert.ok(admitted <= LIMIT + LOCAL_SHARE, `admitted ${admitted}`);
  assert.equal(cluster.edges[1].sync.status().hasInflightBatch, true);
  assert.equal(cluster.edges[1].sync.reachable, false);

  const modes = new Set(cluster.edges[1].enforcer.snapshot().keys.map((key) => key.mode));
  assert.deepEqual([...modes], ['local']);

  cluster.edges[1].faults.configure({ partitioned: false });
  await cluster.syncAll();
  await cluster.syncAll();

  const usage = await cluster.service.describeKey(KEY);
  const total = cluster.edges.reduce((sum, edge) => sum + edge.enforcer.snapshot().keys[0].allowed, 0);
  assert.equal(usage.used, total);
  assert.equal(cluster.edges[1].sync.reachable, true);
});

test('a lost sync response does not double count usage', async () => {
  const cluster = await createCluster();
  const edge = cluster.edges[0];
  const admitted = await burst(cluster, 0, 6);
  assert.ok(admitted > 0);

  edge.faults.rng = () => 0;
  edge.faults.configure({ lostResponseRate: 1 });
  await edge.sync.tick();
  assert.equal(edge.sync.status().hasInflightBatch, true);

  edge.faults.configure({ lostResponseRate: 0 });
  await edge.sync.tick();
  assert.equal(edge.sync.status().hasInflightBatch, false);

  assert.equal((await cluster.service.describeKey(KEY)).used, admitted);
});

test('a restarted edge rejoins with a new epoch and global usage survives', async () => {
  const cluster = await createCluster();
  const before = await burst(cluster, 0, 20);
  await cluster.syncAll();

  const restarted = cluster.restartEdge(0, 'e2');
  assert.equal(restarted.enforcer.snapshot().keyCount, 0);

  const after = await burst(cluster, 0, 20);
  await cluster.syncAll();

  assert.ok(before + after <= LIMIT, `edge-0 admitted ${before + after}`);
  assert.equal((await cluster.service.describeKey(KEY)).used, before + after);
});

test('a crash loses at most the usage not yet reported', async () => {
  const cluster = await createCluster();
  const unreported = await burst(cluster, 0, 20);
  cluster.restartEdge(0, 'e2');

  let others = 0;
  for (let second = 0; second < 10; second += 1) {
    others += await burst(cluster, 1, 10);
    others += await burst(cluster, 2, 10);
    await cluster.syncAll();
    cluster.advance(1000);
  }
  assert.ok(unreported <= Math.ceil(LIMIT / PEERS), `lost lease worth ${unreported}`);
  assert.ok(others <= LIMIT, `survivors admitted ${others}`);
});

test('fail-closed rejects without a lease and fail-open admits', async () => {
  const closed = await createCluster({ failMode: 'closed' });
  closed.edges[0].faults.configure({ partitioned: true });
  assert.equal((await closed.request(0)).reason, 'fail-closed');

  const open = await createCluster({ failMode: 'open' });
  open.edges[0].faults.configure({ partitioned: true });
  assert.ok((await burst(open, 0, 10)) >= 9);
  assert.equal((await open.request(0)).mode, 'open');
});

test('a rule change reaches the edges on their next sync', async () => {
  const cluster = await createCluster();
  await burst(cluster, 0, 3);
  await cluster.syncAll();

  const current = await cluster.service.getRuleSet();
  const tightened = structuredClone(current);
  const tier = tightened.rules.find((rule) => rule.id === 'public-api').tiers.free;
  tier.limit = 5;
  tier.burst = 5;
  await cluster.service.replaceRuleSet(tightened);

  await cluster.syncAll();
  assert.equal(cluster.edges[0].enforcer.rulesVersion, 2);
  assert.equal((await cluster.request(0)).limit, 5);
});

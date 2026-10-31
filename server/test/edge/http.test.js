import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createCoordinator } from '../../src/coordinator/index.js';
import { createEdgeNode } from '../../src/edge/index.js';
import { createOriginApp } from '../../src/origin/index.js';
import { silentLogger, systemClock } from '../../src/shared/index.js';
import { MemoryStore } from '../../src/store/index.js';

const servers = [];

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
    servers.push(server);
  });
}

let edgeUrl;
let node;

before(async () => {
  const origin = await listen(createOriginApp());
  const coordinator = await createCoordinator({
    store: new MemoryStore(),
    clock: systemClock,
    log: silentLogger,
  });
  const coordinatorServer = await listen(coordinator.app);

  node = createEdgeNode({
    log: silentLogger,
    config: {
      id: 'edge-test',
      peers: 3,
      syncIntervalMs: 60_000,
      failMode: 'bounded',
      kvMaxEntries: 100,
      coordinatorUrl: `http://127.0.0.1:${coordinatorServer.address().port}`,
      originUrl: `http://127.0.0.1:${origin.address().port}`,
    },
  });
  const edgeServer = await listen(node.app);
  edgeUrl = `http://127.0.0.1:${edgeServer.address().port}`;
});

after(() => {
  node.stop();
  for (const server of servers) server.close();
});

test('admitted requests are proxied with rate limit headers', async () => {
  const response = await fetch(`${edgeUrl}/api/orders`, { headers: { 'x-api-key': 'key-pro-globex' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-ratelimit-limit'), '200');
  assert.equal(response.headers.get('x-edge-node'), 'edge-test');
  assert.equal((await response.json()).orders.length, 3);
});

test('exceeding the quota returns 429 with Retry-After', async () => {
  const statuses = [];
  let last;
  for (let i = 0; i < 12; i += 1) {
    last = await fetch(`${edgeUrl}/api/weather`, { headers: { 'x-api-key': 'key-free-acme' } });
    statuses.push(last.status);
  }
  assert.ok(statuses.includes(429));
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) >= 1);
  assert.equal((await last.json()).error, 'rate_limited');
});

test('login attempts are limited per ip and bodies reach the origin', async () => {
  const attempt = () =>
    fetch(`${edgeUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'demo@edgegate.dev', password: 'wrong' }),
    });
  const first = await attempt();
  assert.equal(first.status, 401);
  let limited = false;
  for (let i = 0; i < 6; i += 1) limited ||= (await attempt()).status === 429;
  assert.equal(limited, true);
});

test('paths without a rule pass through untouched', async () => {
  const response = await fetch(`${edgeUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-ratelimit-limit'), null);
});

test('the state endpoint exposes keys, sync health and faults', async () => {
  const state = await (await fetch(`${edgeUrl}/_edge/state`)).json();
  assert.equal(state.nodeId, 'edge-test');
  assert.ok(state.keys.length >= 2);
  assert.equal(state.faults.partitioned, false);

  const faults = await (
    await fetch(`${edgeUrl}/_edge/faults`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ partitioned: true }),
    })
  ).json();
  assert.equal(faults.partitioned, true);
});

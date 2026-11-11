import { FaultInjector } from '../chaos/index.js';
import { DEFAULT_RULE_SET } from '../rules/index.js';
import { systemClock } from '../shared/index.js';
import { createEdgeApp } from './app.js';
import { Enforcer } from './enforcer.js';
import { HttpTransport } from './http-transport.js';
import { SyncClient } from './sync-client.js';

function newEpoch(clock) {
  return `${clock.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Composes one edge node. The node boots with the bundled default rule set so it
 * can enforce limits even if the coordinator is unreachable at startup.
 */
export function createEdgeNode({ config, log, clock = systemClock, transport, faults }) {
  const nodeFaults = faults ?? new FaultInjector({
    latencyMs: config.syncLatencyMs,
    jitterMs: config.syncJitterMs,
    lostResponseRate: config.syncLossRate,
  });
  const enforcer = new Enforcer({
    nodeId: config.id,
    clock,
    ruleSet: structuredClone(DEFAULT_RULE_SET),
    failMode: config.failMode,
    peers: config.peers,
    syncIntervalMs: config.syncIntervalMs,
    maxEntries: config.kvMaxEntries,
  });

  const syncClient = new SyncClient({
    nodeId: config.id,
    epoch: newEpoch(clock),
    enforcer,
    transport: transport ?? new HttpTransport({ baseUrl: config.coordinatorUrl, timeoutMs: config.syncTimeoutMs ?? 5000 }),
    faults: nodeFaults,
    clock,
    intervalMs: config.syncIntervalMs,
    log,
  });

  const app = createEdgeApp({
    nodeId: config.id,
    enforcer,
    syncClient,
    faults: nodeFaults,
    upstreamUrl: config.originUrl,
    log,
  });

  return {
    app,
    enforcer,
    syncClient,
    faults: nodeFaults,
    start() {
      syncClient.start();
      void syncClient.tick();
    },
    stop() {
      syncClient.stop();
    },
  };
}

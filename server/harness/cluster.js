import { FaultInjector } from '../src/chaos/index.js';
import { SyncService } from '../src/coordinator/index.js';
import { Enforcer, SyncClient, admit } from '../src/edge/index.js';
import { DEFAULT_RULE_SET } from '../src/rules/index.js';
import { ManualClock, silentLogger } from '../src/shared/index.js';
import { TestStore } from '../test/helpers/test-store.js';

/**
 * In-process cluster: one coordinator and several edge nodes sharing a manual
 * clock. Used by integration tests and benchmarks so time is fully deterministic.
 */
export async function createCluster({
  nodes = 3,
  syncIntervalMs = 1000,
  failMode = 'bounded',
  ruleSet = DEFAULT_RULE_SET,
  clock = new ManualClock(1_000_000),
} = {}) {
  const store = new TestStore({ clock });
  const service = new SyncService({ store, clock, log: silentLogger });
  await service.init();
  if (ruleSet !== DEFAULT_RULE_SET) await service.replaceRuleSet(ruleSet);
  const rules = await service.getRuleSet();

  const edges = Array.from({ length: nodes }, (_, index) => buildEdge(index));

  function buildEdge(index, epoch = 'e1') {
    const nodeId = `edge-${index}`;
    const faults = new FaultInjector({ sleep: async () => {} });
    const enforcer = new Enforcer({
      nodeId,
      clock,
      ruleSet: structuredClone(rules),
      failMode,
      peers: nodes,
      syncIntervalMs,
      maxEntries: 10_000,
    });
    const sync = new SyncClient({
      nodeId,
      epoch,
      enforcer,
      transport: { send: (batch) => service.handleSync(structuredClone(batch)) },
      faults,
      clock,
      intervalMs: syncIntervalMs,
      log: silentLogger,
    });
    return { nodeId, enforcer, sync, faults };
  }

  return {
    clock,
    store,
    service,
    edges,

    request(edgeIndex, overrides = {}) {
      const { enforcer, sync } = edges[edgeIndex];
      return admit(enforcer, sync, {
        method: 'GET',
        path: '/api/orders',
        ip: '10.0.0.1',
        apiKey: 'key-free-acme',
        ...overrides,
      });
    },

    syncAll() {
      return Promise.all(edges.map((edge) => edge.sync.tick()));
    },

    advance(ms) {
      clock.advance(ms);
    },

    /** Replaces an edge with a fresh process: empty memory, new epoch. */
    restartEdge(index, epoch) {
      edges[index] = buildEdge(index, epoch);
      return edges[index];
    },
  };
}

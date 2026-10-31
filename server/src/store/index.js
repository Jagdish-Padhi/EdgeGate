import { MemoryStore } from './memory-store.js';
import { MongoStore } from './mongo-store.js';

export { MemoryStore, MongoStore };

/**
 * Store contract used by the coordinator (all methods async):
 *   init(), close()
 *   addUsage(key, bucketId, amount, expiresAt)
 *   getWindowCounts(key, bucketId) -> { current, previous }
 *   claimBatch(nodeId, epoch, seq, expiresAt) -> boolean (false for replays)
 *   upsertLease(lease), listLeases(key, now)
 *   getRuleSet(), saveRuleSet(ruleSet)
 */
export function createStore({ kind, mongoUri, mongoDb }) {
  if (kind === 'memory') return new MemoryStore();
  if (kind === 'mongo') return new MongoStore({ uri: mongoUri, dbName: mongoDb });
  throw new Error(`Unknown store kind "${kind}"`);
}

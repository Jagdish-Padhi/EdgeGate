import { MongoStore } from './mongo-store.js';

export { MongoStore };

/**
 * Store contract used by the coordinator (all methods async):
 *   init(), close()
 *   addUsage(key, bucketId, amount, expiresAt)
 *   getWindowCounts(key, bucketId) -> { current, previous }
 *   claimBatch(nodeId, epoch, seq, expiresAt) -> boolean (false for replays)
 *   upsertLease(lease), listLeases(key, now)
 *   getRuleSet(), saveRuleSet(ruleSet)
 */
export function createStore({ mongoUri, mongoDb }) {
  return new MongoStore({ uri: mongoUri, dbName: mongoDb });
}

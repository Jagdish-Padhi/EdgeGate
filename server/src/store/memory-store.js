import { systemClock } from '../shared/index.js';

const SWEEP_EVERY_WRITES = 500;

/** Non-durable store for tests, benchmarks and running without MongoDB. */
export class MemoryStore {
  constructor({ clock = systemClock } = {}) {
    this.clock = clock;
    this.usage = new Map();
    this.leases = new Map();
    this.batches = new Map();
    this.ruleSet = null;
    this.writes = 0;
  }

  async init() {}

  async close() {}

  async addUsage(key, bucketId, amount, expiresAt) {
    const id = `${key}#${bucketId}`;
    const entry = this.usage.get(id) ?? { count: 0, expiresAt };
    entry.count += amount;
    entry.expiresAt = expiresAt;
    this.usage.set(id, entry);
    this.#maybeSweep();
  }

  async getWindowCounts(key, bucketId) {
    return {
      current: this.usage.get(`${key}#${bucketId}`)?.count ?? 0,
      previous: this.usage.get(`${key}#${bucketId - 1}`)?.count ?? 0,
    };
  }

  /** Returns true the first time a batch identity is seen, false for replays. */
  async claimBatch(nodeId, epoch, seq, expiresAt) {
    const id = `${nodeId}#${epoch}#${seq}`;
    if (this.batches.has(id)) return false;
    this.batches.set(id, expiresAt);
    return true;
  }

  async upsertLease(lease) {
    this.leases.set(`${lease.key}#${lease.nodeId}`, { ...lease });
  }

  async listLeases(key, now) {
    const live = [];
    for (const lease of this.leases.values()) {
      if (lease.key === key && lease.expiresAt > now) live.push({ ...lease });
    }
    return live;
  }

  async getRuleSet() {
    return this.ruleSet ? structuredClone(this.ruleSet) : null;
  }

  async saveRuleSet(ruleSet) {
    this.ruleSet = structuredClone(ruleSet);
  }

  #maybeSweep() {
    this.writes += 1;
    if (this.writes % SWEEP_EVERY_WRITES !== 0) return;
    const now = this.clock.now();
    for (const [id, entry] of this.usage) if (entry.expiresAt <= now) this.usage.delete(id);
    for (const [id, expiresAt] of this.batches) if (expiresAt <= now) this.batches.delete(id);
    for (const [id, lease] of this.leases) if (lease.expiresAt <= now) this.leases.delete(id);
  }
}

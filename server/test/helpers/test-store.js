export class TestStore {
  constructor({ clock } = {}) {
    this.clock = clock;
    this.usage = new Map();
    this.leases = new Map();
    this.batches = new Map();
    this.ruleSet = null;
  }

  async init() {}
  async close() {}

  async addUsage(key, bucketId, amount, expiresAt) {
    const id = `${key}#${bucketId}`;
    const entry = this.usage.get(id) ?? { count: 0, expiresAt };
    entry.count += amount;
    entry.expiresAt = expiresAt;
    this.usage.set(id, entry);
  }

  async getWindowCounts(key, bucketId) {
    return {
      current: this.usage.get(`${key}#${bucketId}`)?.count ?? 0,
      previous: this.usage.get(`${key}#${bucketId - 1}`)?.count ?? 0,
    };
  }

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
    return [...this.leases.values()].filter((lease) => lease.key === key && lease.expiresAt > now);
  }

  async getRuleSet() {
    return this.ruleSet ? structuredClone(this.ruleSet) : null;
  }

  async saveRuleSet(ruleSet) {
    this.ruleSet = structuredClone(ruleSet);
  }
}

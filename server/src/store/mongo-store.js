import { MongoClient } from 'mongodb';

const DUPLICATE_KEY = 11000;

/**
 * Durable store backed by MongoDB. Documents carry an `expireAt` date so TTL
 * indexes reclaim old counters, leases and batch records.
 */
export class MongoStore {
  constructor({ uri, dbName }) {
    this.client = new MongoClient(uri);
    this.dbName = dbName;
  }

  async init() {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.usage = db.collection('usage');
    this.leases = db.collection('leases');
    this.batches = db.collection('batches');
    this.rules = db.collection('rules');

    await Promise.all([
      this.usage.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
      this.leases.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
      this.leases.createIndex({ key: 1, expiresAt: 1 }),
      this.batches.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  }

  async close() {
    await this.client.close();
  }

  async addUsage(key, bucketId, amount, expiresAt) {
    await this.usage.updateOne(
      { _id: `${key}#${bucketId}` },
      { $inc: { count: amount }, $set: { expireAt: new Date(expiresAt) } },
      { upsert: true }
    );
  }

  async getWindowCounts(key, bucketId) {
    const ids = [`${key}#${bucketId}`, `${key}#${bucketId - 1}`];
    const docs = await this.usage.find({ _id: { $in: ids } }).toArray();
    const countOf = (id) => docs.find((doc) => doc._id === id)?.count ?? 0;
    return { current: countOf(ids[0]), previous: countOf(ids[1]) };
  }

  async claimBatch(nodeId, epoch, seq, expiresAt) {
    try {
      await this.batches.insertOne({
        _id: `${nodeId}#${epoch}#${seq}`,
        expireAt: new Date(expiresAt),
      });
      return true;
    } catch (err) {
      if (err.code === DUPLICATE_KEY) return false;
      throw err;
    }
  }

  async upsertLease(lease) {
    await this.leases.replaceOne(
      { _id: `${lease.key}#${lease.nodeId}` },
      { ...lease, expireAt: new Date(lease.expiresAt) },
      { upsert: true }
    );
  }

  async listLeases(key, now) {
    const docs = await this.leases.find({ key, expiresAt: { $gt: now } }).toArray();
    return docs.map(({ _id, expireAt, ...lease }) => lease);
  }

  async getRuleSet() {
    const doc = await this.rules.findOne({ _id: 'current' });
    if (!doc) return null;
    const { _id, ...ruleSet } = doc;
    return ruleSet;
  }

  async saveRuleSet(ruleSet) {
    await this.rules.replaceOne({ _id: 'current' }, { _id: 'current', ...ruleSet }, { upsert: true });
  }
}

import { allocateLease, slidingEstimate, windowPosition } from '../engine/index.js';
import { DEFAULT_RULE_SET, tierFor, validateRuleSet } from '../rules/index.js';
import { silentLogger } from '../shared/index.js';
import { validateBatch } from './batch.js';
import { KeyedMutex } from './keyed-mutex.js';

const BATCH_RETENTION_MS = 10 * 60 * 1000;
const DEMAND_SMOOTHING = 0.5;

/**
 * Applies usage reported by edge nodes to the global counters and hands back a
 * fresh lease for each reported key.
 *
 * Invariant per key: usage + sum of outstanding leases never exceeds the limit
 * at the moment a lease is granted. A node's previous lease is replaced, not
 * added to, when it syncs; abandoned leases are reclaimed when they expire.
 */
export class SyncService {
  constructor({ store, clock, log = silentLogger }) {
    this.store = store;
    this.clock = clock;
    this.log = log;
    this.mutex = new KeyedMutex();
  }

  async init() {
    await this.store.init();
    if (!(await this.store.getRuleSet())) {
      await this.store.saveRuleSet(structuredClone(DEFAULT_RULE_SET));
      this.log.info('seeded default rule set');
    }
  }

  async handleSync(batch) {
    validateBatch(batch);
    const now = this.clock.now();
    const ruleSet = await this.store.getRuleSet();

    const fresh = await this.store.claimBatch(
      batch.nodeId,
      batch.epoch,
      batch.seq,
      now + BATCH_RETENTION_MS
    );
    if (!fresh) this.log.debug('replayed batch ignored', { nodeId: batch.nodeId, seq: batch.seq });

    const leaseTtlMs = 2 * batch.intervalMs;
    const holdMs = leaseTtlMs + batch.intervalMs;

    const settled = await Promise.all(
      batch.reports.map((report) =>
        this.mutex.run(report.key, () =>
          this.#settle({ ruleSet, report, batch, fresh, now, holdMs })
        )
      )
    );

    const grants = settled.filter(Boolean);
    const rulesPushed = batch.rulesVersion !== ruleSet.version;

    if (batch.reports.length > 0 || rulesPushed) {
      this.log.info('SYNC BATCH', {
        nodeId: batch.nodeId,
        seq: batch.seq,
        reports: batch.reports.map((r) => `${r.key}(+${r.admitted}/-${r.denied})`),
        grants: grants.map((g) => `${g.key}=${g.size}`),
        ...(rulesPushed ? { rulesPushed: ruleSet.version } : {}),
      });
    } else {
      this.log.debug('sync heartbeat', { nodeId: batch.nodeId, seq: batch.seq });
    }

    return {
      grants,
      leaseTtlMs,
      serverTime: now,
      rulesVersion: ruleSet.version,
      rules: rulesPushed ? ruleSet : undefined,
    };
  }

  async #settle({ ruleSet, report, batch, fresh, now, holdMs }) {
    const { nodeId, peers } = batch;
    const tier = tierFor(ruleSet, report.ruleId, report.tier);
    if (!tier) return null;

    const { id: bucketId, elapsedMs } = windowPosition(now, tier.windowMs);
    if (fresh && report.admitted > 0) {
      await this.store.addUsage(report.key, bucketId, report.admitted, now + tier.windowMs * 3);
    }

    const counts = await this.store.getWindowCounts(report.key, bucketId);
    const used = slidingEstimate({ ...counts, elapsedMs, windowMs: tier.windowMs });

    const leases = await this.store.listLeases(report.key, now);
    const previous = leases.find((lease) => lease.nodeId === nodeId);
    const others = leases.filter((lease) => lease.nodeId !== nodeId);
    const outstanding = others.reduce((sum, lease) => sum + lease.size, 0);
    const available = Math.max(0, Math.floor(tier.limit - used - outstanding));

    const observed = report.admitted + report.denied;
    const demand = fresh
      ? DEMAND_SMOOTHING * observed + (1 - DEMAND_SMOOTHING) * (previous?.demand ?? 0)
      : (previous?.demand ?? 0);

    const demandByNode = new Map(others.map((lease) => [lease.nodeId, lease.demand]));
    demandByNode.set(nodeId, demand);
    const size = allocateLease({ available, demandByNode, nodeId, peers });

    await this.store.upsertLease({
      key: report.key,
      nodeId,
      ruleId: report.ruleId,
      tier: report.tier,
      size,
      demand,
      grantedAt: now,
      expiresAt: now + holdMs,
    });

    return { key: report.key, size };
  }

  async getRuleSet() {
    return this.store.getRuleSet();
  }

  async replaceRuleSet(candidate) {
    const validated = validateRuleSet({ ...candidate, version: candidate?.version ?? 1 });
    const current = await this.store.getRuleSet();
    const next = { ...validated, version: (current?.version ?? 0) + 1 };
    await this.store.saveRuleSet(next);
    this.log.info('rule set replaced', { version: next.version });
    return next;
  }

  async resetState() {
    if (typeof this.store.resetAll === 'function') {
      await this.store.resetAll();
    }
    this.log.info('coordinator state reset');
    return { ok: true };
  }

  /** Global view of one key for the dashboard; returns window usage and current active leases. */
  async describeKey(key) {
    const now = this.clock.now();
    const leases = await this.store.listLeases(key, now);

    const ruleSet = await this.store.getRuleSet();
    const [ruleId, tenantOrTier] = key.split('|');
    const tierName = tenantOrTier?.includes(':') ? (tenantOrTier.startsWith('tenant:globex') ? 'pro' : 'free') : 'default';
    const tier = (leases.length > 0 ? tierFor(ruleSet, leases[0].ruleId, leases[0].tier) : null) || tierFor(ruleSet, ruleId || 'public-api', tierName) || tierFor(ruleSet, 'public-api', 'free');
    if (!tier) return null;

    const { id: bucketId, elapsedMs } = windowPosition(now, tier.windowMs);
    const counts = await this.store.getWindowCounts(key, bucketId);
    const used = slidingEstimate({ ...counts, elapsedMs, windowMs: tier.windowMs });

    return {
      key,
      ruleId: leases[0]?.ruleId || ruleId || 'public-api',
      limit: tier.limit,
      windowSec: tier.windowSec,
      used: Math.round(used * 100) / 100,
      leases: leases.map(({ nodeId, size, expiresAt }) => ({ nodeId, size, expiresAt })),
      serverTime: now,
    };
  }
}

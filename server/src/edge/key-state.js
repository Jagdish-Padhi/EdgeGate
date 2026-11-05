import { SlidingWindowCounter, TokenBucket } from '../engine/index.js';

/** Everything an edge node tracks for one rate-limited key. */
export class KeyState {
  constructor({ key, ruleId, tierName, tier, now }) {
    this.key = key;
    this.ruleId = ruleId;
    this.tierName = tierName;
    this.tier = tier;
    this.bucket = new TokenBucket({ capacity: tier.burst, refillPerSec: tier.refillPerSec }, now);
    this.window = new SlidingWindowCounter(tier.windowMs, now);
    this.lease = null;
    this.awaitingLease = false;
    this.pending = { admitted: 0, denied: 0 };
    this.counters = { allowed: 0, denied: 0 };
  }

  /** Applies a changed tier after a rule update without discarding pending usage. */
  retune({ ruleId, tierName, tier }, now) {
    const changed =
      tier.limit !== this.tier.limit ||
      tier.windowMs !== this.tier.windowMs ||
      tier.burst !== this.tier.burst;

    this.ruleId = ruleId;
    this.tierName = tierName;
    if (!changed) return;

    if (tier.windowMs !== this.tier.windowMs) {
      this.window = new SlidingWindowCounter(tier.windowMs, now);
    }
    this.bucket.reconfigure({ capacity: tier.burst, refillPerSec: tier.refillPerSec }, now);
    this.tier = tier;
  }

  hasLiveLease(now) {
    return this.lease !== null && this.lease.expiresAt > now;
  }

  /** True while the key holds usage the coordinator has not seen yet. */
  get hasUnreportedUsage() {
    return this.pending.admitted > 0 || this.pending.denied > 0;
  }
}

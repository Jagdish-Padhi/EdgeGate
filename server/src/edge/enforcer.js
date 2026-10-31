import { BoundedKV } from '../kv/index.js';
import { resolveRequest } from '../rules/index.js';
import { KeyState } from './key-state.js';

const KEY_IDLE_TTL_MS = 10 * 60 * 1000;

/**
 * Local admission control for one edge node.
 *
 * Modes, per key:
 *   leased  a live lease from the coordinator bounds admissions
 *   local   no live lease: admissions are bounded by a static share of the limit
 *   open    no live lease and fail mode "open": admit everything
 *   closed  no live lease and fail mode "closed": reject everything
 *
 * Every admission and rejection is counted in `pending` and reported to the
 * coordinator on the next sync, whatever the mode.
 */
export class Enforcer {
  constructor({ nodeId, clock, ruleSet, failMode, peers, syncIntervalMs, maxEntries }) {
    this.nodeId = nodeId;
    this.clock = clock;
    this.ruleSet = ruleSet;
    this.failMode = failMode;
    this.peers = peers;
    this.syncIntervalMs = syncIntervalMs;
    this.totals = { allowed: 0, denied: 0 };
    this.kv = new BoundedKV({
      maxEntries,
      idleTtlMs: KEY_IDLE_TTL_MS,
      clock,
      canEvict: (state) => !state.hasUnreportedUsage,
    });
  }

  setSyncIntervalMs(intervalMs) {
    this.syncIntervalMs = intervalMs;
  }

  get rulesVersion() {
    return this.ruleSet.version;
  }

  setRuleSet(ruleSet) {
    this.ruleSet = ruleSet;
  }

  /**
   * Registers the key a request maps to and reports whether it still needs a
   * lease. Keys awaiting a lease are included in the next sync batch.
   */
  prepare(request) {
    const resolved = resolveRequest(this.ruleSet, request);
    if (!resolved) return false;

    const now = this.clock.now();
    const state = this.#stateFor(resolved, now);
    if (state.hasLiveLease(now)) return false;
    state.awaitingLease = true;
    return true;
  }

  decide(request) {
    const resolved = resolveRequest(this.ruleSet, request);
    if (!resolved) return { matched: false, allowed: true };

    const now = this.clock.now();
    const state = this.#stateFor(resolved, now);
    const mode = this.#modeOf(state, now);
    const fallbackLimit = Math.max(1, Math.floor(state.tier.limit / this.peers));

    let reason = 'ok';
    if (mode === 'closed') reason = 'fail-closed';
    else if (mode === 'leased' && state.lease.remaining <= 0) reason = 'quota';
    else if (mode === 'local' && !state.window.has(now, fallbackLimit)) reason = 'quota';

    // The token bucket is only charged for requests the quota would admit.
    if (reason === 'ok' && !state.bucket.tryTake(now)) reason = 'burst';

    const allowed = reason === 'ok';
    if (allowed) {
      if (mode === 'leased') state.lease.remaining -= 1;
      if (mode === 'local') state.window.add(now);
      state.pending.admitted += 1;
      state.counters.allowed += 1;
      this.totals.allowed += 1;
    } else {
      state.pending.denied += 1;
      state.counters.denied += 1;
      this.totals.denied += 1;
    }

    return {
      matched: true,
      allowed,
      reason,
      mode,
      ruleId: state.ruleId,
      key: state.key,
      limit: state.tier.limit,
      remaining: this.#remaining(state, mode, fallbackLimit, now),
      resetSec: this.#resetSec(state, now),
      retryAfterSec: allowed ? 0 : this.#retryAfterSec(state, reason, now),
    };
  }

  /** Collects usage since the previous drain into sync reports. */
  drainReports() {
    const reports = [];
    for (const state of this.kv.values()) {
      if (!state.hasUnreportedUsage && !state.awaitingLease) continue;
      reports.push({
        key: state.key,
        ruleId: state.ruleId,
        tier: state.tierName,
        admitted: state.pending.admitted,
        denied: state.pending.denied,
      });
      state.pending = { admitted: 0, denied: 0 };
    }
    return reports;
  }

  /**
   * Installs leases from a sync response. Admissions made since the batch was
   * drained are not yet known to the coordinator, so they are deducted here.
   */
  applyGrants({ grants, leaseTtlMs }) {
    const now = this.clock.now();
    for (const { key, size } of grants) {
      const state = this.kv.get(key);
      if (!state) continue;
      state.lease = {
        remaining: Math.max(0, size - state.pending.admitted),
        expiresAt: now + leaseTtlMs,
      };
      state.awaitingLease = false;
    }
  }

  sweep() {
    return this.kv.sweep();
  }

  snapshot() {
    const now = this.clock.now();
    const keys = this.kv.values().map((state) => {
      const mode = this.#modeOf(state, now);
      const live = state.hasLiveLease(now);
      return {
        key: state.key,
        ruleId: state.ruleId,
        tier: state.tierName,
        mode,
        limit: state.tier.limit,
        burst: state.tier.burst,
        leaseRemaining: live ? state.lease.remaining : null,
        leaseExpiresInMs: live ? state.lease.expiresAt - now : null,
        tokens: state.bucket.available(now),
        pending: { ...state.pending },
        allowed: state.counters.allowed,
        denied: state.counters.denied,
      };
    });

    return {
      nodeId: this.nodeId,
      failMode: this.failMode,
      peers: this.peers,
      rulesVersion: this.rulesVersion,
      totals: { ...this.totals },
      keyCount: this.kv.size,
      keys,
    };
  }

  #stateFor(resolved, now) {
    let state = this.kv.get(resolved.key);
    if (!state) {
      state = new KeyState({ ...resolved, now });
      this.kv.set(resolved.key, state);
    } else {
      state.retune(resolved, now);
    }
    return state;
  }

  #modeOf(state, now) {
    if (state.hasLiveLease(now)) return 'leased';
    if (this.failMode === 'open') return 'open';
    if (this.failMode === 'closed') return 'closed';
    return 'local';
  }

  #remaining(state, mode, fallbackLimit, now) {
    const tokens = state.bucket.available(now);
    if (mode === 'closed') return 0;
    if (mode === 'open') return tokens;
    if (mode === 'leased') return Math.min(state.lease.remaining, tokens);
    return Math.min(Math.max(0, Math.floor(fallbackLimit - state.window.estimate(now))), tokens);
  }

  #resetSec(state, now) {
    const { windowMs } = state.tier;
    return Math.ceil((windowMs - (now % windowMs)) / 1000);
  }

  #retryAfterSec(state, reason, now) {
    if (reason === 'burst') return Math.max(1, Math.ceil(state.bucket.waitMs(now) / 1000));
    if (reason === 'fail-closed') return Math.max(1, Math.ceil(this.syncIntervalMs / 1000));
    return Math.max(1, Math.ceil(state.tier.windowSec / state.tier.limit));
  }
}

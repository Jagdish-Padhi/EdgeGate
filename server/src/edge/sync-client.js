import { silentLogger } from '../shared/index.js';

/**
 * Periodically ships usage to the coordinator and installs the leases it returns.
 *
 * A drained batch is held as `inflight` and re-sent with the same sequence number
 * until the coordinator answers, so a lost reply never loses or double-counts usage.
 */
export class SyncClient {
  constructor({ nodeId, epoch, enforcer, transport, faults, clock, intervalMs, log = silentLogger }) {
    this.nodeId = nodeId;
    this.epoch = epoch;
    this.enforcer = enforcer;
    this.transport = transport;
    this.faults = faults;
    this.clock = clock;
    this.intervalMs = intervalMs;
    this.log = log;

    this.seq = 0;
    this.inflight = null;
    this.running = null;
    this.timer = null;
    this.health = { lastSuccessAt: null, lastError: null, consecutiveFailures: 0, lastLatencyMs: null };
  }

  start() {
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  setIntervalMs(intervalMs) {
    const next = Math.max(100, Math.min(10_000, Number(intervalMs)));
    if (!Number.isFinite(next)) return this.intervalMs;
    this.intervalMs = next;
    if (this.timer) {
      this.stop();
      this.start();
    }
    return this.intervalMs;
  }

  status() {
    return {
      ...this.health,
      epoch: this.epoch,
      seq: this.seq,
      intervalMs: this.intervalMs,
      hasInflightBatch: this.inflight !== null,
    };
  }

  /** True while the last sync succeeded; false once the coordinator looks unreachable. */
  get reachable() {
    return this.health.consecutiveFailures === 0;
  }

  /** Runs a sync round, or joins the one already in progress. */
  tick() {
    this.running ??= this.#run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Syncs now, after any round in progress, so newly seen keys get a lease. */
  async leaseNow() {
    if (this.running) await this.running;
    return this.tick();
  }

  async #run() {
    const startedAt = performance.now();
    try {
      this.inflight ??= this.#nextBatch();
      const response = await this.faults.call(() => this.transport.send(this.inflight));
      this.inflight = null;

      if (response.rules) this.enforcer.setRuleSet(response.rules);
      this.enforcer.applyGrants(response);
      this.enforcer.sweep();

      if (this.health.consecutiveFailures > 0) this.log.info('coordinator reachable again');
      this.health = {
        lastSuccessAt: this.clock.now(),
        lastError: null,
        consecutiveFailures: 0,
        lastLatencyMs: Math.round(performance.now() - startedAt),
      };
    } catch (err) {
      if (err.permanent) this.inflight = null;
      const failures = this.health.consecutiveFailures + 1;
      this.health = { ...this.health, lastError: err.message, consecutiveFailures: failures };
      if (failures === 1) this.log.warn('sync failed', { error: err.message });
    } finally {
      this.running = null;
    }
  }

  #nextBatch() {
    return {
      nodeId: this.nodeId,
      epoch: this.epoch,
      seq: this.seq++,
      intervalMs: this.intervalMs,
      peers: this.enforcer.peers,
      rulesVersion: this.enforcer.rulesVersion,
      reports: this.enforcer.drainReports(),
    };
  }
}

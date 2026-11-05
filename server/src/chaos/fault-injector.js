export class NetworkFault extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkFault';
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps calls on the edge-to-coordinator link with injectable faults.
 *
 * partitioned        the request never reaches the coordinator
 * lostResponseRate   the coordinator processes the request but the reply is lost
 * latencyMs          added delay before the request is sent
 */
export class FaultInjector {
  constructor({ rng = Math.random, sleep = defaultSleep, latencyMs = 0, jitterMs = 0, lostResponseRate = 0 } = {}) {
    this.rng = rng;
    this.sleep = sleep;
    this.state = {
      partitioned: false,
      latencyMs: clamp(latencyMs, 0, 10_000),
      jitterMs: clamp(jitterMs, 0, 10_000),
      lostResponseRate: clamp(lostResponseRate, 0, 1),
    };
  }

  configure(patch) {
    const next = { ...this.state };
    if ('partitioned' in patch) next.partitioned = Boolean(patch.partitioned);
    if ('latencyMs' in patch) next.latencyMs = clamp(patch.latencyMs, 0, 10_000);
    if ('jitterMs' in patch) next.jitterMs = clamp(patch.jitterMs, 0, 10_000);
    if ('lostResponseRate' in patch) next.lostResponseRate = clamp(patch.lostResponseRate, 0, 1);
    this.state = next;
    return this.snapshot();
  }

  snapshot() {
    return { ...this.state };
  }

  async call(fn) {
    if (this.state.partitioned) throw new NetworkFault('network partition');
    const jitter = this.state.jitterMs > 0
      ? (this.rng() * 2 - 1) * this.state.jitterMs
      : 0;
    const delay = Math.max(0, this.state.latencyMs + jitter);
    if (delay > 0) await this.sleep(delay);
    const result = await fn();
    if (this.state.lostResponseRate > 0 && this.rng() < this.state.lostResponseRate) {
      throw new NetworkFault('response lost');
    }
    return result;
  }
}

function clamp(value, min, max) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

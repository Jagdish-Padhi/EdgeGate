export const systemClock = { now: () => Date.now() };

/** Deterministic clock for tests and simulations. */
export class ManualClock {
  constructor(start = 0) {
    this.time = start;
  }

  now() {
    return this.time;
  }

  advance(ms) {
    this.time += ms;
  }
}

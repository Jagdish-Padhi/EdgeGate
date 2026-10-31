export function windowPosition(now, windowMs) {
  const id = Math.floor(now / windowMs);
  return { id, elapsedMs: now - id * windowMs };
}

/**
 * Sliding-window-counter approximation: the previous fixed window is weighted by
 * the share of it that still overlaps the sliding window ending now.
 */
export function slidingEstimate({ current, previous, elapsedMs, windowMs }) {
  return current + previous * (1 - elapsedMs / windowMs);
}

/** Local sliding-window counter over two fixed buckets. */
export class SlidingWindowCounter {
  constructor(windowMs, now) {
    this.windowMs = windowMs;
    this.id = windowPosition(now, windowMs).id;
    this.current = 0;
    this.previous = 0;
  }

  roll(now) {
    const { id } = windowPosition(now, this.windowMs);
    if (id === this.id) return;
    this.previous = id === this.id + 1 ? this.current : 0;
    this.current = 0;
    this.id = id;
  }

  estimate(now) {
    this.roll(now);
    const { elapsedMs } = windowPosition(now, this.windowMs);
    return slidingEstimate({
      current: this.current,
      previous: this.previous,
      elapsedMs,
      windowMs: this.windowMs,
    });
  }

  has(now, limit, cost = 1) {
    return this.estimate(now) + cost <= limit;
  }

  add(now, cost = 1) {
    this.roll(now);
    this.current += cost;
  }
}

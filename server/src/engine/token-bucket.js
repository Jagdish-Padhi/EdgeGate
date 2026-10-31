/**
 * Token bucket. Tokens refill continuously; capacity bounds the burst.
 */
export class TokenBucket {
  constructor({ capacity, refillPerSec }, now) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = capacity;
    this.updatedAt = now;
  }

  reconfigure({ capacity, refillPerSec }, now) {
    this.refill(now);
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = Math.min(this.tokens, capacity);
  }

  refill(now) {
    const elapsedSec = Math.max(0, now - this.updatedAt) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.updatedAt = now;
  }

  tryTake(now, cost = 1) {
    this.refill(now);
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  available(now) {
    this.refill(now);
    return Math.floor(this.tokens);
  }

  /** Milliseconds until `cost` tokens are available; 0 if already available. */
  waitMs(now, cost = 1) {
    this.refill(now);
    if (this.tokens >= cost) return 0;
    return Math.ceil(((cost - this.tokens) / this.refillPerSec) * 1000);
  }
}

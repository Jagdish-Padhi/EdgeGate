/**
 * In-memory key-value store with LRU eviction and idle expiry.
 *
 * Entries for which `canEvict` returns false (for example keys holding usage that
 * has not been reported yet) are never dropped. If every entry is pinned the store
 * temporarily exceeds `maxEntries` rather than lose data.
 */
export class BoundedKV {
  constructor({ maxEntries, idleTtlMs, clock, canEvict = () => true }) {
    this.maxEntries = maxEntries;
    this.idleTtlMs = idleTtlMs;
    this.clock = clock;
    this.canEvict = canEvict;
    this.entries = new Map();
  }

  get size() {
    return this.entries.size;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    const now = this.clock.now();
    if (this.#isIdle(entry, now) && this.canEvict(entry.value)) {
      this.entries.delete(key);
      return undefined;
    }

    // Re-insert to mark as most recently used.
    this.entries.delete(key);
    entry.lastAccess = now;
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    this.entries.delete(key);
    this.entries.set(key, { value, lastAccess: this.clock.now() });
    this.#evictOverflow();
  }

  delete(key) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  values() {
    return Array.from(this.entries.values(), (entry) => entry.value);
  }

  /** Drops idle, evictable entries. Returns how many were removed. */
  sweep() {
    const now = this.clock.now();
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (this.#isIdle(entry, now) && this.canEvict(entry.value)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  #isIdle(entry, now) {
    return now - entry.lastAccess > this.idleTtlMs;
  }

  #evictOverflow() {
    if (this.entries.size <= this.maxEntries) return;
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.maxEntries) return;
      if (this.canEvict(entry.value)) this.entries.delete(key);
    }
  }
}

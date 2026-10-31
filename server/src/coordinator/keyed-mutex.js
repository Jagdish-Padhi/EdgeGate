/** Serializes async work per key so concurrent syncs cannot over-allocate one budget. */
export class KeyedMutex {
  #tails = new Map();

  async run(key, fn) {
    const previous = this.#tails.get(key) ?? Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.#tails.set(key, tail);

    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.#tails.get(key) === tail) this.#tails.delete(key);
    }
  }
}

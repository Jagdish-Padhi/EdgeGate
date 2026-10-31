export class BadBatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadBatchError';
  }
}

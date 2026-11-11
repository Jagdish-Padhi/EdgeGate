export class RejectedBatchError extends Error {
  constructor(status) {
    super(`coordinator rejected batch with ${status}`);
    this.name = 'RejectedBatchError';
    this.permanent = true;
  }
}

export class HttpTransport {
  constructor({ baseUrl, timeoutMs = 5000 }) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async send(batch) {
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 400) throw new RejectedBatchError(400);
    if (!response.ok) throw new Error(`coordinator responded ${response.status}`);
    return response.json();
  }
}

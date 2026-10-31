const FORWARDED_HEADERS = ['accept', 'authorization', 'content-type', 'x-api-key'];
const UPSTREAM_TIMEOUT_MS = 5000;

/** Forwards an admitted request to the origin and relays its response. */
export async function forward(req, res, upstreamUrl) {
  const headers = {};
  for (const name of FORWARDED_HEADERS) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }
  const hasBody = Buffer.isBuffer(req.body) && req.body.length > 0;

  try {
    const upstream = await fetch(`${upstreamUrl}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.set('content-type', contentType);
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.status(502).json({ error: 'origin_unavailable' });
  }
}

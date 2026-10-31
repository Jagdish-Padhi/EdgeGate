import cors from 'cors';
import express from 'express';
import { crashHandler } from '../shared/index.js';
import { RATE_LIMIT_HEADERS, rateLimit } from './middleware.js';
import { forward } from './proxy.js';

export function createEdgeApp({ nodeId, enforcer, syncClient, faults, upstreamUrl, log }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ exposedHeaders: RATE_LIMIT_HEADERS }));

  // Control plane, used by the dashboard and tests.
  app.get('/_edge/state', (_req, res) => {
    res.json({ ...enforcer.snapshot(), sync: syncClient.status(), faults: faults.snapshot() });
  });
  app.put('/_edge/faults', express.json(), (req, res) => {
    const patch = req.body ?? {};
    if ('syncIntervalMs' in patch) {
      const intervalMs = syncClient.setIntervalMs(patch.syncIntervalMs);
      enforcer.setSyncIntervalMs(intervalMs);
    }
    res.json({
      ...faults.configure(patch),
      syncIntervalMs: syncClient.intervalMs,
    });
  });
  app.post('/_edge/crash', crashHandler(log, nodeId));

  // Data plane: admission control, then reverse proxy to the origin.
  app.use(rateLimit(enforcer, syncClient));
  app.use(express.raw({ type: () => true, limit: '1mb' }));
  app.use((req, res) => forward(req, res, upstreamUrl));

  return app;
}

import cors from 'cors';
import express from 'express';
import { RuleSetError } from '../rules/index.js';
import { asyncHandler, crashHandler, errorFields } from '../shared/index.js';
import { BadBatchError } from './errors.js';

export function createCoordinatorApp({ service, log }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '512kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.post(
    '/sync',
    asyncHandler(async (req, res) => {
      res.json(await service.handleSync(req.body));
    })
  );

  app.get(
    '/rules',
    asyncHandler(async (_req, res) => {
      res.json(await service.getRuleSet());
    })
  );

  app.put(
    '/admin/rules',
    asyncHandler(async (req, res) => {
      res.json(await service.replaceRuleSet(req.body));
    })
  );

  app.get(
    '/admin/usage',
    asyncHandler(async (req, res) => {
      const usage = await service.describeKey(String(req.query.key ?? ''));
      if (!usage) return res.status(404).json({ error: 'no active leases for key' });
      return res.json(usage);
    })
  );

  app.post(
    '/admin/reset',
    asyncHandler(async (_req, res) => {
      res.json(await service.resetState());
    })
  );

  app.post('/admin/crash', crashHandler(log, 'coordinator'));

  app.use((err, _req, res, _next) => {
    if (err instanceof BadBatchError || err instanceof RuleSetError) {
      return res.status(400).json({ error: err.message });
    }
    log.error('request failed', errorFields(err));
    return res.status(500).json({ error: 'internal error' });
  });

  return app;
}

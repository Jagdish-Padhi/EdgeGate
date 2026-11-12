import cors from 'cors';
import express from 'express';

const ORDERS = [
  { id: 'ord_1001', status: 'shipped', total: 42.5 },
  { id: 'ord_1002', status: 'processing', total: 18.0 },
  { id: 'ord_1003', status: 'delivered', total: 109.9 },
];

const noopLog = { debug() {}, info() {}, warn() {}, error() {} };

/** Stand-in for the protected API that sits behind the edge nodes. */
export function createOriginApp({
  loginEmail = process.env.DEMO_LOGIN_EMAIL,
  loginPassword = process.env.DEMO_LOGIN_PASSWORD,
  log = noopLog,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());

  // Log all upstream API requests forwarded by edge gateways (skip health pings to keep Render logs clean)
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const start = performance.now();
    res.on('finish', () => {
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      log[level](`ORIGIN SERVED ${req.method} ${req.path}`, {
        status: res.statusCode,
        viaEdge: req.get('x-edge-node') || 'direct',
        ms: Math.round(performance.now() - start),
      });
    });
    next();
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (email === loginEmail && password === loginPassword) {
      return res.json({ token: 'demo-session-token' });
    }
    return res.status(401).json({ error: 'invalid_credentials' });
  });

  app.get('/api/weather', (_req, res) => {
    res.json({ city: 'Mumbai', temperatureC: 31, condition: 'humid' });
  });

  app.get('/api/orders', (_req, res) => res.json({ orders: ORDERS }));

  return app;
}

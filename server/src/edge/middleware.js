import { admit } from './admission.js';

export const RATE_LIMIT_HEADERS = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-RateLimit-Mode',
  'X-Edge-Node',
  'Retry-After',
];

function clientIp(req) {
  return (req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
}

export function rateLimit(enforcer, syncClient) {
  return async (req, res, next) => {
    let decision;
    try {
      decision = await admit(enforcer, syncClient, {
        method: req.method,
        path: req.path,
        ip: clientIp(req),
        apiKey: req.get('x-api-key'),
      });
    } catch (err) {
      return next(err);
    }

    res.set('X-Edge-Node', enforcer.nodeId);
    if (!decision.matched) return next();

    res.set({
      'X-RateLimit-Limit': String(decision.limit),
      'X-RateLimit-Remaining': String(decision.remaining),
      'X-RateLimit-Reset': String(decision.resetSec),
      'X-RateLimit-Mode': decision.mode,
    });
    if (decision.allowed) return next();

    res.set('Retry-After', String(decision.retryAfterSec));
    return res.status(429).json({
      error: 'rate_limited',
      reason: decision.reason,
      retryAfterSec: decision.retryAfterSec,
    });
  };
}

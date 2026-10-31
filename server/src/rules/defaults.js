export const DEFAULT_RULE_SET = Object.freeze({
  version: 1,
  clients: {
    'key-free-acme': { tenant: 'acme', plan: 'free' },
    'key-pro-globex': { tenant: 'globex', plan: 'pro' },
  },
  rules: [
    {
      id: 'auth-login',
      method: 'POST',
      pathPrefix: '/auth/login',
      scope: 'ip',
      tiers: { default: { limit: 5, windowSec: 60, burst: 5 } },
    },
    {
      id: 'public-api',
      pathPrefix: '/api/',
      scope: 'client',
      tiers: {
        default: { limit: 10, windowSec: 60, burst: 5 },
        free: { limit: 20, windowSec: 60, burst: 10 },
        pro: { limit: 200, windowSec: 60, burst: 50 },
      },
    },
  ],
});

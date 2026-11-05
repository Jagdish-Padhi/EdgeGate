import { RuleSetError } from './errors.js';

const SCOPES = ['ip', 'client'];

function isPositiveInt(value) {
  return Number.isInteger(value) && value >= 1;
}

export function validateRuleSet(doc) {
  const problems = [];

  if (!doc || typeof doc !== 'object') throw new RuleSetError(['rule set must be an object']);
  if (!isPositiveInt(doc.version)) problems.push('version must be a positive integer');

  const clients = doc.clients ?? {};
  for (const [apiKey, client] of Object.entries(clients)) {
    if (typeof client?.tenant !== 'string' || typeof client?.plan !== 'string') {
      problems.push(`client "${apiKey}" needs string tenant and plan`);
    }
  }

  if (!Array.isArray(doc.rules) || doc.rules.length === 0) {
    problems.push('rules must be a non-empty array');
  } else {
    const seen = new Set();
    for (const rule of doc.rules) {
      const label = `rule "${rule?.id}"`;
      if (typeof rule?.id !== 'string' || rule.id === '') problems.push('every rule needs an id');
      if (seen.has(rule?.id)) problems.push(`${label} is duplicated`);
      seen.add(rule?.id);
      if (typeof rule?.pathPrefix !== 'string' || !rule.pathPrefix.startsWith('/')) {
        problems.push(`${label} needs a pathPrefix starting with "/"`);
      }
      if (!SCOPES.includes(rule?.scope)) problems.push(`${label} scope must be ip or client`);
      if (!rule?.tiers?.default) problems.push(`${label} needs a default tier`);
      for (const [name, tier] of Object.entries(rule?.tiers ?? {})) {
        for (const field of ['limit', 'windowSec', 'burst']) {
          if (!isPositiveInt(tier?.[field])) {
            problems.push(`${label} tier "${name}" needs a positive integer ${field}`);
          }
        }
      }
    }
  }

  if (problems.length > 0) throw new RuleSetError(problems);
  return { ...doc, clients };
}

function deriveTier({ limit, windowSec, burst }) {
  return { limit, windowSec, windowMs: windowSec * 1000, burst, refillPerSec: limit / windowSec };
}

export function findRule(ruleSet, { method, path }) {
  return ruleSet.rules.find(
    (rule) => path.startsWith(rule.pathPrefix) && (!rule.method || rule.method === method)
  );
}

/** Looks up a tier by name, falling back to the rule's default tier. */
export function tierFor(ruleSet, ruleId, tierName) {
  const rule = ruleSet.rules.find((candidate) => candidate.id === ruleId);
  if (!rule) return null;
  const tier = rule.tiers[tierName] ?? rule.tiers.default;
  return deriveTier(tier);
}

/**
 * Maps a request onto the rule that governs it, the caller identity and the tier.
 * Returns null when no rule applies (the request is not rate limited).
 */
export function resolveRequest(ruleSet, { method, path, ip, apiKey }) {
  const rule = findRule(ruleSet, { method, path });
  if (!rule) return null;

  let identity = `ip:${ip}`;
  let tierName = 'default';

  if (rule.scope === 'client') {
    const client = apiKey ? ruleSet.clients[apiKey] : undefined;
    if (client) {
      identity = `tenant:${client.tenant}`;
      tierName = rule.tiers[client.plan] ? client.plan : 'default';
    }
  }

  return {
    ruleId: rule.id,
    tierName,
    tier: deriveTier(rule.tiers[tierName]),
    key: `${rule.id}|${identity}`,
  };
}

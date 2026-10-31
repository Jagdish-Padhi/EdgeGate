const RULE_NAMES = { 'public-api': 'Public API', 'auth-login': 'Login' };
const MODE_LABELS = { leased: 'Coordinated', idle: 'Idle', local: 'On its own', open: 'Allowing all', closed: 'Blocking all' };

export const modeLabel = (mode) => MODE_LABELS[mode] ?? mode;
export const ruleName = (ruleId) => RULE_NAMES[ruleId] ?? ruleId;

/** Splits a limiter key such as "public-api|tenant:acme" into readable parts. */
export function describeKey(key) {
  const [ruleId, identity = ''] = key.split('|');
  const [kind, ...rest] = identity.split(':');
  const value = rest.join(':');
  const caller = kind === 'tenant' ? value : kind === 'ip' ? `IP ${value}` : identity;
  return { caller, rule: ruleName(ruleId) };
}

export function formatWindow(seconds) {
  if (seconds === 60) return 'minute';
  if (seconds === 3600) return 'hour';
  if (seconds % 60 === 0) return `${seconds / 60} minutes`;
  return `${seconds} seconds`;
}

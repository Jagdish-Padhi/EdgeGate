import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_RULE_SET,
  RuleSetError,
  resolveRequest,
  tierFor,
  validateRuleSet,
} from '../../src/rules/index.js';

const base = { method: 'GET', path: '/api/orders', ip: '1.2.3.4' };

test('client scoped rules use the plan of a known api key', () => {
  const resolved = resolveRequest(DEFAULT_RULE_SET, { ...base, apiKey: 'key-pro-globex' });
  assert.equal(resolved.ruleId, 'public-api');
  assert.equal(resolved.tierName, 'pro');
  assert.equal(resolved.tier.limit, 200);
  assert.equal(resolved.key, 'public-api|tenant:globex');
});

test('unknown or missing keys fall back to the default tier per ip', () => {
  const resolved = resolveRequest(DEFAULT_RULE_SET, { ...base, apiKey: 'nope' });
  assert.equal(resolved.tierName, 'default');
  assert.equal(resolved.key, 'public-api|ip:1.2.3.4');
});

test('method restricted rules ignore other methods', () => {
  const login = { path: '/auth/login', ip: '1.2.3.4' };
  assert.equal(resolveRequest(DEFAULT_RULE_SET, { ...login, method: 'POST' }).ruleId, 'auth-login');
  assert.equal(resolveRequest(DEFAULT_RULE_SET, { ...login, method: 'GET' }), null);
});

test('unmatched paths are not limited', () => {
  assert.equal(resolveRequest(DEFAULT_RULE_SET, { ...base, path: '/health' }), null);
});

test('tierFor derives the refill rate and falls back to default', () => {
  const tier = tierFor(DEFAULT_RULE_SET, 'public-api', 'missing');
  assert.equal(tier.limit, 10);
  assert.equal(tier.refillPerSec, 10 / 60);
});

test('validation reports every problem found', () => {
  const bad = { version: 0, rules: [{ id: 'x', pathPrefix: 'no-slash', scope: 'galaxy', tiers: {} }] };
  assert.throws(
    () => validateRuleSet(bad),
    (err) => err instanceof RuleSetError && err.problems.length >= 4
  );
});

test('the bundled defaults are valid', () => {
  assert.doesNotThrow(() => validateRuleSet(DEFAULT_RULE_SET));
});

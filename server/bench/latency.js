import { createCluster } from '../harness/cluster.js';
import { DEFAULT_RULE_SET } from '../src/rules/index.js';

const KEYS = 1000;
const CALLS = 1_000_000;
const SAMPLE_BATCH = 100;

const ruleSet = structuredClone(DEFAULT_RULE_SET);
ruleSet.rules.find((rule) => rule.id === 'public-api').tiers.default = {
  limit: 1_000_000_000,
  windowSec: 60,
  burst: 1_000_000_000,
};

const cluster = await createCluster({ ruleSet });
const { enforcer } = cluster.edges[0];

const request = (index) => ({
  method: 'GET',
  path: '/api/orders',
  ip: `10.0.${index >> 8}.${index & 255}`,
});

for (let i = 0; i < KEYS; i += 1) await cluster.request(0, request(i));
await cluster.syncAll();

for (let i = 0; i < 50_000; i += 1) enforcer.decide(request(i % KEYS));

const perCallNs = [];
const started = process.hrtime.bigint();
for (let done = 0; done < CALLS; done += SAMPLE_BATCH) {
  const batchStart = process.hrtime.bigint();
  for (let i = 0; i < SAMPLE_BATCH; i += 1) enforcer.decide(request((done + i) % KEYS));
  perCallNs.push(Number(process.hrtime.bigint() - batchStart) / SAMPLE_BATCH);
}
const totalSec = Number(process.hrtime.bigint() - started) / 1e9;

perCallNs.sort((a, b) => a - b);
const percentile = (p) => perCallNs[Math.floor((p / 100) * (perCallNs.length - 1))];
const micros = (ns) => `${(ns / 1000).toFixed(2)} us`;

console.log(`edge decision path, ${CALLS.toLocaleString()} calls over ${KEYS} keys, all admitted from a live lease`);
console.log(`throughput  ${Math.round(CALLS / totalSec).toLocaleString()} decisions/s (single thread)`);
console.log(`per call    p50 ${micros(percentile(50))}   p99 ${micros(percentile(99))}   (means of ${SAMPLE_BATCH}-call batches)`);
console.log('network     0 round trips on this path; a central check adds one coordinator round trip per request');

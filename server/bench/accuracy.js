import { createCluster } from '../harness/cluster.js';
import { DEFAULT_RULE_SET } from '../src/rules/index.js';
import { ManualClock } from '../src/shared/index.js';
import { SlidingWindowCounter } from '../src/engine/index.js';

const LIMIT = 100;
const WINDOW_MS = 60_000;
const DURATION_MS = 50_000;
const TICK_MS = 10;
const START = 17 * WINDOW_MS;
const SYNC_INTERVALS_MS = [100, 250, 500, 1000, 2000, 5000];

const NODES = 3;

const SCENARIOS = [
  { name: 'skewed load: edge rates 60 / 1 / 1 req/s', rates: () => [60, 1, 1] },
  { name: 'uniform load: edge rates 20 / 20 / 20 req/s', rates: () => [20, 20, 20] },
  {
    name: 'late hotspot: edge 2 turns hot at 25 s while edges 0 and 1 hold leases',
    rates: (elapsed) => (elapsed < 25_000 ? [0.8, 0.8, 0] : [0.2, 0.2, 40]),
  },
];

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Yields [edgeIndex] for every request arriving in each tick, identical across modes. */
function* arrivals(rates, seed = 7) {
  const random = seededRandom(seed);
  for (let elapsed = 0; elapsed < DURATION_MS; elapsed += TICK_MS) {
    const batch = [];
    rates(elapsed).forEach((rate, edge) => {
      if (random() < (rate * TICK_MS) / 1000) batch.push(edge);
    });
    yield { elapsed, batch };
  }
}

function offeredCount(rates) {
  let total = 0;
  for (const { batch } of arrivals(rates)) total += batch.length;
  return total;
}

function independentCounters(rates, limitPerEdge) {
  const counters = Array.from({ length: NODES }, () => new SlidingWindowCounter(WINDOW_MS, START));
  let admitted = 0;
  let premature = 0;
  for (const { elapsed, batch } of arrivals(rates)) {
    for (const edge of batch) {
      const now = START + elapsed;
      if (counters[edge].has(now, limitPerEdge)) {
        counters[edge].add(now);
        admitted += 1;
      } else if (admitted < LIMIT) {
        premature += 1;
      }
    }
  }
  return { admitted, premature, calls: 0 };
}

function central(rates) {
  const counter = new SlidingWindowCounter(WINDOW_MS, START);
  let admitted = 0;
  let calls = 0;
  for (const { elapsed, batch } of arrivals(rates)) {
    for (let i = 0; i < batch.length; i += 1) {
      calls += 1;
      const now = START + elapsed;
      if (counter.has(now, LIMIT)) {
        counter.add(now);
        admitted += 1;
      }
    }
  }
  return { admitted, premature: 0, calls };
}

async function leased(rates, syncIntervalMs) {
  const ruleSet = structuredClone(DEFAULT_RULE_SET);
  ruleSet.rules.find((rule) => rule.id === 'public-api').tiers.free = {
    limit: LIMIT,
    windowSec: WINDOW_MS / 1000,
    burst: LIMIT,
  };
  const cluster = await createCluster({
    nodes: NODES,
    syncIntervalMs,
    ruleSet,
    clock: new ManualClock(START),
  });

  let calls = 0;
  const handle = cluster.service.handleSync.bind(cluster.service);
  cluster.service.handleSync = (batch) => {
    calls += 1;
    return handle(batch);
  };

  let admitted = 0;
  let premature = 0;
  for (const { elapsed, batch } of arrivals(rates)) {
    if (elapsed > 0 && elapsed % syncIntervalMs === 0) await cluster.syncAll();
    for (const edge of batch) {
      if ((await cluster.request(edge)).allowed) admitted += 1;
      else if (admitted < LIMIT) premature += 1;
    }
    cluster.advance(TICK_MS);
  }
  return { admitted, premature, calls };
}

function row(label, { admitted, premature, calls }) {
  const over = Math.max(0, admitted - LIMIT);
  console.log(
    [
      label.padEnd(26),
      String(admitted).padStart(9),
      `${((over / LIMIT) * 100).toFixed(0)}%`.padStart(11),
      String(premature).padStart(19),
      String(calls).padStart(19),
    ].join('')
  );
}

console.log(`limit ${LIMIT} per ${WINDOW_MS / 1000}s window, ${DURATION_MS / 1000}s of simulated traffic, ${NODES} edges`);
console.log('premature rejects = requests refused while the global budget was not yet used up\n');

for (const scenario of SCENARIOS) {
  console.log(`${scenario.name} (${offeredCount(scenario.rates)} requests offered)`);
  console.log(
    [
      'mode'.padEnd(26),
      'admitted'.padStart(9),
      'overshoot'.padStart(11),
      'premature rejects'.padStart(19),
      'coordinator calls'.padStart(19),
    ].join('')
  );
  row('local only, no sync', independentCounters(scenario.rates, LIMIT));
  row('static split, L / N', independentCounters(scenario.rates, Math.floor(LIMIT / NODES)));
  row('central, call per request', central(scenario.rates));
  for (const interval of SYNC_INTERVALS_MS) {
    row(`leased, sync ${interval} ms`, await leased(scenario.rates, interval));
  }
  console.log();
}

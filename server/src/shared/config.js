function int(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`${name} must be an integer, got "${raw}"`);
  return value;
}

const FAIL_MODES = ['bounded', 'open', 'closed'];

export function loadConfig(env = process.env) {
  const failMode = env.EDGE_FAIL_MODE ?? 'bounded';
  if (!FAIL_MODES.includes(failMode)) {
    throw new Error(`EDGE_FAIL_MODE must be one of ${FAIL_MODES.join(', ')}`);
  }

  const coordinatorPort = int(env, 'COORDINATOR_PORT', 4000);
  const originPort = int(env, 'ORIGIN_PORT', 4100);

  return {
    store: {
      kind: env.STORE ?? 'mongo',
      mongoUri: env.MONGO_URI ?? 'mongodb://localhost:27017',
      mongoDb: env.MONGO_DB ?? 'edgegate',
    },
    origin: { port: originPort },
    coordinator: { port: coordinatorPort },
    edge: {
      id: env.EDGE_ID ?? 'edge-local',
      port: int(env, 'EDGE_PORT', 4201),
      peers: int(env, 'EDGE_PEERS', 3),
      syncIntervalMs: int(env, 'EDGE_SYNC_INTERVAL_MS', 1000),
      syncLatencyMs: int(env, 'EDGE_SYNC_LATENCY_MS', 0),
      syncJitterMs: int(env, 'EDGE_SYNC_JITTER_MS', 0),
      syncLossRate: number(env, 'EDGE_SYNC_LOSS_RATE', 0),
      failMode,
      kvMaxEntries: int(env, 'EDGE_KV_MAX_ENTRIES', 10000),
      coordinatorUrl: env.COORDINATOR_URL ?? `http://localhost:${coordinatorPort}`,
      originUrl: env.ORIGIN_URL ?? `http://localhost:${originPort}`,
    },
  };
}

function number(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number, got "${raw}"`);
  return value;
}

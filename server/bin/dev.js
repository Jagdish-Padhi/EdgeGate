import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const DEFAULT_RESTART_DELAY_MS = 1500;
let restartDelayMs = Number.parseInt(process.env.NODE_RESTART_DELAY_MS ?? '', 10);
if (Number.isNaN(restartDelayMs)) restartDelayMs = DEFAULT_RESTART_DELAY_MS;
restartDelayMs = Math.max(0, Math.min(60_000, restartDelayMs));
const controlPort = Number.parseInt(process.env.DEV_CONTROL_PORT ?? '4300', 10);
const script = (name) => fileURLToPath(new URL(`./${name}.js`, import.meta.url));

const edge = (id, port) => ({
  name: id,
  script: 'edge',
  env: { EDGE_ID: id, EDGE_PORT: String(port), EDGE_PEERS: '3' },
});

const processes = [
  { name: 'origin', script: 'origin', env: {} },
  { name: 'coordinator', script: 'coordinator', env: {} },
  edge('edge-mumbai', 4201),
  edge('edge-frankfurt', 4202),
  edge('edge-virginia', 4203),
];

let stopping = false;
const children = new Map();

function prefix(name, stream) {
  createInterface({ input: stream }).on('line', (line) => console.log(`[${name}] ${line}`));
}

function launch(def) {
  const child = spawn(process.execPath, [script(def.script)], {
    env: { ...process.env, ...def.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.set(def.name, child);
  prefix(def.name, child.stdout);
  prefix(def.name, child.stderr);

  child.on('exit', (code, signal) => {
    children.delete(def.name);
    if (stopping) return;
    console.log(`[dev] ${def.name} exited (${signal ?? code}); restarting in ${restartDelayMs} ms`);
    setTimeout(() => launch(def), restartDelayMs);
  });
}

const control = express();
control.use(cors());
control.use(express.json());
control.get('/settings', (_req, res) => res.json({ restartDelayMs }));
control.put('/settings', (req, res) => {
  const value = Number(req.body?.restartDelayMs);
  if (!Number.isFinite(value) || value < 0 || value > 60_000) {
    return res.status(400).json({ error: 'restartDelayMs must be between 0 and 60000' });
  }
  restartDelayMs = Math.round(value);
  return res.json({ restartDelayMs });
});
const controlServer = control.listen(controlPort, () => {
  console.log(`[dev] control settings listening on ${controlPort}`);
});

function stop() {
  stopping = true;
  controlServer.close();
  for (const child of children.values()) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

processes.forEach(launch);

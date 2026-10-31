import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const RESTART_DELAY_MS = 1500;
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
    console.log(`[dev] ${def.name} exited (${signal ?? code}); restarting in ${RESTART_DELAY_MS} ms`);
    setTimeout(() => launch(def), RESTART_DELAY_MS);
  });
}

function stop() {
  stopping = true;
  for (const child of children.values()) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

processes.forEach(launch);

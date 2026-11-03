import { useState } from 'react';
import { EDGES } from '../config.js';
import { InfoTip } from './InfoTip.jsx';
import { LoaderCircle, Play } from 'lucide-react';

const CLIENTS = {
  free: { label: 'Free plan, orders API', method: 'GET', path: '/api/orders', headers: { 'x-api-key': 'key-free-acme' } },
  pro: { label: 'Pro plan, orders API', method: 'GET', path: '/api/orders', headers: { 'x-api-key': 'key-pro-globex' } },
  anonymous: { label: 'No API key, weather API', method: 'GET', path: '/api/weather', headers: {} },
  login: {
    label: 'Login attempts with a wrong password',
    method: 'POST',
    path: '/auth/login',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid@example.test', password: 'invalid' }),
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emptyTally = () => Object.fromEntries(EDGES.map((edge) => [edge.id, { ok: 0, limited: 0, failed: 0 }]));

export function TrafficPanel() {
  const [client, setClient] = useState('free');
  const [target, setTarget] = useState('all');
  const [count, setCount] = useState(60);
  const [gapMs, setGapMs] = useState(20);
  const [running, setRunning] = useState(false);
  const [tally, setTally] = useState(emptyTally);
  const [lastRetry, setLastRetry] = useState(null);

  async function send() {
    const spec = CLIENTS[client];
    const targets = target === 'all' ? EDGES : EDGES.filter((edge) => edge.id === target);
    const next = emptyTally();
    setTally(next);
    setRunning(true);

    for (let i = 0; i < count; i += 1) {
      const edge = targets[i % targets.length];
      try {
        const response = await fetch(`${edge.url}${spec.path}`, { method: spec.method, headers: spec.headers, body: spec.body });
        if (response.status === 429) {
          next[edge.id].limited += 1;
          setLastRetry(response.headers.get('retry-after'));
        } else {
          next[edge.id].ok += 1;
        }
      } catch {
        next[edge.id].failed += 1;
      }
      setTally(structuredClone(next));
      if (gapMs > 0) await sleep(gapMs);
    }
    setRunning(false);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>
            Send traffic
            <InfoTip label="About sending traffic">
              Requests go from your browser straight to the edge nodes, as if users in different regions were calling them. Blocked means the node answered 429 Too Many Requests.
            </InfoTip>
          </h2>
          <p className="muted">Try the limits with real requests</p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Client
          <select value={client} onChange={(event) => setClient(event.target.value)}>
            {Object.entries(CLIENTS).map(([id, spec]) => (
              <option key={id} value={id}>{spec.label}</option>
            ))}
          </select>
        </label>
        <label>
          Send to
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="all">All nodes, in turn</option>
            {EDGES.map((edge) => (
              <option key={edge.id} value={edge.id}>{edge.region} only</option>
            ))}
          </select>
        </label>
        <label>
          Number of requests
          <input type="number" min="1" max="1000" value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
        <label>
          Pause between requests (ms)
          <input type="number" min="0" max="2000" value={gapMs} onChange={(event) => setGapMs(Number(event.target.value))} />
        </label>
      </div>

      <div className="controls">
        <button type="button" className="primary" disabled={running} onClick={send}>
          {running ? <><LoaderCircle size={14} className="spin" aria-hidden="true" />Sending...</> : <><Play size={14} aria-hidden="true" />Send requests</>}
        </button>
        {lastRetry && <span className="muted">Blocked callers were told to retry in {lastRetry} seconds.</span>}
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>Node</th>
            <th>Allowed</th>
            <th>Blocked</th>
            <th>Failed</th>
          </tr>
        </thead>
        <tbody>
          {EDGES.map((edge) => (
            <tr key={edge.id}>
              <td>{edge.region}</td>
              <td>{tally[edge.id].ok}</td>
              <td>{tally[edge.id].limited}</td>
              <td>{tally[edge.id].failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

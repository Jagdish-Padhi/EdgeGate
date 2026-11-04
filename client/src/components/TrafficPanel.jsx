import { useRef, useState } from 'react';
import { EDGES } from '../config.js';
import { InfoTip } from './InfoTip.jsx';
import { Play, RotateCcw, Sparkles, StepForward } from 'lucide-react';

export const CLIENTS = {
  free: { label: 'Free plan, orders API', method: 'GET', path: '/api/orders', headers: { 'x-api-key': 'key-free-acme' } },
  pro: { label: 'Pro plan, orders API', method: 'GET', path: '/api/orders', headers: { 'x-api-key': 'key-pro-globex' } },
  anonymous: { label: 'No API key, weather API', method: 'GET', path: '/api/weather', headers: {} },
  login: {
    label: 'Login brute-force test',
    method: 'POST',
    path: '/auth/login',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid@example.test', password: 'invalid' }),
  },
};

const PRESETS = [
  { id: 'balanced', label: 'Balanced (30)', desc: 'Even load across all 3 regions', action: { client: 'free', target: 'all', count: 30 } },
  { id: 'burst', label: 'Mumbai Surge (50)', desc: 'Rapid traffic spike in Mumbai', action: { client: 'free', target: 'edge-mumbai', count: 50 } },
  { id: 'pro', label: 'Pro Tier (40)', desc: 'Higher quota plan test', action: { client: 'pro', target: 'all', count: 40 } },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emptyTally = () => Object.fromEntries(EDGES.map((edge) => [edge.id, { ok: 0, limited: 0, failed: 0 }]));

export function TrafficPanel({
  onRequestDone,
  running,
  setRunning,
  trafficConfig,
  setTrafficConfig,
  triggerRef,
  simulationState,
  setSimulationState,
  onImmediateRefresh,
  onResetTotals,
}) {
  const [localClient, setLocalClient] = useState('free');
  const [localTarget, setLocalTarget] = useState('all');
  const [localCount, setLocalCount] = useState(30);

  // Speed Presets: slow (450ms), normal (120ms), fast (20ms)
  const [speedMode, setSpeedMode] = useState('normal');
  const [tally, setTally] = useState(emptyTally);
  const [lastRetry, setLastRetry] = useState(null);

  const stepIndexRef = useRef(0);

  const client = trafficConfig?.client ?? localClient;
  const target = trafficConfig?.target ?? localTarget;
  const count = trafficConfig?.count ?? localCount;

  const getDelay = (mode) => {
    if (mode === 'slow') return 450;
    if (mode === 'normal') return 120;
    return 20;
  };

  const updateConfig = (patch) => {
    if (setTrafficConfig) {
      setTrafficConfig((prev) => ({ ...prev, ...patch }));
    } else {
      if ('client' in patch) setLocalClient(patch.client);
      if ('target' in patch) setLocalTarget(patch.target);
      if ('count' in patch) setLocalCount(patch.count);
    }
  };

  // Run a single request in round-robin fashion
  async function sendSingle(customSpec, customTargetEdge) {
    const spec = customSpec || CLIENTS[client];
    let targetEdge;

    if (customTargetEdge) {
      targetEdge = customTargetEdge;
    } else if (target === 'all') {
      targetEdge = EDGES[stepIndexRef.current % EDGES.length];
      stepIndexRef.current += 1;
    } else {
      targetEdge = EDGES.find((e) => e.id === target) || EDGES[0];
    }

    const start = performance.now();
    try {
      const response = await fetch(`${targetEdge.url}${spec.path}`, {
        method: spec.method,
        headers: spec.headers,
        body: spec.body,
      });
      const latency = Math.round(performance.now() - start);
      const is429 = response.status === 429;
      if (is429) {
        setTally((t) => ({ ...t, [targetEdge.id]: { ...t[targetEdge.id], limited: t[targetEdge.id].limited + 1 } }));
        const retry = response.headers.get('retry-after');
        setLastRetry(retry);
      } else {
        setTally((t) => ({ ...t, [targetEdge.id]: { ...t[targetEdge.id], ok: t[targetEdge.id].ok + 1 } }));
      }

      onRequestDone?.({
        status: response.status,
        edgeId: targetEdge.id,
        edgeRegion: targetEdge.region,
        path: spec.path,
        method: spec.method,
        clientLabel: spec.label,
        decision: is429 ? 'Blocked (429 Too Many Requests)' : 'Admitted (200 OK)',
        latency,
      });
    } catch {
      setTally((t) => ({ ...t, [targetEdge.id]: { ...t[targetEdge.id], failed: t[targetEdge.id].failed + 1 } }));
      onRequestDone?.({
        status: 0,
        edgeId: targetEdge.id,
        edgeRegion: targetEdge.region,
        path: spec.path,
        method: spec.method,
        clientLabel: spec.label,
        decision: 'Failed (Network Error)',
        latency: Math.round(performance.now() - start),
      });
    } finally {
      onImmediateRefresh?.();
    }
  }

  // Full batch execution
  async function executeRun(customSpec, customTargets, customCount, customSpeed) {
    const spec = customSpec || CLIENTS[client];
    const targets = customTargets || (target === 'all' ? EDGES : EDGES.filter((edge) => edge.id === target));
    const totalRequests = customCount ?? count;
    const currentSpeed = customSpeed || speedMode;
    const delay = getDelay(currentSpeed);

    const next = emptyTally();
    setTally(next);
    if (setRunning) setRunning(true);
    if (setSimulationState) setSimulationState('running');

    for (let i = 0; i < totalRequests; i += 1) {
      const edge = targets[i % targets.length];
      const start = performance.now();
      try {
        const response = await fetch(`${edge.url}${spec.path}`, {
          method: spec.method,
          headers: spec.headers,
          body: spec.body,
        });
        const latency = Math.round(performance.now() - start);
        if (response.status === 429) {
          next[edge.id].limited += 1;
          const retryHeader = response.headers.get('retry-after');
          setLastRetry(retryHeader);
          onRequestDone?.({
            status: 429,
            edgeId: edge.id,
            edgeRegion: edge.region,
            path: spec.path,
            method: spec.method,
            clientLabel: spec.label,
            decision: 'Blocked (429 Too Many Requests)',
            latency,
            step: i + 1,
            total: totalRequests,
          });
        } else {
          next[edge.id].ok += 1;
          onRequestDone?.({
            status: response.status,
            edgeId: edge.id,
            edgeRegion: edge.region,
            path: spec.path,
            method: spec.method,
            clientLabel: spec.label,
            decision: 'Admitted (200 OK)',
            latency,
            step: i + 1,
            total: totalRequests,
          });
        }
      } catch (err) {
        next[edge.id].failed += 1;
        onRequestDone?.({
          status: 0,
          edgeId: edge.id,
          edgeRegion: edge.region,
          path: spec.path,
          method: spec.method,
          clientLabel: spec.label,
          decision: 'Failed / Network Error',
          latency: Math.round(performance.now() - start),
          step: i + 1,
          total: totalRequests,
        });
      }
      setTally(structuredClone(next));

      if (delay >= 100) {
        onImmediateRefresh?.();
      }

      if (delay > 0) await sleep(delay);
    }
    if (setRunning) setRunning(false);
    if (setSimulationState) setSimulationState('idle');
    onImmediateRefresh?.();
  }

  if (triggerRef) {
    triggerRef.current = executeRun;
  }

  const applyPreset = (preset) => {
    updateConfig(preset.action);
    const spec = CLIENTS[preset.action.client];
    const targets = preset.action.target === 'all' ? EDGES : EDGES.filter((e) => e.id === preset.action.target);
    executeRun(spec, targets, preset.action.count);
  };

  const handleClear = () => {
    setTally(emptyTally());
    onResetTotals?.();
  };

  return (
    <aside className="panel traffic-sidebar-panel">
      <div className="panel-head">
        <div>
          <h2>Traffic Controller</h2>
          <p className="muted">Configure & trigger requests</p>
        </div>
      </div>

      {/* Quick 1-Click Presets */}
      <div className="sidebar-section">
        <span className="sidebar-section-title"><Sparkles size={13} /> Quick Presets</span>
        <div className="preset-chip-list vertical-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="preset-chip"
              disabled={running}
              onClick={() => applyPreset(p)}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-form">
        <label>
          Caller Plan
          <select className="uniform-input" value={client} onChange={(event) => updateConfig({ client: event.target.value })}>
            {Object.entries(CLIENTS).map(([id, spec]) => (
              <option key={id} value={id}>{spec.label}</option>
            ))}
          </select>
        </label>

        <label>
          Target Region
          <select className="uniform-input" value={target} onChange={(event) => updateConfig({ target: event.target.value })}>
            <option value="all">All regions (Round-Robin)</option>
            {EDGES.map((edge) => (
              <option key={edge.id} value={edge.id}>{edge.region} only</option>
            ))}
          </select>
        </label>

        <label>
          Batch Size
          <input
            className="uniform-input"
            type="number"
            min="1"
            max="500"
            value={count}
            onChange={(event) => updateConfig({ count: Number(event.target.value) })}
          />
        </label>

        <label>
          Pace
          <div className="speed-toggle-group">
            <button
              type="button"
              className={`speed-btn ${speedMode === 'slow' ? 'active' : ''}`}
              onClick={() => setSpeedMode('slow')}
              title="Slow Motion (450ms)"
            >
              🐢 Slow
            </button>
            <button
              type="button"
              className={`speed-btn ${speedMode === 'normal' ? 'active' : ''}`}
              onClick={() => setSpeedMode('normal')}
              title="Normal (120ms)"
            >
              🚶 Normal
            </button>
            <button
              type="button"
              className={`speed-btn ${speedMode === 'fast' ? 'active' : ''}`}
              onClick={() => setSpeedMode('fast')}
              title="Fast (20ms)"
            >
              ⚡ Fast
            </button>
          </div>
        </label>
      </div>

      <div className="controls sidebar-actions">
        <button
          type="button"
          className="primary icon-button btn-full uniform-btn"
          disabled={running}
          onClick={() => executeRun()}
        >
          <Play size={14} />
          {running ? 'Sending...' : `Send ${count} Requests`}
        </button>

        <div className="button-sub-row">
          <button
            type="button"
            className="icon-button step-btn btn-flex uniform-btn"
            disabled={running}
            onClick={() => sendSingle()}
            title="Send 1 request (Round-robin)"
          >
            <StepForward size={14} />
            Step 1
          </button>

          <button
            type="button"
            className="ghost icon-button btn-flex uniform-btn"
            onClick={handleClear}
            title="Clear tally numbers"
          >
            <RotateCcw size={13} /> Clear
          </button>
        </div>
      </div>

      {lastRetry && <div className="retry-note">⚠️ 429 Throttled: Callers told to retry in {lastRetry}s</div>}

      <div className="mini-tally-bar vertical-tally">
        {EDGES.map((edge) => (
          <div key={edge.id} className="mini-tally-item">
            <span className="mini-tally-region">{edge.region}</span>
            <div className="tally-badges">
              <span className="count-badge ok" title="Allowed (200 OK)">{tally[edge.id]?.ok ?? 0}</span>
              <span className="count-badge blocked" title="Blocked (429)">{tally[edge.id]?.limited ?? 0}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

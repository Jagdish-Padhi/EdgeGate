import { useEffect, useRef, useState } from 'react';
import { EDGES } from '../../config.js';
import { InfoTip } from '../common/InfoTip.jsx';
import { Play, RotateCcw, StepForward } from 'lucide-react';

export const CLIENTS = {
  free: { label: 'Free Plan (/api/orders)', method: 'GET', path: '/api/orders', headers: { 'x-api-key': 'key-free-acme' } },
  pro: { label: 'Pro Plan (/api/orders)', method: 'GET', path: '/api/orders', headers: { 'x-api-key': 'key-pro-globex' } },
  anonymous: { label: 'Anonymous IP (/api/weather)', method: 'GET', path: '/api/weather', headers: {} },
  login: {
    label: 'Login Route (/auth/login)',
    method: 'POST',
    path: '/auth/login',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid@example.test', password: 'invalid' }),
  },
};

const PRESETS = [
  { id: 'balanced', label: 'Even Load (30)', desc: 'Spread 30 requests across Mumbai, Frankfurt, and Virginia', action: { client: 'free', target: 'all', count: 30 } },
  { id: 'burst', label: 'Mumbai Spike (50)', desc: 'Send 50 requests specifically to Mumbai', action: { client: 'free', target: 'edge-mumbai', count: 50 } },
  { id: 'pro', label: 'Pro Plan (40)', desc: 'Send 40 requests using higher-tier Pro credentials', action: { client: 'pro', target: 'all', count: 40 } },
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
  lastResetAt,
}) {
  const [localClient, setLocalClient] = useState('free');
  const [localTarget, setLocalTarget] = useState('all');
  const [localCount, setLocalCount] = useState(30);

  // Pace: slow 450 ms, normal 120 ms, fast 20 ms between requests
  const [speedMode, setSpeedMode] = useState('normal');
  const [tally, setTally] = useState(emptyTally);
  const [lastRetry, setLastRetry] = useState(null);

  const stepIndexRef = useRef(0);
  const abortControllerRef = useRef(null);
  const runIdRef = useRef(0);

  // Immediately abort any active simulation on reset
  useEffect(() => {
    if (lastResetAt) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      runIdRef.current += 1;
      setTally(emptyTally());
      setLastRetry(null);
      if (setRunning) setRunning(false);
      if (setSimulationState) setSimulationState('idle');
    }
  }, [lastResetAt, setRunning, setSimulationState]);

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
        signal: abortControllerRef.current?.signal,
      });
      if (abortControllerRef.current?.signal.aborted) return;

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
        decision: is429 ? 'Blocked' : 'Allowed',
        latency,
      });
    } catch {
      if (abortControllerRef.current?.signal.aborted) return;
      setTally((t) => ({ ...t, [targetEdge.id]: { ...t[targetEdge.id], failed: t[targetEdge.id].failed + 1 } }));
      onRequestDone?.({
        status: 0,
        edgeId: targetEdge.id,
        edgeRegion: targetEdge.region,
        path: spec.path,
        method: spec.method,
        clientLabel: spec.label,
        decision: 'Failed',
        latency: Math.round(performance.now() - start),
      });
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        onImmediateRefresh?.();
      }
    }
  }

  // Full batch execution
  async function executeRun(customSpec, customTargets, customCount, customSpeed) {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;
    const currentRunId = ++runIdRef.current;

    const spec = customSpec || CLIENTS[client];
    const targets = customTargets || (target === 'all' ? EDGES : EDGES.filter((edge) => edge.id === target));
    const totalRequests = customCount ?? count;
    const currentSpeed = customSpeed || speedMode;
    const delay = getDelay(currentSpeed);

    const next = emptyTally();
    setTally(next);
    if (setRunning) setRunning(true);
    if (setSimulationState) setSimulationState('running');

    try {
      for (let i = 0; i < totalRequests; i += 1) {
        if (abortCtrl.signal.aborted || runIdRef.current !== currentRunId) break;

        const edge = targets[i % targets.length];
        const start = performance.now();
        try {
          const response = await fetch(`${edge.url}${spec.path}`, {
            method: spec.method,
            headers: spec.headers,
            body: spec.body,
            signal: abortCtrl.signal,
          });

          if (abortCtrl.signal.aborted || runIdRef.current !== currentRunId) break;

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
              decision: 'Blocked',
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
              decision: 'Allowed',
              latency,
              step: i + 1,
              total: totalRequests,
            });
          }
        } catch {
          if (abortCtrl.signal.aborted || runIdRef.current !== currentRunId) break;
          next[edge.id].failed += 1;
          onRequestDone?.({
            status: 0,
            edgeId: edge.id,
            edgeRegion: edge.region,
            path: spec.path,
            method: spec.method,
            clientLabel: spec.label,
            decision: 'Failed',
            latency: Math.round(performance.now() - start),
            step: i + 1,
            total: totalRequests,
          });
        }

        if (abortCtrl.signal.aborted || runIdRef.current !== currentRunId) break;
        setTally(structuredClone(next));

        if (delay >= 100) {
          onImmediateRefresh?.();
        }

        if (delay > 0) await sleep(delay);
        if (abortCtrl.signal.aborted || runIdRef.current !== currentRunId) break;
      }
    } finally {
      if (runIdRef.current === currentRunId) {
        if (setRunning) setRunning(false);
        if (setSimulationState) setSimulationState('idle');
        onImmediateRefresh?.();
      }
    }
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    runIdRef.current += 1;
    if (setRunning) setRunning(false);
    if (setSimulationState) setSimulationState('idle');
    setTally(emptyTally());
    setLastRetry(null);
    onResetTotals?.();
  };

  return (
    <aside className="panel traffic-sidebar-panel">
      <div className="panel-head">
        <div>
          <h2>Traffic Generator</h2>
          <p className="muted">Send requests to test rate limiting</p>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-section-title">Quick Tests</span>
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
          <span className="field-label">
            Client Plan
            <InfoTip label="About client plan">
              Selects the client credentials (Free, Pro, Anonymous IP, or Login route) and API endpoint.
            </InfoTip>
          </span>
          <select className="uniform-input" value={client} onChange={(event) => updateConfig({ client: event.target.value })}>
            {Object.entries(CLIENTS).map(([id, spec]) => (
              <option key={id} value={id}>{spec.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">
            Target Region
            <InfoTip label="About target region">
              Send requests round-robin across all regions, or target a single edge region.
            </InfoTip>
          </span>
          <select className="uniform-input" value={target} onChange={(event) => updateConfig({ target: event.target.value })}>
            <option value="all">All regions (round-robin)</option>
            {EDGES.map((edge) => (
              <option key={edge.id} value={edge.id}>{edge.region} only</option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">
            Request Count
            <InfoTip label="About request count">
              Total number of HTTP requests to send in this test run.
            </InfoTip>
          </span>
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
          <span className="field-label">
            Speed
            <InfoTip label="About speed">
              Delay between successive requests: Fast (20ms) tests immediate token bucket bursts; Normal (120ms) and Slow (450ms) test steady sliding windows.
            </InfoTip>
          </span>
          <div className="speed-toggle-group">
            <button
              type="button"
              className={`speed-btn ${speedMode === 'slow' ? 'active' : ''}`}
              onClick={() => setSpeedMode('slow')}
              title="450ms delay between requests"
            >
              Slow
            </button>
            <button
              type="button"
              className={`speed-btn ${speedMode === 'normal' ? 'active' : ''}`}
              onClick={() => setSpeedMode('normal')}
              title="120ms delay between requests"
            >
              Normal
            </button>
            <button
              type="button"
              className={`speed-btn ${speedMode === 'fast' ? 'active' : ''}`}
              onClick={() => setSpeedMode('fast')}
              title="20ms delay between requests"
            >
              Fast
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
          <span>{running ? 'Sending...' : `Send ${count} Requests`}</span>
        </button>

        <div className="button-sub-row">
          <button
            type="button"
            className="icon-button step-btn btn-flex uniform-btn"
            disabled={running}
            onClick={() => sendSingle()}
            title="Send a single request"
          >
            <StepForward size={14} />
            <span>Send 1 Request</span>
          </button>

          <button
            type="button"
            className="ghost icon-button btn-flex uniform-btn"
            onClick={handleClear}
            title="Reset regional count tallies"
          >
            <RotateCcw size={13} />
            <span>Reset Counts</span>
          </button>
        </div>
      </div>

      {lastRetry && <div className="retry-note">Rate limit reached. Retry-After: {lastRetry}s.</div>}
    </aside>
  );
}


import { postQuietly, putJson } from '../../api/http.js';
import { describeKey, modeLabel } from '../../lib/labels.js';
import { InfoTip } from '../common/InfoTip.jsx';
import { StatusDot } from '../common/StatusDot.jsx';
import { Gauge, GaugeCircle, MapPin, MessageSquare, MessageSquareOff, OctagonX, Wifi, WifiOff } from 'lucide-react';

function syncSummary(sync, faults) {
  if (faults.partitioned) return { text: 'Disconnected from coordinator (simulated)', warn: true };
  if (sync.consecutiveFailures > 0) return { text: 'Cannot reach coordinator', warn: true };
  if (sync.lastSuccessAt === null) return { text: 'Connecting...', warn: false };
  const seconds = Math.max(0, Math.round((Date.now() - sync.lastSuccessAt) / 1000));
  const latency = sync.lastLatencyMs === null ? '' : `, ${sync.lastLatencyMs} ms`;
  return { text: `Last sync ${seconds}s ago${latency}`, warn: false };
}

function displayMode(key, state) {
  const healthy = !state.faults.partitioned && state.sync.consecutiveFailures === 0;
  return key.mode === 'local' && healthy ? 'idle' : key.mode;
}

function fallbackText(state) {
  if (state.failMode === 'open') return 'Network offline: Allowing all traffic (fail-open)';
  if (state.failMode === 'closed') return 'Network offline: Blocking traffic (fail-closed)';
  return `Network offline: Allowing safe local quota (1/${state.peers} pool)`;
}

function Toggle({ label, active, onClick, icon: Icon, inactiveIcon: InactiveIcon }) {
  const CurrentIcon = active && InactiveIcon ? InactiveIcon : Icon;
  return (
    <button
      type="button"
      className={active ? 'toggle on' : 'toggle'}
      aria-pressed={active}
      onClick={onClick}
      title={label}
    >
      {CurrentIcon && <CurrentIcon size={13} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

export function EdgeCard({ edge, activeEdgeId, lastDecision }) {
  const { state } = edge;
  const setFaults = (patch) => putJson(`${edge.url}/_edge/faults`, patch).catch(() => {});
  const sync = state ? syncSummary(state.sync, state.faults) : null;
  const isActive = activeEdgeId === edge.id;
  const isBlocked = lastDecision?.status === 429;

  return (
    <article className={`panel edge-node-panel triad-edge-card ${isActive ? (isBlocked ? 'pulse-blocked' : 'pulse-active') : ''}`}>
      {/* Node Header */}
      <div className="panel-head triad-node-head">
        <h2>
          <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>{edge.region}</span>
        </h2>
        <StatusDot ok={edge.online}>{edge.online ? 'Online' : 'Down'}</StatusDot>
      </div>

      {!state && <div className="node-offline-card muted">Node restarting...</div>}

      {state && (
        <div className="triad-body">
          {/* Sync status & latency */}
          <div className="node-sync-strip">
            <span className={sync.warn ? 'note warn' : 'note'}>{sync.text}</span>
          </div>

          {/* KPI Metrics */}
          <div className="triad-kpi-row">
            <div className="triad-kpi-box">
              <span className="triad-kpi-label">Allowed</span>
              <strong className="triad-kpi-val stat-ok">{state.totals.allowed}</strong>
            </div>
            <div className="triad-kpi-box">
              <span className="triad-kpi-label">Blocked</span>
              <strong className="triad-kpi-val stat-blocked">{state.totals.denied}</strong>
            </div>
            <div className="triad-kpi-box">
              <span className="triad-kpi-label">Mode</span>
              <strong className={`triad-kpi-val stat-mode mode-${displayMode(state.keys[0] || { mode: 'idle' }, state)}`}>
                {modeLabel(displayMode(state.keys[0] || { mode: 'idle' }, state))}
              </strong>
            </div>
          </div>

          {/* Active Key Meters Section */}
          <div className="triad-keys-section">
            <div className="triad-keys-header-row">
              <span className="col-caller">Caller</span>
              <span className="col-quota">
                Quota left
                <InfoTip label="About quota left">
                  How many requests this node may allow before asking the coordinator for a new lease.
                </InfoTip>
              </span>
              <span className="col-burst">
                Burst tokens
                <InfoTip label="About burst tokens" align="end">
                  Requests the node can allow right now in an immediate burst. Refills steadily over time.
                </InfoTip>
              </span>
            </div>

            <div className="triad-keys-list">
              {state.keys.length === 0 ? (
                <div className="empty-keys-note muted">No requests yet.</div>
              ) : (
                state.keys.map((key) => {
                  const { caller, rule } = describeKey(key.key);
                  return (
                    <div key={key.key} className="key-row-compact">
                      <div className="key-caller-col">
                        <strong className="caller-name">{caller}</strong>
                        <span className="caller-rule muted">{rule}</span>
                      </div>

                      <div className="key-quota-col">
                        <div className="meter-label-row">
                          <span className="meter-num"><strong>{key.leaseRemaining ?? 'None'}</strong></span>
                        </div>
                        {key.leaseRemaining !== null && (
                          <div className="mini-bar-track" title={`${key.leaseRemaining} quota remaining`}>
                            <div
                              className="mini-bar-fill lease-fill"
                              style={{ width: `${Math.min(100, Math.max(0, ((key.leaseRemaining ?? 0) / (key.limit || 20)) * 100))}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="key-burst-col">
                        <div className="meter-label-row">
                          <span className="meter-num">
                            <strong>{key.tokens}</strong> / {key.burst}
                            {key.tokens < key.burst && <span className="refill-indicator">refill</span>}
                          </span>
                        </div>
                        <div className="mini-bar-track" title={`${key.tokens} of ${key.burst} burst tokens`}>
                          <div
                            className="mini-bar-fill burst-fill"
                            style={{ width: `${Math.min(100, Math.max(0, (key.tokens / (key.burst || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Fault Alerts */}
          {state.faults.partitioned && (
            <div className="fault-alert-banner alert-disconnect compact-alert">
              <WifiOff size={13} aria-hidden="true" />
              <span>{fallbackText(state)}</span>
            </div>
          )}
          {state.faults.latencyMs > 0 && (
            <div className="fault-alert-banner alert-slow compact-alert">
              <Gauge size={13} aria-hidden="true" />
              <span>Sync latency +{state.faults.latencyMs}ms delay.</span>
            </div>
          )}
          {state.faults.lostResponseRate > 0 && (
            <div className="fault-alert-banner alert-drop compact-alert">
              <MessageSquareOff size={13} aria-hidden="true" />
              <span>{Math.round(state.faults.lostResponseRate * 100)}% sync packet loss.</span>
            </div>
          )}

          {/* Failure Simulation Section */}
          <div className="fault-simulation-section" role="group" aria-label={`Simulate a failure on ${edge.region}`}>
            <div className="fault-section-title">
              <span>Simulate a failure</span>
              <InfoTip label="About simulated failures">
                <strong>Disconnect</strong>: Simulates network partition from coordinator.
                <br />
                <strong>Drop replies</strong>: Coordinator receives updates but replies are lost.
                <br />
                <strong>Slow network</strong>: Adds 120ms latency to coordinator sync.
                <br />
                <strong>Crash node</strong>: Stops the node process; it restarts automatically.
              </InfoTip>
            </div>

            <div className="fault-toggles-row">
              <Toggle
                icon={WifiOff}
                inactiveIcon={Wifi}
                label="Disconnect"
                active={state.faults.partitioned}
                onClick={() => setFaults({ partitioned: !state.faults.partitioned })}
              />
              <Toggle
                icon={MessageSquareOff}
                inactiveIcon={MessageSquare}
                label="Drop replies"
                active={state.faults.lostResponseRate > 0}
                onClick={() => setFaults({ lostResponseRate: state.faults.lostResponseRate > 0 ? 0 : 0.6 })}
              />
              <Toggle
                icon={Gauge}
                inactiveIcon={GaugeCircle}
                label="Slow network"
                active={state.faults.latencyMs > 0}
                onClick={() => setFaults({
                  latencyMs: state.faults.latencyMs > 0 ? 0 : 120,
                  jitterMs: state.faults.latencyMs > 0 ? 0 : 40,
                })}
              />
            </div>

            <button
              type="button"
              className="crash-node-btn"
              onClick={() => postQuietly(`${edge.url}/_edge/crash`)}
              title="Stop node process (it restarts automatically)"
            >
              <OctagonX size={14} aria-hidden="true" />
              <span>Crash node</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

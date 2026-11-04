import { postQuietly, putJson } from '../api/http.js';
import { describeKey, modeLabel } from '../lib/labels.js';
import { InfoTip } from './InfoTip.jsx';
import { StatusDot } from './StatusDot.jsx';
import { Gauge, GaugeCircle, MapPin, MessageSquare, MessageSquareOff, OctagonX, Wifi, WifiOff } from 'lucide-react';

function syncSummary(sync, faults) {
  if (faults.partitioned) return { text: 'Disconnected from the coordinator (simulated)', warn: true };
  if (sync.consecutiveFailures > 0) return { text: 'Cannot reach the coordinator', warn: true };
  if (sync.lastSuccessAt === null) return { text: 'Connecting to the coordinator', warn: false };
  const seconds = Math.max(0, Math.round((Date.now() - sync.lastSuccessAt) / 1000));
  const latency = sync.lastLatencyMs === null ? '' : ` · ${sync.lastLatencyMs} ms`;
  return { text: `Checked in ${seconds}s ago${latency}`, warn: false };
}

/** A key with no quota while the coordinator is healthy is just idle, not degraded. */
function displayMode(key, state) {
  const healthy = !state.faults.partitioned && state.sync.consecutiveFailures === 0;
  return key.mode === 'local' && healthy ? 'idle' : key.mode;
}

function Toggle({ label, active, onClick, icon: Icon, inactiveIcon: InactiveIcon }) {
  const CurrentIcon = active && InactiveIcon ? InactiveIcon : Icon;
  return (
    <button type="button" className={active ? 'toggle on' : 'toggle'} aria-pressed={active} onClick={onClick}>
      {CurrentIcon && <CurrentIcon size={14} aria-hidden="true" />}
      {label}
    </button>
  );
}

export function EdgeCard({ edge, activeEdgeId, lastDecision }) {
  const { state } = edge;
  const setFaults = (patch) => putJson(`${edge.url}/_edge/faults`, patch).catch(() => {});
  const sync = state ? syncSummary(state.sync, state.faults) : null;

  return (
    <article className={`panel edge-node-panel ${activeEdgeId === edge.id ? (lastDecision?.status === 429 ? 'pulse-blocked' : 'pulse-active') : ''}`}>
      <div className="panel-head">
        <div>
          <h2><MapPin size={16} strokeWidth={1.8} aria-hidden="true" />{edge.region}</h2>
        </div>
        <StatusDot ok={edge.online}>{edge.online ? 'Online' : 'Down'}</StatusDot>
      </div>

      {!state && <p className="muted">This node is down. It restarts on its own within a few seconds.</p>}

      {state && (
        <>
          <p className={sync.warn ? 'note warn' : 'note'}>{sync.text}</p>

          <dl className="totals">
            <div>
              <dt>Allowed</dt>
              <dd className="stat-ok">{state.totals.allowed}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd className="stat-blocked">{state.totals.denied}</dd>
            </div>
            <div>
              <dt>Lease Mode</dt>
              <dd className="stat-mode">{displayMode(state.keys[0] || { mode: 'idle' }, state)}</dd>
            </div>
          </dl>

          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>
                    Mode
                    <InfoTip label="About modes">
                      <strong>Coordinated</strong>: the node is spending quota the coordinator gave it.
                      <br />
                      <strong>Idle</strong>: no quota held right now. The node asks the coordinator when the next request arrives.
                      <br />
                      <strong>On its own</strong>: the coordinator is unreachable, so the node uses a fixed share of the limit.
                      <br />
                      <strong>Allowing all</strong> and <strong>Blocking all</strong> only appear when the node is configured to fail open or closed.
                    </InfoTip>
                  </th>
                  <th>
                    Quota held
                    <InfoTip label="About quota held">
                      How many more requests this node may allow before it needs a new share from the coordinator.
                    </InfoTip>
                  </th>
                  <th>
                    Burst left
                    <InfoTip label="About burst" align="end">
                      Requests the node can allow right now in a quick burst. It refills steadily over time.
                    </InfoTip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.keys.length === 0 && (
                  <tr>
                    <td colSpan="4" className="muted">No requests yet. Use Send traffic to start.</td>
                  </tr>
                )}
                {state.keys.map((key) => {
                  const { caller, rule } = describeKey(key.key);
                  return (
                    <tr key={key.key}>
                      <td>
                        <span className="strong">{caller}</span>
                        <span className="sub">{rule}</span>
                      </td>
                      <td><span className={`mode ${displayMode(key, state)}`}>{modeLabel(displayMode(key, state))}</span></td>
                      <td>
                        <div className="meter-wrap">
                          <span className="meter-text">{key.leaseRemaining ?? '0'} left</span>
                          {key.limit ? (
                            <div className="mini-bar-track" title={`${key.leaseRemaining ?? 0} lease tokens out of ${key.limit} limit`}>
                              <div
                                className="mini-bar-fill lease-fill"
                                style={{ width: `${Math.min(100, Math.max(0, ((key.leaseRemaining ?? 0) / key.limit) * 100))}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="meter-wrap">
                          <span className="meter-text">
                            {key.tokens} / {key.burst}
                            {key.tokens < key.burst && (
                              <span className="refill-indicator" title="Tokens refilling in background steadily"> ⚡ Refilling</span>
                            )}
                          </span>
                          <div className="mini-bar-track" title={`${key.tokens} burst tokens out of ${key.burst} burst cap`}>
                            <div
                              className="mini-bar-fill burst-fill"
                              style={{ width: `${Math.min(100, Math.max(0, (key.tokens / (key.burst || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Chaos Fault Impact Alert */}
          {state.faults.partitioned && (
            <div className="fault-alert-banner alert-disconnect">
              <strong>⚠️ Disconnected from Coordinator:</strong> Cannot fetch leases. Using emergency local safety quota (1/3 share) to avoid crashing.
            </div>
          )}
          {state.faults.latencyMs > 0 && (
            <div className="fault-alert-banner alert-slow">
              <strong>🐢 Slow Network Active:</strong> +{state.faults.latencyMs}ms background sync lag.
            </div>
          )}
          {state.faults.lostResponseRate > 0 && (
            <div className="fault-alert-banner alert-drop">
              <strong>📦 Dropped Replies Active:</strong> Simulating lost sync acknowledgments (60% loss).
            </div>
          )}

          <div className="fault-group" role="group" aria-label={`Simulate a problem on ${edge.region}`}>
            <div className="group-title">
              Simulate a problem
              <InfoTip label="About simulated problems">
                <strong>Disconnect</strong>: the node cannot reach the coordinator.
                <br />
                <strong>Drop replies</strong>: the coordinator gets the update but the node never hears back, so it sends it again.
                <br />
                <strong>Slow network</strong>: adds 120 ms with 40 ms of variation to every check-in.
                <br />
                <strong>Crash node</strong>: stops the node. It restarts by itself.
              </InfoTip>
            </div>
            <div className="controls">
              <Toggle icon={WifiOff} inactiveIcon={Wifi} label="Disconnect" active={state.faults.partitioned} onClick={() => setFaults({ partitioned: !state.faults.partitioned })} />
              <Toggle icon={MessageSquareOff} inactiveIcon={MessageSquare} label="Drop replies" active={state.faults.lostResponseRate > 0} onClick={() => setFaults({ lostResponseRate: state.faults.lostResponseRate > 0 ? 0 : 0.6 })} />
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
              <button type="button" className="danger icon-button" onClick={() => postQuietly(`${edge.url}/_edge/crash`)}>
                <OctagonX size={14} aria-hidden="true" />
                Crash node
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

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
  const latency = sync.lastLatencyMs === null ? '' : `, ${sync.lastLatencyMs} ms`;
  return { text: `Last sync ${seconds}s ago${latency}`, warn: false };
}

/** A key with no quota while the coordinator is healthy is just idle, not degraded. */
function displayMode(key, state) {
  const healthy = !state.faults.partitioned && state.sync.consecutiveFailures === 0;
  return key.mode === 'local' && healthy ? 'idle' : key.mode;
}

/** Describes what a node does while it has no lease, based on its fail mode. */
function fallbackText(state) {
  if (state.failMode === 'open') return 'Requests are allowed without a quota until it reconnects.';
  if (state.failMode === 'closed') return 'Requests are blocked until it reconnects.';
  return `This node allows at most 1/${state.peers} of each limit until it reconnects.`;
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

      {!state && <p className="muted">This node is down. It restarts automatically.</p>}

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
              <dt>Mode</dt>
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
                      <strong>Coordinated</strong>: spending quota granted by the coordinator.
                      <br />
                      <strong>Idle</strong>: no quota held. The node asks for some on the next request.
                      <br />
                      <strong>Local fallback</strong>: the coordinator is unreachable, so the node allows a fixed share of the limit.
                      <br />
                      <strong>Allow all</strong> and <strong>Block all</strong> appear only if the node is set to fail open or closed.
                    </InfoTip>
                  </th>
                  <th>
                    Quota left
                    <InfoTip label="About quota left">
                      Requests this node can still allow from the share the coordinator granted, before it needs a new one.
                    </InfoTip>
                  </th>
                  <th>
                    Burst tokens
                    <InfoTip label="About burst tokens" align="end">
                      Limits how many requests a caller can send at once. Tokens refill steadily over time.
                    </InfoTip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.keys.length === 0 && (
                  <tr>
                    <td colSpan="4" className="muted">No requests yet.</td>
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
                            <div className="mini-bar-track" title={`${key.leaseRemaining ?? 0} of ${key.limit} left`}>
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
                              <span className="refill-indicator" title="Tokens are refilling">refilling</span>
                            )}
                          </span>
                          <div className="mini-bar-track" title={`${key.tokens} of ${key.burst} burst tokens`}>
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

          {state.faults.partitioned && (
            <div className="fault-alert-banner alert-disconnect">
              <WifiOff size={14} aria-hidden="true" />
              <span><strong>Disconnected.</strong> {fallbackText(state)}</span>
            </div>
          )}
          {state.faults.latencyMs > 0 && (
            <div className="fault-alert-banner alert-slow">
              <Gauge size={14} aria-hidden="true" />
              <span><strong>Slow network.</strong> Sync is delayed by {state.faults.latencyMs} ms.</span>
            </div>
          )}
          {state.faults.lostResponseRate > 0 && (
            <div className="fault-alert-banner alert-drop">
              <MessageSquareOff size={14} aria-hidden="true" />
              <span><strong>Dropping replies.</strong> About {Math.round(state.faults.lostResponseRate * 100)}% of sync replies are lost.</span>
            </div>
          )}

          <div className="fault-group" role="group" aria-label={`Simulate a failure on ${edge.region}`}>
            <div className="group-title">
              Simulate a failure
              <InfoTip label="About simulated failures">
                <strong>Disconnect</strong>: the node cannot reach the coordinator.
                <br />
                <strong>Drop replies</strong>: the coordinator receives the update but the reply is lost, so the node sends it again.
                <br />
                <strong>Slow network</strong>: adds 120 ms (plus or minus 40 ms) to every sync.
                <br />
                <strong>Crash node</strong>: stops the node. It restarts automatically.
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

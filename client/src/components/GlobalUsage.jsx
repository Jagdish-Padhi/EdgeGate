import { getJson, postQuietly } from '../api/http.js';
import { EDGES, POLL_INTERVAL_MS } from '../config.js';
import { usePolling } from '../hooks/usePolling.js';
import { describeKey, formatWindow } from '../lib/labels.js';
import { InfoTip } from './InfoTip.jsx';
import { StatusDot } from './StatusDot.jsx';
import { OctagonX } from 'lucide-react';

const NODE_CLASS = Object.fromEntries(EDGES.map((edge, index) => [edge.id, `node-${index}`]));
const MAX_KEYS = 4;
const round = (value) => Number(value.toFixed(1));

function Budget({ usage }) {
  const reserved = usage.leases.reduce((sum, lease) => sum + lease.size, 0);
  const unassigned = Math.max(0, usage.limit - usage.used - reserved);
  const percent = (value) => `${Math.min(100, (value / usage.limit) * 100)}%`;
  const { caller, rule } = describeKey(usage.key);

  return (
    <li className="budget">
      <div className="budget-head">
        <span>
          <span className="strong">{caller}</span>
          <span className="sub inline">{rule}</span>
        </span>
        <span className="muted">
          {round(usage.used)} of {usage.limit} used, {reserved} reserved, per {formatWindow(usage.windowSec)}
        </span>
      </div>
      <div className="bar" role="img" aria-label={`${round(usage.used)} used, ${reserved} reserved, ${unassigned} unassigned, out of ${usage.limit}`}>
        <span className="seg used" style={{ width: percent(usage.used) }} />
        {usage.leases.map((lease) => (
          <span key={lease.nodeId} className={`seg ${NODE_CLASS[lease.nodeId] ?? 'node-0'}`} style={{ width: percent(lease.size) }} />
        ))}
      </div>
    </li>
  );
}

export function GlobalUsage({ keys, coordinatorUrl }) {
  const result = usePolling(async () => {
    try {
      const usages = await Promise.all(
        keys.slice(0, MAX_KEYS).map((key) => getJson(`${coordinatorUrl}/admin/usage?key=${encodeURIComponent(key)}`).catch(() => null))
      );
      return { online: true, usages: usages.filter(Boolean) };
    } catch {
      return { online: false, usages: [] };
    }
  }, POLL_INTERVAL_MS);

  const online = result?.online ?? false;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>
            Shared limit
            <InfoTip label="About the shared limit">
              Each caller has one limit that applies in every region. The coordinator counts usage and sets aside part of what is left for each region, so a region can decide on its own without asking every time.
            </InfoTip>
          </h2>
          <p className="muted">What each caller has used across all regions</p>
        </div>
        <StatusDot ok={online}>{online ? 'Coordinator online' : 'Coordinator down'}</StatusDot>
      </div>

      <ul className="budgets">
        {(result?.usages.length ?? 0) === 0 && <li className="muted">No quota is reserved right now. Budgets show up here while traffic is flowing.</li>}
        {result?.usages.map((usage) => (
          <Budget key={usage.key} usage={usage} />
        ))}
      </ul>

      <div className="legend">
        <span><i className="swatch used" />Used</span>
        {EDGES.map((edge, index) => (
          <span key={edge.id}><i className={`swatch node-${index}`} />{edge.region} reserved</span>
        ))}
        <span><i className="swatch free" />Not yet assigned</span>
      </div>

      <div className="controls">
        <button type="button" className="danger icon-button" onClick={() => postQuietly(`${coordinatorUrl}/admin/crash`)}>
          <OctagonX size={14} aria-hidden="true" />
          Crash coordinator
        </button>
      </div>
    </section>
  );
}

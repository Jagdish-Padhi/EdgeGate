import { getJson, postQuietly } from '../api/http.js';
import { EDGES, POLL_INTERVAL_MS } from '../config.js';
import { usePolling } from '../hooks/usePolling.js';
import { describeKey, formatWindow } from '../lib/labels.js';
import { InfoTip } from './InfoTip.jsx';
import { StatusDot } from './StatusDot.jsx';
import { Database, OctagonX } from 'lucide-react';

const NODE_CLASS = Object.fromEntries(EDGES.map((edge, index) => [edge.id, `node-${index}`]));
const MAX_KEYS = 4;
const round = (value) => Number(value.toFixed(1));

function Budget({ usage }) {
  const reserved = usage.leases.reduce((sum, lease) => sum + lease.size, 0);
  const unassigned = Math.max(0, usage.limit - usage.used - reserved);
  const percent = (value) => `${Math.min(100, (value / usage.limit) * 100)}%`;
  const { caller, rule } = describeKey(usage.key);

  return (
    <div className="budget-item">
      <div className="budget-head">
        <span className="budget-title">
          <strong className="strong">{caller}</strong>
          <small className="sub inline">{rule}</small>
        </span>
        <span className="muted font-tabular">
          {round(usage.used)} used / {usage.limit} limit
        </span>
      </div>

      {/* Always visible progress bar */}
      <div className="bar" role="img" aria-label={`${round(usage.used)} used, ${reserved} reserved, ${unassigned} unassigned`}>
        <span className="seg used" style={{ width: percent(usage.used) }} title={`Used: ${round(usage.used)}`} />
        {usage.leases.map((lease) => (
          <span
            key={lease.nodeId}
            className={`seg ${NODE_CLASS[lease.nodeId] ?? 'node-0'}`}
            style={{ width: percent(lease.size) }}
            title={`${lease.nodeId} reserved: ${lease.size}`}
          />
        ))}
      </div>

      <div className="budget-stats-row">
        <span>Used: <strong>{round(usage.used)}</strong></span>
        <span>Reserved by Edges: <strong>{reserved}</strong></span>
        <span>Vault Pool: <strong>{Math.max(0, Math.round(unassigned))}</strong></span>
      </div>
    </div>
  );
}

export function GlobalUsage({ keys, coordinatorUrl }) {
  const [result] = usePolling(async () => {
    try {
      await getJson(`${coordinatorUrl}/health`);
      // Always query at least the known keys so the budget bar never disappears
      const queryKeys = keys.length > 0 ? keys : ['public-api|tenant:acme', 'public-api|tenant:globex'];
      const usages = await Promise.all(
        queryKeys.slice(0, MAX_KEYS).map((key) => getJson(`${coordinatorUrl}/admin/usage?key=${encodeURIComponent(key)}`).catch(() => null))
      );
      return { online: true, usages: usages.filter(Boolean) };
    } catch {
      return { online: false, usages: [] };
    }
  }, POLL_INTERVAL_MS);

  const online = result?.online ?? false;
  const usages = result?.usages ?? [];

  return (
    <article className="panel edge-node-panel shared-quota-panel">
      <div className="panel-head">
        <div>
          <h2>
            <Database size={16} strokeWidth={1.8} aria-hidden="true" />
            Global Quota Pool (Coordinator)
          </h2>
          <p className="muted">Shared limit tracked across all regions</p>
        </div>
        <StatusDot ok={online}>{online ? 'Online' : 'Down'}</StatusDot>
      </div>

      <div className="quota-explainer-banner">
        <strong>How it works:</strong> The central Coordinator holds the master quota. It gives temporary leases to Mumbai, Frankfurt, and Virginia, preventing any single region from overspending.
      </div>

      <div className="budgets-container">
        {usages.length === 0 ? (
          <div className="budget-item default-preview">
            <div className="budget-head">
              <span className="budget-title">
                <strong className="strong">acme (Free Plan)</strong>
                <small className="sub inline">Public API</small>
              </span>
              <span className="muted font-tabular">0 used / 20 limit</span>
            </div>
            <div className="bar">
              <span className="seg free" style={{ width: '100%' }} />
            </div>
            <div className="budget-stats-row">
              <span>Used: <strong>0</strong></span>
              <span>Reserved: <strong>0</strong></span>
              <span>Vault Pool: <strong>20</strong></span>
            </div>
          </div>
        ) : (
          usages.map((usage) => <Budget key={usage.key} usage={usage} />)
        )}
      </div>

      <div className="legend compact-legend">
        <span><i className="swatch used" /> Used</span>
        {EDGES.map((edge, index) => (
          <span key={edge.id}><i className={`swatch node-${index}`} /> {edge.region} lease</span>
        ))}
        <span><i className="swatch free" /> Available in Vault</span>
      </div>

      <div className="controls panel-footer-action">
        <button type="button" className="danger icon-button" onClick={() => postQuietly(`${coordinatorUrl}/admin/crash`)}>
          <OctagonX size={13} aria-hidden="true" />
          Crash coordinator
        </button>
      </div>
    </article>
  );
}

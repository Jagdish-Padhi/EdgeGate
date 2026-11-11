import { useEffect, useRef } from 'react';
import { getJson } from '../../api/http.js';
import { EDGES, POLL_INTERVAL_MS } from '../../config.js';
import { usePolling } from '../../hooks/usePolling.js';
import { describeKey } from '../../lib/labels.js';
import { StatusDot } from '../common/StatusDot.jsx';
import { InfoTip } from '../common/InfoTip.jsx';
import { Database } from 'lucide-react';

const NODE_CLASS = Object.fromEntries(EDGES.map((edge, index) => [edge.id, `node-${index}`]));
const MAX_KEYS = 4;
const round = (value) => Number(value.toFixed(1));

function Budget({ usage }) {
  const reserved = usage.leases.reduce((sum, lease) => sum + lease.size, 0);
  const unassigned = Math.max(0, usage.limit - usage.used - reserved);
  const percent = (value) => `${Math.min(100, (value / usage.limit) * 100)}%`;
  const { caller, rule } = describeKey(usage.key);

  return (
    <div className="budget-item compact-budget">
      <div className="budget-head">
        <span className="budget-title">
          <strong className="strong">{caller}</strong>
          <small className="sub inline">{rule}</small>
        </span>
        <span className="muted font-tabular">
          {round(usage.used)} of {usage.limit} used
        </span>
      </div>

      <div className="bar" role="img" aria-label={`${round(usage.used)} used, ${reserved} held by regions, ${unassigned} unassigned`}>
        <span className="seg used" style={{ width: percent(usage.used) }} title={`Used: ${round(usage.used)}`} />
        {usage.leases.map((lease) => (
          <span
            key={lease.nodeId}
            className={`seg ${NODE_CLASS[lease.nodeId] ?? 'node-0'}`}
            style={{ width: percent(lease.size) }}
            title={`${lease.nodeId}: ${lease.size} leased`}
          />
        ))}
      </div>

      <div className="budget-stats-row">
        <span>Used <strong>{round(usage.used)}</strong></span>
        <span>Held by regions <strong>{reserved}</strong></span>
        <span>Unassigned <strong>{Math.max(0, Math.round(unassigned))}</strong></span>
      </div>
    </div>
  );
}

export function GlobalUsage({ keys, coordinatorUrl, lastEvent }) {
  const [result, refreshUsage] = usePolling(async () => {
    try {
      await getJson(`${coordinatorUrl}/health`);
      // Consistently show only the primary acme quota (remove globex)
      const primaryKey = keys.find((k) => k.includes('tenant:acme')) || 'public-api|tenant:acme';
      const usage = await getJson(`${coordinatorUrl}/admin/usage?key=${encodeURIComponent(primaryKey)}`).catch(() => null);
      return { online: true, usages: usage ? [usage] : [] };
    } catch {
      return { online: false, usages: [] };
    }
  }, POLL_INTERVAL_MS);

  // Trigger immediate refresh whenever a request is completed
  const refreshTimerRef = useRef(null);
  useEffect(() => {
    if (lastEvent) {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshUsage();
      refreshTimerRef.current = setTimeout(() => {
        refreshUsage();
      }, 150);
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [lastEvent, refreshUsage]);

  const online = result?.online ?? false;
  const usages = result?.usages ?? [];

  return (
    <article className="panel edge-node-panel shared-quota-panel horizontal-coordinator-card">
      <div className="panel-head quota-head-compact">
        <div>
          <h2>
            <Database size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>Global quota</span>
            <InfoTip label="About the global quota">
              Coordinator view, shared by all regions. The coordinator tracks total usage across the fleet and dispenses quotas via leases.
            </InfoTip>
          </h2>
          <div className="quota-subtitle">Coordinator view, shared by all regions</div>
        </div>
        <StatusDot ok={online}>{online ? 'Online' : 'Down'}</StatusDot>
      </div>

      <div className="budgets-container horizontal-budgets">
        {usages.length === 0 ? (
          <div className="budget-item default-preview compact-budget">
            <div className="budget-head">
              <span className="budget-title">
                <strong className="strong">acme</strong>
                <small className="sub inline">Public API</small>
              </span>
              <span className="muted font-tabular">0 of 20 used</span>
            </div>
            <div className="bar">
              <span className="seg free" style={{ width: '100%' }} />
            </div>
            <div className="budget-stats-row">
              <span>Used <strong>0</strong></span>
              <span>Held by regions <strong>0</strong></span>
              <span>Unassigned <strong>20</strong></span>
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
        <span><i className="swatch free" /> Unassigned</span>
      </div>
    </article>
  );
}

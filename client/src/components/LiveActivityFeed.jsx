import { BarChart3, CheckCircle2, ShieldCheck, Terminal, Trash2 } from 'lucide-react';

export function LiveActivityFeed({ logs, onClear, totalStats }) {
  const total = totalStats?.total ?? 0;
  const ok = totalStats?.ok ?? 0;
  const blocked = totalStats?.blocked ?? 0;
  const okPercent = total > 0 ? Math.round((ok / total) * 100) : 0;
  const blockedPercent = total > 0 ? Math.round((blocked / total) * 100) : 0;

  return (
    <aside className="panel activity-sidebar-panel">
      <div className="test-conclusion-card">
        <div className="conclusion-head">
          <BarChart3 size={16} className="conclusion-icon" aria-hidden="true" />
          <strong>Results</strong>
        </div>

        <div className="conclusion-metrics">
          <div className="conclusion-metric">
            <span className="metric-label">Sent</span>
            <span className="metric-value">{total}</span>
          </div>
          <div className="conclusion-metric ok">
            <span className="metric-label">Allowed</span>
            <span className="metric-value">{ok} <small>({okPercent}%)</small></span>
          </div>
          <div className="conclusion-metric blocked">
            <span className="metric-label">Blocked</span>
            <span className="metric-value">{blocked} <small>({blockedPercent}%)</small></span>
          </div>
        </div>

        {total > 0 && (
          <div className="conclusion-verdict">
            {blocked > 0 ? (
              <span className="verdict-text protected">
                <ShieldCheck size={14} aria-hidden="true" /> {blocked} {blocked === 1 ? 'request was' : 'requests were'} blocked at the edge and never reached the origin.
              </span>
            ) : (
              <span className="verdict-text normal">
                <CheckCircle2 size={14} aria-hidden="true" /> All requests were within the limit.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="panel-head log-head">
        <div>
          <h2>
            <Terminal size={15} strokeWidth={1.8} aria-hidden="true" />
            Request log
          </h2>
          <p className="muted">Latest 50 decisions</p>
        </div>
        {logs.length > 0 && (
          <button type="button" className="ghost icon-button" onClick={onClear} title="Clear the log">
            <Trash2 size={13} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="feed-container side-feed-container">
        {logs.length === 0 ? (
          <div className="feed-empty muted">
            No requests yet. Use <strong>Send</strong> on the left to start.
          </div>
        ) : (
          <ul className="feed-list">
            {logs.map((item) => (
              <li key={item.id} className={`feed-item ${item.level}`}>
                <div className="feed-row">
                  <span className="feed-time">{item.time}</span>
                  <span className={`feed-tag tag-${item.level}`}>{item.region}</span>
                  <span className="feed-outcome">{item.outcome}</span>
                  {item.latency !== undefined && <span className="feed-latency">{item.latency} ms</span>}
                </div>
                <span className="feed-text">{item.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

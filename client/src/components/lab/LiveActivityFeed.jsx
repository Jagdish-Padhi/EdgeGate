import { BarChart3, Terminal, Trash2 } from 'lucide-react';

export function LiveActivityFeed({ logs, onClear, totalStats }) {
  const total = totalStats?.total ?? 0;
  const ok = totalStats?.ok ?? 0;
  const blocked = totalStats?.blocked ?? 0;
  const okPercent = total > 0 ? Math.round((ok / total) * 100) : 0;
  const blockedPercent = total > 0 ? Math.round((blocked / total) * 100) : 0;

  return (
    <aside className="panel activity-sidebar-panel">
      {/* KPI Activity Summary */}
      <div className="test-conclusion-card">
        <div className="conclusion-head">
          <BarChart3 size={15} className="conclusion-icon" aria-hidden="true" />
          <strong>Activity Summary</strong>
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
      </div>

      {/* Live Event Log Stream */}
      <div className="panel-head log-head">
        <h2>
          <Terminal size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>Live Event Log</span>
        </h2>
        {logs.length > 0 && (
          <button type="button" className="ghost icon-button" onClick={onClear} title="Clear event log">
            <Trash2 size={13} aria-hidden="true" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="side-feed-container">
        {logs.length === 0 ? (
          <div className="feed-empty muted">
            No events yet. Choose a test on the left to start sending requests.
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

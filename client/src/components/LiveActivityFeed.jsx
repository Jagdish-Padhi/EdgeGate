import { BarChart3, CheckCircle2, ShieldAlert, Terminal, Trash2 } from 'lucide-react';

export function LiveActivityFeed({ logs, onClear, totalStats }) {
  const total = totalStats?.total ?? 0;
  const ok = totalStats?.ok ?? 0;
  const blocked = totalStats?.blocked ?? 0;
  const okPercent = total > 0 ? Math.round((ok / total) * 100) : 0;
  const blockedPercent = total > 0 ? Math.round((blocked / total) * 100) : 0;

  return (
    <aside className="panel activity-sidebar-panel">
      {/* 1. TEST CONCLUSION / SUMMARY CARD */}
      <div className="test-conclusion-card">
        <div className="conclusion-head">
          <BarChart3 size={16} className="conclusion-icon" />
          <strong>Test Conclusion & Summary</strong>
        </div>

        <div className="conclusion-metrics">
          <div className="conclusion-metric">
            <span className="metric-label">Total Sent</span>
            <span className="metric-value">{total}</span>
          </div>
          <div className="conclusion-metric ok">
            <span className="metric-label">Admitted</span>
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
                <ShieldAlert size={14} /> Origin protected: {blocked} abusive/excess requests blocked at edge perimeter!
              </span>
            ) : (
              <span className="verdict-text normal">
                <CheckCircle2 size={14} /> All requests stayed safely within global quota.
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. REAL-TIME LOG FEED */}
      <div className="panel-head log-head">
        <div>
          <h2>
            <Terminal size={15} strokeWidth={1.8} aria-hidden="true" />
            Live Activity Feed
          </h2>
          <p className="muted">Per-request decision log</p>
        </div>
        {logs.length > 0 && (
          <button type="button" className="ghost icon-button" onClick={onClear} title="Clear event feed">
            <Trash2 size={13} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="feed-container side-feed-container">
        {logs.length === 0 ? (
          <div className="feed-empty muted">
            No events recorded yet. Click <strong>"Step 1"</strong> or <strong>"Send"</strong> on the left to see decisions recorded here.
          </div>
        ) : (
          <ul className="feed-list">
            {logs.map((item) => (
              <li key={item.id} className={`feed-item ${item.level}`}>
                <span className="feed-time">{item.time}</span>
                <span className={`feed-tag tag-${item.level}`}>{item.region}</span>
                <span className="feed-text">{item.message}</span>
                {item.latency && <span className="feed-latency">{item.latency}ms</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

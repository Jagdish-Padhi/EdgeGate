export function StatusDot({ ok, children }) {
  return <span className={ok ? 'status ok' : 'status bad'}><span className="status-dot" aria-hidden="true" />{children}</span>;
}

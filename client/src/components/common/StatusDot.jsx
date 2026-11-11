export function StatusDot({ ok, children }) {
  return (
    <span className={`status ${ok ? 'ok' : 'bad'}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}


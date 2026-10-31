/** Forwards rejected promises from async route handlers to Express error handling. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Exits the process shortly after replying; used by fault-injection endpoints. */
export function crashHandler(log, name) {
  return (_req, res) => {
    log.warn(`crash requested for ${name}`);
    res.status(202).json({ crashing: true });
    setTimeout(() => process.exit(1), 50);
  };
}

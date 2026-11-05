const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(scope, level = process.env.LOG_LEVEL ?? 'info') {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const emit = (name, message, fields) => {
    if (LEVELS[name] < threshold) return;
    const suffix = fields ? ` ${JSON.stringify(fields)}` : '';
    const output = `${new Date().toISOString()} ${name.padEnd(5)} [${scope}] ${message}${suffix}`;
    (name === 'warn' || name === 'error' ? console.error : console.log)(output);
  };
  return {
    debug: (m, f) => emit('debug', m, f),
    info: (m, f) => emit('info', m, f),
    warn: (m, f) => emit('warn', m, f),
    error: (m, f) => emit('error', m, f),
  };
}

export function errorFields(error) {
  return {
    error: error?.message ?? String(error),
    ...(error?.code ? { code: error.code } : {}),
  };
}

export const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

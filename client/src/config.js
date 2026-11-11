const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

function resolveServiceUrl(envVal, fallback) {
  if (!envVal || envVal.includes('your-') || envVal.includes('example.com')) {
    return fallback;
  }
  return envVal;
}

export const COORDINATOR_URL = resolveServiceUrl(env.VITE_COORDINATOR_URL, 'http://localhost:4000');
export const DEV_CONTROL_URL = resolveServiceUrl(env.VITE_DEV_CONTROL_URL, 'http://localhost:4300');

export const EDGES = [
  { id: 'edge-mumbai', region: 'Mumbai', url: resolveServiceUrl(env.VITE_EDGE_MUMBAI_URL, 'http://localhost:4201') },
  { id: 'edge-frankfurt', region: 'Frankfurt', url: resolveServiceUrl(env.VITE_EDGE_FRANKFURT_URL, 'http://localhost:4202') },
  { id: 'edge-virginia', region: 'Virginia', url: resolveServiceUrl(env.VITE_EDGE_VIRGINIA_URL, 'http://localhost:4203') },
];

export const POLL_INTERVAL_MS = 700;

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

function resolveServiceUrl(envVal, fallback) {
  if (!envVal || envVal.includes('your-') || envVal.includes('example.com')) {
    return fallback;
  }
  return envVal;
}

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const COORDINATOR_URL = resolveServiceUrl(env.VITE_COORDINATOR_URL, isLocal ? 'http://localhost:4000' : 'https://edgegate.onrender.com');
export const ORIGIN_URL = resolveServiceUrl(env.VITE_ORIGIN_URL, isLocal ? 'http://localhost:4100' : 'https://edgegate-origin.onrender.com');
export const DEV_CONTROL_URL = resolveServiceUrl(env.VITE_DEV_CONTROL_URL, isLocal ? 'http://localhost:4300' : 'https://edgegate.onrender.com');

export const EDGES = [
  { id: 'edge-mumbai', region: 'Mumbai', url: resolveServiceUrl(env.VITE_EDGE_MUMBAI_URL, isLocal ? 'http://localhost:4201' : 'https://edgegate-mumbai.onrender.com') },
  { id: 'edge-frankfurt', region: 'Frankfurt', url: resolveServiceUrl(env.VITE_EDGE_FRANKFURT_URL, isLocal ? 'http://localhost:4202' : 'https://edgegate-frankfurt.onrender.com') },
  { id: 'edge-virginia', region: 'Virginia', url: resolveServiceUrl(env.VITE_EDGE_VIRGINIA_URL, isLocal ? 'http://localhost:4203' : 'https://edgegate-virginia.onrender.com') },
];

export const POLL_INTERVAL_MS = 700;

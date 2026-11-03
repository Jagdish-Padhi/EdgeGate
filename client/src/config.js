const env = import.meta.env;

export const COORDINATOR_URL = env.VITE_COORDINATOR_URL || 'http://localhost:4000';
export const DEV_CONTROL_URL = env.VITE_DEV_CONTROL_URL || 'http://localhost:4300';

export const EDGES = [
  { id: 'edge-mumbai', region: 'Mumbai', url: env.VITE_EDGE_MUMBAI_URL || 'http://localhost:4201' },
  { id: 'edge-frankfurt', region: 'Frankfurt', url: env.VITE_EDGE_FRANKFURT_URL || 'http://localhost:4202' },
  { id: 'edge-virginia', region: 'Virginia', url: env.VITE_EDGE_VIRGINIA_URL || 'http://localhost:4203' },
];

export const POLL_INTERVAL_MS = 700;

import { useEffect, useState, useRef } from 'react';
import {
  Check,
  Database,
  Loader2,
  MapPin,
  Server,
  ArrowRight,
  Activity,
  Radio,
} from 'lucide-react';
import { COORDINATOR_URL, ORIGIN_URL, EDGES } from '../../config.js';

const SERVICES = [
  {
    id: 'coordinator',
    name: 'Central Coordinator',
    role: 'Global Lease & Sync Engine',
    url: `${COORDINATOR_URL}/health`,
    displayUrl: COORDINATOR_URL.replace(/^https?:\/\//, ''),
    icon: Database,
  },
  {
    id: 'origin',
    name: 'Origin Gateway',
    role: 'Backend Protected Upstream API',
    url: `${ORIGIN_URL}/health`,
    displayUrl: ORIGIN_URL.replace(/^https?:\/\//, ''),
    icon: Server,
  },
  {
    id: 'mumbai',
    name: 'Mumbai Regional Node',
    role: 'Asia-South Edge Enforcer',
    url: `${EDGES[0]?.url || 'https://edgegate-mumbai.onrender.com'}/_edge/state`,
    displayUrl: (EDGES[0]?.url || '').replace(/^https?:\/\//, ''),
    icon: MapPin,
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt Regional Node',
    role: 'Europe-Central Edge Enforcer',
    url: `${EDGES[1]?.url || 'https://edgegate-frankfurt.onrender.com'}/_edge/state`,
    displayUrl: (EDGES[1]?.url || '').replace(/^https?:\/\//, ''),
    icon: MapPin,
  },
  {
    id: 'virginia',
    name: 'Virginia Regional Node',
    role: 'US-East Edge Enforcer',
    url: `${EDGES[2]?.url || 'https://edgegate-virginia.onrender.com'}/_edge/state`,
    displayUrl: (EDGES[2]?.url || '').replace(/^https?:\/\//, ''),
    icon: MapPin,
  },
];

export function WarmupModal({ isOpen, onComplete }) {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(
      SERVICES.map((s) => [s.id, { status: 'waking', latency: null, attempts: 1 }])
    )
  );

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const abortCtrl = new AbortController();

    async function pingService(service) {
      let attempts = 0;
      while (isMountedRef.current && !abortCtrl.signal.aborted) {
        attempts += 1;
        const start = performance.now();
        try {
          const timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined;
          let isAlive = false;
          try {
            const res = await fetch(service.url, {
              signal: timeoutSignal,
              headers: { accept: 'application/json' },
            });
            if (res.ok) {
              isAlive = true;
            }
          } catch {
            // If standard fetch failed due to CORS policy (e.g. Origin server lacking CORS headers),
            // fallback to mode: 'no-cors' ping. If the server is up and responding, it returns an opaque response.
            try {
              const resNoCors = await fetch(service.url, {
                mode: 'no-cors',
                signal: timeoutSignal,
              });
              if (resNoCors.type === 'opaque' || resNoCors.ok) {
                isAlive = true;
              }
            } catch {
              // Server is still booting / connection refused
            }
          }

          if (isAlive) {
            const latency = Math.round(performance.now() - start);
            if (isMountedRef.current) {
              setStatuses((prev) => ({
                ...prev,
                [service.id]: { status: 'ready', latency, attempts },
              }));
            }
            return;
          }
        } catch {
          // Cold start boot in progress
        }

        if (isMountedRef.current) {
          setStatuses((prev) => ({
            ...prev,
            [service.id]: { status: 'waking', latency: null, attempts },
          }));
        }

        // Wait 2.2s before next retry loop for this service
        await new Promise((resolve) => setTimeout(resolve, 2200));
      }
    }

    // Ping all 5 services concurrently
    SERVICES.forEach((service) => {
      void pingService(service);
    });

    return () => {
      isMountedRef.current = false;
      abortCtrl.abort();
    };
  }, []);

  if (!isOpen) return null;

  const readyCount = Object.values(statuses).filter((s) => s.status === 'ready').length;
  const allReady = readyCount === SERVICES.length;
  const progressPercent = Math.round((readyCount / SERVICES.length) * 100);

  return (
    <div className="modal-backdrop warmup-backdrop" role="dialog" aria-modal="true" aria-labelledby="warmup-title">
      <div className="modal-card warmup-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="warmup-head">
          <div className="warmup-badge-icon">
            <Radio size={20} className={allReady ? 'pulse-done' : 'spin-slow'} aria-hidden="true" />
          </div>
          <div className="warmup-title-wrap">
            <h3 id="warmup-title" className="warmup-title">
              {allReady ? 'All instances are awake & ready' : 'Waking up servers...'}
            </h3>
            <p className="warmup-prompt">
              {allReady
                ? 'All 5 cloud services responded. Central coordinator, origin and edge nodes are in sync.'
                : 'Render free tier instances spin down after inactivity. Sending wake-up pings to warm up cold starts...'}
            </p>
          </div>
        </div>

        {/* Progress Bar Strip */}
        <div className="warmup-progress-wrap">
          <div className="warmup-progress-info">
            <span className="warmup-progress-label">Fleet Status</span>
            <span className="warmup-progress-stat">
              <strong>{readyCount}</strong> of {SERVICES.length} online ({progressPercent}%)
            </span>
          </div>
          <div className="warmup-progress-track">
            <div
              className={`warmup-progress-fill ${allReady ? 'fill-done' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 5 Services Live Checklist */}
        <div className="warmup-services-list">
          {SERVICES.map((service) => {
            const st = statuses[service.id] || { status: 'waking', latency: null, attempts: 1 };
            const isReady = st.status === 'ready';
            const Icon = service.icon;

            return (
              <div
                key={service.id}
                className={`warmup-service-row ${isReady ? 'service-ready' : 'service-waking'}`}
              >
                <div className="service-row-left">
                  <div className={`service-icon-box ${isReady ? 'icon-ready' : ''}`}>
                    <Icon size={15} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="service-text-wrap">
                    <div className="service-name-row">
                      <strong className="service-name">{service.name}</strong>
                      <span className="service-role-tag">{service.role}</span>
                    </div>
                    <span className="service-url">{service.displayUrl}</span>
                  </div>
                </div>

                <div className="service-row-right">
                  {isReady ? (
                    <div className="status-pill ready-pill animate-pop-in">
                      <Check size={14} className="check-icon" strokeWidth={2.8} aria-hidden="true" />
                      <span className="status-label">Online</span>
                      {st.latency !== null && (
                        <span className="latency-label">{st.latency}ms</span>
                      )}
                    </div>
                  ) : (
                    <div className="status-pill waking-pill">
                      <Loader2 size={13} className="spin" aria-hidden="true" />
                      <span className="status-label">Waking up...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action */}
        <div className="warmup-footer">
          <button
            type="button"
            className={`button primary warmup-action-btn ${allReady ? 'btn-ready' : 'btn-waiting'}`}
            disabled={!allReady}
            onClick={onComplete}
          >
            {allReady ? (
              <>
                <span>Let's Start!</span>
                <ArrowRight size={15} aria-hidden="true" />
              </>
            ) : (
              <>
                <Loader2 size={14} className="spin" aria-hidden="true" />
                <span>Waking up services ({readyCount}/5)...</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { getJson, postQuietly } from './api/http.js';
import { COORDINATOR_URL, EDGES, POLL_INTERVAL_MS } from './config.js';
import {
  EdgeCard,
  GlobalUsage,
  TrafficPanel,
  VisualPipeline,
  LiveActivityFeed,
  TheoryGuide,
  SettingsPanel,
  ErrorBoundary,
} from './components/index.js';
import { usePolling } from './hooks/usePolling.js';
import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  RotateCcw,
  Settings2,
} from 'lucide-react';

async function loadEdges() {
  return Promise.all(
    EDGES.map((edge) =>
      getJson(`${edge.url}/_edge/state`)
        .then((state) => ({ ...edge, online: true, state }))
        .catch(() => ({ ...edge, online: false, state: null }))
    )
  );
}

function getAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  return AudioContextConstructor ? new AudioContextConstructor() : null;
}

/** Audio feedback beep for simulation events (lower pitch for 429 blocked, bright tone for 200 allowed) */
function playEdgeAlert(audioContext, blocked) {
  if (!audioContext) return;

  const startAt = Math.max(audioContext.currentTime, 0.001) + 0.005;
  const firstTone = blocked ? 460 : 760;
  const secondTone = blocked ? 310 : 540;
  const toneLength = 0.09;
  const gap = 0.045;
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(firstTone, startAt);
  oscillator.frequency.setValueAtTime(secondTone, startAt + toneLength + gap);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.24, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + toneLength * 2 + gap);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + toneLength * 2 + gap);
}

export function App() {
  const [view, setView] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#theory' || hash === '#guide') return 'theory';
    if (hash === '#settings') return 'settings';
    return 'console'; // Tool opens directly in gateway console
  });

  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [lastResetAt, setLastResetAt] = useState(Date.now());
  const [settingsResetKey, setSettingsResetKey] = useState(0);
  const [theoryResetKey, setTheoryResetKey] = useState(0);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#theory' || hash === '#guide') {
        setView('theory');
      } else if (hash === '#settings') {
        setView('settings');
      } else {
        setView('console');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Close reset confirmation modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showResetModal) {
        setShowResetModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetModal]);

  const navigateTo = (newView) => {
    if (newView === 'theory') {
      window.location.hash = '#guide';
      setView('theory');
    } else if (newView === 'settings') {
      window.location.hash = '#settings';
      setView('settings');
    } else {
      window.location.hash = '#lab';
      setView('console');
    }
  };

  // Polling for edges across the platform
  const [polledEdges, refreshEdges] = usePolling(loadEdges, POLL_INTERVAL_MS);
  const edges = polledEdges ?? EDGES.map((edge) => ({ ...edge, online: false }));

  async function handleExecuteReset() {
    if (resetting) return;
    setResetting(true);
    try {
      if (view === 'settings') {
        // Trigger settings reset to factory defaults
        setSettingsResetKey(Date.now());
      } else if (view === 'theory') {
        // Reset test scenarios and coordinator/edge node state
        setTheoryResetKey(Date.now());
        await postQuietly(`${COORDINATOR_URL}/admin/reset`);
        await Promise.all(EDGES.map((edge) => postQuietly(`${edge.url}/_edge/reset`)));
        setLastResetAt(Date.now());
        await refreshEdges();
      } else {
        // Console view: reset gateway coordinator and all regional edge nodes
        await postQuietly(`${COORDINATOR_URL}/admin/reset`);
        await Promise.all(EDGES.map((edge) => postQuietly(`${edge.url}/_edge/reset`)));
        setLastResetAt(Date.now());
        await refreshEdges();
      }
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  }

  return (
    <div className="site-shell">
      <Navbar
        view={view}
        onNavigate={navigateTo}
        onRequestReset={() => setShowResetModal(true)}
        resetting={resetting}
      />

      <ErrorBoundary>
        {view === 'console' && (
          <Console
            edges={edges}
            refreshEdges={refreshEdges}
            lastResetAt={lastResetAt}
          />
        )}

        {view === 'theory' && (
          <TheoryGuide
            resetKey={theoryResetKey}
            onOpenConsole={() => navigateTo('console')}
          />
        )}

        {view === 'settings' && (
          <SettingsPanel
            edges={edges}
            coordinatorUrl={COORDINATOR_URL}
            resetKey={settingsResetKey}
          />
        )}
      </ErrorBoundary>

      <ResetConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleExecuteReset}
        resetting={resetting}
        view={view}
      />
    </div>
  );
}

function ResetConfirmModal({ isOpen, onClose, onConfirm, resetting, view }) {
  if (!isOpen) return null;

  const contentMap = {
    console: {
      title: 'Reset Virtual Lab State?',
      prompt: 'Are you sure you want to reset the Virtual Lab? This will clear all traffic counters, active regional leases, and reset edge nodes to a clean state.',
      actionText: 'Reset Lab',
    },
    theory: {
      title: 'Reset Guide Progress?',
      prompt: 'Are you sure you want to reset? This will reset your active guide section to General Terminology and clear active gateway counters.',
      actionText: 'Reset Guide',
    },
    settings: {
      title: 'Reset Configuration to Defaults?',
      prompt: 'Are you sure you want to reset all rate limit policies and network emulation parameters back to system factory defaults?',
      actionText: 'Reset Settings',
    },
  };

  const current = contentMap[view] || contentMap.console;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-icon-badge">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <div className="modal-title-wrap">
            <h3 id="reset-modal-title">{current.title}</h3>
            <p className="modal-prompt">{current.prompt}</p>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={resetting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button danger reset-confirm-btn"
            onClick={onConfirm}
            disabled={resetting}
          >
            <RotateCcw size={14} className={resetting ? 'spin' : ''} aria-hidden="true" />
            <span>{resetting ? 'Resetting...' : current.actionText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Navbar({
  view,
  onNavigate,
  onRequestReset,
  resetting,
}) {
  const resetLabels = {
    console: 'Reset Lab',
    theory: 'Reset Guide',
    settings: 'Reset Settings',
  };

  return (
    <header className="site-header">
      <nav className="navbar full-navbar" aria-label="Primary navigation">
        <button
          type="button"
          className="brand-button"
          onClick={() => onNavigate('console')}
          title="EdgeGate Virtual Lab"
        >
          <span className="brand-title">EdgeGate</span>
          <span className="brand-subtitle">Distributed Gateway Engine</span>
        </button>

        <div className="nav-links">
          <button
            type="button"
            className={`nav-tab-btn ${view === 'console' ? 'active' : ''}`}
            onClick={() => onNavigate('console')}
          >
            <FlaskConical size={15} aria-hidden="true" />
            <span>Virtual Lab</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${view === 'theory' ? 'active' : ''}`}
            onClick={() => onNavigate('theory')}
          >
            <BookOpen size={15} aria-hidden="true" />
            <span>Guide</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${view === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
          >
            <Settings2 size={15} aria-hidden="true" />
            <span>Configuration</span>
          </button>

          {/* Reset button consistently visible on ALL screens */}
          <button
            type="button"
            className="nav-button reset-button"
            onClick={onRequestReset}
            disabled={resetting}
            title={`Reset ${view === 'settings' ? 'configuration policies to defaults' : view === 'theory' ? 'verification scenarios' : 'gateway counters and node leases'}`}
          >
            <RotateCcw
              size={14}
              className={resetting ? 'spin' : ''}
              aria-hidden="true"
            />
            <span>{resetting ? 'Resetting...' : (resetLabels[view] || 'Reset')}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

function Console({
  edges,
  refreshEdges,
  lastResetAt,
}) {
  const keys = [
    ...new Set(edges.flatMap((edge) => edge.state?.keys.map((key) => key.key) ?? [])),
  ];

  const [lastEvent, setLastEvent] = useState(null);
  const [activeEdgeId, setActiveEdgeId] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [totalStats, setTotalStats] = useState({ total: 0, ok: 0, blocked: 0 });
  const [running, setRunning] = useState(false);
  const [simulationState, setSimulationState] = useState('idle');
  const [trafficConfig, setTrafficConfig] = useState({
    client: 'free',
    target: 'all',
    count: 30,
  });

  const triggerRef = useRef(null);
  const audioContextRef = useRef(null);
  const lastAlertAtRef = useRef(0);

  useEffect(() => {
    const warmAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = getAudioContext();
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch((error) => {
          console.warn('Edge alert sound is unavailable:', error);
        });
      }
    };

    window.addEventListener('pointerdown', warmAudio, { once: true });
    window.addEventListener('keydown', warmAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', warmAudio);
      window.removeEventListener('keydown', warmAudio);
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    setActivityLogs([]);
    setLastEvent(null);
    setActiveEdgeId(null);
    setTotalStats({ total: 0, ok: 0, blocked: 0 });
    setRunning(false);
    setSimulationState('idle');
  }, [lastResetAt]);

  const handleRequestDone = (evt) => {
    setLastEvent(evt);
    setActiveEdgeId(evt.edgeId);

    // Audio feedback alert beep (preserved)
    const now = performance.now();
    if (now - lastAlertAtRef.current >= 140) {
      lastAlertAtRef.current = now;
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = getAudioContext();
        }
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch((error) => {
            console.warn('Edge alert sound is unavailable:', error);
          });
        }
        playEdgeAlert(audioContextRef.current, evt.status === 429);
      } catch (error) {
        console.warn('Edge alert sound is unavailable:', error);
      }
    }

    setTotalStats((prev) => ({
      total: prev.total + 1,
      ok: prev.ok + (evt.status === 200 ? 1 : 0),
      blocked: prev.blocked + (evt.status === 429 ? 1 : 0),
    }));

    setTimeout(() => {
      setActiveEdgeId((current) => (current === evt.edgeId ? null : current));
    }, 600);

    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const level = evt.status === 200 ? 'ok' : evt.status === 429 ? 'blocked' : 'warn';
    const message = `${evt.method} ${evt.path}`;
    const outcome = evt.status ? `${evt.status} ${evt.decision}` : evt.decision;

    setActivityLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time,
        region: evt.edgeRegion,
        message,
        outcome,
        level,
        latency: evt.latency,
      },
      ...prev.slice(0, 49),
    ]);
  };

  return (
    <main className="page console modern-3col-console" id="console">
      <div className="console-layout">
        {/* Left Column: Traffic Generator */}
        <div className="console-sidebar left-sidebar">
          <TrafficPanel
            onRequestDone={handleRequestDone}
            running={running}
            setRunning={setRunning}
            trafficConfig={trafficConfig}
            setTrafficConfig={setTrafficConfig}
            triggerRef={triggerRef}
            simulationState={simulationState}
            setSimulationState={setSimulationState}
            onImmediateRefresh={refreshEdges}
            onResetTotals={() => setTotalStats({ total: 0, ok: 0, blocked: 0 })}
            lastResetAt={lastResetAt}
          />
        </div>

        {/* Center Column: Pipeline, Coordinator Pool & 3 Regional Edges Triad */}
        <div className="console-center">
          <VisualPipeline lastEvent={lastEvent} edges={edges} running={running} />

          <GlobalUsage keys={keys} coordinatorUrl={COORDINATOR_URL} lastEvent={lastEvent} />

          <div className="matrix-triad">
            {edges.map((edge) => (
              <EdgeCard
                key={edge.id}
                edge={edge}
                activeEdgeId={activeEdgeId}
                lastDecision={lastEvent}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Live Telemetry Feed */}
        <div className="console-sidebar right-sidebar">
          <LiveActivityFeed
            logs={activityLogs}
            onClear={() => setActivityLogs([])}
            totalStats={totalStats}
          />
        </div>
      </div>
    </main>
  );
}

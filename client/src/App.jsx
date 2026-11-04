import { useEffect, useRef, useState } from 'react';
import { getJson, postQuietly } from './api/http.js';
import { COORDINATOR_URL, EDGES, POLL_INTERVAL_MS } from './config.js';
import { EdgeCard } from './components/EdgeCard.jsx';
import { GlobalUsage } from './components/GlobalUsage.jsx';
import { CLIENTS, TrafficPanel } from './components/TrafficPanel.jsx';
import { usePolling } from './hooks/usePolling.js';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { DecisionChart } from './components/DecisionChart.jsx';
import { VisualPipeline } from './components/VisualPipeline.jsx';
import { LiveActivityFeed } from './components/LiveActivityFeed.jsx';
import { TheoryGuide } from './components/TheoryGuide.jsx';
import { BookOpen, Eye, EyeOff, RotateCcw, Settings2, Sparkles, X } from 'lucide-react';

async function loadEdges() {
  return Promise.all(
    EDGES.map((edge) =>
      getJson(`${edge.url}/_edge/state`)
        .then((state) => ({ ...edge, online: true, state }))
        .catch(() => ({ ...edge, online: false, state: null }))
    )
  );
}

export function App() {
  const [view, setView] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#theory') return 'theory';
    if (hash === '#console') return 'console';
    return 'console';
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastResetAt, setLastResetAt] = useState(Date.now());

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#theory') setView('theory');
      else if (hash === '#console') setView('console');
      else setView('console');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  async function handleGlobalReset() {
    if (resetting) return;
    setResetting(true);
    try {
      await postQuietly(`${COORDINATOR_URL}/admin/reset`);
      await Promise.all(EDGES.map((edge) => postQuietly(`${edge.url}/_edge/reset`)));
      setLastResetAt(Date.now());
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="site-shell">
      <Navbar
        view={view}
        setView={setView}
        settingsOpen={settingsOpen}
        onSettings={() => setSettingsOpen((open) => !open)}
        onReset={handleGlobalReset}
        resetting={resetting}
      />

      {view === 'theory' && <TheoryGuide />}
      {view === 'console' && (
        <Console
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          onReset={handleGlobalReset}
          resetting={resetting}
          lastResetAt={lastResetAt}
        />
      )}

      <Footer setView={setView} />
    </div>
  );
}

function Navbar({ view, setView, onSettings, settingsOpen, onReset, resetting }) {
  return (
    <header className="site-header">
      <nav className="navbar full-navbar" aria-label="Primary navigation">
        <a className="brand" href="#console" onClick={() => setView('console')}>
          EdgeGate <span>Distributed rate limiting</span>
        </a>

        <div className="nav-links">
          <button
            type="button"
            className={`nav-tab-btn ${view === 'console' ? 'active' : ''}`}
            onClick={() => {
              window.location.hash = '#console';
              setView('console');
            }}
          >
            <Sparkles size={14} /> Live Simulation
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${view === 'theory' ? 'active' : ''}`}
            onClick={() => {
              window.location.hash = '#theory';
              setView('theory');
            }}
          >
            <BookOpen size={14} /> Theory & Guide
          </button>

          <button
            type="button"
            className="nav-button reset-button"
            onClick={onReset}
            disabled={resetting}
            title="Reset all edge caches and coordinator usage for a clean simulation"
          >
            <RotateCcw size={14} className={resetting ? 'spin' : ''} aria-hidden="true" />
            {resetting ? 'Resetting...' : 'Reset simulation'}
          </button>

          <button
            type="button"
            className={`nav-button icon-button ${settingsOpen ? 'active' : ''}`}
            onClick={onSettings}
            aria-pressed={settingsOpen}
            title="Configure rate limits, tier quotas, and network latency"
          >
            {settingsOpen ? <X size={15} aria-hidden="true" /> : <Settings2 size={15} aria-hidden="true" />}
            {settingsOpen ? 'Close Settings' : 'Settings'}
          </button>
        </div>
      </nav>
    </header>
  );
}

function Console({ settingsOpen, setSettingsOpen, onReset, resetting, lastResetAt }) {
  const [polledEdges, refreshEdges] = usePolling(loadEdges, POLL_INTERVAL_MS);
  const edges = polledEdges ?? EDGES.map((edge) => ({ ...edge, online: false }));
  const keys = [...new Set(edges.flatMap((edge) => edge.state?.keys.map((key) => key.key) ?? []))];

  const [lastEvent, setLastEvent] = useState(null);
  const [activeEdgeId, setActiveEdgeId] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [totalStats, setTotalStats] = useState({ total: 0, ok: 0, blocked: 0 });
  const [running, setRunning] = useState(false);
  const [simulationState, setSimulationState] = useState('idle');
  const [trafficConfig, setTrafficConfig] = useState({ client: 'free', target: 'all', count: 30 });
  const [showInspector, setShowInspector] = useState(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    setActivityLogs([]);
    setLastEvent(null);
    setActiveEdgeId(null);
    setTotalStats({ total: 0, ok: 0, blocked: 0 });
  }, [lastResetAt]);

  const handleRequestDone = (evt) => {
    setLastEvent(evt);
    setActiveEdgeId(evt.edgeId);

    setTotalStats((prev) => ({
      total: prev.total + 1,
      ok: prev.ok + (evt.status === 200 ? 1 : 0),
      blocked: prev.blocked + (evt.status === 429 ? 1 : 0),
    }));

    setTimeout(() => {
      setActiveEdgeId((current) => (current === evt.edgeId ? null : current));
    }, 600);

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const level = evt.status === 200 ? 'ok' : evt.status === 429 ? 'blocked' : 'warn';
    const message = `${evt.method} ${evt.path} → ${evt.status} ${evt.decision}`;

    setActivityLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time,
        region: evt.edgeRegion,
        message,
        level,
        latency: evt.latency,
      },
      ...prev.slice(0, 49),
    ]);
  };

  return (
    <main className="page console modern-3col-console" id="console">
      {settingsOpen && (
        <SettingsPanel
          edges={edges}
          coordinatorUrl={COORDINATOR_URL}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* 3-COLUMN COCKPIT LAYOUT */}
      <div className="cockpit-layout">
        {/* LEFT COLUMN: Full Height Traffic Controller Sidebar */}
        <div className="cockpit-sidebar left-sidebar">
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
          />
        </div>

        {/* CENTER COLUMN: Top Visual Pipeline + Below 2x2 Matrix */}
        <div className="cockpit-center">
          {/* Top: State / Request Narrative & Flow Component */}
          <VisualPipeline lastEvent={lastEvent} edges={edges} />

          {/* Below: 2x2 Matrix (Mumbai, Frankfurt, Virginia, Global Quota Pool) */}
          <div className="matrix-2x2">
            {edges[0] && (
              <EdgeCard
                key={edges[0].id}
                edge={edges[0]}
                activeEdgeId={activeEdgeId}
                lastDecision={lastEvent}
              />
            )}

            {edges[1] && (
              <EdgeCard
                key={edges[1].id}
                edge={edges[1]}
                activeEdgeId={activeEdgeId}
                lastDecision={lastEvent}
              />
            )}

            {edges[2] && (
              <EdgeCard
                key={edges[2].id}
                edge={edges[2]}
                activeEdgeId={activeEdgeId}
                lastDecision={lastEvent}
              />
            )}

            {/* Matrix Slot 4: Global Shared Quota Pool */}
            <GlobalUsage keys={keys} coordinatorUrl={COORDINATOR_URL} />
          </div>
        </div>

        {/* RIGHT COLUMN: Full Height Test Conclusion & Activity Feed */}
        <div className="cockpit-sidebar right-sidebar">
          <LiveActivityFeed
            logs={activityLogs}
            onClear={() => setActivityLogs([])}
            totalStats={totalStats}
          />
        </div>
      </div>

      {/* ADVANCED CHART TOGGLE (AT BOTTOM) */}
      <div className="inspector-toggle-bar">
        <button
          type="button"
          className="ghost icon-button"
          onClick={() => setShowInspector((prev) => !prev)}
        >
          {showInspector ? <EyeOff size={14} /> : <Eye size={14} />}
          {showInspector ? 'Hide Decision Rate Chart' : 'Show Advanced Decision Rate Chart'}
        </button>
      </div>

      {showInspector && <DecisionChart edges={edges} />}
    </main>
  );
}

function Footer({ setView }) {
  return (
    <footer className="footer full-footer">
      <a className="brand" href="#console" onClick={() => setView('console')}>
        EdgeGate
      </a>
      <span>Edge-based distributed rate limiting</span>
      <span className="footer-meta">MongoDB-backed coordinator</span>
    </footer>
  );
}

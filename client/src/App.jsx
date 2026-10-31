import { useEffect, useState } from 'react';
import { getJson } from './api/http.js';
import { COORDINATOR_URL, EDGES, POLL_INTERVAL_MS } from './config.js';
import { EdgeCard } from './components/EdgeCard.jsx';
import { GlobalUsage } from './components/GlobalUsage.jsx';
import { RulesPanel } from './components/RulesPanel.jsx';
import { TrafficPanel } from './components/TrafficPanel.jsx';
import { usePolling } from './hooks/usePolling.js';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { Globe2, Network, Settings2, ShieldCheck, X } from 'lucide-react';

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
  const [view, setView] = useState(() => window.location.hash === '#console' ? 'console' : 'landing');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setView(window.location.hash === '#console' ? 'console' : 'landing');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="site-shell">
      <Navbar view={view} settingsOpen={settingsOpen} onSettings={() => setSettingsOpen((open) => !open)} />
      {view === 'console' ? <Console settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} /> : <Landing />}
      <Footer />
    </div>
  );
}

function Navbar({ view, onSettings, settingsOpen }) {
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <a className="brand" href="#overview">EdgeGate <span>Distributed rate limiting</span></a>
      <div className="nav-links">
        {view === 'landing' ? (
          <>
            <a href="#overview">Overview</a>
            <a href="#how-it-works">How it works</a>
            <a className="nav-cta" href="#console">Open console</a>
          </>
        ) : (
          <>
            <a href="#console">Console</a>
            <a href="#traffic">Traffic</a>
            <a href="#limits">Limits</a>
            <button type="button" className="nav-button icon-button" onClick={onSettings} aria-pressed={settingsOpen}>
              {settingsOpen ? <X size={15} aria-hidden="true" /> : <Settings2 size={15} aria-hidden="true" />}
              {settingsOpen ? 'Close settings' : 'Settings'}
            </button>
            <a className="nav-cta" href="#overview">Product overview</a>
          </>
        )}
      </div>
    </nav>
  );
}

function Landing() {
  return (
    <main className="landing">
      <section className="landing-hero" id="overview">
        <div className="hero-copy-block">
          <p className="eyebrow">For APIs serving users in many regions</p>
          <h1>Protect one shared API limit across every region.</h1>
          <p className="hero-lead">When traffic arrives from Mumbai, Frankfurt, and Virginia, EdgeGate lets each region decide quickly while making sure one busy region cannot spend everyone’s quota.</p>
          <div className="hero-actions">
            <a className="button primary" href="#console">Open live console</a>
            <a className="text-link" href="#how-it-works">See how it works <span>→</span></a>
          </div>
        </div>
        <div className="hero-visual" aria-label="EdgeGate request and synchronization flow">
          <div className="visual-label">A request from a user’s point of view</div>
          <div className="architecture-flow">
            <div className="architecture-row">
              <div className="architecture-node client-node">
                <span className="node-kicker">User request</span>
                <strong>Any region</strong>
                <small>Orders, login, weather</small>
              </div>
              <span className="flow-arrow">→</span>
              <div className="architecture-node edge-node">
                <span className="node-kicker">Checks nearby</span>
                <strong>EdgeGate</strong>
                <small>Mumbai · Frankfurt · Virginia</small>
              </div>
              <span className="flow-arrow">→</span>
              <div className="architecture-node origin-node">
                <span className="node-kicker">If allowed</span>
                <strong>Your API</strong>
                <small>Receives the request</small>
              </div>
            </div>
            <div className="sync-path">
              <span className="sync-line" />
              <span className="sync-label">Regions share usage in the background</span>
              <span className="sync-line" />
            </div>
            <div className="architecture-node coordinator-node">
              <span className="node-kicker">Keeps it fair</span>
              <strong>Shared quota</strong>
              <small>One limit across all regions</small>
            </div>
          </div>
          <div className="visual-caption">Fast local checks, one fair global limit.</div>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="features-title">
        <div className="section-heading">
          <p className="eyebrow">Why use it</p>
          <h2 id="features-title">The problem it solves.</h2>
          <p>One API limit should behave like one limit, wherever requests arrive from.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-top"><Globe2 className="feature-icon" size={18} strokeWidth={1.8} aria-hidden="true" /><span className="feature-mark">Protect</span></div>
            <h3>Stop abusive bursts</h3>
            <p>Limit repeated requests before they reach your API and consume origin capacity.</p>
          </article>
          <article className="feature-card">
            <div className="feature-top"><Network className="feature-icon" size={18} strokeWidth={1.8} aria-hidden="true" /><span className="feature-mark">Stay fast</span></div>
            <h3>Decide near the user</h3>
            <p>Each region checks traffic from local memory instead of waiting on a central call for every request.</p>
          </article>
          <article className="feature-card">
            <div className="feature-top"><ShieldCheck className="feature-icon" size={18} strokeWidth={1.8} aria-hidden="true" /><span className="feature-mark">Stay fair</span></div>
            <h3>Share one global budget</h3>
            <p>Capacity moves toward the region that needs it while all regions remain under the same limit.</p>
          </article>
        </div>
      </section>

      <section className="principles" id="how-it-works">
        <div className="section-intro">
          <p className="eyebrow">How a request is handled</p>
          <h2>Simple for callers. Coordinated behind the scenes.</h2>
          <p>The user gets a quick response. The system keeps the regional budgets aligned in the background.</p>
        </div>
        <div className="principle-grid">
          <article>
            <h3>A request arrives</h3>
            <p>The nearest EdgeGate node checks whether this caller still has room in the shared limit.</p>
          </article>
          <article>
            <h3>The edge decides</h3>
            <p>Allowed requests continue to your API. Blocked requests receive a clear rate-limit response.</p>
          </article>
          <article>
            <h3>Regions reconcile</h3>
            <p>Edges report usage in batches and receive fresh shares, so busy regions can use available capacity.</p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <p className="eyebrow">Try the example</p>
          <h2>Send traffic and watch the shared limit move.</h2>
        </div>
        <a className="button primary" href="#console">Open live console <span>→</span></a>
      </section>
    </main>
  );
}

function Console({ settingsOpen, setSettingsOpen }) {
  const edges = usePolling(loadEdges, POLL_INTERVAL_MS) ?? EDGES.map((edge) => ({ ...edge, online: false }));

  const keys = [...new Set(edges.flatMap((edge) => edge.state?.keys.map((key) => key.key) ?? []))];

  return (
    <main className="page console" id="console">
      {settingsOpen && <SettingsPanel edges={edges} onClose={() => setSettingsOpen(false)} />}
      <section className="edge-grid" aria-label="Edge nodes">
        {edges.map((edge) => (
          <EdgeCard key={edge.id} edge={edge} />
        ))}
      </section>

      <div className="two-column">
        <GlobalUsage keys={keys} coordinatorUrl={COORDINATOR_URL} />
        <div id="traffic"><TrafficPanel /></div>
      </div>

      <div id="limits"><RulesPanel coordinatorUrl={COORDINATOR_URL} /></div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <a className="brand" href="#overview">EdgeGate</a>
      <span>Edge-based distributed rate limiting</span>
      <span className="footer-meta">Group 12 · Systems design project</span>
    </footer>
  );
}

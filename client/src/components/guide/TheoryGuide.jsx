import { useEffect, useState } from 'react';
import { GeneralDeepDive } from './GeneralDeepDive.jsx';
import { AlgorithmsDeepDive } from './AlgorithmsDeepDive.jsx';
import { ArchitectureDeepDive } from './ArchitectureDeepDive.jsx';
import { CoordinationDeepDive } from './CoordinationDeepDive.jsx';
import { ChaosDeepDive } from './ChaosDeepDive.jsx';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  Globe2,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const GENERAL_SUB_ITEMS = [
  { id: 'overview', label: 'All Concepts Overview' },
  { id: 'rate-limiting', label: '1. Rate Limiting Architecture' },
  { id: 'throttling', label: '2. Throttling & HTTP 429' },
  { id: 'api-gateway', label: '3. API Gateway Perimeter' },
  { id: 'latency', label: '4. Latency (LAN vs WAN)' },
  { id: 'jitter', label: '5. Network Jitter' },
  { id: 'cap-theorem', label: '6. CAP Theorem Trade-Offs' },
];

const ALGO_SUB_ITEMS = [
  { id: 'overview', label: 'Comparative Matrix' },
  { id: 'fixed-window', label: '1. Fixed Window' },
  { id: 'sliding-log', label: '2. Sliding Window Log' },
  { id: 'sliding-counter', label: '3. Sliding Window Counter' },
  { id: 'token-bucket', label: '4. Token Bucket (Standard)' },
  { id: 'leaky-bucket', label: '5. Leaky Bucket' },
  { id: 'distributed-lease', label: '6. Distributed Leases' },
];

const ARCH_SUB_ITEMS = [
  { id: 'overview', label: 'Dual-Plane Architecture' },
  { id: 'data-plane', label: '1. Data Plane (Fast Path · <1ms)' },
  { id: 'control-plane', label: '2. Control Plane (Slow Path · 1s)' },
  { id: 'sync-pipeline', label: '3. Synchronization Pipeline' },
];

const COORD_SUB_ITEMS = [
  { id: 'overview', label: 'Consensus Overview' },
  { id: 'lease-contract', label: '1. Quota Lease Contract' },
  { id: 'dynamic-migration', label: '2. Dynamic Quota Migration' },
  { id: 'idempotent-sync', label: '3. Idempotent Sync Protocol' },
];

const CHAOS_SUB_ITEMS = [
  { id: 'overview', label: 'Chaos Matrix Overview' },
  { id: 'partition', label: '1. Network Partition (Fallback)' },
  { id: 'dropped-replies', label: '2. Dropped Replies (Packet Loss)' },
  { id: 'latency-jitter', label: '3. WAN Latency & Jitter' },
  { id: 'process-crash', label: '4. Process Crash & Epoch Healing' },
];

export function TheoryGuide({ resetKey }) {
  // Active selection: 'general' | 'algorithms' | 'architecture' | 'coordination' | 'chaos' | 'scenario-1' .. 'scenario-5'
  const [activeTab, setActiveTab] = useState('general');
  const [selectedGeneral, setSelectedGeneral] = useState('overview');
  const [selectedAlgo, setSelectedAlgo] = useState('overview');
  const [selectedArch, setSelectedArch] = useState('overview');
  const [selectedCoord, setSelectedCoord] = useState('overview');
  const [selectedChaos, setSelectedChaos] = useState('overview');
  const [theoryOpen, setTheoryOpen] = useState(true);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);

  useEffect(() => {
    if (resetKey) {
      setActiveTab('general');
      setSelectedGeneral('overview');
      setSelectedAlgo('overview');
      setSelectedArch('overview');
      setSelectedCoord('overview');
      setSelectedChaos('overview');
      setSelectedScenarioIndex(0);
    }
  }, [resetKey]);

  const scenarios = [
    {
      id: 'scenario-1',
      title: 'Scenario 1: Token Bucket Burst Throttling',
      category: 'Token Bucket & Sliding Window',
      badge: 'Fast Path Protection',
      realWorldScenario:
        'An e-commerce user clicks "Place Order" 15 times within 1 second during a sale. While their hourly limit might permit 100 orders, downstream database locks and payment processors will collapse if all 15 arrive at the exact same millisecond. The in-memory Token Bucket acts as an instantaneous shock absorber.',
      setup: 'Default policy baseline (Free tier: Limit = 20, Burst = 10, Window = 60s).',
      steps: [
        { num: 1, action: 'Navigate to the Console view.', detail: 'Verify all regional nodes (Mumbai, Frankfurt, Virginia) show online status.' },
        { num: 2, action: 'In the Traffic Generator, select Caller: "Free plan, orders API".', detail: 'Targets /api/orders using tenant key-free-acme.' },
        { num: 3, action: 'Set Pace to "Fast" (20 ms between requests).', detail: 'Fires requests in rapid succession to verify token depletion.' },
        { num: 4, action: 'Set Request Count to 15, then click "Send 15 Requests".', detail: 'Observe pipeline decisions and the Mumbai edge card in real time.' },
      ],
      metricsTable: [
        { metric: 'Requests 1 – 10', expected: 'HTTP 200 OK', reason: 'Covered by tokens available in local bucket' },
        { metric: 'Request 11', expected: 'HTTP 429 Too Many Requests', reason: 'Bucket depleted (0 tokens remaining)' },
        { metric: 'Token Meter', expected: 'Continuous refilling animation', reason: 'Tokens replenish steadily at Limit / WindowSec' },
        { metric: 'Retry-After Header', expected: 'Appended to all 429 responses', reason: 'Specifies exact seconds until next token is available' },
      ],
      takeaway:
        'A sliding window rate limiter protects against sustained high volume over minutes or hours. A token bucket protects against instantaneous sub-second bursts. Production gateways enforce both concurrently.',
    },
    {
      id: 'scenario-2',
      title: 'Scenario 2: Multi-Region Quota Sharing',
      category: 'Distributed Lease Coordination',
      badge: 'Global Consistency',
      realWorldScenario:
        'A customer has a free plan allowing 20 requests per minute across 3 global points of presence (Mumbai, Frankfurt, Virginia). If each edge node enforced an isolated 20-request limit, the customer could consume 60 requests. EdgeGate enforces a strict global ceiling of 20 without cross-region database locks on the request path.',
      setup: 'All 3 regional nodes connected to central coordinator.',
      steps: [
        { num: 1, action: 'Click "Reset Gateway" in the top navigation bar.', detail: 'Clears all historical counts and restores fresh quota.' },
        { num: 2, action: 'In the Traffic Generator, click preset "Even load, 30 requests".', detail: 'Distributes 30 calls across Mumbai, Frankfurt, and Virginia in round-robin sequence.' },
        { num: 3, action: 'Observe the Global Quota panel in the center.', detail: 'Watch each region consume from the centralized 20-request budget.' },
      ],
      metricsTable: [
        { metric: 'Total Sent', expected: '30 requests', reason: '10 requests directed to each region' },
        { metric: 'Total Allowed', expected: 'Exactly 20 requests', reason: 'Global limit strictly bounded across all 3 nodes' },
        { metric: 'Total Blocked', expected: 'Exactly 10 requests', reason: 'Rejected once global lease pool was exhausted' },
        { metric: 'Coordinator Quota Bar', expected: 'Used = 20 / 20', reason: 'Single source of truth maintained in MongoDB' },
      ],
      takeaway:
        'Naive architectures either let users exceed limits (isolated regional counters) or suffer intolerable latency (every request pinging a central database). EdgeGate\'s lease pool model provides global fairness with local sub-millisecond execution.',
    },
    {
      id: 'scenario-3',
      title: 'Scenario 3: Flash Crowd & Dynamic Lease Migration',
      category: 'Dynamic Traffic Rebalancing',
      badge: 'Elastic Allocation',
      realWorldScenario:
        'A localized promotion begins in India. 95% of global traffic suddenly concentrates at the Mumbai node, while Frankfurt and Virginia sit idle. Static partitioning (dividing 20 by 3 = 6 per region) would prematurely reject Mumbai requests after just 6 calls. EdgeGate dynamically migrates unneeded capacity.',
      setup: 'Fresh state baseline. All edge nodes online.',
      steps: [
        { num: 1, action: 'Click "Reset Gateway" to clear state.', detail: 'All three nodes initialize with balanced default allocations.' },
        { num: 2, action: 'In the Traffic Generator, click preset "Mumbai spike, 50 requests".', detail: 'Fires 50 requests targeted exclusively at edge-mumbai.' },
        { num: 3, action: 'Monitor Mumbai\'s edge card and the Global Quota pool.', detail: 'Observe how Mumbai requests and acquires additional quota on successive sync cycles.' },
      ],
      metricsTable: [
        { metric: 'Initial Mumbai Grant', expected: '~7 requests', reason: 'Base lease share granted on startup' },
        { metric: 'Background Sync (1s)', expected: 'Coordinator lease refresh', reason: 'Coordinator reclaims idle quota from Frankfurt & Virginia' },
        { metric: 'Final Mumbai Allowed', expected: '20 requests', reason: 'Mumbai was allowed to consume the full global quota' },
        { metric: 'Requests 21 – 50', expected: 'HTTP 429 Blocked', reason: 'Intercepted at Mumbai edge; protected origin never saw excess load' },
      ],
      takeaway:
        'Dynamic lease migration eliminates the stranded capacity bottleneck. Rate limit allowances automatically flow to regions experiencing real-time traffic surges.',
    },
    {
      id: 'scenario-4',
      title: 'Scenario 4: Network Partition & CAP Trade-offs',
      category: 'Network Partition & CAP',
      badge: 'Bounded Degradation',
      realWorldScenario:
        'An undersea cable between Virginia and the central coordinator suffers an outage. In distributed systems, you must choose availability or consistency. Traditional architectures either Fail Open (risk backend overload) or Fail Closed (reject legitimate users). EdgeGate implements Bounded Fallback.',
      setup: 'Virginia edge node online.',
      steps: [
        { num: 1, action: 'On Virginia\'s node card, toggle "Disconnect" under Fault Injection.', detail: 'Simulates complete network partition from coordinator.' },
        { num: 2, action: 'Observe Virginia switch to "Local fallback" operating mode.', detail: 'Node calculates local sliding window quota of Limit / TotalNodes.' },
        { num: 3, action: 'Send 10 requests specifically to "Virginia only".', detail: 'Observe how many succeed before Virginia throttles locally.' },
        { num: 4, action: 'Click "Disconnect" again to heal the network partition.', detail: 'Virginia re-synchronizes and reconciles offline usage seamlessly.' },
      ],
      metricsTable: [
        { metric: 'Offline Mode', expected: 'Local fallback', reason: 'No active coordinator lease; enforced from local sliding window' },
        { metric: 'Local Allowance', expected: '~6-7 requests', reason: 'Bounded to 1/3 of the 20-request limit' },
        { metric: 'Excess Requests', expected: 'HTTP 429 Blocked', reason: 'Protects backend origin from unchecked offline traffic' },
        { metric: 'Network Healing', expected: 'State reconciled', reason: 'Coordinator updates total without loss of recorded requests' },
      ],
      takeaway:
        'During network partitions, Bounded Local Fallback preserves service availability for legitimate callers while strictly guaranteeing that downstream backends cannot be overwhelmed beyond 1/N capacity per partitioned zone.',
    },
    {
      id: 'scenario-5',
      title: 'Scenario 5: Packet Loss & Idempotent Resync',
      category: 'Fault-Tolerant Protocol',
      badge: 'Idempotent Sync',
      realWorldScenario:
        'A regional edge node flushes a batch of 8 allowed requests to the coordinator. The coordinator persists them to MongoDB, but the return HTTP 200 acknowledgment packet gets dropped by an unreliable network router. How does the architecture prevent double-counting upon retry?',
      setup: 'Frankfurt edge node online.',
      steps: [
        { num: 1, action: 'On Frankfurt\'s card, toggle "Drop replies" (60% packet loss).', detail: 'Coordinator receives updates but return replies are dropped in transit.' },
        { num: 2, action: 'Send 15 requests to "Frankfurt only".', detail: 'Frankfurt records traffic and initiates repeated sync retries.' },
        { num: 3, action: 'Compare Frankfurt\'s allowed count against the Global Quota pool.', detail: 'Verify that counts reconcile exactly with zero double deductions.' },
      ],
      metricsTable: [
        { metric: 'Sync Retries', expected: 'Monotonic sequence numbers', reason: 'Retried requests retain the exact same batch sequence ID' },
        { metric: 'Coordinator Action', expected: 'Deduplicated silently', reason: 'Coordinator recognizes already-applied sequence ID' },
        { metric: 'Global Usage Count', expected: 'Exact match', reason: 'Guaranteed at-least-once delivery with idempotent execution semantics' },
      ],
      takeaway:
        'Distributed synchronization protocols must be architected as idempotent state transitions. Monotonic sequence IDs and process generation epochs prevent duplicate side effects across lossy networks.',
    },
  ];

  const currentScenario = scenarios[selectedScenarioIndex] || scenarios[0];

  return (
    <main className="dedicated-guide-page" id="guide">
      <div className="guide-workspace-layout">
        {/* Left Navigation Sidebar */}
        <aside className="guide-nav-sidebar">
          {/* Group 1: Theory Dropdown / Accordion */}
          <div className="sidebar-group-header-row" onClick={() => setTheoryOpen(!theoryOpen)}>
            <span className="sidebar-group-title">Theory &amp; Foundations</span>
            <button type="button" className="group-toggle-icon" aria-label="Toggle Theory Sections">
              {theoryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {theoryOpen && (
            <nav className="guide-vertical-nav" aria-label="Theory Categories">
              {/* Section 1: General Terminology */}
              <button
                type="button"
                className={`guide-nav-item ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                <BookOpen size={16} aria-hidden="true" />
                <div className="nav-item-text">
                  <strong>1. General Terminology</strong>
                  <span>Latency, Jitter, Throttling, Gateway</span>
                </div>
              </button>

              {activeTab === 'general' && (
                <div className="guide-subnav-tree" aria-label="General Terminology Sub-navigation">
                  {GENERAL_SUB_ITEMS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`guide-subnav-item ${selectedGeneral === sub.id ? 'active' : ''}`}
                      onClick={() => setSelectedGeneral(sub.id)}
                    >
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Section 2: Core Algorithms */}
              <button
                type="button"
                className={`guide-nav-item ${activeTab === 'algorithms' ? 'active' : ''}`}
                onClick={() => setActiveTab('algorithms')}
              >
                <Cpu size={16} aria-hidden="true" />
                <div className="nav-item-text">
                  <strong>2. Core Algorithms</strong>
                  <span>Fixed Window, Token Bucket, Sliding Window</span>
                </div>
              </button>

              {activeTab === 'algorithms' && (
                <div className="guide-subnav-tree" aria-label="Core Algorithms Sub-navigation">
                  {ALGO_SUB_ITEMS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`guide-subnav-item ${selectedAlgo === sub.id ? 'active' : ''}`}
                      onClick={() => setSelectedAlgo(sub.id)}
                    >
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Section 3: System Architecture */}
              <button
                type="button"
                className={`guide-nav-item ${activeTab === 'architecture' ? 'active' : ''}`}
                onClick={() => setActiveTab('architecture')}
              >
                <Layers size={16} aria-hidden="true" />
                <div className="nav-item-text">
                  <strong>3. System Architecture</strong>
                  <span>Data Plane (Fast) vs Control Plane (Slow)</span>
                </div>
              </button>

              {activeTab === 'architecture' && (
                <div className="guide-subnav-tree" aria-label="System Architecture Sub-navigation">
                  {ARCH_SUB_ITEMS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`guide-subnav-item ${selectedArch === sub.id ? 'active' : ''}`}
                      onClick={() => setSelectedArch(sub.id)}
                    >
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Section 4: Leases & Consensus */}
              <button
                type="button"
                className={`guide-nav-item ${activeTab === 'coordination' ? 'active' : ''}`}
                onClick={() => setActiveTab('coordination')}
              >
                <Database size={16} aria-hidden="true" />
                <div className="nav-item-text">
                  <strong>4. Leases &amp; Consensus</strong>
                  <span>Distributed lease pools, dynamic rebalancing</span>
                </div>
              </button>

              {activeTab === 'coordination' && (
                <div className="guide-subnav-tree" aria-label="Leases and Consensus Sub-navigation">
                  {COORD_SUB_ITEMS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`guide-subnav-item ${selectedCoord === sub.id ? 'active' : ''}`}
                      onClick={() => setSelectedCoord(sub.id)}
                    >
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Section 5: Fault Tolerance & Chaos */}
              <button
                type="button"
                className={`guide-nav-item ${activeTab === 'chaos' ? 'active' : ''}`}
                onClick={() => setActiveTab('chaos')}
              >
                <ShieldAlert size={16} aria-hidden="true" />
                <div className="nav-item-text">
                  <strong>5. Fault Tolerance &amp; Chaos</strong>
                  <span>Partitions, CAP theorem, Bounded Fallback</span>
                </div>
              </button>

              {activeTab === 'chaos' && (
                <div className="guide-subnav-tree" aria-label="Fault Tolerance Sub-navigation">
                  {CHAOS_SUB_ITEMS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`guide-subnav-item ${selectedChaos === sub.id ? 'active' : ''}`}
                      onClick={() => setSelectedChaos(sub.id)}
                    >
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </nav>
          )}

          {/* Group 2: Verification Scenarios */}
          <span className="sidebar-group-title" style={{ marginTop: '16px' }}>Verification Scenarios</span>
          <nav className="guide-vertical-nav" aria-label="Verification Scenarios">
            {scenarios.map((sc, idx) => (
              <button
                key={sc.id}
                type="button"
                className={`guide-nav-item ${activeTab === sc.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(sc.id);
                  setSelectedScenarioIndex(idx);
                }}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                <div className="nav-item-text">
                  <strong>Scenario {idx + 1}</strong>
                  <span>{sc.badge}</span>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right Content Pane */}
        <div className="guide-content-pane">
          {/* TAB 1: GENERAL TERMINOLOGY */}
          {activeTab === 'general' && (
            <div className="guide-content-card">
              <GeneralDeepDive selectedConcept={selectedGeneral} />
            </div>
          )}

          {/* TAB 2: CORE ALGORITHMS & EVOLUTION */}
          {activeTab === 'algorithms' && (
            <div className="guide-content-card">
              <AlgorithmsDeepDive selectedAlgo={selectedAlgo} />
            </div>
          )}

          {/* TAB 3: SYSTEM ARCHITECTURE & PLANES */}
          {activeTab === 'architecture' && (
            <div className="guide-content-card">
              <ArchitectureDeepDive selectedSection={selectedArch} />
            </div>
          )}

          {/* TAB 4: LEASES & CONSENSUS */}
          {activeTab === 'coordination' && (
            <div className="guide-content-card">
              <CoordinationDeepDive selectedSection={selectedCoord} />
            </div>
          )}

          {/* TAB 5: FAULT TOLERANCE & CHAOS */}
          {activeTab === 'chaos' && (
            <div className="guide-content-card">
              <ChaosDeepDive selectedSection={selectedChaos} />
            </div>
          )}

          {/* SCENARIO VIEWS (Scenario 1 to 5) */}
          {activeTab.startsWith('scenario-') && (
            <div className="guide-content-card">
              <div className="canvas-header-card">
                <div className="canvas-header-left">
                  <span className="canvas-tag">{currentScenario.badge} · {currentScenario.category}</span>
                  <h2>{currentScenario.title}</h2>
                </div>
              </div>

              {/* Real World Engineering Context */}
              <div className="scenario-callout-card">
                <div className="scenario-head">
                  <Globe2 size={16} className="text-accent" aria-hidden="true" />
                  <strong>Production Systems Engineering Context</strong>
                </div>
                <p>{currentScenario.realWorldScenario}</p>
              </div>

              {/* Prerequisites */}
              <div className="lab-setup-strip">
                <span className="setup-label">Environment State:</span>
                <span>{currentScenario.setup}</span>
              </div>

              {/* Step-by-Step Procedure */}
              <section className="canvas-section">
                <h3>
                  <Zap size={16} className="text-accent" aria-hidden="true" />
                  Step-by-Step Execution Procedure
                </h3>
                <div className="steps-container">
                  {currentScenario.steps.map((st) => (
                    <div key={st.num} className="step-card">
                      <div className="step-badge-circle">{st.num}</div>
                      <div className="step-text-wrap">
                        <strong>{st.action}</strong>
                        <p>{st.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Telemetry Matrix */}
              <section className="canvas-section">
                <h3>
                  <CheckCircle2 size={16} className="text-ok" aria-hidden="true" />
                  Expected Telemetry &amp; Verification Matrix
                </h3>
                <div className="metrics-table-frame">
                  <table className="wide-matrix-table">
                    <thead>
                      <tr>
                        <th>Telemetry Probe</th>
                        <th>Expected Outcome</th>
                        <th>Distributed Systems Mechanism</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentScenario.metricsTable.map((row, i) => (
                        <tr key={i}>
                          <td className="probe-name"><strong>{row.metric}</strong></td>
                          <td className="probe-result"><span className="result-pill">{row.expected}</span></td>
                          <td className="probe-reason">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Takeaway */}
              <div className="takeaway-banner-card">
                <div className="takeaway-header">
                  <Cpu size={16} className="takeaway-spark" aria-hidden="true" />
                  <strong>Core Systems Takeaway</strong>
                </div>
                <p>{currentScenario.takeaway}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Database, Globe2, Zap } from 'lucide-react';

export function ArchitectureDeepDive({ selectedSection: propSelected } = {}) {
  const [internalSection] = useState('overview');
  const selectedSection = propSelected !== undefined ? propSelected : internalSection;

  return (
    <div className="algo-deep-workspace">
      {/* 0. OVERVIEW */}
      {selectedSection === 'overview' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Architecture</span>
              <span className="algo-domain-tag">Dual-Plane Separation</span>
            </div>
            <h2>Dual-Plane Gateway Architecture</h2>
            <p className="algo-lead-text">
              High-throughput distributed systems decouple critical-path request processing (Data Plane) from periodic coordination and persistent state storage (Control Plane).
            </p>
          </div>

          <div className="wide-comparison-grid">
            <div className="comp-card data-plane-comp">
              <div className="comp-head">
                <Zap size={18} className="text-accent" aria-hidden="true" />
                <div>
                  <strong>Data Plane (Fast Path · Regional Edge Proxy)</strong>
                  <span className="comp-sub">&lt; 1 ms Execution · Pure In-Memory</span>
                </div>
              </div>
              <p>Evaluates incoming customer traffic directly inside the regional node RAM. Never blocks on cross-continental database round-trips.</p>
              <div className="flow-steps-pill-list">
                <span className="flow-pill">1. Client Request Ingestion</span>
                <span className="flow-pill">2. Extract API Key / IP Address</span>
                <span className="flow-pill">3. Deduct 1 Token from Local Burst Bucket</span>
                <span className="flow-pill">4. Deduct 1 Unit from Active Lease Grant</span>
                <span className="flow-pill">5. Proxy to Backend (200) or Return 429</span>
              </div>
            </div>

            <div className="comp-card control-plane-comp">
              <div className="comp-head">
                <Database size={18} className="text-ok" aria-hidden="true" />
                <div>
                  <strong>Control Plane (Slow Path · Central Coordinator &amp; DB)</strong>
                  <span className="comp-sub">1-Second Asynchronous Sync · Global Consensus</span>
                </div>
              </div>
              <p>Aggregates traffic velocity reports from all regions, manages MongoDB persistence, and dispenses time-bounded leases.</p>
              <div className="flow-steps-pill-list">
                <span className="flow-pill">1. Receive Aggregated Batches</span>
                <span className="flow-pill">2. Verify Monotonic Sequence Numbers</span>
                <span className="flow-pill">3. Compute Sliding Window Weighted Sum</span>
                <span className="flow-pill">4. Reallocate Quota toward Busy Regions</span>
                <span className="flow-pill">5. Issue Signed Leases to Edge Nodes</span>
              </div>
            </div>
          </div>

          <div className="analogy-banner-strip">
            <Globe2 size={18} className="text-accent" aria-hidden="true" />
            <div>
              <strong>Architectural Trade-off:</strong> Querying a central database on every request across continents adds 150ms+ of latency. In EdgeGate, edge nodes enforce leases locally in RAM in sub-millisecond time while the control plane reconciles asynchronously in the background.
            </div>
          </div>
        </section>
      )}

      {/* 1. DATA PLANE */}
      {selectedSection === 'data-plane' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Plane 01</span>
              <span className="algo-domain-tag">Fast Path</span>
            </div>
            <h2>Data Plane: Sub-Millisecond Request Interception</h2>
            <p className="algo-lead-text">
              The Data Plane executes entirely inside node process memory. Every incoming customer HTTP request is inspected, evaluated, and either admitted or throttled in under 0.5 milliseconds.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Data Plane Internal Evaluation Pipeline</span>
              <span className="diagram-sub">Pure RAM lookups · Zero disk or network I/O</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="dp-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker id="dp-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
                  </marker>
                  <marker id="dp-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#dc2626" />
                  </marker>
                </defs>

                {/* Step 1: Ingestion */}
                <rect x="15" y="65" width="130" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="80" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Request Arrival</text>
                <text x="80" y="103" textAnchor="middle" fill="#64748b" fontSize="10">HTTP /api/orders</text>

                <line x1="145" y1="90" x2="185" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#dp-arrow)" />

                {/* Step 2: Layer 1 Token Check */}
                <rect x="190" y="65" width="160" height="50" rx="6" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="270" y="88" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">1. Local Token Bucket</text>
                <text x="270" y="103" textAnchor="middle" fill="#3b82f6" fontSize="10">Burst Capacity B &gt; 0?</text>

                <line x1="350" y1="90" x2="390" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#dp-arrow)" />

                {/* Step 3: Layer 2 Lease Check */}
                <rect x="395" y="65" width="160" height="50" rx="6" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="475" y="88" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">2. Active Lease Pool</text>
                <text x="475" y="103" textAnchor="middle" fill="#3b82f6" fontSize="10">Remaining Leases &gt; 0?</text>

                {/* Branch YES */}
                <line x1="555" y1="90" x2="605" y2="50" stroke="#059669" strokeWidth="1.5" markerEnd="url(#dp-green)" />
                <rect x="610" y="25" width="195" height="50" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="707" y="47" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">Proxy to Origin (200 OK)</text>
                <text x="707" y="62" textAnchor="middle" fill="#047857" fontSize="10">Record Delta in Buffer</text>

                {/* Branch NO */}
                <line x1="555" y1="90" x2="605" y2="130" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#dp-red)" />
                <rect x="610" y="105" width="195" height="50" rx="6" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="707" y="127" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">HTTP 429 Throttled</text>
                <text x="707" y="142" textAnchor="middle" fill="#dc2626" fontSize="10">Append Retry-After Header</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Two-Tier Local Defense</h3>
              <p>
                Every EdgeGate regional node enforces two independent limits in RAM on every single request:
              </p>
              <ul className="clean-bullet-list">
                <li><strong>Tier 1 (Token Bucket):</strong> Protects against sub-second concurrency spikes (e.g. 10 requests in 10ms).</li>
                <li><strong>Tier 2 (Lease Counter):</strong> Protects the global multi-region budget over the 60-second sliding window.</li>
              </ul>
            </div>

            <div className="deep-info-block">
              <h3>Zero Blocking Guarantee</h3>
              <p>
                The Data Plane never executes <code>await fetch()</code> or queries MongoDB while processing an end-user request. If the coordinator is slow or unreachable, the Data Plane operates autonomously without stalling caller connections.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. CONTROL PLANE */}
      {selectedSection === 'control-plane' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Plane 02</span>
              <span className="algo-domain-tag">Slow Path</span>
            </div>
            <h2>Control Plane: Asynchronous Consensus &amp; Persistence</h2>
            <p className="algo-lead-text">
              The Control Plane runs as a centralized coordinator service backed by MongoDB. It dispenses time-bounded leases, reallocates capacity based on global demand, and maintains sliding window telemetry.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Control Plane 1-Second Periodic Heartbeat &amp; Lease Allocation</span>
              <span className="diagram-sub">Idempotent batch processing and global sliding window interpolation</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 3 Regional Nodes */}
                <rect x="20" y="25" width="160" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="100" y="48" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">Mumbai Usage Batch</text>

                <rect x="20" y="72" width="160" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="100" y="95" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">Frankfurt Usage Batch</text>

                <rect x="20" y="119" width="160" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="100" y="142" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">Virginia Usage Batch</text>

                {/* Arrows to Coordinator */}
                <line x1="180" y1="43" x2="330" y2="80" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#dp-arrow)" />
                <line x1="180" y1="90" x2="330" y2="90" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#dp-arrow)" />
                <line x1="180" y1="137" x2="330" y2="100" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#dp-arrow)" />

                {/* Coordinator Core */}
                <rect x="340" y="45" width="220" height="90" rx="8" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
                <text x="450" y="73" textAnchor="middle" fill="#14532d" fontSize="12" fontWeight="600">Central Coordinator</text>
                <text x="450" y="90" textAnchor="middle" fill="#15803d" fontSize="10">Sliding Window Accumulator</text>
                <text x="450" y="105" textAnchor="middle" fill="#047857" fontSize="9">Dynamic Lease Distributor</text>
                <text x="450" y="120" textAnchor="middle" fill="#059669" fontSize="9">MongoDB Store</text>

                <line x1="560" y1="90" x2="620" y2="90" stroke="#059669" strokeWidth="2" markerEnd="url(#dp-green)" />

                {/* Dispatched Leases */}
                <rect x="630" y="55" width="170" height="70" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="715" y="82" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">Renewed Leases</text>
                <text x="715" y="98" textAnchor="middle" fill="#047857" fontSize="9">TTL: 3 Seconds</text>
                <text x="715" y="112" textAnchor="middle" fill="#059669" fontSize="9">Scaled to Traffic Velocity</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Batching &amp; Amortization</h3>
              <p>
                Instead of sending 1,000 database writes per second for 1,000 incoming user requests, the regional edge aggregates usage into a single periodic heartbeat.
              </p>
              <div className="code-box">
                <code>1,000 requests/sec at edge</code>
                <code>&darr; Aggregated in RAM</code>
                <code>1 sync report/sec sent to Coordinator</code>
                <code>= 99.9% database write reduction!</code>
              </div>
            </div>

            <div className="deep-info-block">
              <h3>Central Storage Role</h3>
              <p>
                MongoDB stores persistent tenant policies, rulesets, and aggregate usage records. If a coordinator process restarts, state is restored from MongoDB without loss of historical usage.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. SYNC PIPELINE */}
      {selectedSection === 'sync-pipeline' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Pipeline</span>
              <span className="algo-domain-tag">Lifecycle Synchronization</span>
            </div>
            <h2>Dual-Plane Synchronization Lifecycle</h2>
            <p className="algo-lead-text">
              How the Data Plane and Control Plane collaborate continuously to guarantee both sub-millisecond execution and strict global limits.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Complete 5-Stage Synchronization Lifecycle</span>
              <span className="diagram-sub">Edge consumption &rarr; Buffer accumulation &rarr; Sync &rarr; Quota rebalance &rarr; Lease return</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 140" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 5 Stages */}
                <rect x="15" y="45" width="140" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="85" y="68" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">1. Local Consume</text>
                <text x="85" y="82" textAnchor="middle" fill="#64748b" fontSize="9">Fast path RAM</text>

                <line x1="155" y1="70" x2="175" y2="70" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#dp-arrow)" />

                <rect x="180" y="45" width="140" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="250" y="68" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">2. Delta Buffer</text>
                <text x="250" y="82" textAnchor="middle" fill="#64748b" fontSize="9">Accumulate &amp; batch</text>

                <line x1="320" y1="70" x2="340" y2="70" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#dp-arrow)" />

                <rect x="345" y="45" width="140" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="415" y="68" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">3. 1s Sync Report</text>
                <text x="415" y="82" textAnchor="middle" fill="#64748b" fontSize="9">Monotonic Seq ID</text>

                <line x1="485" y1="70" x2="505" y2="70" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#dp-arrow)" />

                <rect x="510" y="45" width="140" height="50" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1" />
                <text x="580" y="68" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">4. Quota Rebalance</text>
                <text x="580" y="82" textAnchor="middle" fill="#3b82f6" fontSize="9">Dynamic migration</text>

                <line x1="650" y1="70" x2="670" y2="70" stroke="#059669" strokeWidth="1.5" markerEnd="url(#dp-green)" />

                <rect x="675" y="45" width="130" height="50" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="740" y="68" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">5. Signed Lease</text>
                <text x="740" y="82" textAnchor="middle" fill="#047857" fontSize="9">Restock Edge RAM</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Self-Regulating Cycle</h3>
              <p>
                When traffic stops, sync reports carry a delta of zero. The coordinator gradually scales regional leases down to a baseline, reclaiming quota to the global pool ready for any sudden surge.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Live Console Demonstration</h3>
              <p>
                Observe this in real time in the <strong>Console</strong>: watch the <em>Visual Pipeline</em> animate traffic arriving at the edge, while the <em>Global Quota</em> bar in the center reflects coordinated 1-second batch synchronization.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


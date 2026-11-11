import { useState } from 'react';

export function CoordinationDeepDive({ selectedSection: propSelected } = {}) {
  const [internalSection] = useState('overview');
  const selectedSection = propSelected !== undefined ? propSelected : internalSection;

  return (
    <div className="algo-deep-workspace">
      {/* 0. OVERVIEW */}
      {selectedSection === 'overview' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Consensus</span>
              <span className="algo-domain-tag">Distributed Leases</span>
            </div>
            <h2>Distributed Leases &amp; Dynamic Rebalancing</h2>
            <p className="algo-lead-text">
              How EdgeGate coordinates multiple regional points of presence without requiring heavy consensus protocols (Raft/Paxos) or blocking cross-ocean locks on the request path.
            </p>
          </div>

          <div className="concepts-doc-grid">
            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">01</span>
                <h3>The Quota Lease Contract</h3>
              </div>
              <p>
                A time-bounded grant issued by the coordinator allowing an edge node to admit up to $K$ requests locally without checking back.
              </p>
              <div className="concept-doc-example">
                <strong>Everyday Analogy:</strong> A prepaid debit card loaded with \$20. You buy coffee without telephoning your bank branch on every swipe.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">02</span>
                <h3>Dynamic Quota Migration (Flash Crowd Handling)</h3>
              </div>
              <p>
                Static quota partitioning fails when traffic concentrates in one region. EdgeGate dynamically transfers unused capacity from idle regions to hot regions.
              </p>
              <div className="concept-doc-example">
                <strong>Benefit:</strong> Eliminates "stranded capacity" while strictly preserving the global ceiling.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">03</span>
                <h3>Idempotent Sync Protocol</h3>
              </div>
              <p>
                Monotonic sequence numbers and process epochs guarantee that network packet loss or repeated retries never cause double-counting.
              </p>
              <div className="concept-doc-example">
                <strong>Safety Invariant:</strong> Applying the same batch update 5 times produces the exact same state as applying it once.
              </div>
            </article>
          </div>
        </section>
      )}

      {/* 1. THE LEASE CONTRACT */}
      {selectedSection === 'lease-contract' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Contract 01</span>
              <span className="algo-domain-tag">Bounded Trust</span>
            </div>
            <h2>The Quota Lease Contract</h2>
            <p className="algo-lead-text">
              Borrowed from distributed file systems (Google Chubby, NFSv4), a lease is a time-limited authorization that enables autonomous local execution while ensuring bounded global exposure upon failure.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Lease Negotiation &amp; Autonomous Fast-Path Execution</span>
              <span className="diagram-sub">Edge node consumes locally until lease expires or runs out</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="coord-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker id="coord-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
                  </marker>
                </defs>

                {/* Coordinator issues */}
                <rect x="20" y="65" width="160" height="50" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
                <text x="100" y="88" textAnchor="middle" fill="#14532d" fontSize="12" fontWeight="600">Coordinator</text>
                <text x="100" y="103" textAnchor="middle" fill="#15803d" fontSize="10">Issues: Grant = 8, TTL = 3s</text>

                <line x1="180" y1="90" x2="250" y2="90" stroke="#059669" strokeWidth="1.5" markerEnd="url(#coord-green)" />

                {/* Edge Node Local Budget */}
                <rect x="260" y="45" width="260" height="90" rx="8" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="390" y="70" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">Regional Edge Node (RAM)</text>
                <text x="390" y="88" textAnchor="middle" fill="#0369a1" fontSize="10">Active Local Lease Balance: 8</text>
                <text x="390" y="105" textAnchor="middle" fill="#64748b" fontSize="9">Admit incoming requests instantly (&lt;1ms)</text>
                <text x="390" y="120" textAnchor="middle" fill="#64748b" fontSize="9">Balance = Balance - 1 per call</text>

                <line x1="520" y1="90" x2="590" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#coord-arrow)" />

                {/* Outflow */}
                <rect x="600" y="65" width="200" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="700" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Next 1s Sync</text>
                <text x="700" y="103" textAnchor="middle" fill="#64748b" fontSize="10">Report Used: 5, Request Next Grant</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The Mathematical Lease Invariant</h3>
              <p>
                To strictly prevent global over-allocation across $N$ regional nodes, the coordinator guarantees:
              </p>
              <div className="formula-box">
                <code>&Sigma; (Active_Leases_i) + Used_Global &le; Global_Limit</code>
              </div>
              <p className="mt-2">
                Even if all edge nodes simultaneously exhaust their granted leases at the exact same millisecond, the global limit cannot be breached.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Automatic Failure Recovery (TTL)</h3>
              <p>
                What happens if an edge node hardware crashes while holding 8 leases?
              </p>
              <p className="mt-2">
                Because every lease has an explicit <strong>TTL of 3 seconds</strong>, the coordinator naturally reclaims the abandoned leases once the timer expires. No distributed locks or split-brain recovery procedures required!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. DYNAMIC MIGRATION (FLASH CROWD) */}
      {selectedSection === 'dynamic-migration' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Consensus 02</span>
              <span className="algo-domain-tag">Elastic Capacity</span>
            </div>
            <h2>Dynamic Quota Migration (Flash Crowd Rebalancing)</h2>
            <p className="algo-lead-text">
              Static partitioning creates stranded capacity. If a localized flash crowd hits Mumbai while Frankfurt and Virginia sit idle, EdgeGate dynamically reallocates quota to the active region.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Flash Crowd Quota Migration Mechanism</span>
              <span className="diagram-sub">Coordinator reclaims unneeded leases from idle nodes and channels them to Mumbai</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Idle Nodes */}
                <rect x="30" y="30" width="220" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="140" y="52" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">Frankfurt (Idle · 0 req/s)</text>
                <text x="140" y="68" textAnchor="middle" fill="#94a3b8" fontSize="9">Leases Reclaimed by Coordinator</text>

                <rect x="30" y="100" width="220" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="140" y="122" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">Virginia (Idle · 0 req/s)</text>
                <text x="140" y="138" textAnchor="middle" fill="#94a3b8" fontSize="9">Leases Reclaimed by Coordinator</text>

                {/* Arrows to Center */}
                <line x1="250" y1="55" x2="350" y2="85" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#coord-arrow)" />
                <line x1="250" y1="125" x2="350" y2="95" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#coord-arrow)" />

                {/* Coordinator Rebalancer */}
                <rect x="360" y="55" width="180" height="70" rx="8" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" />
                <text x="450" y="82" textAnchor="middle" fill="#14532d" fontSize="12" fontWeight="600">Quota Rebalancer</text>
                <text x="450" y="98" textAnchor="middle" fill="#15803d" fontSize="10">Demand Proportional Shift</text>
                <text x="450" y="112" textAnchor="middle" fill="#047857" fontSize="9">Reallocates pool to hotspot</text>

                <line x1="540" y1="90" x2="610" y2="90" stroke="#059669" strokeWidth="2" markerEnd="url(#coord-green)" />

                {/* Hot Node */}
                <rect x="620" y="45" width="170" height="90" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
                <text x="705" y="73" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">Mumbai Edge (HOT)</text>
                <text x="705" y="92" textAnchor="middle" fill="#0284c7" fontSize="10">Flash Crowd (50 req/s)</text>
                <text x="705" y="108" textAnchor="middle" fill="#047857" fontSize="10" fontWeight="600">Granted 100% of Quota!</text>
                <text x="705" y="122" textAnchor="middle" fill="#64748b" fontSize="8">Zero Stranded Capacity</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Proportional Demand Formula</h3>
              <p>
                The coordinator calculates each region's lease grant based on recent request velocity:
              </p>
              <div className="formula-box">
                <code>DemandRatio_i = Velocity_i / &Sigma; (Velocity_all)</code>
                <code>Grant_i = AvailableQuota * DemandRatio_i</code>
              </div>
              <p className="mt-2">
                If Mumbai experiences 95% of world traffic, Mumbai receives 95% of available leases on the subsequent sync cycle.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Live Verification</h3>
              <p>
                In the <strong>Console</strong>, click preset <em>"Mumbai spike, 50 requests"</em>:
              </p>
              <p className="mt-2">
                Observe Mumbai acquire fresh leases over successive seconds to allow the full 20 requests without prematurely throttling at 6!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. IDEMPOTENT SYNC PROTOCOL */}
      {selectedSection === 'idempotent-sync' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Protocol 03</span>
              <span className="algo-domain-tag">Deduplication</span>
            </div>
            <h2>Idempotent Sync Protocol &amp; Monotonic Sequences</h2>
            <p className="algo-lead-text">
              Networks drop packets. If an acknowledgment is lost in transit, the edge retransmits. How do we ensure usage is never double-counted?
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Monotonic Sequence Deduplication Flow</span>
              <span className="diagram-sub">Coordinator recognizes duplicate sequence IDs and replies without re-incrementing usage</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Attempt 1: Success */}
                <rect x="30" y="30" width="180" height="40" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="120" y="54" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">Batch Seq #101 (Delta: 5)</text>

                <line x1="210" y1="50" x2="330" y2="50" stroke="#059669" strokeWidth="1.5" markerEnd="url(#coord-green)" />
                <text x="270" y="42" textAnchor="middle" fill="#047857" fontSize="9">Delivered</text>

                <rect x="340" y="30" width="200" height="40" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="440" y="54" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">Applied (Usage + 5)</text>

                {/* Dropped Ack */}
                <line x1="440" y1="70" x2="220" y2="105" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="330" y="95" textAnchor="middle" fill="#dc2626" fontSize="9">HTTP 200 Ack Dropped by Network!</text>

                {/* Attempt 2: Duplicate Retry */}
                <rect x="30" y="115" width="180" height="40" rx="4" fill="#fee2e2" stroke="#fecaca" strokeWidth="1" />
                <text x="120" y="139" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">Retry Seq #101 (Delta: 5)</text>

                <line x1="210" y1="135" x2="330" y2="135" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#coord-arrow)" />

                <rect x="340" y="115" width="300" height="40" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5" />
                <text x="490" y="134" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Seq #101 Already Processed &rarr; Deduplicate!</text>
                <text x="490" y="147" textAnchor="middle" fill="#0369a1" fontSize="9">Return current state; Usage NOT incremented twice</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Idempotent Execution Guarantee</h3>
              <p>
                The coordinator tracks the highest processed sequence number per node:
              </p>
              <div className="formula-box">
                <code>if (incomingSeq &le; lastProcessedSeq[nodeId]) {`{`}</code>
                <code>  return cachedResponse; // No state mutation!</code>
                <code>{`}`}</code>
              </div>
            </div>

            <div className="deep-info-block">
              <h3>Safety Invariant</h3>
              <p>
                Guarantees <strong>strictly-once execution semantics</strong> across an unreliable, lossy network link. You can verify this in <strong>Scenario 5: Packet Loss &amp; Idempotent Resync</strong>.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


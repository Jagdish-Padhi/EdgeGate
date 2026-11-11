import { useState } from 'react';
import { Clock, RotateCcw, ShieldAlert, WifiOff } from 'lucide-react';

export function ChaosDeepDive({ selectedSection: propSelected } = {}) {
  const [internalSection] = useState('overview');
  const selectedSection = propSelected !== undefined ? propSelected : internalSection;

  return (
    <div className="algo-deep-workspace">
      {/* 0. OVERVIEW */}
      {selectedSection === 'overview' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Chaos Engineering</span>
              <span className="algo-domain-tag">Resilience Verification</span>
            </div>
            <h2>Fault Tolerance &amp; Failure Recovery Matrix</h2>
            <p className="algo-lead-text">
              Real-world distributed systems operate across lossy networks and crashing hardware. EdgeGate is engineered to remain safe, available, and self-healing under severe chaos.
            </p>
          </div>

          <div className="chaos-matrix-grid">
            <div className="chaos-matrix-card">
              <div className="chaos-matrix-head">
                <WifiOff size={18} className="text-bad" aria-hidden="true" />
                <strong>1. Network Partition (Disconnect)</strong>
              </div>
              <p>Simulates complete network severance between an edge node and the central coordinator.</p>
              <div className="chaos-behavior-box">
                <strong>System Response:</strong> The edge node switches to <strong>Bounded Local Fallback</strong> (<code>Limit / TotalNodes</code>), preserving availability without exceeding backend capacity.
              </div>
            </div>

            <div className="chaos-matrix-card">
              <div className="chaos-matrix-head">
                <ShieldAlert size={18} className="text-warn" aria-hidden="true" />
                <strong>2. Dropped Replies (Packet Loss)</strong>
              </div>
              <p>Coordinator receives usage reports, but return acknowledgments are lost in transit.</p>
              <div className="chaos-behavior-box">
                <strong>System Response:</strong> Edge retransmits with identical sequence ID. Coordinator detects duplicate and replies without double-counting.
              </div>
            </div>

            <div className="chaos-matrix-card">
              <div className="chaos-matrix-head">
                <Clock size={18} className="text-accent" aria-hidden="true" />
                <strong>3. WAN Latency &amp; Jitter</strong>
              </div>
              <p>Adds 100ms–500ms of intercontinental network lag and random delay variance.</p>
              <div className="chaos-behavior-box">
                <strong>System Response:</strong> Real API requests covered by an active lease experience <strong>zero latency penalty (&lt;1ms)</strong>.
              </div>
            </div>

            <div className="chaos-matrix-card">
              <div className="chaos-matrix-head">
                <RotateCcw size={18} className="text-ok" aria-hidden="true" />
                <strong>4. Process Crash &amp; Self-Healing</strong>
              </div>
              <p>Simulates out-of-memory crash or hardware reboot on a regional edge server.</p>
              <div className="chaos-behavior-box">
                <strong>System Response:</strong> Node restarts with an incremented epoch. Leftover leases held by the crashed instance expire naturally on the coordinator.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 1. NETWORK PARTITION */}
      {selectedSection === 'partition' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Failure 01</span>
              <span className="algo-domain-tag">Network Partition</span>
            </div>
            <h2>Network Partition &amp; Bounded Fallback</h2>
            <p className="algo-lead-text">
              When an undersea cable is cut and an edge node loses connectivity to the central coordinator, the node must decide whether to continue serving traffic.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Partition Detection &amp; Bounded Fallback Enforcement</span>
              <span className="diagram-sub">3 missed heartbeats triggers automatic mode transition</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="ch-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker id="ch-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#dc2626" />
                  </marker>
                </defs>

                {/* Healthy state */}
                <rect x="20" y="65" width="160" height="50" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="100" y="88" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">Online Mode</text>
                <text x="100" y="103" textAnchor="middle" fill="#047857" fontSize="10">Active Coordinator Leases</text>

                <line x1="180" y1="90" x2="250" y2="90" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#ch-red)" />
                <text x="215" y="80" textAnchor="middle" fill="#dc2626" fontSize="9">Link Severed</text>

                {/* Heartbeat Loss */}
                <rect x="260" y="55" width="220" height="70" rx="6" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="370" y="80" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">3 Missed Sync Cycles</text>
                <text x="370" y="96" textAnchor="middle" fill="#dc2626" fontSize="10">Lease TTL (3s) Expires</text>
                <text x="370" y="110" textAnchor="middle" fill="#64748b" fontSize="9">Trigger: Local Fallback</text>

                <line x1="480" y1="90" x2="550" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ch-arrow)" />

                {/* Bounded Fallback State */}
                <rect x="560" y="55" width="230" height="70" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
                <text x="675" y="80" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">Bounded Local Fallback</text>
                <text x="675" y="96" textAnchor="middle" fill="#0284c7" fontSize="10">Local Quota = Limit / N (6 reqs)</text>
                <text x="675" y="110" textAnchor="middle" fill="#047857" fontSize="9">Maintains Availability!</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Healing &amp; Reconciliation</h3>
              <p>
                When the network partition heals, the edge flushes its offline usage count to the coordinator. The coordinator reconciles the global counter seamlessly without losing recorded transactions.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Interactive Lab Trigger</h3>
              <p>
                In the <strong>Console</strong> on the Virginia node card, toggle <em>"Disconnect"</em> under Fault Injection.
              </p>
              <p className="mt-2 text-muted">
                Virginia switches to "Local fallback" within seconds. Send requests to Virginia to verify it admits up to 6 calls, then throttles with HTTP 429!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. DROPPED REPLIES */}
      {selectedSection === 'dropped-replies' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Failure 02</span>
              <span className="algo-domain-tag">Packet Loss</span>
            </div>
            <h2>Dropped Replies &amp; Lossy Network Resiliency</h2>
            <p className="algo-lead-text">
              Routers drop packets during congestion. When the coordinator receives usage but its return acknowledgment packet is lost, EdgeGate guarantees at-least-once delivery without double-deduction.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Packet Drop &amp; Retry Deduplication Cycle</span>
              <span className="diagram-sub">Edge re-transmits identical batch sequence until acknowledgment is received</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 160" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Edge send */}
                <rect x="30" y="30" width="160" height="40" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="110" y="54" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">Edge Sends Seq #42</text>

                <line x1="190" y1="50" x2="310" y2="50" stroke="#059669" strokeWidth="1.5" markerEnd="url(#ch-arrow)" />

                <rect x="320" y="30" width="180" height="40" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="410" y="54" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">Applied by Coordinator</text>

                {/* Packet dropped on return */}
                <line x1="410" y1="70" x2="200" y2="105" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="305" y="95" textAnchor="middle" fill="#dc2626" fontSize="9">Return ACK Dropped in Transit (Packet Loss!)</text>

                {/* Retry */}
                <rect x="30" y="105" width="160" height="40" rx="4" fill="#fee2e2" stroke="#fecaca" strokeWidth="1" />
                <text x="110" y="129" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">Retry Seq #42</text>

                <line x1="190" y1="125" x2="310" y2="125" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#ch-arrow)" />

                <rect x="320" y="105" width="280" height="40" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5" />
                <text x="460" y="124" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Deduplicated: Ack Returned Safely</text>
                <text x="460" y="137" textAnchor="middle" fill="#0369a1" fontSize="9">Usage count preserved with zero inflation</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Idempotency Invariant</h3>
              <p>
                Every sync payload carries:
              </p>
              <div className="code-box">
                <code>{`{ nodeId: "frankfurt", epoch: 1, seq: 42, count: 5 }`}</code>
              </div>
              <p className="mt-2">
                Even with a 60% packet drop rate, the global usage count matches actual requests exactly.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Live Verification</h3>
              <p>
                On Frankfurt's node card, toggle <em>"Drop replies"</em> (60% packet loss). Send 15 requests and verify Frankfurt's total allowed matches the Coordinator's counter without duplicate deductions.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. LATENCY & JITTER */}
      {selectedSection === 'latency-jitter' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Failure 03</span>
              <span className="algo-domain-tag">Delay Emulation</span>
            </div>
            <h2>WAN Latency &amp; Jitter Tolerance</h2>
            <p className="algo-lead-text">
              Network delays fluctuate across continents. EdgeGate ensures user-facing requests never suffer WAN lag while background heartbeats tolerate up to hundreds of milliseconds of jitter.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Decoupled Latency Boundary</span>
              <span className="diagram-sub">User request (&lt;1ms) vs Background Sync (100ms–500ms)</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 160" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Fast Path Line */}
                <rect x="30" y="30" width="360" height="40" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="210" y="54" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">
                  Customer Path: User &rarr; Edge RAM Proxy (&lt; 1 ms)
                </text>

                {/* Slow Path Line */}
                <rect x="30" y="90" width="760" height="40" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <text x="410" y="114" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">
                  Background Sync: Edge &harr; Coordinator (200ms WAN + 40ms Jitter) &bull; Asynchronous
                </text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Why Customers Never Wait</h3>
              <p>
                Because the lease is already held in RAM, request evaluation is 100% independent of background WAN latency.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Testing in EdgeGate</h3>
              <p>
                In Configuration, set <strong>Base Latency = 150ms</strong> and <strong>Jitter = 40ms</strong>. Send traffic: customer responses return instantly in &lt;1ms while telemetry logs show the background heartbeat delay.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4. PROCESS CRASH & EPOCH */}
      {selectedSection === 'process-crash' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Failure 04</span>
              <span className="algo-domain-tag">Process Supervision</span>
            </div>
            <h2>Process Crash &amp; Epoch-Based Self-Healing</h2>
            <p className="algo-lead-text">
              When an edge server crashes (OOM or kernel panic) and restarts, how does the distributed coordinator avoid mixing old pre-crash requests with new post-crash traffic?
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Epoch Advancement &amp; Lease Self-Healing</span>
              <span className="diagram-sub">Process restart increments epoch ID to distinguish fresh instances</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Instance 1 */}
                <rect x="30" y="30" width="180" height="45" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
                <text x="120" y="52" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">Instance (Epoch = 1)</text>
                <text x="120" y="66" textAnchor="middle" fill="#dc2626" fontSize="9">Process Crashes (OOM)!</text>

                {/* Coordinator TTL */}
                <rect x="290" y="30" width="220" height="45" rx="4" fill="#fffbeb" stroke="#fde68a" strokeWidth="1" />
                <text x="400" y="52" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="600">Coordinator Leases</text>
                <text x="400" y="66" textAnchor="middle" fill="#b45309" fontSize="9">Old leases expire naturally (TTL 3s)</text>

                {/* Instance 2 */}
                <rect x="30" y="105" width="180" height="45" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="120" y="127" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">Supervisor Restarts Instance</text>
                <text x="120" y="141" textAnchor="middle" fill="#047857" fontSize="9">Epoch Incremented to 2</text>

                {/* Coordinator Reconnect */}
                <line x1="210" y1="127" x2="280" y2="127" stroke="#059669" strokeWidth="2" markerEnd="url(#ch-arrow)" />
                <rect x="290" y="105" width="300" height="45" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                <text x="440" y="127" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Coordinator Accepts Epoch 2</text>
                <text x="440" y="141" textAnchor="middle" fill="#0369a1" fontSize="9">Fresh lease pool initialized; Sequence reset to 1</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Lamport Generation Epochs</h3>
              <p>
                Every process launch generates a monotonic epoch timestamp. When the coordinator receives a sync with a higher epoch, it flushes stale sequence deduplication caches for that node.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Bounded Crash Loss</h3>
              <p>
                In the worst-case scenario where an edge node crashes before sending its 1-second batch, at most 1 second of recorded usage is lost. The system reconciles smoothly without manual human intervention.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


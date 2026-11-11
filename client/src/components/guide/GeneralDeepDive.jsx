import { useState } from 'react';

export function GeneralDeepDive({ selectedConcept: propSelected } = {}) {
  const [internalConcept] = useState('overview');
  const selectedConcept = propSelected !== undefined ? propSelected : internalConcept;

  return (
    <div className="algo-deep-workspace">
      {/* 0. OVERVIEW: ALL CONCEPTS GRID */}
      {selectedConcept === 'overview' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Foundations</span>
              <span className="algo-domain-tag">Core Terminology</span>
            </div>
            <h2>Essential Distributed Systems Terminology</h2>
            <p className="algo-lead-text">
              First-principles definitions, why these mechanisms are required in distributed infrastructure, and concrete real-world engineering examples.
            </p>
          </div>

          <div className="concepts-doc-grid">
            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">01</span>
                <h3>Rate Limiting</h3>
              </div>
              <p>Restricting request frequency per client or IP to protect backend services from resource exhaustion.</p>
              <div className="concept-doc-example">
                <strong>Example:</strong> E-commerce orders API permits 20 req/min per tenant.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">02</span>
                <h3>Throttling &amp; HTTP 429</h3>
              </div>
              <p>Immediate rejection with status 429 and Retry-After header when a tenant exceeds quota.</p>
              <div className="concept-doc-example">
                <strong>Example:</strong> Returning <code>Retry-After: 4</code> stops client retry storms.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">03</span>
                <h3>API Gateway</h3>
              </div>
              <p>Reverse proxy perimeter handling authentication, TLS termination, and rate enforcement before backends.</p>
              <div className="concept-doc-example">
                <strong>Example:</strong> EdgeGate nodes in Mumbai, Frankfurt, Virginia enforcing policies in &lt;1ms.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">04</span>
                <h3>Latency (LAN vs WAN)</h3>
              </div>
              <p>Round-trip packet time. Sub-millisecond in local RAM; 150ms–250ms across trans-oceanic fiber.</p>
              <div className="concept-doc-example">
                <strong>Example:</strong> In-memory edge checks avoid 200ms round trips to Virginia.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">05</span>
                <h3>Network Jitter</h3>
              </div>
              <p>Variance in packet arrival latency over time across network hops.</p>
              <div className="concept-doc-example">
                <strong>Example:</strong> 40ms jitter buffer prevents false node timeout declarations.
              </div>
            </article>

            <article className="concept-doc-box">
              <div className="concept-doc-head">
                <span className="concept-doc-num">06</span>
                <h3>CAP Theorem</h3>
              </div>
              <p>Under network partitions, distributed nodes must choose Consistency or Availability.</p>
              <div className="concept-doc-example">
                <strong>Example:</strong> EdgeGate Bounded Fallback preserves availability bounded to 1/N quota.
              </div>
            </article>
          </div>
        </section>
      )}

      {/* 1. RATE LIMITING */}
      {selectedConcept === 'rate-limiting' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Concept 01</span>
              <span className="algo-domain-tag">Traffic Control</span>
            </div>
            <h2>Rate Limiting Architecture</h2>
            <p className="algo-lead-text">
              A defensive barrier enforced at network perimeters to prevent noisy neighbors, runaway bots, and distributed denial-of-service traffic from exhausting backend CPU, memory, and database connections.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Perimeter Ingestion &amp; Admission Decision Flow</span>
              <span className="diagram-sub">Zero database locks on fast path</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="gen-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker id="gen-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
                  </marker>
                  <marker id="gen-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#dc2626" />
                  </marker>
                </defs>

                {/* Node 1: Incoming */}
                <rect x="20" y="65" width="130" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="85" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Client Traffic</text>
                <text x="85" y="103" textAnchor="middle" fill="#64748b" fontSize="10">API / Web / Mobile</text>

                <line x1="150" y1="90" x2="195" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#gen-arrow)" />

                {/* Node 2: Rate Limit Filter */}
                <rect x="200" y="65" width="160" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="280" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Extract Identity Key</text>
                <text x="280" y="103" textAnchor="middle" fill="#64748b" fontSize="10">IP or API Tenant Key</text>

                <line x1="360" y1="90" x2="410" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#gen-arrow)" />

                {/* Decision Diamond */}
                <polygon points="480,55 550,90 480,125 410,90" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="480" y="87" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Within Quota?</text>
                <text x="480" y="101" textAnchor="middle" fill="#3b82f6" fontSize="9">Usage &lt; Limit</text>

                {/* Branch YES */}
                <line x1="550" y1="90" x2="600" y2="50" stroke="#059669" strokeWidth="1.5" markerEnd="url(#gen-green)" />
                <rect x="605" y="25" width="195" height="50" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="702" y="47" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">Forward to Backend</text>
                <text x="702" y="62" textAnchor="middle" fill="#047857" fontSize="10">Proxy HTTP 200 Response</text>

                {/* Branch NO */}
                <line x1="550" y1="90" x2="600" y2="130" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#gen-red)" />
                <rect x="605" y="105" width="195" height="50" rx="6" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="702" y="127" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">Halt at Perimeter</text>
                <text x="702" y="142" textAnchor="middle" fill="#dc2626" fontSize="10">Return HTTP 429 Too Many Reqs</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>First Principles &amp; Need</h3>
              <p>
                In any multi-tenant system, shared resources (relational database connection pools, thread pools, and CPU cycles) are strictly finite.
              </p>
              <ul className="clean-bullet-list">
                <li><strong>Noisy Neighbor Defense:</strong> One customer running a runaway Python test script cannot monopolize backend bandwidth.</li>
                <li><strong>DoS Mitigation:</strong> Halts high-velocity credential stuffing and scraping attacks before business logic executes.</li>
                <li><strong>Tiered Monetization:</strong> Directly enforces SLA tiers (Free: 20 req/min vs Pro: 200 req/min).</li>
              </ul>
            </div>

            <div className="deep-info-block">
              <h3>Real-World Case Study</h3>
              <p>
                <strong>Stripe API Gateway:</strong> Stripe processes billions in transactions daily. Their rate limiter operates in four layers:
              </p>
              <div className="code-box">
                <code>1. Request rate limiter (HTTP 429)</code>
                <code>2. Concurrent request limiter (load shedding)</code>
                <code>3. Fleet usage limiter (CPU protection)</code>
                <code>4. Critical infrastructure protection</code>
              </div>
              <p className="mt-2 text-muted">
                EdgeGate adopts the Layer 1 &amp; Layer 2 design, evaluating request tokens in regional RAM in sub-millisecond execution time.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. THROTTLING & HTTP 429 */}
      {selectedConcept === 'throttling' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Concept 02</span>
              <span className="algo-domain-tag">Protocol Standard</span>
            </div>
            <h2>Throttling &amp; The HTTP 429 Protocol Contract</h2>
            <p className="algo-lead-text">
              RFC 6585 defines the standard behavior when an API client exceeds its rate limit. Compliant gateways must not simply drop packets; they communicate backoff intervals explicitly.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">HTTP 429 Handshake &amp; SDK Backoff Timeline</span>
              <span className="diagram-sub">How clients coordinate backoff using Retry-After</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 160" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Timeline axis */}
                <line x1="40" y1="80" x2="780" y2="80" stroke="#94a3b8" strokeWidth="2" />

                {/* Request 1: 429 */}
                <circle cx="160" cy="80" r="7" fill="#dc2626" />
                <rect x="90" y="20" width="140" height="42" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
                <text x="160" y="38" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">Request Rejected</text>
                <text x="160" y="52" textAnchor="middle" fill="#dc2626" fontSize="9">HTTP 429 · Retry-After: 3s</text>

                {/* Sleep interval */}
                <rect x="220" y="70" width="280" height="20" fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="3 3" />
                <text x="360" y="84" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="600">Client SDK sleeps for 3 seconds (Exponential Backoff + Jitter)</text>

                {/* Token refill */}
                <circle cx="500" cy="80" r="7" fill="#0284c7" />
                <text x="500" y="115" textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="600">Tokens Replenished</text>

                {/* Retry request */}
                <circle cx="640" cy="80" r="7" fill="#059669" />
                <rect x="570" y="20" width="140" height="42" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="640" y="38" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">Retry Admitted</text>
                <text x="640" y="52" textAnchor="middle" fill="#047857" fontSize="9">HTTP 200 OK</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Standard Headers Enforced by EdgeGate</h3>
              <div className="code-box">
                <code>HTTP/1.1 429 Too Many Requests</code>
                <code>Retry-After: 3</code>
                <code>X-RateLimit-Limit: 20</code>
                <code>X-RateLimit-Remaining: 0</code>
                <code>X-RateLimit-Reset: 1718000060</code>
              </div>
              <p className="mt-2">
                Providing <code>Retry-After</code> prevents clients from entering a tight CPU spin retry loop, which would cause an accidental self-inflicted DDoS attack on the gateway.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Everyday Analogy</h3>
              <p>
                Imagine a bank branch with 5 tellers. When the lobby is full, the bank guard doesn't slam the door permanently; he points to a digital sign stating: <em>"Please wait 30 seconds outside until the next customer departs."</em>
              </p>
              <div className="analogy-banner-strip mt-2">
                <div>
                  <strong>Key Takeaway:</strong> Throttling is not failure; it is graceful backpressure that keeps infrastructure operating at peak efficiency under heavy load.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. API GATEWAY PERIMETER */}
      {selectedConcept === 'api-gateway' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Concept 03</span>
              <span className="algo-domain-tag">Perimeter Routing</span>
            </div>
            <h2>API Gateway Perimeter Architecture</h2>
            <p className="algo-lead-text">
              The API Gateway is a dedicated high-performance reverse proxy that sits at the perimeter between clients and upstream microservices, offloading cross-cutting operational concerns.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">EdgeGate Reverse Proxy &amp; Request Lifecycle</span>
              <span className="diagram-sub">Edge interception vs Backend Origin protection</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Client Layer */}
                <rect x="20" y="65" width="130" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="85" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">External Caller</text>
                <text x="85" y="103" textAnchor="middle" fill="#64748b" fontSize="10">Untrusted Network</text>

                <line x1="150" y1="90" x2="220" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#gen-arrow)" />

                {/* Gateway Boundary Box */}
                <rect x="230" y="25" width="310" height="130" rx="8" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="385" y="45" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">EdgeGate Perimeter Gateway</text>

                <rect x="250" y="60" width="120" height="40" rx="4" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" />
                <text x="310" y="80" textAnchor="middle" fill="#1e3a8a" fontSize="10" fontWeight="600">Auth &amp; Key Check</text>
                <text x="310" y="93" textAnchor="middle" fill="#64748b" fontSize="8">x-api-key</text>

                <line x1="370" y1="80" x2="400" y2="80" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#gen-arrow)" />

                <rect x="405" y="60" width="120" height="40" rx="4" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" />
                <text x="465" y="80" textAnchor="middle" fill="#1e3a8a" fontSize="10" fontWeight="600">Rate Limiter</text>
                <text x="465" y="93" textAnchor="middle" fill="#0284c7" fontSize="8">&lt; 1ms RAM Check</text>

                <line x1="540" y1="90" x2="610" y2="90" stroke="#059669" strokeWidth="2" markerEnd="url(#gen-green)" />

                {/* Protected Backend */}
                <rect x="620" y="50" width="170" height="80" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
                <text x="705" y="80" textAnchor="middle" fill="#14532d" fontSize="12" fontWeight="600">Protected Backend</text>
                <text x="705" y="98" textAnchor="middle" fill="#15803d" fontSize="10">Orders Microservice</text>
                <text x="705" y="112" textAnchor="middle" fill="#166534" fontSize="9">Database Connection Pool</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Perimeter Decoupling</h3>
              <p>
                Without a gateway, every microservice developer must re-implement rate limiting, JWT token parsing, TLS certificates, and retry handling.
              </p>
              <ul className="clean-bullet-list">
                <li><strong>Single Security Boundary:</strong> Malicious traffic is terminated at the edge before it enters internal VPCs.</li>
                <li><strong>Clean Microservice Code:</strong> Business services receive pre-authenticated, rate-verified HTTP requests.</li>
                <li><strong>Telemetry Concentration:</strong> Centralized metrics and logging across all tenant traffic.</li>
              </ul>
            </div>

            <div className="deep-info-block">
              <h3>EdgeGate Deployment Model</h3>
              <p>
                In EdgeGate, 3 regional instances (Mumbai, Frankfurt, Virginia) run close to global end-users:
              </p>
              <div className="code-box">
                <code>mumbai.edgegate.internal    [ap-south-1]</code>
                <code>frankfurt.edgegate.internal [eu-central-1]</code>
                <code>virginia.edgegate.internal  [us-east-1]</code>
              </div>
              <p className="mt-2 text-muted">
                Each node makes instant local decisions in memory while synchronizing quota asynchronously with the central coordinator.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4. LATENCY (LAN VS WAN) */}
      {selectedConcept === 'latency' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Concept 04</span>
              <span className="algo-domain-tag">Physical Geography</span>
            </div>
            <h2>Network Latency: LAN vs WAN Physics</h2>
            <p className="algo-lead-text">
              The fundamental constraint of distributed systems: while memory lookups execute in nanoseconds, light traveling through fiber optic cables cannot exceed the speed of light in glass (~200,000 km/s).
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Latency Hierarchy: In-Memory vs Cross-Continental Round Trips</span>
              <span className="diagram-sub">Why EdgeGate avoids synchronous WAN calls on the request path</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 160" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Level 1: RAM */}
                <rect x="30" y="20" width="180" height="36" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="120" y="42" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">Node RAM: &lt; 0.001 ms</text>

                {/* Level 2: LAN */}
                <rect x="30" y="65" width="280" height="36" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                <text x="170" y="87" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Local Data Center (LAN): ~1 ms</text>

                {/* Level 3: Cross Continent WAN */}
                <rect x="30" y="110" width="760" height="36" rx="4" fill="#fee2e2" stroke="#fecaca" strokeWidth="1" />
                <text x="410" y="132" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">
                  Trans-Oceanic WAN (Mumbai &harr; Virginia): 180 ms &ndash; 250 ms (Light in Glass Barrier)
                </text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The Architectural Dilemma</h3>
              <p>
                Suppose a gateway in Mumbai queries a centralized Redis database in Virginia on every incoming HTTP request:
              </p>
              <div className="code-box">
                <code>User in Singapore clicks "Add to Cart"</code>
                <code>Mumbai Edge receives packet: +10ms</code>
                <code>Mumbai queries Virginia DB:   +220ms (WAN RTT)</code>
                <code>Total request overhead:      = 230ms delay!</code>
              </div>
              <p className="mt-2">
                This degrades user experience and destroys throughput.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>EdgeGate Solution: Lease Decoupling</h3>
              <p>
                EdgeGate executes request admission purely against local RAM tokens in <strong>&lt;0.5ms</strong>.
              </p>
              <ul className="clean-bullet-list">
                <li><strong>No WAN wait on request path:</strong> Customers experience sub-millisecond gateway overhead.</li>
                <li><strong>Asynchronous batch sync:</strong> The 200ms WAN ping happens in the background every 1 second, completely decoupled from user clicks.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* 5. JITTER */}
      {selectedConcept === 'jitter' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Concept 05</span>
              <span className="algo-domain-tag">Network Variance</span>
            </div>
            <h2>Network Jitter &amp; Heartbeat Drift</h2>
            <p className="algo-lead-text">
              Jitter is the statistical fluctuation in network delay over time. In real-world internet routing, consecutive packets rarely arrive with identical timing.
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Packet Departure vs Jittered Arrival Timeline</span>
              <span className="diagram-sub">Why background consensus protocols require jitter buffering</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 160" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Top timeline: Edge Send */}
                <line x1="40" y1="45" x2="780" y2="45" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="40" y="30" fill="#475569" fontSize="10" fontWeight="600">Edge Sends Heartbeats (Exact 1000ms intervals):</text>
                <circle cx="150" cy="45" r="5" fill="#3b82f6" />
                <text x="150" y="62" textAnchor="middle" fill="#64748b" fontSize="9">t=0s</text>
                <circle cx="350" cy="45" r="5" fill="#3b82f6" />
                <text x="350" y="62" textAnchor="middle" fill="#64748b" fontSize="9">t=1.0s</text>
                <circle cx="550" cy="45" r="5" fill="#3b82f6" />
                <text x="550" y="62" textAnchor="middle" fill="#64748b" fontSize="9">t=2.0s</text>

                {/* Bottom timeline: Coordinator Receive */}
                <line x1="40" y1="120" x2="780" y2="120" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="40" y="105" fill="#475569" fontSize="10" fontWeight="600">Coordinator Receives (Jittered across internet routers):</text>
                <circle cx="180" cy="120" r="5" fill="#059669" />
                <text x="180" y="140" textAnchor="middle" fill="#047857" fontSize="9">t=0.15s (150ms)</text>
                <circle cx="410" cy="120" r="5" fill="#059669" />
                <text x="410" y="140" textAnchor="middle" fill="#047857" fontSize="9">t=1.35s (350ms delay!)</text>
                <circle cx="580" cy="120" r="5" fill="#059669" />
                <text x="580" y="140" textAnchor="middle" fill="#047857" fontSize="9">t=2.15s (150ms)</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The False-Positive Crash Threat</h3>
              <p>
                If the central coordinator had a strict 1050ms timeout, the packet arriving at 1350ms would trigger a false-positive node failure declaration, prematurely revoking regional leases and causing unnecessary flapping.
              </p>
              <div className="code-box">
                <code>Safety Buffer = Max_Latency + (2 * Max_Jitter)</code>
                <code>Lease TTL = 3 * SyncInterval (3000ms safety window)</code>
              </div>
            </div>

            <div className="deep-info-block">
              <h3>Chaos Testing in EdgeGate</h3>
              <p>
                You can inject up to <strong>100ms of random jitter</strong> in Configuration &gt; Network Emulation.
              </p>
              <p className="mt-2">
                Observe the node telemetry: despite uneven packet arrival, the lease migration engine remains completely stable without false disconnects.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 6. CAP THEOREM */}
      {selectedConcept === 'cap-theorem' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Concept 06</span>
              <span className="algo-domain-tag">Theoretical Guarantee</span>
            </div>
            <h2>CAP Theorem in Edge Gateways</h2>
            <p className="algo-lead-text">
              In any distributed system subject to network partitions ($P$), you cannot simultaneously maintain absolute consistency ($C$) and 100% availability ($A$).
            </p>
          </div>

          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">The Three Architectural Choices under Network Partition</span>
              <span className="diagram-sub">Fail Open vs Fail Closed vs EdgeGate Bounded Fallback</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Option 1: Fail Closed */}
                <rect x="30" y="25" width="225" height="130" rx="6" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="142" y="50" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">Option A: Fail Closed</text>
                <text x="142" y="68" textAnchor="middle" fill="#dc2626" fontSize="10">Prioritize Consistency (CP)</text>
                <text x="142" y="95" textAnchor="middle" fill="#475569" fontSize="9">Reject all traffic if isolated</text>
                <text x="142" y="112" textAnchor="middle" fill="#475569" fontSize="9">Flaw: Legitimate users suffer</text>
                <text x="142" y="130" textAnchor="middle" fill="#b91c1c" fontSize="9" fontWeight="600">Outage for customers</text>

                {/* Option 2: Fail Open */}
                <rect x="295" y="25" width="225" height="130" rx="6" fill="#fffbeb" stroke="#fde68a" strokeWidth="1.5" />
                <text x="407" y="50" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="600">Option B: Fail Open</text>
                <text x="407" y="68" textAnchor="middle" fill="#d97706" fontSize="10">Prioritize Availability (AP)</text>
                <text x="407" y="95" textAnchor="middle" fill="#475569" fontSize="9">Admit all traffic without limit</text>
                <text x="407" y="112" textAnchor="middle" fill="#475569" fontSize="9">Flaw: Backend origin collapses</text>
                <text x="407" y="130" textAnchor="middle" fill="#b45309" fontSize="9" fontWeight="600">Unchecked traffic flood</text>

                {/* Option 3: Bounded Fallback (EdgeGate) */}
                <rect x="560" y="25" width="230" height="130" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="2" />
                <text x="675" y="50" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">EdgeGate: Bounded Fallback</text>
                <text x="675" y="68" textAnchor="middle" fill="#059669" fontSize="10">Engineered Pragmatism</text>
                <text x="675" y="95" textAnchor="middle" fill="#334155" fontSize="9">Node enforces Limit / N in RAM</text>
                <text x="675" y="112" textAnchor="middle" fill="#334155" fontSize="9">Keeps service available</text>
                <text x="675" y="130" textAnchor="middle" fill="#047857" fontSize="9" fontWeight="600">Protected backend origin!</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The Bounded Fallback Invariant</h3>
              <p>
                When an edge node detects lease loss (3 consecutive failed sync heartbeats), it switches into local fallback:
              </p>
              <div className="formula-box">
                <code>LocalFallbackQuota = floor(GlobalLimit / TotalNodeCount)</code>
                <code>For Free Tier (Limit = 20, 3 Nodes): 20 / 3 = 6 requests</code>
              </div>
              <p className="mt-2">
                This guarantees that even if all 3 nodes become completely partitioned simultaneously, the total admitted requests across the planet cannot exceed <strong>$3 \times 6 = 18 \le 20$</strong>!
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Hands-On Verification</h3>
              <p>
                Test this live in <strong>Scenario 4: Network Partition &amp; CAP Trade-offs</strong>:
              </p>
              <ul className="clean-bullet-list">
                <li>Disconnect the Virginia edge node card.</li>
                <li>Watch Virginia enter <strong>Local fallback</strong> mode.</li>
                <li>Send 10 requests: exactly 6 are admitted, and request 7 is throttled locally with HTTP 429!</li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

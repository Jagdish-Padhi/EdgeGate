import { useState } from 'react';

export function AlgorithmsDeepDive({ selectedAlgo: propSelected } = {}) {
  const [internalAlgo] = useState('overview');
  const selectedAlgo = propSelected !== undefined ? propSelected : internalAlgo;

  return (
    <div className="algo-deep-workspace">
      {/* OVERVIEW / COMPARATIVE MATRIX */}
      {selectedAlgo === 'overview' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Architectural Comparison</span>
              <span className="algo-domain-tag">Engineering Trade-offs</span>
            </div>
            <h2>Comparative Analysis of Rate Limiting Algorithms</h2>
            <p className="algo-lead-text">
              Every rate limiting algorithm makes a fundamental engineering trade-off between <strong>memory consumption</strong>, <strong>CPU time complexity</strong>, <strong>burst tolerance</strong>, and <strong>distributed consistency</strong>.
            </p>
          </div>

          <div className="matrix-table-wrapper">
            <table className="algo-comparison-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Time Complexity</th>
                  <th>Space / Tenant</th>
                  <th>Burst Handling</th>
                  <th>Boundary Spikes</th>
                  <th>Production Fit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Fixed Window</strong></td>
                  <td><code>O(1)</code></td>
                  <td><code>8 Bytes</code> (1 int)</td>
                  <td>Poor (rejects bursts)</td>
                  <td><span className="table-bad">Severe (2x burst)</span></td>
                  <td>Simple internal tools, low concurrency</td>
                </tr>
                <tr>
                  <td><strong>Sliding Window Log</strong></td>
                  <td><code>O(log N)</code></td>
                  <td><code>O(N)</code> (all timestamps)</td>
                  <td>Poor (strict log)</td>
                  <td><span className="table-ok">None (100% smooth)</span></td>
                  <td>Low-traffic high-security endpoints (Auth)</td>
                </tr>
                <tr>
                  <td><strong>Sliding Window Counter</strong></td>
                  <td><code>O(1)</code></td>
                  <td><code>16 Bytes</code> (2 ints)</td>
                  <td>Moderate</td>
                  <td><span className="table-ok">Bounded (&lt;0.05% error)</span></td>
                  <td>High-throughput central gateways (Cloudflare)</td>
                </tr>
                <tr className="highlight-row">
                  <td><strong>Token Bucket</strong></td>
                  <td><code>O(1)</code></td>
                  <td><code>16 Bytes</code> (tokens + ts)</td>
                  <td><span className="table-ok">Excellent (capacity B)</span></td>
                  <td><span className="table-ok">None (drip refill)</span></td>
                  <td>Modern API Gateways (Stripe, GitHub, Envoy, EdgeGate)</td>
                </tr>
                <tr>
                  <td><strong>Leaky Bucket</strong></td>
                  <td><code>O(1)</code></td>
                  <td><code>O(B)</code> (queue buffer)</td>
                  <td>Smooths bursts into queue</td>
                  <td><span className="table-ok">None (constant drain)</span></td>
                  <td>Traffic shaping, message brokers, streaming APIs</td>
                </tr>
                <tr className="highlight-row">
                  <td><strong>Distributed Leases (EdgeGate)</strong></td>
                  <td><code>&lt; 1 ms</code> in RAM</td>
                  <td><code>O(1)</code> at edge</td>
                  <td><span className="table-ok">Local burst in RAM</span></td>
                  <td><span className="table-ok">Bounded (Sliding Central)</span></td>
                  <td>Multi-region global gateways (EdgeGate)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="algo-selection-guide-grid">
            <div className="selection-guide-card">
              <h4>When to choose Token Bucket?</h4>
              <p>
                When your APIs serve real-world interactive human traffic (browsers loading dashboards, mobile apps making parallel asset requests). It absorbs bursts up to capacity $B$ while maintaining a flat rolling average.
              </p>
            </div>
            <div className="selection-guide-card">
              <h4>When to choose Leaky Bucket?</h4>
              <p>
                When your downstream dependencies (e.g., third-party payment processors or legacy databases) collapse under concurrent bursts and strictly require a predictable, constant requests-per-second stream.
              </p>
            </div>
            <div className="selection-guide-card">
              <h4>When to choose Sliding Window Counter?</h4>
              <p>
                When you need global consistency across millions of keys with near-zero memory footprint (16 bytes) and can tolerate an imperceptible approximation error (&lt;0.05%).
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 1. FIXED WINDOW COUNTER */}
      {selectedAlgo === 'fixed-window' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Algorithm 01</span>
              <span className="algo-domain-tag">Discrete Time Slices</span>
            </div>
            <h2>Fixed Window Counter Algorithm</h2>
            <p className="algo-lead-text">
              The simplest rate limiting algorithm. Divides the timeline into fixed, non-overlapping intervals (e.g. 60-second windows) and increments an integer counter for each incoming request.
            </p>
          </div>

          {/* Standard Flow Diagram */}
          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">System Execution Flow &amp; Decision Path</span>
              <span className="diagram-sub">Atomic evaluation on request ingestion</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Defs for markers */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
                  </marker>
                  <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#dc2626" />
                  </marker>
                </defs>

                {/* Node 1: Request Arrival */}
                <rect x="15" y="65" width="130" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="80" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Client Request</text>
                <text x="80" y="103" textAnchor="middle" fill="#64748b" fontSize="10">GET /api/orders</text>

                {/* Arrow 1 */}
                <line x1="145" y1="90" x2="185" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

                {/* Node 2: Key Resolution */}
                <rect x="190" y="65" width="150" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="265" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Calculate Window Key</text>
                <text x="265" y="103" textAnchor="middle" fill="#64748b" fontSize="10">key:floor(t / 60)</text>

                {/* Arrow 2 */}
                <line x1="340" y1="90" x2="385" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

                {/* Node 3: Condition Diamond */}
                <polygon points="450,55 520,90 450,125 380,90" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="450" y="87" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Count &lt; Limit?</text>
                <text x="450" y="101" textAnchor="middle" fill="#3b82f6" fontSize="9">e.g. 15 &lt; 20</text>

                {/* Branch YES (Top Right) */}
                <line x1="520" y1="90" x2="570" y2="50" stroke="#059669" strokeWidth="1.5" markerEnd="url(#arrow-green)" />
                <rect x="575" y="25" width="220" height="50" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="685" y="47" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">HTTP 200 OK (Allowed)</text>
                <text x="685" y="62" textAnchor="middle" fill="#047857" fontSize="10">Atomic INCR key; Proxy to Origin</text>

                {/* Branch NO (Bottom Right) */}
                <line x1="520" y1="90" x2="570" y2="130" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#arrow-red)" />
                <rect x="575" y="105" width="220" height="50" rx="6" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="685" y="127" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">HTTP 429 Too Many Requests</text>
                <text x="685" y="142" textAnchor="middle" fill="#dc2626" fontSize="10">Append Retry-After: (60 - t % 60)</text>
              </svg>
            </div>
          </div>

          {/* Boundary Spike Vulnerability Diagram */}
          <div className="flow-diagram-container failure-artifact-card">
            <div className="diagram-header">
              <span className="diagram-title text-bad">The Fatal Flaw: The 2× Boundary Burst Vulnerability</span>
              <span className="diagram-sub">Why naive discrete windows crash downstream databases</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 150" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Timeline axis */}
                <line x1="40" y1="80" x2="780" y2="80" stroke="#94a3b8" strokeWidth="2" />

                {/* Window 1 */}
                <rect x="80" y="30" width="310" height="40" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="4" />
                <text x="235" y="55" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">Window 1 (12:00:00 – 12:01:00) · Limit: 100</text>

                {/* Window 2 */}
                <rect x="410" y="30" width="310" height="40" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="4" />
                <text x="565" y="55" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">Window 2 (12:01:00 – 12:02:00) · Limit: 100</text>

                {/* Boundary marker */}
                <line x1="400" y1="20" x2="400" y2="105" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 4" />
                <text x="400" y="125" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="600">Reset Boundary (12:01:00)</text>

                {/* Spike 1: 12:00:59 */}
                <rect x="330" y="85" width="60" height="28" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
                <text x="360" y="103" textAnchor="middle" fill="#991b1b" fontSize="10" fontWeight="600">100 reqs</text>

                {/* Spike 2: 12:01:01 */}
                <rect x="410" y="85" width="60" height="28" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
                <text x="440" y="103" textAnchor="middle" fill="#991b1b" fontSize="10" fontWeight="600">100 reqs</text>

                {/* 2-second burst bracket */}
                <path d="M 330 118 L 470 118" stroke="#dc2626" strokeWidth="2" />
                <text x="400" y="142" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="600">
                  Critical Vulnerability: 200 Requests Admitted in 2 Seconds (2× Allowed Quota!)
                </text>
              </svg>
            </div>
          </div>

          {/* Deep Content Grid: Math & Code */}
          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Mathematical Specification</h3>
              <p>Given current epoch time $t$, window duration $W$, and rate limit $L$:</p>
              <div className="code-box">
                <code>Window Index = floor(t / W)</code>
                <code>Tenant Key  = &quot;rate:&quot; + tenantId + &quot;:&quot; + Window Index</code>
                <code>Condition   = if (Counter[Tenant Key] &lt; L) ALLOW else DROP</code>
              </div>
            </div>

            <div className="deep-info-block">
              <h3>Algorithmic Pseudo-code (Redis Atomic)</h3>
              <div className="code-box">
                <pre>{`// Redis Lua script execution
local key = "rate:" .. KEYS[1] .. ":" .. math.floor(ARGV[1] / ARGV[2])
local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, ARGV[2] * 2)
end
if current > tonumber(ARGV[3]) then
  return 0 // HTTP 429 Blocked
end
return 1   // HTTP 200 OK`}</pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. SLIDING WINDOW LOG */}
      {selectedAlgo === 'sliding-log' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Algorithm 02</span>
              <span className="algo-domain-tag">Exact Timestamp History</span>
            </div>
            <h2>Sliding Window Log Algorithm</h2>
            <p className="algo-lead-text">
              Eliminates the boundary burst problem completely. Rather than partitioning time into fixed blocks, it records the exact Unix timestamp of every request in a sorted log and counts the entries within the continuous interval $[t - W, t]$.
            </p>
          </div>

          {/* Standard Flow Diagram */}
          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Sliding Log Continuous Rolling Window Architecture</span>
              <span className="diagram-sub">Sorted Set (ZSET) timestamp eviction and cardinality check</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Node 1: Request */}
                <rect x="15" y="65" width="130" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="80" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Request at t</text>
                <text x="80" y="103" textAnchor="middle" fill="#64748b" fontSize="10">t = 1698000042</text>

                <line x1="145" y1="90" x2="185" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

                {/* Node 2: Purge Stale */}
                <rect x="190" y="65" width="160" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="270" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Purge Stale Timestamps</text>
                <text x="270" y="103" textAnchor="middle" fill="#64748b" fontSize="10">ZREMRANGEBYSCORE &lt; (t - W)</text>

                <line x1="350" y1="90" x2="395" y2="90" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

                {/* Node 3: Cardinality */}
                <polygon points="460,55 530,90 460,125 390,90" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="460" y="87" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">ZCARD &lt; Limit?</text>
                <text x="460" y="101" textAnchor="middle" fill="#3b82f6" fontSize="9">Current Log Size</text>

                {/* Branch Allowed */}
                <line x1="530" y1="90" x2="575" y2="50" stroke="#059669" strokeWidth="1.5" markerEnd="url(#arrow-green)" />
                <rect x="580" y="25" width="225" height="50" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="692" y="47" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">HTTP 200 OK</text>
                <text x="692" y="62" textAnchor="middle" fill="#047857" fontSize="10">ZADD key t t; Set Key TTL</text>

                {/* Branch Blocked */}
                <line x1="530" y1="90" x2="575" y2="130" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#arrow-red)" />
                <rect x="580" y="105" width="225" height="50" rx="6" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="692" y="127" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">HTTP 429 Throttled</text>
                <text x="692" y="142" textAnchor="middle" fill="#dc2626" fontSize="10">Do NOT insert timestamp into log</text>
              </svg>
            </div>
          </div>

          {/* Deep Content Grid */}
          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The Memory Explosion Problem</h3>
              <p>
                While 100% accurate, storing every timestamp in memory creates massive space complexity.
              </p>
              <div className="table-wrapper">
                <table className="mini-stat-table">
                  <tbody>
                    <tr>
                      <td>Tenant with 500 req/min limit:</td>
                      <td><code>~32 KB / tenant</code></td>
                    </tr>
                    <tr>
                      <td>100,000 active tenants in memory:</td>
                      <td><span className="table-bad">3.2 GB of RAM!</span></td>
                    </tr>
                    <tr>
                      <td>Time complexity per lookup:</td>
                      <td><code>O(log N + M)</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-muted">
                Unsuitable for high-throughput public APIs; reserved for critical auth/login brute-force guards.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>Redis Sorted Set Implementation</h3>
              <div className="code-box">
                <pre>{`// Redis Lua Sliding Log Implementation
local key = "log:" .. KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

// Step 1: Remove timestamps older than window
redis.call("ZREMRANGEBYSCORE", key, "-inf", clearBefore)

// Step 2: Check current log size
local count = redis.call("ZCARD", key)
if count < limit then
  // Step 3: Insert current request timestamp
  redis.call("ZADD", key, now, now)
  redis.call("EXPIRE", key, window)
  return 1 // Admitted
else
  return 0 // Throttled
end`}</pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. SLIDING WINDOW COUNTER */}
      {selectedAlgo === 'sliding-counter' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Algorithm 03</span>
              <span className="algo-domain-tag">Hybrid Approximation</span>
            </div>
            <h2>Sliding Window Counter (Weighted Interpolation)</h2>
            <p className="algo-lead-text">
              Combines the fixed window’s minimal $O(1)$ memory with the sliding log’s boundary smoothness. By tracking only 2 counters (previous window and current window), it estimates real-time traffic using weighted time interpolation.
            </p>
          </div>

          {/* Visual Formula & Weighting Diagram */}
          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Weighted Rolling Average Mechanism</span>
              <span className="diagram-sub">Only 2 integers stored per tenant (16 Bytes)</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 160" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Previous Window Bar */}
                <rect x="80" y="30" width="300" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" rx="4" />
                <text x="230" y="55" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">Previous Window (Requests: 80)</text>

                {/* Current Window Bar */}
                <rect x="400" y="30" width="300" height="40" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" rx="4" />
                <text x="550" y="55" textAnchor="middle" fill="#0369a1" fontSize="12" fontWeight="600">Current Window (Requests: 30)</text>

                {/* Sliding 60s Bracket overlapping both */}
                <rect x="250" y="85" width="360" height="36" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" rx="4" />
                <text x="430" y="108" textAnchor="middle" fill="#15803d" fontSize="12" fontWeight="600">
                  Sliding Rolling 60s Window = (80 × 30%) + 30 = 54 Requests
                </text>

                {/* Percentage Annotations */}
                <line x1="250" y1="72" x2="380" y2="72" stroke="#059669" strokeWidth="2" />
                <text x="315" y="68" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="600">30% Overlap</text>

                <line x1="400" y1="72" x2="610" y2="72" stroke="#0284c7" strokeWidth="2" />
                <text x="505" y="68" textAnchor="middle" fill="#0284c7" fontSize="10" fontWeight="600">70% Elapsed</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The Interpolation Formula</h3>
              <div className="formula-box">
                <code>Weight_prev = 1 - (t - WindowStart) / WindowDuration</code>
                <code>EstimatedCount = (Count_prev * Weight_prev) + Count_curr</code>
              </div>
              <p className="mt-2">
                <strong>Why Cloudflare uses it:</strong> It assumes uniform distribution across the previous window. In tests across billions of requests, the error rate against an exact sliding log is less than <strong>0.05%</strong>, while using <strong>99.9% less memory</strong>.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>EdgeGate Coordinator Implementation</h3>
              <div className="code-box">
                <pre>{`// EdgeGate Sliding Window Evaluator
function estimateUsage(prevCount, currCount, windowSec, elapsedSec) {
  const remainingWeight = Math.max(0, 1 - (elapsedSec / windowSec));
  const estimated = Math.round((prevCount * remainingWeight) + currCount);
  return estimated;
}`}</pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. TOKEN BUCKET ALGORITHM */}
      {selectedAlgo === 'token-bucket' && (
        <section className="algo-article-card highlight-border">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag active">Industry Standard</span>
              <span className="algo-domain-tag">Burst Shock Absorber</span>
            </div>
            <h2>Token Bucket Algorithm</h2>
            <p className="algo-lead-text">
              The gold standard in production API gateways (Stripe, GitHub, Envoy, Amazon AWS). A bucket holds up to $B$ tokens and replenishes continuously at rate $r$. Incoming requests consume 1 token. When empty, requests are dropped immediately.
            </p>
          </div>

          {/* Standard Token Bucket Physical Vector Diagram */}
          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Token Reservoir, Drip Refill &amp; Drain Valve</span>
              <span className="diagram-sub">Pure in-memory sub-millisecond evaluation inside regional edge RAM</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 220" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Refill Spigot */}
                <rect x="180" y="10" width="80" height="20" rx="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                <text x="220" y="24" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="600">Refill Spigot</text>
                {/* Drip arrow */}
                <line x1="220" y1="30" x2="220" y2="60" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrow)" />
                <text x="310" y="45" fill="#0284c7" fontSize="11" fontWeight="600">Refill Rate r = Limit / Window (tokens/sec)</text>

                {/* The Bucket Reservoir */}
                <path d="M 160 65 L 170 170 L 270 170 L 280 65" stroke="#1e293b" strokeWidth="3" fill="#f8fafc" />
                {/* Water/Tokens in bucket */}
                <path d="M 167 120 L 170 170 L 270 170 L 273 120 Z" fill="#bae6fd" />
                <text x="220" y="145" textAnchor="middle" fill="#0369a1" fontSize="11" fontWeight="600">Current Tokens</text>
                <text x="220" y="160" textAnchor="middle" fill="#0284c7" fontSize="9">Cap: Burst B (e.g. 10)</text>

                {/* Arrow to Decision Valve */}
                <line x1="275" y1="145" x2="350" y2="145" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

                {/* Request Ingestion Node */}
                <rect x="355" y="120" width="130" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="420" y="143" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Incoming Request</text>
                <text x="420" y="157" textAnchor="middle" fill="#64748b" fontSize="10">Needs 1 Token</text>

                <line x1="485" y1="145" x2="525" y2="145" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

                {/* Decision Diamond */}
                <polygon points="570,120 615,145 570,170 525,145" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="570" y="142" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="600">Tokens &gt;= 1?</text>

                {/* Branch YES */}
                <line x1="615" y1="145" x2="655" y2="110" stroke="#059669" strokeWidth="1.5" markerEnd="url(#arrow-green)" />
                <rect x="660" y="85" width="145" height="45" rx="5" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                <text x="732" y="105" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">HTTP 200 Allowed</text>
                <text x="732" y="120" textAnchor="middle" fill="#047857" fontSize="9">tokens = tokens - 1</text>

                {/* Branch NO */}
                <line x1="615" y1="145" x2="655" y2="180" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#arrow-red)" />
                <rect x="660" y="160" width="145" height="45" rx="5" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" />
                <text x="732" y="180" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">HTTP 429 Blocked</text>
                <text x="732" y="194" textAnchor="middle" fill="#dc2626" fontSize="9">Retry-After: (1-tok)/r</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Continuous Time Refill Math</h3>
              <p>
                Unlike background timers that wake up on interval ticks, the token bucket refills lazily on request arrival:
              </p>
              <div className="formula-box">
                <code>deltaSec = (now - lastRefillAt) / 1000</code>
                <code>tokens = min(burstCapacity, tokens + (deltaSec * refillRate))</code>
                <code>lastRefillAt = now</code>
              </div>
              <p className="mt-2">
                This requires <strong>zero background timers or event loops</strong> per client, enabling millions of buckets to sleep in RAM at zero CPU cost.
              </p>
            </div>

            <div className="deep-info-block">
              <h3>EdgeGate In-Memory Token Bucket</h3>
              <div className="code-box">
                <pre>{`// EdgeGate Token Bucket Implementation (In-Memory)
function takeToken(bucket, cost = 1) {
  const now = performance.now();
  const elapsed = (now - bucket.lastRefillAt) / 1000;
  bucket.tokens = Math.min(
    bucket.burst,
    bucket.tokens + (elapsed * bucket.refillRate)
  );
  bucket.lastRefillAt = now;

  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    return { ok: true, retryAfter: 0 };
  }
  const waitSec = Math.ceil((cost - bucket.tokens) / bucket.refillRate);
  return { ok: false, retryAfter: waitSec };
}`}</pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. LEAKY BUCKET */}
      {selectedAlgo === 'leaky-bucket' && (
        <section className="algo-article-card">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag">Algorithm 05</span>
              <span className="algo-domain-tag">Traffic Shaping</span>
            </div>
            <h2>Leaky Bucket Algorithm</h2>
            <p className="algo-lead-text">
              Acts as a FIFO queue buffer that absorbs bursty, uneven traffic and releases (leaks) requests to backend services at a strictly constant, uniform speed.
            </p>
          </div>

          {/* Leaky Bucket Vector Diagram */}
          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">FIFO Inflow Funnel vs Constant Leak Rate</span>
              <span className="diagram-sub">Eliminates downstream concurrency spikes by smoothing traffic</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 180" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Inflow Bursts */}
                <rect x="20" y="30" width="130" height="40" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
                <text x="85" y="55" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">Bursty Input (50 reqs)</text>

                <line x1="150" y1="50" x2="210" y2="50" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-red)" />

                {/* Funnel Queue */}
                <path d="M 220 20 L 320 20 L 290 120 L 250 120 Z" stroke="#334155" strokeWidth="2" fill="#f8fafc" />
                <text x="270" y="60" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600">FIFO Queue</text>
                <text x="270" y="75" textAnchor="middle" fill="#64748b" fontSize="9">Cap: Buffer Size B</text>

                {/* Overflow drop */}
                <line x1="320" y1="20" x2="380" y2="40" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="440" y="45" fill="#dc2626" fontSize="10" fontWeight="600">Overflow Drops (HTTP 429)</text>

                {/* Constant Drain */}
                <line x1="270" y1="120" x2="270" y2="155" stroke="#059669" strokeWidth="2" markerEnd="url(#arrow-green)" />
                <rect x="330" y="130" width="220" height="40" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="440" y="155" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="600">
                  Constant Outflow (1 req every 100ms)
                </text>

                <line x1="550" y1="150" x2="620" y2="150" stroke="#059669" strokeWidth="2" markerEnd="url(#arrow-green)" />
                <rect x="625" y="130" width="160" height="40" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                <text x="705" y="155" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="600">Backend Origin</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>Key Difference: Token Bucket vs Leaky Bucket</h3>
              <p>
                Engineers frequently confuse these two algorithms. Their mechanical distinction is crucial:
              </p>
              <ul className="clean-bullet-list">
                <li>
                  <strong>Token Bucket:</strong> Allows bursts to pass through immediately at line rate as long as tokens are available. Tokens leak/drip in; requests blast out.
                </li>
                <li>
                  <strong>Leaky Bucket:</strong> Requests queue up and are released at a strictly constant, smoothed pace. Traffic blasts in; requests leak out smoothly.
                </li>
              </ul>
            </div>

            <div className="deep-info-block">
              <h3>When is Leaky Bucket Essential?</h3>
              <p>
                Ideal for legacy backend relational databases (e.g. Postgres / MySQL) that experience severe thread lock contention when 50 concurrent transactions land at the exact same millisecond. The leaky bucket flattens the spike into an even stream.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 6. EDGEGATE DISTRIBUTED LEASE MODEL */}
      {selectedAlgo === 'distributed-lease' && (
        <section className="algo-article-card highlight-border">
          <div className="algo-card-hero">
            <div className="algo-badge-row">
              <span className="algo-index-tag active">EdgeGate Engine</span>
              <span className="algo-domain-tag">Multi-Region Asynchronous Consensus</span>
            </div>
            <h2>EdgeGate Distributed Lease-Pool Architecture</h2>
            <p className="algo-lead-text">
              How EdgeGate achieves the holy grail: enforcing a single, unified global quota across multiple continents without incurring cross-ocean database latency on the request path.
            </p>
          </div>

          {/* Distributed Architecture SVG Diagram */}
          <div className="flow-diagram-container">
            <div className="diagram-header">
              <span className="diagram-title">Data Plane (&lt;1ms Local RAM) vs Control Plane (1s Background Leases)</span>
              <span className="diagram-sub">EdgeGate dual-plane multi-region synchronization topology</span>
            </div>
            <div className="svg-flow-wrapper">
              <svg viewBox="0 0 820 220" className="flow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 3 Regional Edges */}
                <g>
                  {/* Mumbai */}
                  <rect x="30" y="25" width="200" height="50" rx="6" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="130" y="47" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Mumbai Edge (ap-south-1)</text>
                  <text x="130" y="62" textAnchor="middle" fill="#0284c7" fontSize="10">RAM Token Bucket &lt;1ms</text>

                  {/* Frankfurt */}
                  <rect x="30" y="90" width="200" height="50" rx="6" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="130" y="112" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Frankfurt Edge (eu-central-1)</text>
                  <text x="130" y="127" textAnchor="middle" fill="#0284c7" fontSize="10">RAM Token Bucket &lt;1ms</text>

                  {/* Virginia */}
                  <rect x="30" y="155" width="200" height="50" rx="6" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="130" y="177" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600">Virginia Edge (us-east-1)</text>
                  <text x="130" y="192" textAnchor="middle" fill="#0284c7" fontSize="10">RAM Token Bucket &lt;1ms</text>
                </g>

                {/* Bi-directional asynchronous sync arrows */}
                <g stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4">
                  <line x1="230" y1="50" x2="490" y2="105" markerEnd="url(#arrow)" />
                  <line x1="230" y1="115" x2="490" y2="115" markerEnd="url(#arrow)" />
                  <line x1="230" y1="180" x2="490" y2="125" markerEnd="url(#arrow)" />
                </g>
                <text x="350" y="85" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">
                  1-Second Asynchronous Sync
                </text>

                {/* Central Coordinator */}
                <rect x="500" y="70" width="280" height="90" rx="8" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" />
                <text x="640" y="98" textAnchor="middle" fill="#14532d" fontSize="14" fontWeight="600">Central Coordinator</text>
                <text x="640" y="116" textAnchor="middle" fill="#15803d" fontSize="11">MongoDB Persistent Store</text>
                <text x="640" y="132" textAnchor="middle" fill="#047857" fontSize="10">Dynamic Leases · Idempotent Deduplication</text>
                <text x="640" y="148" textAnchor="middle" fill="#059669" fontSize="9">Sliding Window Counter ($O(1)$)</text>
              </svg>
            </div>
          </div>

          <div className="algo-deep-grid">
            <div className="deep-info-block">
              <h3>The 3 Distributed Guarantees</h3>
              <ul className="clean-bullet-list">
                <li>
                  <strong>Sub-millisecond P99:</strong> Edge nodes make admission decisions purely against process memory. No locks or synchronous WAN pings.
                </li>
                <li>
                  <strong>Zero Over-allocation:</strong> The sum of all active regional leases plus coordinator consumed count strictly satisfies: <code>&Sigma; Leases + Used &le; Global Limit</code>.
                </li>
                <li>
                  <strong>Elastic Rebalancing:</strong> When a flash crowd hits Mumbai, the coordinator reclaims unneeded quota from Frankfurt and transfers it to Mumbai on the next 1s cycle.
                </li>
              </ul>
            </div>

            <div className="deep-info-block">
              <h3>Idempotent Batch Synchronization</h3>
              <p>
                Lossy networks are guaranteed. Every sync report contains a monotonically increasing sequence ID. If an acknowledgment is dropped, the edge safely resends the exact same sequence number:
              </p>
              <div className="formula-box">
                <code>Report = {`{ nodeId: "mumbai", epoch: 3, seq: 104, deltaAllowed: 5 }`}</code>
                <code>Coordinator: if (lastSeq[mumbai] &gt;= 104) IGNORE_DUPLICATE;</code>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

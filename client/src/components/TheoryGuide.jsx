import { useState } from 'react';
import { BookOpen, CheckCircle, Database, Flame, HelpCircle, Layers, Network, ShieldAlert, Sliders, Zap } from 'lucide-react';

export function TheoryGuide() {
  const [activeTab, setActiveTab] = useState('analogy');

  return (
    <div className="theory-container" id="theory">
      <div className="theory-header">
        <p className="eyebrow">Interactive Learning Guide</p>
        <h1>How EdgeGate Works Under the Hood</h1>
        <p className="theory-lead">
          Understand distributed rate limiting through clear analogies, visual flows, and parameter explanations.
        </p>

        <div className="theory-nav">
          <button
            type="button"
            className={`theory-nav-btn ${activeTab === 'analogy' ? 'active' : ''}`}
            onClick={() => setActiveTab('analogy')}
          >
            <BookOpen size={16} /> 1. Real-World Analogy
          </button>
          <button
            type="button"
            className={`theory-nav-btn ${activeTab === 'lifecycle' ? 'active' : ''}`}
            onClick={() => setActiveTab('lifecycle')}
          >
            <Layers size={16} /> 2. Request Lifecycle
          </button>
          <button
            type="button"
            className={`theory-nav-btn ${activeTab === 'glossary' ? 'active' : ''}`}
            onClick={() => setActiveTab('glossary')}
          >
            <HelpCircle size={16} /> 3. Jargon Buster
          </button>
          <button
            type="button"
            className={`theory-nav-btn ${activeTab === 'parameters' ? 'active' : ''}`}
            onClick={() => setActiveTab('parameters')}
          >
            <Sliders size={16} /> 4. Parameter Impacts
          </button>
          <button
            type="button"
            className={`theory-nav-btn ${activeTab === 'chaos' ? 'active' : ''}`}
            onClick={() => setActiveTab('chaos')}
          >
            <ShieldAlert size={16} /> 5. Failure & Chaos Simulation
          </button>
        </div>
      </div>

      <div className="theory-content">
        {/* TAB 1: REAL WORLD ANALOGY */}
        {activeTab === 'analogy' && (
          <section className="theory-card">
            <h2>The Bank Vault & Regional Cashiers Analogy</h2>
            <p className="lead-text">
              Imagine a global company with an origin API server that can only handle <strong>100 requests per minute</strong>.
              If every request from Mumbai, Frankfurt, and Virginia called the central server to ask <em>"Can I enter?"</em>,
              two disasters happen:
            </p>

            <div className="analogy-grid">
              <div className="analogy-box bad">
                <ShieldAlert size={24} className="icon-bad" />
                <h3>Without EdgeGate (Naive Central Check)</h3>
                <ul>
                  <li><strong>Slow:</strong> Every request suffers 150ms+ cross-continental ping times just to check a counter.</li>
                  <li><strong>Central Bottleneck:</strong> The central rate-limiter crashes under the check traffic.</li>
                  <li><strong>Unfair Starvation:</strong> A bot script in one city can consume all 100 requests before other users wake up.</li>
                </ul>
              </div>

              <div className="analogy-box good">
                <CheckCircle size={24} className="icon-good" />
                <h3>With EdgeGate (Lease Delegation)</h3>
                <ul>
                  <li><strong>Local Speed:</strong> The Central Coordinator gives each regional edge a <em>"petty cash drawer"</em> (e.g. 20 tokens).</li>
                  <li><strong>Sub-Millisecond Decisions:</strong> When a user calls Mumbai, Mumbai checks its own local memory in &lt;1ms.</li>
                  <li><strong>Dynamic Fair Sharing:</strong> If Frankfurt is quiet and Mumbai gets busy, the coordinator automatically moves unused tokens to Mumbai!</li>
                </ul>
              </div>
            </div>

            <div className="analogy-banner">
              <Zap size={20} className="accent-icon" />
              <div>
                <strong>Key Takeaway:</strong> The coordinator hands out short-lived <em>leases</em> in the background. The client path never waits for the coordinator!
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: REQUEST LIFECYCLE */}
        {activeTab === 'lifecycle' && (
          <section className="theory-card">
            <h2>What Happens When a Request Arrives?</h2>
            <p className="lead-text">Here is the exact step-by-step path every single API request follows:</p>

            <div className="lifecycle-timeline">
              <div className="timeline-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Client calls regional edge</h3>
                  <p>
                    A user in Europe calls <code>GET /api/orders</code>. DNS routes them to the closest EdgeGate node (<strong>Frankfurt</strong>).
                  </p>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Local Memory Inspection (&lt;1ms)</h3>
                  <p>Frankfurt evaluates two things in local RAM without making any network call:</p>
                  <div className="step-subgrid">
                    <div className="sub-check">
                      <strong>A. Do I have a live Lease?</strong>
                      <span>Has the central coordinator granted Frankfurt remaining quota for this caller?</span>
                    </div>
                    <div className="sub-check">
                      <strong>B. Do I have Burst Tokens?</strong>
                      <span>Has the caller sent 10 requests in 5 milliseconds? (Token bucket prevents instant spikes).</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Immediate Admission or Perimeter Block</h3>
                  <p>
                    If tokens are available, Frankfurt forwards the request directly to <strong>Your Origin API</strong> (<code>200 OK</code>).
                    If tokens are exhausted, Frankfurt immediately returns <code>429 Too Many Requests</code> with a <code>Retry-After</code> header, protecting your origin backend completely.
                  </p>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>Background Reconciliation (Every ~1 second)</h3>
                  <p>
                    In the background, Frankfurt batches its admissions (e.g. <em>"I admitted 14 requests"</em>) and sends them to the Central Coordinator.
                    The Coordinator logs the global total in MongoDB and gives Frankfurt a refreshed quota lease for the next interval.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: JARGON BUSTER */}
        {activeTab === 'glossary' && (
          <section className="theory-card">
            <h2>Demystifying the Terminology</h2>
            <p className="lead-text">Clear definitions for every term you see on the dashboard:</p>

            <div className="glossary-grid">
              <div className="glossary-item">
                <span className="term-badge">Lease</span>
                <h3>Quota Lease</h3>
                <p>
                  A temporary permission slip given by the coordinator to a regional edge (e.g., <em>"Mumbai may admit up to 25 requests over the next 2 seconds"</em>).
                  Once expired or exhausted, the edge must sync to get more.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Burst</span>
                <h3>Token Bucket Burst</h3>
                <p>
                  Even if your limit is 60 requests/minute, you don't want a client firing 60 requests in the first 100 milliseconds.
                  The burst cap acts like a buffer that refills steadily, smoothing out spiky traffic.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Sliding Window</span>
                <h3>Two-Bucket Sliding Window</h3>
                <p>
                  Prevents the "boundary burst" exploit. If limits reset strictly at 12:00:00, an attacker could send 20 requests at 11:59:59 and another 20 at 12:00:01 (40 requests in 2 seconds!).
                  Sliding window smoothly blends the previous and current windows.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Fail Mode</span>
                <h3>Fail-Open vs Fail-Closed</h3>
                <p>
                  What should an edge do if an undersea fiber cable breaks and it cannot reach the coordinator?
                  <strong>Fail-Open:</strong> Keep allowing requests to avoid breaking the user app.
                  <strong>Fail-Closed:</strong> Block requests to guarantee the backend origin never overloads.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Partition</span>
                <h3>Network Partition</h3>
                <p>
                  A simulated network failure where an edge node is isolated from the central coordinator.
                  EdgeGate falls back to local safety math so the edge doesn't crash or guess wildly.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Sync Interval</span>
                <h3>Batch Sync Interval</h3>
                <p>
                  How often edges check in with the coordinator (default 1000ms).
                  Shorter intervals mean faster quota rebalancing between regions, while longer intervals reduce database load.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: PARAMETER IMPACTS */}
        {activeTab === 'parameters' && (
          <section className="theory-card">
            <h2>How Changing Parameters Impacts the System</h2>
            <p className="lead-text">Use the Settings drawer to tweak these parameters and observe the effect:</p>

            <div className="param-cards">
              <div className="param-row">
                <div className="param-header">
                  <Sliders size={18} className="param-icon" />
                  <div>
                    <strong>Rate Limit (e.g. Free Tier: 20 req / 60s)</strong>
                    <small>Settings → Rate Limit Tiers</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>What it controls:</strong> The absolute maximum requests a single customer or API key can make globally in that window.</p>
                  <p><strong>What you will observe:</strong> If you reduce Free tier from 20 to 10, sending a 30-request batch will cause red <code>429 Blocked</code> responses to appear much earlier.</p>
                </div>
              </div>

              <div className="param-row">
                <div className="param-header">
                  <Flame size={18} className="param-icon" />
                  <div>
                    <strong>Burst Capacity (e.g. 10 tokens)</strong>
                    <small>Settings → Rate Limit Tiers</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>What it controls:</strong> How many rapid back-to-back calls are tolerated before throttling kicks in, even if total quota is not yet exceeded.</p>
                  <p><strong>What you will observe:</strong> If Burst is 5, firing 15 requests in "Fast" mode will immediately throttle the 6th request with <code>Retry-After: 1</code>.</p>
                </div>
              </div>

              <div className="param-row">
                <div className="param-header">
                  <Network size={18} className="param-icon" />
                  <div>
                    <strong>Sync Interval (e.g. 1000ms vs 3000ms)</strong>
                    <small>Settings → Network Conditions</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>What it controls:</strong> How frequently edges report usage and re-negotiate leases.</p>
                  <p><strong>What you will observe:</strong> If one region experiences a huge traffic surge while sync interval is long (3000ms), it might temporarily throttle requests until the next sync cycle reallocates unused capacity from other idle regions.</p>
                </div>
              </div>

              <div className="param-row">
                <div className="param-header">
                  <Database size={18} className="param-icon" />
                  <div>
                    <strong>Simulated Chaos (Disconnect / Partition)</strong>
                    <small>Edge Card → Simulate a problem</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>What it controls:</strong> Simulates broken connectivity between an edge and the central coordinator.</p>
                  <p><strong>What you will observe:</strong> The edge transitions from "Coordinated" to "On its own" mode, using a conservative local fraction (limit ÷ 3 peers) to prevent origin overflow while flying blind.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 5: CHAOS & FAULT SIMULATION */}
        {activeTab === 'chaos' && (
          <section className="theory-card">
            <h2>Chaos Engineering: How EdgeGate Survives Disasters</h2>
            <p className="lead-text">
              Real cloud networks experience cut undersea cables, packet loss, and service crashes.
              Here is how EdgeGate stays resilient under each condition you can simulate on screen:
            </p>

            <div className="glossary-grid">
              <div className="glossary-item">
                <span className="term-badge">Failure Mode 1</span>
                <h3>Network Partition (Disconnect)</h3>
                <p>
                  <strong>What happened:</strong> The edge node is completely cut off from the central Coordinator.
                </p>
                <p>
                  <strong>How the Edge reacts:</strong> It enters <em>"On its own"</em> fallback mode. Rather than halting or letting users flood the origin, it enforces a static fraction of the total limit (<code>Global Limit ÷ 3 Peer Nodes</code>) based on local sliding-window memory.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Failure Mode 2</span>
                <h3>Lost Sync Replies (Packet Drop)</h3>
                <p>
                  <strong>What happened:</strong> The edge sends a usage batch to the Coordinator, but the return confirmation is dropped on the wire.
                </p>
                <p>
                  <strong>How the Edge reacts:</strong> EdgeGate uses <em>idempotent sequence numbers</em> (<code>epoch#seq</code>). The edge safely re-transmits the batch without double-counting usage or losing tokens.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Failure Mode 3</span>
                <h3>High Latency & Jitter (Slow Network)</h3>
                <p>
                  <strong>What happened:</strong> Cross-region background pings spike with +120ms latency and 40ms variation.
                </p>
                <p>
                  <strong>How the Edge reacts:</strong> <em>Zero impact on user API requests!</em> Because client calls check local RAM, client response times remain &lt;1ms. Only background lease renewal experiences slight delay.
                </p>
              </div>

              <div className="glossary-item">
                <span className="term-badge">Failure Mode 4</span>
                <h3>Node Crash & Restart</h3>
                <p>
                  <strong>What happened:</strong> A regional edge server process crashes or is killed by the operator.
                </p>
                <p>
                  <strong>How the Edge reacts:</strong> The supervisor restarts the process in ~1.5s with a fresh epoch. Abandoned leases in MongoDB naturally expire via TTL indexes, ensuring zero permanent quota leaks.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


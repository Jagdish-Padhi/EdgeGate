import { useState } from 'react';
import { BookOpen, CheckCircle2, Database, Flame, Layers, Network, ShieldAlert, Sliders, ListChecks } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'flow', label: 'Request flow', icon: Layers },
  { id: 'terms', label: 'Terms', icon: ListChecks },
  { id: 'settings', label: 'Settings', icon: Sliders },
  { id: 'failures', label: 'Failures', icon: ShieldAlert },
];

export function TheoryGuide() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="theory-container" id="theory">
      <div className="theory-header">
        <h1>How EdgeGate works</h1>
        <p className="theory-lead">
          A short guide to the ideas behind the console: what each part does and what to try.
        </p>

        <div className="theory-nav" role="tablist" aria-label="Guide sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`theory-nav-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="theory-content">
        {activeTab === 'overview' && (
          <section className="theory-card">
            <h2>Why limit requests at the edge</h2>
            <p className="lead-text">
              An API has one global limit, for example 100 requests per minute. Users reach it through
              several regions. The question is where the counting happens.
            </p>

            <div className="analogy-grid">
              <div className="analogy-box bad">
                <ShieldAlert size={22} className="icon-bad" aria-hidden="true" />
                <h3>One central check per request</h3>
                <ul>
                  <li><strong>Slower:</strong> every request waits for a round trip to the central limiter.</li>
                  <li><strong>Bottleneck:</strong> the central service handles every check, so it carries all the load.</li>
                  <li><strong>Single point of failure:</strong> if the limiter is down, every region is affected.</li>
                </ul>
              </div>

              <div className="analogy-box good">
                <CheckCircle2 size={22} className="icon-good" aria-hidden="true" />
                <h3>Leases from a coordinator</h3>
                <ul>
                  <li><strong>Local decisions:</strong> the coordinator lends each region a share of the limit. The region spends it from memory, with no network call.</li>
                  <li><strong>One shared limit:</strong> shares are sized so that usage plus lent quota never goes above the limit.</li>
                  <li><strong>Rebalancing:</strong> at each sync, shares move toward the regions that receive more traffic.</li>
                </ul>
              </div>
            </div>

            <div className="analogy-banner">
              <Database size={18} className="accent-icon" aria-hidden="true" />
              <div>
                <strong>In short:</strong> the coordinator lends quota ahead of time, regions spend it locally and
                report back in batches. A region with no lease for a caller asks the coordinator first, so the first
                request from a new caller takes slightly longer.
              </div>
            </div>
          </section>
        )}

        {activeTab === 'flow' && (
          <section className="theory-card">
            <h2>What happens to a request</h2>
            <p className="lead-text">The steps below are the same for every request.</p>

            <div className="lifecycle-timeline">
              <div className="timeline-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>The request reaches an edge node</h3>
                  <p>
                    A client calls an endpoint such as <code>GET /api/orders</code> on the nearest node. The node
                    identifies the caller from the API key or IP address and finds the matching rule.
                  </p>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>The node checks two things in memory</h3>
                  <div className="step-subgrid">
                    <div className="sub-check">
                      <strong>Lease</strong>
                      <span>Does this node still hold quota from the coordinator for this caller?</span>
                    </div>
                    <div className="sub-check">
                      <strong>Burst tokens</strong>
                      <span>Has this caller sent too many requests in a very short time?</span>
                    </div>
                  </div>
                  <p className="step-note">If the node has no valid lease, it asks the coordinator for one first.</p>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Allow or block</h3>
                  <p>
                    If both checks pass, the node forwards the request to the origin (<code>200</code>). Otherwise it
                    replies <code>429 Too Many Requests</code> with a <code>Retry-After</code> header, and the origin
                    never sees the request.
                  </p>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>The node reports usage</h3>
                  <p>
                    About once per sync interval (1 second by default), each node sends the number of requests it
                    allowed and blocked. The coordinator stores the totals in MongoDB and replies with a new lease.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'terms' && (
          <section className="theory-card">
            <h2>Terms used in the console</h2>
            <p className="lead-text">Short definitions for the labels you see on screen.</p>

            <div className="glossary-grid">
              <div className="glossary-item">
                <h3>Lease</h3>
                <p>
                  A share of the global limit that the coordinator lends to one node for a short time. When it is
                  used up or expires, the node syncs to get a new one.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Burst (token bucket)</h3>
                <p>
                  A small bucket of tokens that refills steadily. Each request takes one token. It stops a caller
                  from using the whole limit in the first fraction of a second.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Sliding window</h3>
                <p>
                  A way to count usage without a hard reset at the end of each window. The coordinator estimates
                  usage from the current and previous window, weighted by how much of each still applies.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Fail mode</h3>
                <p>
                  What a node does when it has no lease. <strong>Bounded</strong> (default) allows a fixed share of
                  the limit. <strong>Open</strong> allows everything. <strong>Closed</strong> blocks everything.
                  It is set with the <code>EDGE_FAIL_MODE</code> environment variable.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Network partition</h3>
                <p>
                  A node cannot reach the coordinator. In this console you can simulate it with Disconnect. The node
                  switches to Local fallback until the connection returns.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Sync interval</h3>
                <p>
                  How often nodes check in with the coordinator. A shorter interval rebalances quota faster. A longer
                  one means fewer requests to the coordinator and MongoDB.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="theory-card">
            <h2>What each setting changes</h2>
            <p className="lead-text">Open Settings in the top bar, change a value, and watch the console react.</p>

            <div className="param-cards">
              <div className="param-row">
                <div className="param-header">
                  <Sliders size={18} className="param-icon" aria-hidden="true" />
                  <div>
                    <strong>Limit</strong>
                    <small>Settings, Rate limits</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>Controls:</strong> the most requests one caller can make in a window, across all regions.</p>
                  <p><strong>Try:</strong> lower the Free plan limit from 20 to 10, then send 30 requests. Blocked requests start much earlier.</p>
                </div>
              </div>

              <div className="param-row">
                <div className="param-header">
                  <Flame size={18} className="param-icon" aria-hidden="true" />
                  <div>
                    <strong>Burst</strong>
                    <small>Settings, Rate limits</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>Controls:</strong> how many requests can arrive back to back before the node starts blocking, even when the limit has not been reached.</p>
                  <p><strong>Try:</strong> set Burst to 5 and send requests at Fast pace. Requests are blocked once the burst tokens run out faster than they refill.</p>
                </div>
              </div>

              <div className="param-row">
                <div className="param-header">
                  <Network size={18} className="param-icon" aria-hidden="true" />
                  <div>
                    <strong>Sync interval</strong>
                    <small>Settings, Network</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>Controls:</strong> how often nodes report usage and receive new leases.</p>
                  <p><strong>Try:</strong> set it to 3000 ms and send a spike to one region. That region may be blocked until the next sync moves unused quota from quieter regions.</p>
                </div>
              </div>

              <div className="param-row">
                <div className="param-header">
                  <Database size={18} className="param-icon" aria-hidden="true" />
                  <div>
                    <strong>Disconnect</strong>
                    <small>Region card, Simulate a failure</small>
                  </div>
                </div>
                <div className="param-body">
                  <p><strong>Controls:</strong> cuts the connection between one node and the coordinator.</p>
                  <p><strong>Try:</strong> the node changes from Coordinated to Local fallback and allows only a fixed share of each limit (1/3 with three nodes) until you reconnect.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'failures' && (
          <section className="theory-card">
            <h2>How the system handles failures</h2>
            <p className="lead-text">
              Each failure below can be triggered from a region card or from Settings.
            </p>

            <div className="glossary-grid">
              <div className="glossary-item">
                <h3>Disconnect</h3>
                <p><strong>What happens:</strong> the node cannot reach the coordinator.</p>
                <p>
                  <strong>Response:</strong> once its lease expires, the node falls back to a fixed share of the
                  limit (<code>limit / number of nodes</code>), counted with a local sliding window.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Dropped replies</h3>
                <p><strong>What happens:</strong> the coordinator receives a usage report, but the reply is lost.</p>
                <p>
                  <strong>Response:</strong> each report carries an epoch and sequence number. The node resends the
                  same report, and the coordinator ignores the duplicate, so nothing is counted twice or lost.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Slow network</h3>
                <p><strong>What happens:</strong> every sync takes longer, with some random variation.</p>
                <p>
                  <strong>Response:</strong> requests covered by a lease are not affected. Only requests that need a
                  new lease wait for the slower sync.
                </p>
              </div>

              <div className="glossary-item">
                <h3>Node crash</h3>
                <p><strong>What happens:</strong> an edge process stops.</p>
                <p>
                  <strong>Response:</strong> the development supervisor restarts it after the restart delay (1.5
                  seconds by default) with a new epoch. Leases it held expire on their own, so no quota is lost for good.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

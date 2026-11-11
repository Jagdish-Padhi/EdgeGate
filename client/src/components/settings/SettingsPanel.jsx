import { useEffect, useRef, useState, useCallback } from 'react';
import { getJson, putJson } from '../../api/http.js';
import { DEV_CONTROL_URL } from '../../config.js';
import {
  Check,
  Layers,
  Loader2,
  Network,
  Sliders,
} from 'lucide-react';
import { InfoTip } from '../common/InfoTip.jsx';

const networkDefaults = {
  latencyMs: 0,
  jitterMs: 0,
  lostResponseRate: 0,
  syncIntervalMs: 1000,
  restartDelayMs: 1500,
};

const LIMIT_TIP = 'Maximum number of requests permitted for this tier during the rolling window.';
const BURST_TIP = 'Maximum requests allowed in an immediate burst (token bucket capacity). Cannot exceed the limit.';
const WINDOW_TIP = 'Duration of the rate limit window in seconds (e.g., 60s).';

export function SettingsPanel({ edges, coordinatorUrl, resetKey }) {
  const [activeSection, setActiveSection] = useState('rules'); // 'rules' | 'network' | 'presets'

  // Auto-save state: 'idle' | 'saving' | 'saved' | 'error'
  const [saveState, setSaveState] = useState('saved');

  const [netValues, setNetValues] = useState(networkDefaults);
  const initializedNet = useRef(false);

  const [rules, setRules] = useState(null);
  const rulesRef = useRef(null);
  const initialRulesLoaded = useRef(false);
  const prevRulesValuesRef = useRef(null);
  const prevNetValuesRef = useRef(null);

  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Free Tier
  const [freeLimit, setFreeLimit] = useState(20);
  const [freeBurst, setFreeBurst] = useState(10);
  const [freeWindow, setFreeWindow] = useState(60);

  // Pro Tier
  const [proLimit, setProLimit] = useState(200);
  const [proBurst, setProBurst] = useState(50);
  const [proWindow, setProWindow] = useState(60);

  // Anonymous IP (Weather API)
  const [defaultLimit, setDefaultLimit] = useState(10);
  const [defaultBurst, setDefaultBurst] = useState(5);

  // Login IP (Auth endpoint)
  const [loginLimit, setLoginLimit] = useState(5);
  const [loginBurst, setLoginBurst] = useState(5);

  const isSavingRef = useRef(false);
  const ruleDebounceTimerRef = useRef(null);
  const netDebounceTimerRef = useRef(null);

  // Load initial network state
  useEffect(() => {
    if (initializedNet.current) return;
    const state = edges.find((edge) => edge.state)?.state;
    if (state) {
      const initialNet = {
        latencyMs: state.faults.latencyMs,
        jitterMs: state.faults.jitterMs,
        lostResponseRate: state.faults.lostResponseRate,
        syncIntervalMs: state.sync.intervalMs,
        restartDelayMs: 1500,
      };
      setNetValues(initialNet);
      prevNetValuesRef.current = initialNet;
      initializedNet.current = true;
      void getJson(`${DEV_CONTROL_URL}/settings`)
        .then((settings) => {
          setNetValues((current) => {
            const updated = { ...current, restartDelayMs: settings.restartDelayMs };
            prevNetValuesRef.current = updated;
            return updated;
          });
        })
        .catch(() => {});
    }
  }, [edges]);

  // Load initial rules
  useEffect(() => {
    async function loadRules() {
      try {
        const loaded = await getJson(`${coordinatorUrl}/rules`);
        rulesRef.current = loaded;
        setRules(loaded);

        const pubRule = loaded.rules.find((r) => r.id === 'public-api');
        const initialVals = {
          freeLimit: pubRule?.tiers?.free?.limit ?? 20,
          freeBurst: pubRule?.tiers?.free?.burst ?? 10,
          freeWindow: pubRule?.tiers?.free?.windowSec ?? 60,
          proLimit: pubRule?.tiers?.pro?.limit ?? 200,
          proBurst: pubRule?.tiers?.pro?.burst ?? 50,
          proWindow: pubRule?.tiers?.pro?.windowSec ?? 60,
          defaultLimit: pubRule?.tiers?.default?.limit ?? 10,
          defaultBurst: pubRule?.tiers?.default?.burst ?? 5,
          loginLimit: 5,
          loginBurst: 5,
        };

        if (pubRule) {
          if (pubRule.tiers.free) {
            setFreeLimit(pubRule.tiers.free.limit);
            setFreeBurst(pubRule.tiers.free.burst);
            setFreeWindow(pubRule.tiers.free.windowSec);
          }
          if (pubRule.tiers.pro) {
            setProLimit(pubRule.tiers.pro.limit);
            setProBurst(pubRule.tiers.pro.burst);
            setProWindow(pubRule.tiers.pro.windowSec);
          }
          if (pubRule.tiers.default) {
            setDefaultLimit(pubRule.tiers.default.limit);
            setDefaultBurst(pubRule.tiers.default.burst);
          }
        }

        const authRule = loaded.rules.find((r) => r.id === 'auth-login');
        if (authRule?.tiers.default) {
          setLoginLimit(authRule.tiers.default.limit);
          setLoginBurst(authRule.tiers.default.burst);
          initialVals.loginLimit = authRule.tiers.default.limit;
          initialVals.loginBurst = authRule.tiers.default.burst;
        }

        prevRulesValuesRef.current = initialVals;
        initialRulesLoaded.current = true;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }
    loadRules();
  }, [coordinatorUrl]);

  // Helper to persist rules to coordinator
  const persistRules = useCallback(
    async (values) => {
      const currentRules = rulesRef.current;
      if (!currentRules) return;
      setSaveState('saving');
      isSavingRef.current = true;
      const next = structuredClone(currentRules);

      const pubRule = next.rules.find((r) => r.id === 'public-api');
      if (pubRule) {
        if (pubRule.tiers.free) {
          pubRule.tiers.free.limit = values.freeLimit;
          pubRule.tiers.free.burst = Math.min(values.freeBurst, values.freeLimit);
          pubRule.tiers.free.windowSec = values.freeWindow;
        }
        if (pubRule.tiers.pro) {
          pubRule.tiers.pro.limit = values.proLimit;
          pubRule.tiers.pro.burst = Math.min(values.proBurst, values.proLimit);
          pubRule.tiers.pro.windowSec = values.proWindow;
        }
        if (pubRule.tiers.default) {
          pubRule.tiers.default.limit = values.defaultLimit;
          pubRule.tiers.default.burst = Math.min(values.defaultBurst, values.defaultLimit);
        }
      }

      const authRule = next.rules.find((r) => r.id === 'auth-login');
      if (authRule?.tiers.default) {
        authRule.tiers.default.limit = values.loginLimit;
        authRule.tiers.default.burst = Math.min(values.loginBurst, values.loginLimit);
      }

      try {
        const saved = await putJson(`${coordinatorUrl}/admin/rules`, next);
        rulesRef.current = saved;
        setRules(saved);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      } finally {
        isSavingRef.current = false;
      }
    },
    [coordinatorUrl]
  );

  // Helper to persist network faults to edges
  const persistNetwork = useCallback(
    async (net) => {
      setSaveState('saving');
      try {
        const currentEdges = edgesRef.current;
        await Promise.allSettled([
          ...currentEdges.map((edge) => putJson(`${edge.url}/_edge/faults`, net)),
          putJson(`${DEV_CONTROL_URL}/settings`, { restartDelayMs: net.restartDelayMs }),
        ]);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    },
    []
  );

  // Auto-save rules with 400ms debounce when policy inputs change
  useEffect(() => {
    if (!initialRulesLoaded.current) return;

    const currentValues = {
      freeLimit,
      freeBurst,
      freeWindow,
      proLimit,
      proBurst,
      proWindow,
      defaultLimit,
      defaultBurst,
      loginLimit,
      loginBurst,
    };

    // Avoid unnecessary auto-save cycles if values haven't changed
    if (JSON.stringify(prevRulesValuesRef.current) === JSON.stringify(currentValues)) {
      return;
    }

    if (ruleDebounceTimerRef.current) {
      clearTimeout(ruleDebounceTimerRef.current);
    }

    setSaveState('saving');
    ruleDebounceTimerRef.current = setTimeout(() => {
      prevRulesValuesRef.current = currentValues;
      void persistRules(currentValues);
    }, 400);

    return () => {
      if (ruleDebounceTimerRef.current) clearTimeout(ruleDebounceTimerRef.current);
    };
  }, [
    freeLimit,
    freeBurst,
    freeWindow,
    proLimit,
    proBurst,
    proWindow,
    defaultLimit,
    defaultBurst,
    loginLimit,
    loginBurst,
    persistRules,
  ]);

  // Auto-save network settings with 400ms debounce
  useEffect(() => {
    if (!initializedNet.current) return;

    // Avoid unnecessary network save cycles if values haven't changed
    if (JSON.stringify(prevNetValuesRef.current) === JSON.stringify(netValues)) {
      return;
    }

    if (netDebounceTimerRef.current) {
      clearTimeout(netDebounceTimerRef.current);
    }

    setSaveState('saving');
    netDebounceTimerRef.current = setTimeout(() => {
      prevNetValuesRef.current = netValues;
      void persistNetwork(netValues);
    }, 400);

    return () => {
      if (netDebounceTimerRef.current) clearTimeout(netDebounceTimerRef.current);
    };
  }, [netValues, persistNetwork]);

  // Handle Navbar Reset event when on Settings tab
  const lastResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (resetKey && resetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = resetKey;

      // Reset policy defaults
      setFreeLimit(20);
      setFreeBurst(10);
      setFreeWindow(60);
      setProLimit(200);
      setProBurst(50);
      setProWindow(60);
      setDefaultLimit(10);
      setDefaultBurst(5);
      setLoginLimit(5);
      setLoginBurst(5);

      // Reset network defaults
      const cleanNet = {
        latencyMs: 0,
        jitterMs: 0,
        lostResponseRate: 0,
        syncIntervalMs: 1000,
        restartDelayMs: 1500,
      };
      setNetValues(cleanNet);

      // Immediate persist
      void persistRules({
        freeLimit: 20,
        freeBurst: 10,
        freeWindow: 60,
        proLimit: 200,
        proBurst: 50,
        proWindow: 60,
        defaultLimit: 10,
        defaultBurst: 5,
        loginLimit: 5,
        loginBurst: 5,
      });
      void persistNetwork(cleanNet);
    }
  }, [resetKey, persistRules, persistNetwork]);

  const applyRatePreset = (preset) => {
    if (preset === 'strict') {
      setFreeLimit(10);
      setFreeBurst(5);
      setProLimit(50);
      setProBurst(20);
      setDefaultLimit(5);
      setDefaultBurst(3);
      setLoginLimit(3);
      setLoginBurst(3);
    } else if (preset === 'default') {
      setFreeLimit(20);
      setFreeBurst(10);
      setProLimit(200);
      setProBurst(50);
      setDefaultLimit(10);
      setDefaultBurst(5);
      setLoginLimit(5);
      setLoginBurst(5);
    }
  };

  const applyNetworkPreset = (preset) => {
    if (preset === 'healthy') {
      setNetValues({
        latencyMs: 0,
        jitterMs: 0,
        lostResponseRate: 0,
        syncIntervalMs: 1000,
        restartDelayMs: 1500,
      });
    } else if (preset === 'wan') {
      setNetValues((v) => ({ ...v, latencyMs: 180, jitterMs: 35, lostResponseRate: 0 }));
    } else if (preset === 'lossy') {
      setNetValues((v) => ({ ...v, lostResponseRate: 0.25 }));
    }
  };

  const sectionTitles = {
    rules: 'Rate Limiting Policies',
    network: 'Network & Chaos Emulation',
    presets: 'Environment Profiles',
  };

  return (
    <main className="dedicated-settings-page" id="settings">
      <div className="settings-workspace-layout">
        <aside className="settings-nav-sidebar">
          <span className="sidebar-group-title">Configuration</span>
          <nav className="settings-vertical-nav" aria-label="Settings Categories">
            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveSection('rules')}
            >
              <Layers size={16} aria-hidden="true" />
              <div className="nav-item-text">
                <strong>Rate Limiting Policies</strong>
                <span>Tier budgets, burst limits, and windows</span>
              </div>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'network' ? 'active' : ''}`}
              onClick={() => setActiveSection('network')}
            >
              <Network size={16} aria-hidden="true" />
              <div className="nav-item-text">
                <strong>Network &amp; Chaos Emulation</strong>
                <span>WAN latency, packet drop, and sync interval</span>
              </div>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveSection('presets')}
            >
              <Sliders size={16} aria-hidden="true" />
              <div className="nav-item-text">
                <strong>Environment Profiles</strong>
                <span>Pre-configured operational baselines</span>
              </div>
            </button>
          </nav>
        </aside>

        <div className="settings-content-pane">
          {/* Top header row with section title & enterprise auto-save tag */}
          <div className="settings-card-top-bar">
            <h2 className="settings-pane-title">{sectionTitles[activeSection]}</h2>
            <div className="autosave-container">
              {saveState === 'saving' && (
                <span className="autosave-tag saving">
                  <Loader2 size={12} className="spin" aria-hidden="true" />
                  <span>Saving...</span>
                </span>
              )}
              {saveState === 'saved' && (
                <span className="autosave-tag saved">
                  <Check size={12} aria-hidden="true" />
                  <span>All changes saved</span>
                </span>
              )}
              {saveState === 'error' && (
                <span className="autosave-tag error">
                  <span>Failed to save</span>
                </span>
              )}
            </div>
          </div>

          {activeSection === 'rules' && (
            <div className="settings-panel-card">
              <div className="tier-cards-grid">
                <div className="tier-card">
                  <div className="tier-card-head">
                    <div>
                      <strong>Free Tier (ACME Corp)</strong>
                      <span className="tier-card-sub">Endpoint: /api/orders · Header: x-api-key</span>
                    </div>
                    <span className="badge-tag">API Key</span>
                  </div>

                  <div className="tier-fields-row">
                    <label>
                      <span className="field-label">
                        Window Limit
                        <InfoTip label="About Window Limit">{LIMIT_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={freeLimit}
                        onChange={(e) => setFreeLimit(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span className="field-label">
                        Burst Capacity
                        <InfoTip label="About Burst Capacity">{BURST_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={freeLimit}
                        value={freeBurst}
                        onChange={(e) => setFreeBurst(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span className="field-label">
                        Window (s)
                        <InfoTip label="About Window" align="end">{WINDOW_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={freeWindow}
                        onChange={(e) => setFreeWindow(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>

                <div className="tier-card">
                  <div className="tier-card-head">
                    <div>
                      <strong>Pro Tier (Globex Corp)</strong>
                      <span className="tier-card-sub">Endpoint: /api/orders · Header: x-api-key</span>
                    </div>
                    <span className="badge-tag pro">High Capacity</span>
                  </div>

                  <div className="tier-fields-row">
                    <label>
                      <span className="field-label">
                        Window Limit
                        <InfoTip label="About Window Limit">{LIMIT_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={proLimit}
                        onChange={(e) => setProLimit(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span className="field-label">
                        Burst Capacity
                        <InfoTip label="About Burst Capacity">{BURST_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={proLimit}
                        value={proBurst}
                        onChange={(e) => setProBurst(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span className="field-label">
                        Window (s)
                        <InfoTip label="About Window" align="end">{WINDOW_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={proWindow}
                        onChange={(e) => setProWindow(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>

                <div className="tier-card">
                  <div className="tier-card-head">
                    <div>
                      <strong>Anonymous IP (Public Weather)</strong>
                      <span className="tier-card-sub">Endpoint: /api/weather · Identifier: Client IP</span>
                    </div>
                    <span className="badge-tag">IP Scoped</span>
                  </div>

                  <div className="tier-fields-row">
                    <label>
                      <span className="field-label">
                        Window Limit
                        <InfoTip label="About Window Limit">{LIMIT_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={defaultLimit}
                        onChange={(e) => setDefaultLimit(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span className="field-label">
                        Burst Capacity
                        <InfoTip label="About Burst Capacity">{BURST_TIP}</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={defaultLimit}
                        value={defaultBurst}
                        onChange={(e) => setDefaultBurst(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>

                <div className="tier-card">
                  <div className="tier-card-head">
                    <div>
                      <strong>Auth Login Protection</strong>
                      <span className="tier-card-sub">Endpoint: /auth/login · Identifier: Client IP</span>
                    </div>
                    <span className="badge-tag warn">Brute-Force Guard</span>
                  </div>

                  <div className="tier-fields-row">
                    <label>
                      <span className="field-label">
                        Max Attempts
                        <InfoTip label="About Login Limit">Maximum attempts permitted per IP per window.</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={loginLimit}
                        onChange={(e) => setLoginLimit(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span className="field-label">
                        Burst Attempts
                        <InfoTip label="About Login Burst">Maximum back-to-back login tries allowed.</InfoTip>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={loginLimit}
                        value={loginBurst}
                        onChange={(e) => setLoginBurst(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'network' && (
            <div className="settings-panel-card">
              <div className="network-form-grid">
                <div className="config-form-item">
                  <label>
                    <span className="field-label">
                      Sync Latency (ms)
                      <InfoTip label="About Latency">
                        Network delay added to lease synchronization requests between regional nodes and coordinator.
                      </InfoTip>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      value={netValues.latencyMs}
                      onChange={(e) => setNetValues((v) => ({ ...v, latencyMs: Number(e.target.value) }))}
                    />
                  </label>
                  <span className="field-help">0ms simulates local network; 150-250ms simulates trans-oceanic fiber links.</span>
                </div>

                <div className="config-form-item">
                  <label>
                    <span className="field-label">
                      Latency Jitter (ms)
                      <InfoTip label="About Jitter">
                        Random deviation added or subtracted from base latency to simulate Internet routing variance.
                      </InfoTip>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={netValues.jitterMs}
                      onChange={(e) => setNetValues((v) => ({ ...v, jitterMs: Number(e.target.value) }))}
                    />
                  </label>
                  <span className="field-help">Simulates realistic network fluctuation across packet routes.</span>
                </div>

                <div className="config-form-item">
                  <label>
                    <span className="field-label">
                      Dropped Replies (%)
                      <InfoTip label="About Dropped Replies">
                        Percentage of coordinator reply packets discarded. Verifies idempotent deduplication.
                      </InfoTip>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(netValues.lostResponseRate * 100)}
                      onChange={(e) => setNetValues((v) => ({ ...v, lostResponseRate: Number(e.target.value) / 100 }))}
                    />
                  </label>
                  <span className="field-help">Verifies that duplicate usage reports never result in double-counting.</span>
                </div>

                <div className="config-form-item">
                  <label>
                    <span className="field-label">
                      Sync Interval (ms)
                      <InfoTip label="About Sync Interval">
                        Frequency at which edge nodes flush usage counts and receive updated lease allocations.
                      </InfoTip>
                    </span>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={netValues.syncIntervalMs}
                      onChange={(e) => setNetValues((v) => ({ ...v, syncIntervalMs: Number(e.target.value) }))}
                    />
                  </label>
                  <span className="field-help">Default: 1000ms. Shorter intervals rebalance faster; longer intervals minimize coordinator load.</span>
                </div>

                <div className="config-form-item">
                  <label>
                    <span className="field-label">
                      Process Supervisor Restart Delay (ms)
                      <InfoTip label="About Restart Delay" align="end">
                        Delay before supervisor restarts an edge process following a simulated crash.
                      </InfoTip>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30000"
                      step="100"
                      value={netValues.restartDelayMs}
                      onChange={(e) => setNetValues((v) => ({ ...v, restartDelayMs: Number(e.target.value) }))}
                    />
                  </label>
                  <span className="field-help">Default: 1500ms. Allows abandoned leases to expire on the coordinator.</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'presets' && (
            <div className="settings-panel-card">
              <div className="presets-showcase-grid">
                <div className="preset-card">
                  <div className="preset-top">
                    <span className="badge-tag">Baseline</span>
                    <strong>Default Balanced Profile</strong>
                  </div>
                  <p>
                    Free limit = 20, Burst = 10, healthy 0ms local network. Standard operational configuration.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      applyRatePreset('default');
                      applyNetworkPreset('healthy');
                      setActiveSection('rules');
                    }}
                  >
                    Apply Profile
                  </button>
                </div>

                <div className="preset-card">
                  <div className="preset-top">
                    <span className="badge-tag warn">Strict Limits</span>
                    <strong>Low-Quota Throttle Test</strong>
                  </div>
                  <p>
                    Free limit = 10, Burst = 5. Demonstrates instant token depletion and HTTP 429 generation under minimal traffic.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      applyRatePreset('strict');
                      setActiveSection('rules');
                    }}
                  >
                    Apply Profile
                  </button>
                </div>

                <div className="preset-card">
                  <div className="preset-top">
                    <span className="badge-tag">WAN Emulation</span>
                    <strong>High-Latency Intercontinental Link</strong>
                  </div>
                  <p>
                    180ms latency with 35ms jitter. Verifies sub-millisecond local decisions despite slow central sync.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      applyNetworkPreset('wan');
                      setActiveSection('network');
                    }}
                  >
                    Apply Profile
                  </button>
                </div>

                <div className="preset-card">
                  <div className="preset-top">
                    <span className="badge-tag warn">Lossy Channel</span>
                    <strong>Unreliable Link (25% Packet Drop)</strong>
                  </div>
                  <p>
                    Drops 25% of coordinator responses. Verifies idempotent retries and monotonic sequence numbers.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      applyNetworkPreset('lossy');
                      setActiveSection('network');
                    }}
                  >
                    Apply Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

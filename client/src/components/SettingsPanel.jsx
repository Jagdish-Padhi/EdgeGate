import { useEffect, useRef, useState } from 'react';
import { getJson, putJson } from '../api/http.js';
import { DEV_CONTROL_URL } from '../config.js';
import { Check, Layers, Sliders, X } from 'lucide-react';

const networkDefaults = {
  latencyMs: 0,
  jitterMs: 0,
  lostResponseRate: 0,
  syncIntervalMs: 1000,
  restartDelayMs: 1500,
};

export function SettingsPanel({ edges, coordinatorUrl, onClose }) {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'network'

  // Network Faults State
  const [netValues, setNetValues] = useState(networkDefaults);
  const [netSaveStatus, setNetSaveStatus] = useState('');
  const initializedNet = useRef(false);

  // Rules / Tiers State
  const [rules, setRules] = useState(null);
  const [ruleSaveStatus, setRuleSaveStatus] = useState('');
  const [loadingRules, setLoadingRules] = useState(false);

  // Editable Tier limits
  const [freeLimit, setFreeLimit] = useState(20);
  const [freeBurst, setFreeBurst] = useState(10);
  const [freeWindow, setFreeWindow] = useState(60);

  const [proLimit, setProLimit] = useState(200);
  const [proBurst, setProBurst] = useState(50);
  const [proWindow, setProWindow] = useState(60);

  const [defaultLimit, setDefaultLimit] = useState(10);
  const [defaultBurst, setDefaultBurst] = useState(5);

  const [loginLimit, setLoginLimit] = useState(5);
  const [loginBurst, setLoginBurst] = useState(5);

  // 1. Load initial network state
  useEffect(() => {
    if (initializedNet.current) return;
    const state = edges.find((edge) => edge.state)?.state;
    if (state) {
      setNetValues({
        latencyMs: state.faults.latencyMs,
        jitterMs: state.faults.jitterMs,
        lostResponseRate: state.faults.lostResponseRate,
        syncIntervalMs: state.sync.intervalMs,
        restartDelayMs: 1500,
      });
      void getJson(`${DEV_CONTROL_URL}/settings`)
        .then((settings) => setNetValues((current) => ({ ...current, restartDelayMs: settings.restartDelayMs })))
        .catch(() => {});
      initializedNet.current = true;
    }
  }, [edges]);

  // 2. Load rules from coordinator
  useEffect(() => {
    async function loadRules() {
      setLoadingRules(true);
      try {
        const loaded = await getJson(`${coordinatorUrl}/rules`);
        setRules(loaded);
        // public-api rule
        const pubRule = loaded.rules.find((r) => r.id === 'public-api');
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
        // auth-login rule
        const authRule = loaded.rules.find((r) => r.id === 'auth-login');
        if (authRule?.tiers.default) {
          setLoginLimit(authRule.tiers.default.limit);
          setLoginBurst(authRule.tiers.default.burst);
        }
      } catch (err) {
        setRuleSaveStatus('Failed to load rules from coordinator.');
      } finally {
        setLoadingRules(false);
      }
    }
    loadRules();
  }, [coordinatorUrl]);

  // Save network conditions
  async function applyNetwork() {
    setNetSaveStatus('Saving network settings...');
    try {
      await Promise.allSettled([
        ...edges.map((edge) => putJson(`${edge.url}/_edge/faults`, netValues)),
        putJson(`${DEV_CONTROL_URL}/settings`, { restartDelayMs: netValues.restartDelayMs }),
      ]);
      setNetSaveStatus('Network settings applied to all edges.');
      setTimeout(() => setNetSaveStatus(''), 3000);
    } catch {
      setNetSaveStatus('Error applying network settings.');
    }
  }

  // Save all tier limits
  async function applyRules() {
    if (!rules) return;
    setRuleSaveStatus('Applying rate limit updates...');
    const next = structuredClone(rules);

    const pubRule = next.rules.find((r) => r.id === 'public-api');
    if (pubRule) {
      if (pubRule.tiers.free) {
        pubRule.tiers.free.limit = freeLimit;
        pubRule.tiers.free.burst = Math.min(freeBurst, freeLimit);
        pubRule.tiers.free.windowSec = freeWindow;
      }
      if (pubRule.tiers.pro) {
        pubRule.tiers.pro.limit = proLimit;
        pubRule.tiers.pro.burst = Math.min(proBurst, proLimit);
        pubRule.tiers.pro.windowSec = proWindow;
      }
      if (pubRule.tiers.default) {
        pubRule.tiers.default.limit = defaultLimit;
        pubRule.tiers.default.burst = Math.min(defaultBurst, defaultLimit);
      }
    }

    const authRule = next.rules.find((r) => r.id === 'auth-login');
    if (authRule?.tiers.default) {
      authRule.tiers.default.limit = loginLimit;
      authRule.tiers.default.burst = Math.min(loginBurst, loginLimit);
    }

    try {
      const saved = await putJson(`${coordinatorUrl}/admin/rules`, next);
      setRules(saved);
      setRuleSaveStatus(`Applied version ${saved.version}! Propagates to all edges in seconds.`);
      setTimeout(() => setRuleSaveStatus(''), 4000);
    } catch (err) {
      setRuleSaveStatus(err.message);
    }
  }

  return (
    <aside className="settings panel" aria-label="System Settings">
      <div className="panel-head">
        <div>
          <h2>System Configuration & Rate Limits</h2>
          <p className="muted">Configure tier quotas and network simulation</p>
        </div>
        <button type="button" className="close-button icon-button" onClick={onClose} aria-label="Close settings">
          <X size={15} aria-hidden="true" />
          Close
        </button>
      </div>

      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Layers size={14} /> Rate Limit Tiers (Quotas & Burst)
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <Sliders size={14} /> Network Conditions & Sync
        </button>
      </div>

      {activeTab === 'rules' ? (
        <div className="settings-section">
          {loadingRules && <p className="muted">Loading current tier definitions...</p>}

          <div className="tier-group">
            <div className="tier-title">
              <strong>Free Plan (/api/orders)</strong>
              <small>Client key-free-acme</small>
            </div>
            <div className="tier-inputs">
              <label>
                Limit (req)
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={freeLimit}
                  onChange={(e) => setFreeLimit(Number(e.target.value))}
                />
              </label>
              <label>
                Burst Cap
                <input
                  type="number"
                  min="1"
                  max={freeLimit}
                  value={freeBurst}
                  onChange={(e) => setFreeBurst(Number(e.target.value))}
                />
              </label>
              <label>
                Window (sec)
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

          <div className="tier-group">
            <div className="tier-title">
              <strong>Pro Plan (/api/orders)</strong>
              <small>Client key-pro-globex</small>
            </div>
            <div className="tier-inputs">
              <label>
                Limit (req)
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={proLimit}
                  onChange={(e) => setProLimit(Number(e.target.value))}
                />
              </label>
              <label>
                Burst Cap
                <input
                  type="number"
                  min="1"
                  max={proLimit}
                  value={proBurst}
                  onChange={(e) => setProBurst(Number(e.target.value))}
                />
              </label>
              <label>
                Window (sec)
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

          <div className="tier-group">
            <div className="tier-title">
              <strong>Anonymous / Default API (/api/weather)</strong>
              <small>Per-IP scope</small>
            </div>
            <div className="tier-inputs">
              <label>
                Limit (req)
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={defaultLimit}
                  onChange={(e) => setDefaultLimit(Number(e.target.value))}
                />
              </label>
              <label>
                Burst Cap
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

          <div className="tier-group">
            <div className="tier-title">
              <strong>Login Security (/auth/login)</strong>
              <small>Brute-force protection per IP</small>
            </div>
            <div className="tier-inputs">
              <label>
                Limit (attempts)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={loginLimit}
                  onChange={(e) => setLoginLimit(Number(e.target.value))}
                />
              </label>
              <label>
                Burst Cap
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

          <div className="settings-actions">
            <button type="button" className="primary" onClick={applyRules} disabled={!rules}>
              <Check size={14} /> Apply Rate Limit Changes
            </button>
            {ruleSaveStatus && <span className="save-status-msg">{ruleSaveStatus}</span>}
          </div>
        </div>
      ) : (
        <div className="settings-section">
          <div className="settings-form">
            <label>
              Base latency (ms)
              <input
                type="number"
                min="0"
                max="10000"
                value={netValues.latencyMs}
                onChange={(e) => setNetValues((v) => ({ ...v, latencyMs: Number(e.target.value) }))}
              />
            </label>
            <label>
              Jitter (± ms)
              <input
                type="number"
                min="0"
                max="10000"
                value={netValues.jitterMs}
                onChange={(e) => setNetValues((v) => ({ ...v, jitterMs: Number(e.target.value) }))}
              />
            </label>
            <label>
              Lost replies (%)
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={netValues.lostResponseRate * 100}
                onChange={(e) => setNetValues((v) => ({ ...v, lostResponseRate: Number(e.target.value) / 100 }))}
              />
            </label>
            <label>
              Sync interval (ms)
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={netValues.syncIntervalMs}
                onChange={(e) => setNetValues((v) => ({ ...v, syncIntervalMs: Number(e.target.value) }))}
              />
            </label>
            <label>
              Node restart delay (ms)
              <input
                type="number"
                min="0"
                max="60000"
                step="100"
                value={netValues.restartDelayMs}
                onChange={(e) => setNetValues((v) => ({ ...v, restartDelayMs: Number(e.target.value) }))}
              />
            </label>
          </div>

          <div className="settings-actions">
            <button type="button" className="primary" onClick={applyNetwork}>
              <Check size={14} /> Apply Network Conditions
            </button>
            {netSaveStatus && <span className="save-status-msg">{netSaveStatus}</span>}
          </div>
        </div>
      )}
    </aside>
  );
}

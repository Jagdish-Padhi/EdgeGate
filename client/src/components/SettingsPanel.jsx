import { useEffect, useRef, useState } from 'react';
import { getJson, putJson } from '../api/http.js';
import { DEV_CONTROL_URL } from '../config.js';
import { Check, Layers, Sliders, X } from 'lucide-react';
import { InfoTip } from './InfoTip.jsx';

const networkDefaults = {
  latencyMs: 0,
  jitterMs: 0,
  lostResponseRate: 0,
  syncIntervalMs: 1000,
  restartDelayMs: 1500,
};

const LIMIT_TIP = 'The most requests a caller can make in one window.';
const BURST_TIP = 'The most requests a caller can send back to back. It cannot exceed the limit.';
const WINDOW_TIP = 'The length of the counting period, in seconds.';

export function SettingsPanel({ edges, coordinatorUrl, onClose }) {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'network'

  const [netValues, setNetValues] = useState(networkDefaults);
  const [netSaveStatus, setNetSaveStatus] = useState('');
  const initializedNet = useRef(false);

  const [rules, setRules] = useState(null);
  const [ruleSaveStatus, setRuleSaveStatus] = useState('');
  const [loadingRules, setLoadingRules] = useState(false);

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
        setRuleSaveStatus('Could not load rules from the coordinator.');
      } finally {
        setLoadingRules(false);
      }
    }
    loadRules();
  }, [coordinatorUrl]);

  async function applyNetwork() {
    setNetSaveStatus('Saving');
    try {
      await Promise.allSettled([
        ...edges.map((edge) => putJson(`${edge.url}/_edge/faults`, netValues)),
        putJson(`${DEV_CONTROL_URL}/settings`, { restartDelayMs: netValues.restartDelayMs }),
      ]);
      setNetSaveStatus('Saved. Applied to all nodes.');
      setTimeout(() => setNetSaveStatus(''), 3000);
    } catch {
      setNetSaveStatus('Could not save network settings.');
    }
  }

  async function applyRules() {
    if (!rules) return;
    setRuleSaveStatus('Saving');
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
      setRuleSaveStatus(`Saved as version ${saved.version}. Nodes pick it up on their next sync.`);
      setTimeout(() => setRuleSaveStatus(''), 4000);
    } catch (err) {
      setRuleSaveStatus(err.message);
    }
  }

  return (
    <aside className="settings panel" aria-label="Settings">
      <div className="panel-head">
        <div>
          <h2>Settings</h2>
          <p className="muted">Rate limits for each plan and simulated network conditions</p>
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
          <Layers size={14} aria-hidden="true" /> Rate limits
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <Sliders size={14} aria-hidden="true" /> Network
        </button>
      </div>

      {activeTab === 'rules' ? (
        <div className="settings-section">
          {loadingRules && <p className="muted">Loading rules</p>}

          <div className="tier-group">
            <div className="tier-title">
              <strong>Free plan</strong>
              <small>/api/orders, per API key</small>
            </div>
            <div className="tier-inputs">
              <label>
                <span className="field-label">Limit<InfoTip label="About limit">{LIMIT_TIP}</InfoTip></span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={freeLimit}
                  onChange={(e) => setFreeLimit(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Burst<InfoTip label="About burst">{BURST_TIP}</InfoTip></span>
                <input
                  type="number"
                  min="1"
                  max={freeLimit}
                  value={freeBurst}
                  onChange={(e) => setFreeBurst(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Window (s)<InfoTip label="About window" align="end">{WINDOW_TIP}</InfoTip></span>
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
              <strong>Pro plan</strong>
              <small>/api/orders, per API key</small>
            </div>
            <div className="tier-inputs">
              <label>
                <span className="field-label">Limit<InfoTip label="About limit">{LIMIT_TIP}</InfoTip></span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={proLimit}
                  onChange={(e) => setProLimit(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Burst<InfoTip label="About burst">{BURST_TIP}</InfoTip></span>
                <input
                  type="number"
                  min="1"
                  max={proLimit}
                  value={proBurst}
                  onChange={(e) => setProBurst(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Window (s)<InfoTip label="About window" align="end">{WINDOW_TIP}</InfoTip></span>
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
              <strong>No API key</strong>
              <small>/api/weather, per IP address</small>
            </div>
            <div className="tier-inputs">
              <label>
                <span className="field-label">Limit<InfoTip label="About limit">{LIMIT_TIP}</InfoTip></span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={defaultLimit}
                  onChange={(e) => setDefaultLimit(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Burst<InfoTip label="About burst">{BURST_TIP}</InfoTip></span>
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
              <strong>Login</strong>
              <small>/auth/login, per IP address</small>
            </div>
            <div className="tier-inputs">
              <label>
                <span className="field-label">Limit<InfoTip label="About limit">{LIMIT_TIP}</InfoTip></span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={loginLimit}
                  onChange={(e) => setLoginLimit(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="field-label">Burst<InfoTip label="About burst">{BURST_TIP}</InfoTip></span>
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
              <Check size={14} aria-hidden="true" /> Save rate limits
            </button>
            {ruleSaveStatus && <span className="save-status-msg">{ruleSaveStatus}</span>}
          </div>
        </div>
      ) : (
        <div className="settings-section">
          <div className="settings-form">
            <label>
              <span className="field-label">Sync delay (ms)<InfoTip label="About sync delay">Time added to every sync between a node and the coordinator.</InfoTip></span>
              <input
                type="number"
                min="0"
                max="10000"
                value={netValues.latencyMs}
                onChange={(e) => setNetValues((v) => ({ ...v, latencyMs: Number(e.target.value) }))}
              />
            </label>
            <label>
              <span className="field-label">Delay variation (ms)<InfoTip label="About delay variation">Random change added to the sync delay, up or down by this amount.</InfoTip></span>
              <input
                type="number"
                min="0"
                max="10000"
                value={netValues.jitterMs}
                onChange={(e) => setNetValues((v) => ({ ...v, jitterMs: Number(e.target.value) }))}
              />
            </label>
            <label>
              <span className="field-label">Dropped replies (%)<InfoTip label="About dropped replies">Share of coordinator replies that never reach the node. The node sends the update again.</InfoTip></span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(netValues.lostResponseRate * 100)}
                onChange={(e) => setNetValues((v) => ({ ...v, lostResponseRate: Number(e.target.value) / 100 }))}
              />
            </label>
            <label>
              <span className="field-label">Sync interval (ms)<InfoTip label="About sync interval">How often each node reports usage and receives a new lease. Shorter means faster rebalancing and more coordinator load.</InfoTip></span>
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
              <span className="field-label">Restart delay (ms)<InfoTip label="About restart delay" align="end">How long to wait before a crashed node is started again.</InfoTip></span>
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
              <Check size={14} aria-hidden="true" /> Save network settings
            </button>
            {netSaveStatus && <span className="save-status-msg">{netSaveStatus}</span>}
          </div>
        </div>
      )}
    </aside>
  );
}

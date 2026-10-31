import { useEffect, useRef, useState } from 'react';
import { putJson } from '../api/http.js';
import { Check, LoaderCircle, X } from 'lucide-react';

const defaults = { latencyMs: 0, jitterMs: 0, lostResponseRate: 0, syncIntervalMs: 1000 };

export function SettingsPanel({ edges, onClose }) {
  const [values, setValues] = useState(defaults);
  const [saveState, setSaveState] = useState('idle');
  const initialized = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const state = edges.find((edge) => edge.state)?.state;
    if (state) {
      setValues({
        latencyMs: state.faults.latencyMs,
        jitterMs: state.faults.jitterMs,
        lostResponseRate: state.faults.lostResponseRate,
        syncIntervalMs: state.sync.intervalMs,
      });
      initialized.current = true;
    }
  }, [edges]);

  useEffect(() => {
    if (!initialized.current || !dirty.current) return undefined;
    setSaveState('saving');
    const timer = setTimeout(() => void apply(), 450);
    return () => clearTimeout(timer);
  }, [values]);

  async function apply() {
    const results = await Promise.allSettled(
      edges.map((edge) => putJson(`${edge.url}/_edge/faults`, values))
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    dirty.current = false;
    setSaveState(failed === 0 ? 'saved' : 'error');
  }

  function update(name, value) {
    dirty.current = true;
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <aside className="settings panel" aria-label="Network settings">
      <div className="panel-head">
        <div>
          <h2>Network conditions</h2>
          <p className="muted">Applied live to edge-to-coordinator sync.</p>
        </div>
        <button type="button" className="close-button icon-button" onClick={onClose} aria-label="Close settings">
          <X size={15} aria-hidden="true" />
          Close
        </button>
      </div>
      <div className="settings-form">
        <label>Base latency (ms)
          <input type="number" min="0" max="10000" value={values.latencyMs} onChange={(event) => update('latencyMs', Number(event.target.value))} />
        </label>
        <label>Jitter (± ms)
          <input type="number" min="0" max="10000" value={values.jitterMs} onChange={(event) => update('jitterMs', Number(event.target.value))} />
        </label>
        <label>Lost replies (%)
          <input type="number" min="0" max="100" step="1" value={values.lostResponseRate * 100} onChange={(event) => update('lostResponseRate', Number(event.target.value) / 100)} />
        </label>
        <label>Sync interval (ms)
          <input type="number" min="100" max="10000" step="100" value={values.syncIntervalMs} onChange={(event) => update('syncIntervalMs', Number(event.target.value))} />
        </label>
        <div className="settings-actions">
          {saveState === 'saving' && <span className="save-status"><LoaderCircle size={14} className="spin" />Updating</span>}
          {saveState === 'saved' && <span className="save-status saved"><Check size={15} />Saved</span>}
          {saveState === 'error' && <span className="save-status error">Some nodes unavailable</span>}
        </div>
      </div>
    </aside>
  );
}

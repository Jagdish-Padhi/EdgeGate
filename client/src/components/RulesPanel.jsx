import { useEffect, useState } from 'react';
import { getJson, putJson } from '../api/http.js';
import { formatWindow } from '../lib/labels.js';
import { InfoTip } from './InfoTip.jsx';
import { Check, Save } from 'lucide-react';

const RULE_ID = 'public-api';

export function RulesPanel({ coordinatorUrl }) {
  const [rules, setRules] = useState(null);
  const [limit, setLimit] = useState(20);
  const [windowSec, setWindowSec] = useState(60);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const loaded = await getJson(`${coordinatorUrl}/rules`);
      setRules(loaded);
      const tier = loaded.rules.find((rule) => rule.id === RULE_ID).tiers.free;
      setLimit(tier.limit);
      setWindowSec(tier.windowSec);
    } catch {
      setMessage('Cannot reach the coordinator.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function apply() {
    const next = structuredClone(rules);
    const tier = next.rules.find((rule) => rule.id === RULE_ID).tiers.free;
    tier.limit = limit;
    tier.burst = Math.min(tier.burst, limit);
    try {
      const saved = await putJson(`${coordinatorUrl}/admin/rules`, next);
      setRules(saved);
      setMessage(`Saved as version ${saved.version}. Every node picks it up within a few seconds.`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>
            Limits
            <InfoTip label="About changing limits">
              A change is sent to the coordinator and reaches every node the next time it checks in. Nothing needs to restart.
            </InfoTip>
          </h2>
          <p className="muted">Change a limit while the system is running{rules ? ` (rules version ${rules.version})` : ''}</p>
        </div>
      </div>
      <div className="controls">
        <label className="inline">
          Free plan, requests allowed per {formatWindow(windowSec)}
          <input type="number" min="1" value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
        </label>
        <button type="button" className="primary icon-button" disabled={!rules} onClick={apply}>
          {message.startsWith('Saved') ? <Check size={14} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          {message.startsWith('Saved') ? 'Applied' : 'Apply change'}
        </button>
        {message && <span className="muted">{message}</span>}
      </div>
    </section>
  );
}

import { ArrowRight, CheckCircle2, Route, XCircle } from 'lucide-react';

export function VisualPipeline({ lastEvent, edges }) {
  const isOk = lastEvent?.status === 200;
  const is429 = lastEvent?.status === 429;
  const step = lastEvent?.step ? `[${lastEvent.step}/${lastEvent.total}] ` : '';

  return (
    <section className="pipeline-card compact-center-pipeline" aria-label="Latest request">
      <div className={`pipeline-narrator compact-narrator ${isOk ? 'narrative-ok' : is429 ? 'narrative-blocked' : 'narrative-idle'}`}>
        <Route size={14} className="narrator-icon" aria-hidden="true" />
        <div className="narrator-text">
          {lastEvent ? (
            isOk ? (
              <span>
                <strong>{step}{lastEvent.edgeRegion}</strong> decided from the quota it holds and{' '}
                <strong className="text-ok">allowed the request</strong>. Response time {lastEvent.latency} ms.
              </span>
            ) : is429 ? (
              <span>
                <strong>{step}{lastEvent.edgeRegion}</strong> has no quota left and{' '}
                <strong className="text-blocked">blocked the request (429)</strong>. The origin was not contacted.
              </span>
            ) : lastEvent.status === 0 ? (
              <span>{lastEvent.edgeRegion} could not be reached.</span>
            ) : (
              <span>{lastEvent.edgeRegion} returned status {lastEvent.status}.</span>
            )
          ) : (
            <span>Send requests from the panel on the left to see each decision here.</span>
          )}
        </div>
      </div>

      <div className="pipeline-compact-row">
        <div className="pipe-mini-node">
          <span className="mini-tag">Client</span>
          <strong>{lastEvent ? lastEvent.clientLabel.split(',')[0] : 'Free plan'}</strong>
        </div>

        <ArrowRight size={16} className={`mini-arrow ${lastEvent ? 'active' : ''}`} aria-hidden="true" />

        <div className={`pipe-mini-node ${lastEvent ? 'node-active' : ''}`}>
          <span className="mini-tag">Edge node</span>
          <strong>{lastEvent ? lastEvent.edgeRegion : 'Nearest edge'}</strong>
        </div>

        <ArrowRight size={16} className={`mini-arrow ${lastEvent ? (isOk ? 'active-ok' : 'active-drop') : ''}`} aria-hidden="true" />

        <div className="pipe-mini-outcomes">
          <div className={`mini-outcome-pill ok ${isOk ? 'active' : ''}`}>
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Allowed (200)</span>
          </div>
          <div className={`mini-outcome-pill blocked ${is429 ? 'active' : ''}`}>
            <XCircle size={13} aria-hidden="true" />
            <span>Blocked (429)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

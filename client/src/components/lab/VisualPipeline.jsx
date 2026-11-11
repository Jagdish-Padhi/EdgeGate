import { ArrowRight, CheckCircle2, Route, XCircle } from 'lucide-react';

export function VisualPipeline({ lastEvent, edges, running }) {
  const isOk = lastEvent?.status === 200;
  const is429 = lastEvent?.status === 429;
  const step = lastEvent?.step ? `[${lastEvent.step}/${lastEvent.total}] ` : '';

  const isArrow1Active = running || Boolean(lastEvent);
  const isArrow2Active = running || Boolean(lastEvent);

  return (
    <section className="pipeline-card slim-pipeline-strip" aria-label="Request Pipeline">
      {/* Left: Node Pipeline Flow */}
      <div className="pipeline-flow-group">
        <div className={`pipe-chip client-chip ${isArrow1Active ? 'chip-active' : ''}`}>
          <span className="pipe-chip-tag">Client</span>
          <strong>{lastEvent ? lastEvent.clientLabel.split(',')[0] : 'Free Plan'}</strong>
        </div>

        <ArrowRight
          size={15}
          className={`pipe-flow-arrow ${running ? 'pulse-active' : isArrow1Active ? 'active' : ''}`}
          aria-hidden="true"
        />

        <div className={`pipe-chip edge-chip ${isArrow2Active ? 'chip-active' : ''}`}>
          <span className="pipe-chip-tag">Edge Region</span>
          <strong>{lastEvent ? lastEvent.edgeRegion : 'Selected Region'}</strong>
        </div>

        <ArrowRight
          size={15}
          className={`pipe-flow-arrow ${
            running
              ? 'pulse-active'
              : isOk
              ? 'active-ok'
              : is429
              ? 'active-drop'
              : isArrow2Active
              ? 'active'
              : ''
          }`}
          aria-hidden="true"
        />

        <div className="pipe-outcome-group">
          <div className={`outcome-chip ok ${isOk ? 'active' : ''}`}>
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>200 Allowed</span>
          </div>
          <div className={`outcome-chip blocked ${is429 ? 'active' : ''}`}>
            <XCircle size={13} aria-hidden="true" />
            <span>429 Blocked</span>
          </div>
        </div>
      </div>

      {/* Right: Decision Narrative & Latency */}
      <div className={`pipeline-narrative-strip ${isOk ? 'ok' : is429 ? 'blocked' : 'idle'}`}>
        <Route size={13} className="narrative-lead-icon" aria-hidden="true" />
        <span className="narrative-summary">
          {running && !lastEvent ? (
            <span>Sending requests to regional edge nodes...</span>
          ) : lastEvent ? (
            isOk ? (
              <span>
                <strong>{step}{lastEvent.edgeRegion}</strong> allowed request · <strong className="text-ok">{lastEvent.latency}ms</strong>
              </span>
            ) : is429 ? (
              <span>
                <strong>{step}{lastEvent.edgeRegion}</strong> blocked (quota exceeded) · <strong className="text-blocked">HTTP 429</strong>
              </span>
            ) : lastEvent.status === 0 ? (
              <span>{lastEvent.edgeRegion} unreachable (network offline)</span>
            ) : (
              <span>{lastEvent.edgeRegion} returned HTTP {lastEvent.status}</span>
            )
          ) : (
            <span>Ready. Send requests from the left panel to test rate limits.</span>
          )}
        </span>
      </div>
    </section>
  );
}

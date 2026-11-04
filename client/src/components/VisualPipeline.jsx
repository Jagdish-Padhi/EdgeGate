import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

export function VisualPipeline({ lastEvent, edges }) {
  const isOk = lastEvent?.status === 200;
  const is429 = lastEvent?.status === 429;

  return (
    <section className="pipeline-card compact-center-pipeline" aria-label="Interactive Traffic Flow">
      {/* 1. Slim Narrative Ribbon */}
      <div className={`pipeline-narrator compact-narrator ${isOk ? 'narrative-ok' : is429 ? 'narrative-blocked' : 'narrative-idle'}`}>
        <Sparkles size={14} className="narrator-icon" />
        <div className="narrator-text">
          {lastEvent ? (
            isOk ? (
              <span>
                <strong>{lastEvent.step ? `[${lastEvent.step}/${lastEvent.total}] ` : ''}</strong>
                <strong>{lastEvent.edgeRegion}</strong> evaluated local RAM lease $\rightarrow${' '}
                <strong className="text-ok">Admitted to Origin (200 OK) in {lastEvent.latency}ms</strong> without calling Coordinator.
              </span>
            ) : is429 ? (
              <span>
                <strong>{lastEvent.step ? `[${lastEvent.step}/${lastEvent.total}] ` : ''}</strong>
                <strong>{lastEvent.edgeRegion}</strong> quota exhausted $\rightarrow${' '}
                <strong className="text-blocked">Throttled (429 Too Many Requests)</strong>. Origin protected!
              </span>
            ) : (
              <span>{lastEvent.edgeRegion} returned status {lastEvent.status}.</span>
            )
          ) : (
            <span>
              <strong>Ready:</strong> Click <strong>"Step 1"</strong> or <strong>"Send"</strong> on the left to see requests routed in real time.
            </span>
          )}
        </div>
      </div>

      {/* 2. Compact 3-Node Visual Pipeline */}
      <div className="pipeline-compact-row">
        <div className="pipe-mini-node">
          <span className="mini-tag">1. Client</span>
          <strong>{lastEvent ? lastEvent.clientLabel.split(',')[0] : 'Free Client'}</strong>
        </div>

        <span className={`mini-arrow ${lastEvent ? 'active' : ''}`}>→</span>

        <div className={`pipe-mini-node ${lastEvent ? 'node-active' : ''}`}>
          <span className="mini-tag">2. Edge Check</span>
          <strong>{lastEvent ? `${lastEvent.edgeRegion} (RAM)` : 'Nearest Edge'}</strong>
        </div>

        <span className={`mini-arrow ${lastEvent ? (isOk ? 'active-ok' : 'active-drop') : ''}`}>→</span>

        <div className="pipe-mini-outcomes">
          <div className={`mini-outcome-pill ok ${isOk ? 'active' : ''}`}>
            <CheckCircle2 size={13} />
            <span>Origin (200)</span>
          </div>
          <div className={`mini-outcome-pill blocked ${is429 ? 'active' : ''}`}>
            <ShieldAlert size={13} />
            <span>EdgeGate (429)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

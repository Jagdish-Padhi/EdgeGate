import { Flame, PlayCircle, ShieldCheck, Zap } from 'lucide-react';

export function ScenarioBar({ onRunScenario, running }) {
  const scenarios = [
    {
      id: 'balanced',
      label: 'Balanced Global Traffic',
      desc: '30 requests distributed evenly across Mumbai, Frankfurt & Virginia',
      icon: PlayCircle,
      action: { client: 'free', target: 'all', count: 30, gapMs: 30 },
    },
    {
      id: 'mumbai-burst',
      label: 'Flash Crowd in Mumbai',
      desc: '70 rapid requests hammering Mumbai — observe local throttling protecting origin',
      icon: Flame,
      action: { client: 'free', target: 'edge-mumbai', count: 70, gapMs: 15 },
    },
    {
      id: 'pro-tier',
      label: 'High-Volume Pro Client',
      desc: '45 requests from paying Pro customer with higher quota limits',
      icon: ShieldCheck,
      action: { client: 'pro', target: 'all', count: 45, gapMs: 25 },
    },
  ];

  return (
    <div className="scenario-bar" aria-label="Demo scenarios">
      <div className="scenario-intro">
        <Zap size={15} className="scenario-zap" />
        <span className="scenario-intro-text">
          <strong>Quick Demo Scenarios:</strong> Click any preset to see how EdgeGate reacts
        </span>
      </div>
      <div className="scenario-buttons">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              type="button"
              className="scenario-btn"
              disabled={running}
              onClick={() => onRunScenario(sc.action, sc.label)}
            >
              <Icon size={14} className="sc-icon" />
              <div className="sc-content">
                <span className="sc-title">{sc.label}</span>
                <span className="sc-desc">{sc.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


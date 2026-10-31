import { useEffect, useMemo, useRef, useState } from 'react';
import { EDGES } from '../config.js';
import { InfoTip } from './InfoTip.jsx';
import { Activity, Ban, CheckCircle2 } from 'lucide-react';

const MAX_SAMPLES = 30;
const WIDTH = 760;
const HEIGHT = 250;
const PADDING = { top: 18, right: 18, bottom: 34, left: 44 };
const COLORS = ['var(--node-0)', 'var(--node-1)', 'var(--node-2)'];

function linePath(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function formatRate(value) {
  return value >= 10 ? Math.round(value) : value.toFixed(1);
}

export function DecisionChart({ edges }) {
  const [metric, setMetric] = useState('allowed');
  const [samples, setSamples] = useState([]);
  const previous = useRef(null);

  useEffect(() => {
    const now = Date.now();
    const current = Object.fromEntries(
      edges.filter((edge) => edge.state).map((edge) => [
        edge.id,
        { allowed: edge.state.totals.allowed, blocked: edge.state.totals.denied },
      ])
    );

    if (!Object.keys(current).length) return;
    if (!previous.current) {
      previous.current = { at: now, totals: current };
      return;
    }

    const elapsed = Math.max(0.1, (now - previous.current.at) / 1000);
    const sample = {
      at: now,
      rates: Object.fromEntries(EDGES.map((edge) => {
        const before = previous.current.totals[edge.id] ?? { allowed: 0, blocked: 0 };
        const after = current[edge.id] ?? before;
        return [edge.id, {
          allowed: Math.max(0, after.allowed - before.allowed) / elapsed,
          blocked: Math.max(0, after.blocked - before.blocked) / elapsed,
        }];
      })),
    };

    previous.current = { at: now, totals: current };
    setSamples((history) => [...history, sample].slice(-MAX_SAMPLES));
  }, [edges]);

  const chart = useMemo(() => {
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const maxValue = Math.max(1, ...samples.flatMap((sample) => EDGES.map((edge) => sample.rates[edge.id]?.[metric] ?? 0)));
    const yMax = Math.ceil(maxValue / 5) * 5 || 1;
    const x = (index) => PADDING.left + (samples.length <= 1 ? plotWidth : (index / (samples.length - 1)) * plotWidth);
    const y = (value) => PADDING.top + plotHeight - (value / yMax) * plotHeight;
    const series = EDGES.map((edge) => ({
      ...edge,
      color: COLORS[EDGES.indexOf(edge)],
      points: samples.map((sample, index) => [x(index), y(sample.rates[edge.id]?.[metric] ?? 0)]),
    }));
    return { plotWidth, plotHeight, yMax, x, y, series };
  }, [metric, samples]);

  const latest = samples.at(-1);
  const hasData = samples.length > 0;
  const yTicks = [0, 0.5, 1].map((fraction) => ({
    value: chart.yMax * fraction,
    y: chart.y(chart.yMax * fraction),
  }));

  return (
    <section className="panel decision-chart" aria-labelledby="decision-chart-title">
      <div className="panel-head">
        <div>
          <h2 id="decision-chart-title">
            <Activity size={16} strokeWidth={1.8} aria-hidden="true" />
            Regional decisions
            <InfoTip label="About this chart">
              Each point is calculated from the edge counters between console polls. It shows decisions per second made locally by each region, not requests sent to a central limiter.
            </InfoTip>
          </h2>
          <p className="muted">Live request decisions by edge region</p>
        </div>
        <div className="chart-switcher" role="group" aria-label="Decision type">
          <button type="button" className={metric === 'allowed' ? 'active' : ''} onClick={() => setMetric('allowed')}>
            <CheckCircle2 size={13} aria-hidden="true" /> Allowed
          </button>
          <button type="button" className={metric === 'blocked' ? 'active' : ''} onClick={() => setMetric('blocked')}>
            <Ban size={13} aria-hidden="true" /> Blocked
          </button>
        </div>
      </div>

      <div className="chart-frame">
        <svg className="decision-plot" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${metric} decisions per second by region`}>
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line className="chart-gridline" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={tick.y} y2={tick.y} />
              <text className="chart-axis-label" x={PADDING.left - 9} y={tick.y + 4} textAnchor="end">{formatRate(tick.value)}</text>
            </g>
          ))}
          <line className="chart-axis" x1={PADDING.left} x2={PADDING.left} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} />
          <line className="chart-axis" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={HEIGHT - PADDING.bottom} y2={HEIGHT - PADDING.bottom} />
          <text className="chart-axis-title" x={12} y={PADDING.top - 3}>req/s</text>
          {!hasData && <text className="chart-empty" x={WIDTH / 2} y={HEIGHT / 2}>Send traffic to populate the graph</text>}
          {chart.series.map((series) => (
            <g key={series.id}>
              {series.points.length > 1 && <path className="chart-series" d={linePath(series.points)} style={{ stroke: series.color }} />}
              {latest && series.points.length > 0 && (
                <circle className="chart-point" cx={series.points.at(-1)[0]} cy={series.points.at(-1)[1]} r="3.5" style={{ fill: series.color }}>
                  <title>{`${series.region}: ${formatRate(latest.rates[series.id]?.[metric] ?? 0)} req/s`}</title>
                </circle>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="chart-footer">
        <div className="chart-legend">
          {chart.series.map((series) => <span key={series.id}><i style={{ background: series.color }} />{series.region}</span>)}
        </div>
        <span className="muted">{hasData ? `Last ${samples.length} samples · ${metric} decisions/sec` : 'Waiting for edge counters'}</span>
      </div>
    </section>
  );
}

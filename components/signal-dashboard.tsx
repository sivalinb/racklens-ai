'use client';

import {
  Activity,
  BellRing,
  CircleGauge,
  Cpu,
  Fan,
  Gauge,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { Scenario, ScenarioKey } from '@/lib/demo-data';
import {
  buildRedfishSignals,
  buildSignalEvents,
  type RedfishSignal,
  type SignalGroup,
  type SignalScope,
} from '@/lib/redfish-signals';

type Props = {
  scenario: Scenario;
  scenarioKey: ScenarioKey;
  running: boolean;
  scope: SignalScope;
  selectedRack: string;
  selectedGpu: number;
  onScopeChange: (scope: SignalScope) => void;
  onRackChange: (rack: string) => void;
  onGpuChange: (gpu: number) => void;
};

const groups: SignalGroup[] = ['All', 'Power', 'Thermal', 'Health', 'Fabric'];
const ranges = ['5m', '15m', '1h', '6h'] as const;

function Sparkline({ signal }: { signal: RedfishSignal }) {
  const min = Math.min(...signal.series);
  const max = Math.max(...signal.series);
  const spread = max - min || 1;
  const points = signal.series
    .map((value, index) => {
      const x = (index / Math.max(1, signal.series.length - 1)) * 100;
      const y = 42 - ((value - min) / spread) * 34;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `0,44 ${points} 100,44`;
  return (
    <svg
      className="signal-sparkline"
      viewBox="0 0 100 46"
      preserveAspectRatio="none"
      aria-label={`${signal.label} recent trend`}
    >
      <defs>
        <linearGradient id={`fill-${signal.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={signal.color} stopOpacity=".3" />
          <stop offset="1" stopColor={signal.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="13" x2="100" y2="13" className="spark-grid" />
      <line x1="0" y1="29" x2="100" y2="29" className="spark-grid" />
      <polygon points={area} fill={`url(#fill-${signal.id})`} />
      <polyline
        points={points}
        fill="none"
        stroke={signal.color}
        strokeWidth="1.7"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx="100"
        cy={points.split(' ').at(-1)?.split(',')[1]}
        r="2"
        fill={signal.color}
      />
    </svg>
  );
}

function GroupIcon({ group }: { group: RedfishSignal['group'] }) {
  if (group === 'Power') return <Zap />;
  if (group === 'Thermal') return <Thermometer />;
  if (group === 'Fabric') return <Network />;
  return <ShieldCheck />;
}

export function SignalDashboard({
  scenario,
  scenarioKey,
  running,
  scope,
  selectedRack,
  selectedGpu,
  onScopeChange,
  onRackChange,
  onGpuChange,
}: Props) {
  const [group, setGroup] = useState<SignalGroup>('All');
  const [range, setRange] = useState<(typeof ranges)[number]>('15m');
  const [refreshCount, setRefreshCount] = useState(0);
  const signals = buildRedfishSignals(
    scope,
    selectedRack,
    selectedGpu,
    scenarioKey,
    scenario,
  );
  const visibleSignals = signals.filter(
    (signal) => group === 'All' || signal.group === group,
  );
  const events = buildSignalEvents(
    scope,
    selectedRack,
    selectedGpu,
    scenarioKey,
  );
  const warnings = signals.filter(
    (signal) => signal.status === 'warning' || signal.status === 'critical',
  ).length;
  const targetLabel =
    scope === 'rack'
      ? selectedRack
      : `${selectedRack}-U18 / GPU ${selectedGpu}`;

  return (
    <section
      className={`signal-dashboard ${running ? 'signals-running' : ''}`}
      id="signals"
    >
      <div className="signal-dashboard-topbar">
        <div className="signal-title">
          <span className="signal-glyph">
            <Activity />
          </span>
          <div>
            <span>OBSERVABILITY / REDFISH SIGNALS</span>
            <h2>{targetLabel}</h2>
          </div>
        </div>
        <div className="signal-live-state">
          <i />
          <span>{running ? 'STREAMING REPLAY' : 'REPLAY PAUSED'}</span>
          <b>{signals.length} signals</b>
        </div>
      </div>

      <div className="signal-toolbar">
        <div className="signal-scope-tabs" aria-label="Signal target">
          <button
            className={scope === 'rack' ? 'active' : ''}
            onClick={() => onScopeChange('rack')}
          >
            <Server /> Rack
          </button>
          <button
            className={scope === 'gpu' ? 'active' : ''}
            onClick={() => onScopeChange('gpu')}
          >
            <Cpu /> GPU
          </button>
        </div>
        <label>
          Rack
          <select
            value={selectedRack}
            onChange={(event) => onRackChange(event.target.value)}
          >
            {['R01', 'R02', 'R03', 'R04'].map((rack) => (
              <option key={rack}>{rack}</option>
            ))}
          </select>
        </label>
        {scope === 'gpu' && (
          <label>
            GPU
            <select
              value={selectedGpu}
              onChange={(event) => onGpuChange(Number(event.target.value))}
            >
              {Array.from({ length: 8 }, (_, index) => (
                <option key={index} value={index}>
                  GPU {index}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="signal-range" aria-label="Time range">
          {ranges.map((item) => (
            <button
              key={item}
              className={range === item ? 'active' : ''}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="signal-refresh"
          onClick={() => setRefreshCount((value) => value + 1)}
        >
          <RefreshCw /> Refresh <span>{refreshCount ? 'now' : '8s'}</span>
        </button>
      </div>

      <div className="signal-summary">
        <article>
          <CircleGauge />
          <div>
            <span>Collection coverage</span>
            <strong>
              {signals.length} / {signals.length}
            </strong>
            <small>no missing series</small>
          </div>
        </article>
        <article>
          <BellRing />
          <div>
            <span>Active thresholds</span>
            <strong>{warnings}</strong>
            <small>{warnings ? 'needs attention' : 'normal envelope'}</small>
          </div>
        </article>
        <article>
          <Gauge />
          <div>
            <span>Sampling interval</span>
            <strong>5 sec</strong>
            <small>TelemetryService</small>
          </div>
        </article>
        <article>
          <ShieldCheck />
          <div>
            <span>Connector mode</span>
            <strong>GET only</strong>
            <small>0 production writes</small>
          </div>
        </article>
      </div>

      <div className="signal-filter-row">
        <div>
          <SlidersHorizontal />
          <span>Signal groups</span>
          {groups.map((item) => (
            <button
              key={item}
              className={group === item ? 'active' : ''}
              onClick={() => setGroup(item)}
            >
              {item}
              <small>
                {item === 'All'
                  ? signals.length
                  : signals.filter((signal) => signal.group === item).length}
              </small>
            </button>
          ))}
        </div>
        <p>
          Window: last {range} · target follows rack floor and GPU topology
          selections
        </p>
      </div>

      <div className="signal-card-grid" aria-live="polite">
        {visibleSignals.map((signal) => (
          <article
            className={`signal-card signal-${signal.status}`}
            key={signal.id}
          >
            <div className="signal-card-head">
              <span>
                <GroupIcon group={signal.group} /> {signal.group}
              </span>
              <i />
            </div>
            <h3>{signal.label}</h3>
            <div className="signal-reading">
              <strong>{signal.value}</strong>
              <span>{signal.delta}</span>
            </div>
            <Sparkline signal={signal} />
            <div className="signal-source">
              <span>{signal.source}</span>
              <code title={signal.uri}>{signal.uri}</code>
            </div>
          </article>
        ))}
      </div>

      <div className="signal-events">
        <div className="signal-events-heading">
          <div>
            <BellRing />
            <span>Redfish event stream</span>
          </div>
          <small>Newest first · selected target only</small>
        </div>
        <div
          className="signal-event-table"
          aria-label="Redfish events for selected target"
        >
          <div className="signal-event-row signal-event-header">
            <span>Time</span>
            <span>Severity</span>
            <span>Event</span>
            <span>Target</span>
            <span>Message</span>
          </div>
          {events.map((event) => (
            <div
              className="signal-event-row"
              key={`${event.time}-${event.event}`}
            >
              <time>{event.time}</time>
              <span
                className={`event-severity event-${event.severity.toLowerCase()}`}
              >
                {event.severity}
              </span>
              <strong>{event.event}</strong>
              <code>{event.target}</code>
              <p>{event.message}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="signal-footnote">
        <Fan />
        <p>
          Standard Redfish resources and optional OEM MetricReport properties
          are labeled per card. The public site uses deterministic
          Redfish-shaped telemetry.
        </p>
      </div>
    </section>
  );
}

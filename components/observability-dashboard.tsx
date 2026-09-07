'use client';
/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */

import {
  Activity,
  Bell,
  Clock3,
  Cpu,
  Database,
  Filter,
  Gauge,
  LayoutDashboard,
  Maximize2,
  MoreHorizontal,
  Network,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Thermometer,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SCENARIOS, type ScenarioKey } from '@/lib/demo-data';
import {
  buildObservabilityCatalog,
  type ObservabilityGroup,
} from '@/lib/observability-data';

const timeLabels = [
  '14:21',
  '14:22',
  '14:23',
  '14:24',
  '14:25',
  '14:26',
  '14:27',
  '14:28',
  '14:29',
  '14:30',
  '14:31',
  '14:32',
];

const palette = {
  green: '#73bf69',
  yellow: '#f2cc0c',
  orange: '#ff9830',
  red: '#f2495c',
  blue: '#5794f2',
  purple: '#b877d9',
  cyan: '#56d2df',
};

const facilities = {
  'DEN-01': ['Hall A', 'Hall B'],
  'SJC-02': ['Hall A', 'Hall C'],
  'IAD-01': ['Hall B', 'Hall D'],
} as const;

const dashboardViews = [
  'Overview',
  'Power',
  'Thermal',
  'Fabric',
  'Health',
  'Performance',
  'Inventory',
] as const;

const subscribeToBrowser = () => () => undefined;

function Panel({
  title,
  subtitle,
  children,
  className = '',
  defer = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  defer?: boolean;
}) {
  const browserReady = useSyncExternalStore(
    subscribeToBrowser,
    () => true,
    () => false,
  );
  return (
    <section className={`observe-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <div className="observe-panel-actions">
          <button aria-label={`Expand ${title}`}>
            <Maximize2 />
          </button>
          <button aria-label={`More options for ${title}`}>
            <MoreHorizontal />
          </button>
        </div>
      </header>
      <div className="observe-panel-body">
        {defer && !browserReady ? (
          <div className="observe-chart-loading" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

type MetricTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    color?: string;
    dataKey?: string | number;
    name?: string | number;
    value?: string | number;
  }>;
};

function MetricTooltip({ active, payload, label }: MetricTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="observe-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          <i style={{ background: item.color }} /> {item.name}
          <b>{Number(item.value).toFixed(1)}</b>
        </span>
      ))}
    </div>
  );
}

export function ObservabilityDashboard() {
  const [dataCenter, setDataCenter] =
    useState<keyof typeof facilities>('DEN-01');
  const [hall, setHall] = useState('Hall A');
  const [row, setRow] = useState('Row 02');
  const [rack, setRack] = useState('R02');
  const [node, setNode] = useState('U18');
  const [gpu, setGpu] = useState('All GPUs');
  const [range, setRange] = useState('Last 15 minutes');
  const [refresh, setRefresh] = useState('5s');
  const [paused, setPaused] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('cooling');
  const [view, setView] = useState<(typeof dashboardViews)[number]>('Overview');
  const [signalSearch, setSignalSearch] = useState('');
  const scenario = SCENARIOS[scenarioKey];

  const lineData = useMemo(
    () =>
      timeLabels.map((time, index) => ({
        time,
        power: Number(
          (scenario.metrics.power[index] + (refreshTick % 3) * 0.02).toFixed(2),
        ),
        cap: scenarioKey === 'power' ? 35 : 48,
        inlet: scenario.metrics.thermal[index],
        exhaust: Number((scenario.metrics.thermal[index] + 11.6).toFixed(1)),
        fan: Math.round(69 + index * (scenarioKey === 'cooling' ? 2.35 : 0.3)),
        ingress: scenario.metrics.traffic[index],
        egress: Number((scenario.metrics.traffic[index] * 0.91).toFixed(2)),
        clock: scenario.metrics.clock[index],
        pollLatency: Math.round(
          142 +
            Math.sin(index * 0.9) * 24 +
            (scenarioKey === 'pcie' && index > 7 ? 78 : 0) +
            (refreshTick % 3) * 3,
        ),
      })),
    [scenario, scenarioKey, refreshTick],
  );

  const gpuData = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => ({
        gpu: `GPU ${index}`,
        temperature: Math.round(
          (scenario.metrics.thermal.at(-1) ?? 24) +
            34 +
            index * 0.8 +
            (refreshTick % 2) * 0.1,
        ),
        power: Math.round(498 + index * 7 - (scenarioKey === 'power' ? 72 : 0)),
      })),
    [scenario, scenarioKey, refreshTick],
  );

  const catalog = buildObservabilityCatalog(
    rack,
    node === 'All nodes' ? 'U18' : node,
    gpu,
    scenarioKey,
    scenario,
  );
  const visibleSignals = catalog.filter((signal) => {
    const matchesView = view === 'Overview' || signal.group === view;
    const query = signalSearch.trim().toLowerCase();
    return (
      matchesView &&
      (!query ||
        signal.name.toLowerCase().includes(query) ||
        signal.source.toLowerCase().includes(query) ||
        signal.uri.toLowerCase().includes(query))
    );
  });
  const gpuHeatmap = Array.from({ length: 8 }, (_, gpuIndex) => ({
    gpu: `GPU ${gpuIndex}`,
    values: scenario.metrics.clock.map((clock, timeIndex) =>
      Math.max(
        22,
        Math.min(
          99,
          Math.round(
            64 + gpuIndex * 2.1 + timeIndex * 1.7 - (1830 - clock) * 0.08,
          ),
        ),
      ),
    ),
  }));
  const serviceFreshness = [
    { service: 'Systems', age: 3.2 },
    { service: 'Chassis', age: 2.1 },
    { service: 'Thermal', age: 1.9 },
    { service: 'Power', age: 2.4 },
    { service: 'Fabric', age: scenarioKey === 'pcie' ? 8.7 : 4.8 },
    { service: 'GPU OEM', age: 6.2 },
    { service: 'Events', age: 0.7 },
  ];
  const groupCount = (group: ObservabilityGroup) =>
    catalog.filter((signal) => signal.group === group).length;

  const chartCommon = {
    stroke: '#3a3a3a',
    tick: { fill: '#9f9f9f', fontSize: 11 },
  };

  return (
    <main className="observe-shell">
      <header className="observe-appbar">
        <a href="/" className="observe-logo" aria-label="RackLens home">
          <span>
            <Activity />
          </span>
          <strong>RackLens</strong>
          <small>OBSERVE</small>
        </a>
        <button className="observe-search">
          <Search /> Search dashboards and signals <kbd>⌘K</kbd>
        </button>
        <nav aria-label="Observability navigation">
          <a href="/ai-observability">AI Observability</a>
          <a href="/studio">3D Studio</a>
          <a href="/platform">Product Lab</a>
          <button aria-label="Notifications">
            <Bell />
          </button>
          <button aria-label="Settings">
            <Settings />
          </button>
        </nav>
      </header>

      <div className="observe-crumbbar">
        <div>
          <LayoutDashboard />
          <span>Dashboards</span>
          <b>/</b>
          <strong>Redfish rack & GPU overview</strong>
        </div>
        <div>
          <button>
            <Star /> Star
          </button>
          <button>
            <Share2 /> Share
          </button>
        </div>
      </div>

      <section className="observe-toolbar" aria-label="Dashboard controls">
        <div className="observe-variables">
          <label>
            Data source
            <select>
              <option>Redfish TelemetryService</option>
              <option>EventService</option>
              <option>OEM MetricReports</option>
            </select>
          </label>
          <label>
            Data center
            <select
              value={dataCenter}
              onChange={(event) => {
                const value = event.target.value as keyof typeof facilities;
                setDataCenter(value);
                setHall(facilities[value][0]);
              }}
            >
              <option>DEN-01</option>
              <option>SJC-02</option>
              <option>IAD-01</option>
            </select>
          </label>
          <label>
            Hall
            <select
              value={hall}
              onChange={(event) => setHall(event.target.value)}
            >
              {facilities[dataCenter].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Row
            <select
              value={row}
              onChange={(event) => setRow(event.target.value)}
            >
              {['Row 01', 'Row 02', 'Row 03'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Rack
            <select
              value={rack}
              onChange={(event) => setRack(event.target.value)}
            >
              {['R01', 'R02', 'R03', 'R04'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Node
            <select
              value={node}
              onChange={(event) => setNode(event.target.value)}
            >
              {['All nodes', 'U14', 'U18', 'U22', 'U26'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            GPU
            <select
              value={gpu}
              onChange={(event) => setGpu(event.target.value)}
            >
              {[
                'All GPUs',
                ...Array.from({ length: 8 }, (_, index) => `GPU ${index}`),
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Replay
            <select
              value={scenarioKey}
              onChange={(event) =>
                setScenarioKey(event.target.value as ScenarioKey)
              }
            >
              {Object.entries(SCENARIOS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="observe-time-controls">
          <label>
            <Clock3 />
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option>Last 5 minutes</option>
              <option>Last 15 minutes</option>
              <option>Last 1 hour</option>
              <option>Last 6 hours</option>
              <option>Last 24 hours</option>
            </select>
          </label>
          <button
            onClick={() => setRefreshTick((value) => value + 1)}
            aria-label="Refresh dashboard"
          >
            <RefreshCw />
          </button>
          <label className="refresh-select">
            <span className="sr-only">Refresh interval</span>
            <select
              value={refresh}
              onChange={(event) => setRefresh(event.target.value)}
            >
              <option>Off</option>
              <option>5s</option>
              <option>10s</option>
              <option>30s</option>
              <option>1m</option>
            </select>
          </label>
          <button
            className={paused ? 'paused' : ''}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play /> : <Pause />}
          </button>
        </div>
      </section>

      <section className="observe-statusbar">
        <span>
          <i className="status-live" />{' '}
          {paused ? 'Streaming paused' : `Streaming · refresh ${refresh}`}
        </span>
        <span>
          {dataCenter} / {hall} / {row} / {rack} / {node} / {gpu}
        </span>
        <span>
          <Database /> 112 Redfish + OEM series · {catalog.length} selected
          signals
        </span>
        <span>Updated 2s ago</span>
      </section>

      <section
        className="observe-view-tabs"
        aria-label="Dashboard signal groups"
      >
        {dashboardViews.map((item) => (
          <button
            key={item}
            className={view === item ? 'active' : ''}
            onClick={() => setView(item)}
          >
            {item}
            {item !== 'Overview' && (
              <small>{groupCount(item as ObservabilityGroup)}</small>
            )}
          </button>
        ))}
      </section>

      <section className="observe-stat-grid">
        <article>
          <span>
            <Zap /> Rack power
          </span>
          <strong>
            {scenario.metrics.power.at(-1)?.toFixed(1)} <small>kW</small>
          </strong>
          <b className="ok">NORMAL</b>
        </article>
        <article>
          <span>
            <Thermometer /> Peak inlet
          </span>
          <strong>
            {scenario.metrics.thermal.at(-1)?.toFixed(1)}
            <small>°C</small>
          </strong>
          <b className={scenarioKey === 'cooling' ? 'warn' : 'ok'}>
            {scenarioKey === 'cooling' ? 'WARNING' : 'NORMAL'}
          </b>
        </article>
        <article>
          <span>
            <Cpu /> GPU health
          </span>
          <strong>{scenarioKey === 'healthy' ? '8 / 8' : '7 / 8'}</strong>
          <b className={scenarioKey === 'healthy' ? 'ok' : 'warn'}>
            {scenarioKey === 'healthy' ? 'HEALTHY' : '1 DEGRADED'}
          </b>
        </article>
        <article>
          <span>
            <Gauge /> Collection
          </span>
          <strong>
            112 <small>/ 112</small>
          </strong>
          <b className="ok">100%</b>
        </article>
      </section>

      <section className="observe-grid">
        <Panel
          title="Rack power draw"
          subtitle={`${rack} · Chassis Power · kW`}
          className="panel-wide"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <AreaChart
              data={lineData}
              margin={{ top: 12, right: 18, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="power-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0"
                    stopColor={palette.yellow}
                    stopOpacity={0.35}
                  />
                  <stop offset="1" stopColor={palette.yellow} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 55]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={48}
                stroke={palette.red}
                strokeDasharray="6 4"
                label={{
                  value: '48 kW limit',
                  fill: palette.red,
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="power"
                name="Rack power"
                stroke={palette.yellow}
                strokeWidth={2}
                fill="url(#power-fill)"
              />
              <Line
                type="stepAfter"
                dataKey="cap"
                name="Configured cap"
                stroke={palette.red}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Inlet / exhaust temperature"
          subtitle={`${rack} · Thermal · °C`}
          className="panel-wide"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <LineChart
              data={lineData}
              margin={{ top: 12, right: 18, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[15, 50]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={27}
                stroke={palette.orange}
                strokeDasharray="6 4"
                label={{
                  value: 'warning 27°C',
                  fill: palette.orange,
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={32}
                stroke={palette.red}
                strokeDasharray="6 4"
              />
              <Line
                type="monotone"
                dataKey="inlet"
                name="Cold aisle inlet"
                stroke={palette.cyan}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="exhaust"
                name="Hot aisle exhaust"
                stroke={palette.orange}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="GPU temperature"
          subtitle={`${rack}-${node} · all accelerators · °C`}
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <BarChart
              data={gpuData}
              margin={{ top: 12, right: 14, left: -14, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="gpu"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <ReferenceLine
                y={80}
                stroke={palette.red}
                strokeDasharray="6 4"
              />
              <Bar
                dataKey="temperature"
                name="GPU temp"
                fill={palette.orange}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="GPU board power"
          subtitle={`${rack}-${node} · OEM MetricReport · W`}
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <BarChart
              data={gpuData}
              margin={{ top: 12, right: 14, left: -14, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="gpu"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 750]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <ReferenceLine
                y={700}
                stroke={palette.red}
                strokeDasharray="6 4"
              />
              <Bar
                dataKey="power"
                name="Board power"
                fill={palette.blue}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="ToR traffic"
          subtitle={`${rack} · ports A/B · Tb/s`}
          className="panel-wide"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <AreaChart
              data={lineData}
              margin={{ top: 12, right: 18, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ingress-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={palette.blue} stopOpacity={0.3} />
                  <stop offset="1" stopColor={palette.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="egress-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0"
                    stopColor={palette.purple}
                    stopOpacity={0.22}
                  />
                  <stop offset="1" stopColor={palette.purple} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 8]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={7.2}
                stroke={palette.red}
                strokeDasharray="6 4"
                label={{
                  value: 'warning 7.2',
                  fill: palette.red,
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="ingress"
                name="ToR ingress"
                stroke={palette.blue}
                strokeWidth={2}
                fill="url(#ingress-fill)"
              />
              <Area
                type="monotone"
                dataKey="egress"
                name="ToR egress"
                stroke={palette.purple}
                strokeWidth={2}
                fill="url(#egress-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Cooling control"
          subtitle={`${rack} · fan zone 0 · duty %`}
          className="panel-tall"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <LineChart
              data={lineData}
              margin={{ top: 12, right: 18, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={90}
                stroke={palette.orange}
                strokeDasharray="6 4"
                label={{
                  value: 'warning 90%',
                  fill: palette.orange,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="fan"
                name="Fan duty"
                stroke={palette.green}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="GPU utilization heatmap"
          subtitle={`${rack}-${node} · 8 GPUs · %`}
          className="panel-tall"
        >
          <figure
            className="observe-heatmap"
            aria-label="GPU utilization over the selected time range"
          >
            <div className="heatmap-times">
              <span />
              {timeLabels
                .filter((_, index) => index % 2 === 0)
                .map((time) => (
                  <b key={time}>{time}</b>
                ))}
            </div>
            {gpuHeatmap.map((item) => (
              <div className="heatmap-row" key={item.gpu}>
                <span>{item.gpu}</span>
                {item.values.map((value, index) => (
                  <i
                    key={`${item.gpu}-${timeLabels[index]}`}
                    title={`${item.gpu} · ${timeLabels[index]} · ${value}%`}
                    style={{
                      background:
                        value >= 90
                          ? palette.red
                          : value >= 76
                            ? palette.yellow
                            : palette.green,
                      opacity: 0.38 + value / 165,
                    }}
                  />
                ))}
              </div>
            ))}
            <div className="heatmap-legend">
              <span>0%</span>
              <i />
              <span>100%</span>
            </div>
          </figure>
        </Panel>

        <Panel
          title="Health state"
          subtitle={`${rack} · Redfish Status rollup`}
          className="panel-tall"
        >
          <div className="observe-health-list">
            {[
              [
                'Chassis',
                scenarioKey === 'healthy' ? 'OK' : 'Warning',
                'Chassis/Status',
              ],
              ['Compute nodes', '8 / 8 OK', 'Systems/Status'],
              [
                'Accelerators',
                scenarioKey === 'pcie' ? '7 / 8 OK' : '8 / 8 OK',
                'PCIeDevices/Status',
              ],
              ['Power supplies', '2 / 2 OK', 'PowerSupplies/Status'],
              [
                'Fan zones',
                scenarioKey === 'cooling' ? '1 warning' : '6 / 6 OK',
                'Thermal/Fans',
              ],
              [
                'ToR links',
                scenarioKey === 'pcie' ? '1 degraded' : '4 / 4 OK',
                'NetworkAdapters/Ports',
              ],
            ].map(([label, value, source]) => (
              <div key={label}>
                <span>
                  <i
                    className={
                      value.includes('warning') ||
                      value.includes('degraded') ||
                      value === 'Warning' ||
                      value.startsWith('7')
                        ? 'warn'
                        : ''
                    }
                  />
                  {label}
                </span>
                <strong>{value}</strong>
                <code>{source}</code>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="GPU accelerator clock"
          subtitle={`${rack}-${node} · ${gpu} · MHz`}
          className="panel-tall"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <LineChart
              data={lineData}
              margin={{ top: 12, right: 18, left: -5, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[1400, 1950]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={1600}
                stroke={palette.red}
                strokeDasharray="6 4"
                label={{
                  value: 'warning 1,600',
                  fill: palette.red,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="clock"
                name="Accelerator clock"
                stroke={palette.purple}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Active thresholds & events"
          subtitle="EventService · newest first"
          className="panel-wide panel-tall"
        >
          <div className="observe-events">
            <div className="observe-events-head">
              <span>State</span>
              <span>Time</span>
              <span>Event</span>
              <span>Source</span>
            </div>
            {(scenarioKey === 'healthy'
              ? [
                  [
                    'OK',
                    '14:32:04',
                    'Telemetry report delivered',
                    `${rack} MetricReport`,
                  ],
                  [
                    'OK',
                    '14:31:59',
                    'Health rollup unchanged',
                    `${rack} Chassis`,
                  ],
                ]
              : [
                  [
                    'WARN',
                    '14:32:04',
                    scenario.finding,
                    `${rack} ${scenarioKey === 'cooling' ? 'Thermal' : scenarioKey === 'power' ? 'PowerControl' : 'PCIeDevice'}`,
                  ],
                  [
                    'INFO',
                    '14:31:42',
                    'Threshold annotation opened',
                    `${rack}-${node}`,
                  ],
                  [
                    'OK',
                    '14:31:36',
                    'MetricReport delivered',
                    `${rack} TelemetryService`,
                  ],
                  [
                    'INFO',
                    '14:31:12',
                    'Correlation window aligned',
                    'RackLens collector',
                  ],
                  [
                    'OK',
                    '14:30:58',
                    'Event subscription heartbeat',
                    'EventService',
                  ],
                ]
            ).map(([state, time, event, source]) => (
              <div key={`${time}-${event}`}>
                <b className={`event-${state.toLowerCase()}`}>{state}</b>
                <time>{time}</time>
                <strong>{event}</strong>
                <code>{source}</code>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Redfish poll latency"
          subtitle="Collector · GET request latency · ms"
          className="panel-tall"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <AreaChart
              data={lineData}
              margin={{ top: 12, right: 18, left: -5, bottom: 0 }}
            >
              <defs>
                <linearGradient id="latency-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={palette.cyan} stopOpacity={0.3} />
                  <stop offset="1" stopColor={palette.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 600]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={500}
                stroke={palette.orange}
                strokeDasharray="6 4"
                label={{
                  value: 'warning 500 ms',
                  fill: palette.orange,
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="pollLatency"
                name="Poll latency"
                stroke={palette.cyan}
                strokeWidth={2}
                fill="url(#latency-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Metric freshness"
          subtitle="Seconds since last report · lower is better"
          className="panel-tall"
          defer
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <BarChart
              data={serviceFreshness}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 5, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 20]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="service"
                width={65}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MetricTooltip />} />
              <Legend verticalAlign="bottom" iconType="square" />
              <ReferenceLine
                x={15}
                stroke={palette.red}
                strokeDasharray="6 4"
                label={{
                  value: 'stale 15s',
                  fill: palette.red,
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="age"
                name="Report age"
                fill={palette.green}
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Redfish signal inventory"
          subtitle={`${visibleSignals.length} of ${catalog.length} selected signals · standard + OEM`}
          className="panel-full panel-inventory"
        >
          <div className="observe-inventory-tools">
            <label>
              <Search />
              <input
                value={signalSearch}
                onChange={(event) => setSignalSearch(event.target.value)}
                placeholder="Filter by signal, source, or Redfish URI"
              />
            </label>
            <span>
              <Filter /> {view === 'Overview' ? 'All groups' : view}
            </span>
            <span className="inventory-legend">
              <i className="normal" />
              Normal <i className="warning" />
              Warning <i className="critical" />
              Critical <i className="info" />
              Info
            </span>
          </div>
          <table
            className="observe-signal-table"
            aria-label="All selected Redfish signals"
          >
            <thead>
              <tr className="signal-table-head">
                <th>Signal</th>
                <th>Group</th>
                <th>Last</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Source / resource URI</th>
              </tr>
            </thead>
            <tbody>
              {visibleSignals.map((signal) => (
                <tr className="signal-table-row" key={signal.name}>
                  <td>
                    <strong>{signal.name}</strong>
                  </td>
                  <td>{signal.group}</td>
                  <td>
                    <b>{signal.value}</b>
                  </td>
                  <td>
                    <code>{signal.threshold}</code>
                  </td>
                  <td>
                    <i
                      className={`signal-state state-${signal.status.toLowerCase()}`}
                    >
                      {signal.status}
                    </i>
                  </td>
                  <td>
                    <em>{signal.source}</em>
                    <code title={signal.uri}>{signal.uri}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>

      <footer className="observe-footer">
        <span>
          <ShieldCheck /> Read-only collector · no production writes
        </span>
        <span>
          <Network /> Standard Redfish properties and OEM metrics are labeled in
          the inventory
        </span>
        <span>
          <TriangleAlert /> Thresholds are demonstration policies
        </span>
      </footer>
    </main>
  );
}

'use client';
/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */

import {
  Activity,
  Bell,
  BookOpenCheck,
  Check,
  Clock3,
  Coins,
  Database,
  ExternalLink,
  FileJson2,
  Filter,
  GitBranch,
  LayoutDashboard,
  Maximize2,
  MoreHorizontal,
  Network,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import langsmithData from '@/public/data/langsmith-observability.json';
import { SiteHeader } from '@/components/site-header';

const palette = {
  green: '#73bf69',
  mint: '#5ee2b7',
  yellow: '#f2cc0c',
  orange: '#ff9830',
  red: '#f2495c',
  blue: '#5794f2',
  purple: '#b877d9',
  cyan: '#56d2df',
};

const views = [
  'Overview',
  'Traces',
  'RAG quality',
  'Evaluations',
  'Cost & tokens',
  'Correlations',
] as const;

const learningWeeks = [
  {
    week: 'Week 1',
    phase: 'Instrument',
    title: 'Redfish foundations',
    outcome: 'Explain how each hardware signal reaches the dashboard.',
    proof: 'Open Redfish signals',
    href: '/dashboard',
    tasks: [
      'Map Systems, Chassis and Managers resources',
      'Collect thermal and power data with GET-only access',
      'Compare TelemetryService reports with EventService events',
      'Verify every metric against its Redfish source URI',
    ],
  },
  {
    week: 'Week 2',
    phase: 'Contextualize',
    title: 'Evidence and RAG',
    outcome: 'Turn raw sensor changes into a cited incident timeline.',
    proof: 'Inspect RAG quality',
    href: '#rag-quality',
    tasks: [
      'Normalize units, health rollups and event severity',
      'Align BMC, GPU and workload timestamps',
      'Retrieve evidence by rack, component and incident ID',
      'Reject claims whose evidence IDs do not resolve',
    ],
  },
  {
    week: 'Week 3',
    phase: 'Reason',
    title: 'Reliability agent',
    outcome: 'Trace a bounded investigation from tools to human review.',
    proof: 'Follow trace waterfall',
    href: '#trace-waterfall',
    tasks: [
      'Trace collector, retriever and LLM as nested runs',
      'Generate exactly three ranked hypotheses',
      'Attach Redfish evidence to every recommendation',
      'Stop at the human-review boundary before action',
    ],
  },
  {
    week: 'Week 4',
    phase: 'Evaluate',
    title: 'LangSmith observability',
    outcome: 'Measure whether the AI is useful, fast and affordable.',
    proof: 'Review AI signals',
    href: '#ai-signals',
    tasks: [
      'Inspect trace p50, p95 and p99 latency',
      'Track groundedness, citation and eval-pass thresholds',
      'Monitor token usage, tool latency and estimated cost',
      'Correlate AI findings with Redfish event lead time',
    ],
  },
  {
    week: 'Week 5',
    phase: 'Adapt',
    title: 'LoRA and QLoRA',
    outcome: 'Specialize only after reviewed data clears release gates.',
    proof: 'Open adapter foundry',
    href: '/platform#roadmap',
    tasks: [
      'Curate at least 200 operator-reviewed examples',
      'Train a LoRA baseline without changing the base model',
      'Run a 4-bit QLoRA experiment for constrained hardware',
      'Promote only when quality rises with no safety regression',
    ],
  },
] as const;

const subscribeToBrowser = () => () => undefined;

type TraceApiPayload = {
  source: {
    mode: string;
    engine: string;
    exportMode: string;
    api: string;
    persistent: boolean;
    liveLangSmithConnection: boolean;
  };
  freshnessSeconds: number | null;
  traceCount: number;
  series: Array<{
    time: string;
    traces: number;
    errors: number;
    p50: number;
    p95: number;
    p99: number;
    tokens: number;
    cost: number;
    groundedness: number;
    citations: number;
    eval_pass: number;
  }>;
};

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    color?: string;
    dataKey?: string | number;
    name?: string | number;
    value?: string | number;
  }>;
};

function AiTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="observe-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          <i style={{ background: item.color }} /> {item.name}
          <b>{Number(item.value).toFixed(2)}</b>
        </span>
      ))}
    </div>
  );
}

function AiPanel({
  id,
  title,
  subtitle,
  children,
  className = '',
  chart = false,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  chart?: boolean;
}) {
  const browserReady = useSyncExternalStore(
    subscribeToBrowser,
    () => true,
    () => false,
  );
  return (
    <section id={id} className={`observe-panel ls-panel ${className}`}>
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
        {chart && !browserReady ? (
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

export function LangSmithObservabilityDashboard() {
  const [project, setProject] = useState('racklens-reliability-prod');
  const [environment, setEnvironment] = useState('production replay');
  const [service, setService] = useState('All run types');
  const [dataCenter, setDataCenter] = useState('DEN-01');
  const [rack, setRack] = useState('All racks');
  const [model, setModel] = useState('All models');
  const [prompt, setPrompt] = useState('investigator-v7');
  const [range, setRange] = useState('Last 15 minutes');
  const [refresh, setRefresh] = useState('10s');
  const [paused, setPaused] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [view, setView] = useState<(typeof views)[number]>('Overview');
  const [traceSearch, setTraceSearch] = useState('');
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    () => new Set(),
  );
  const [traceTelemetry, setTraceTelemetry] = useState<TraceApiPayload | null>(
    null,
  );
  const [traceSourceState, setTraceSourceState] = useState<
    'connecting' | 'live' | 'fallback'
  >('connecting');

  useEffect(() => {
    if (paused) return;
    const intervalSeconds = Number.parseInt(refresh, 10);
    if (!Number.isFinite(intervalSeconds)) return;
    const timer = window.setInterval(
      () => setRefreshTick((value) => value + 1),
      intervalSeconds * 1_000,
    );
    return () => window.clearInterval(timer);
  }, [paused, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/observability/traces', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('trace store unavailable');
        return (await response.json()) as TraceApiPayload;
      })
      .then((payload) => {
        setTraceTelemetry(payload);
        setTraceSourceState('live');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setTraceSourceState('fallback');
      });
    return () => controller.abort();
  }, [
    project,
    environment,
    service,
    dataCenter,
    rack,
    model,
    prompt,
    range,
    refreshTick,
  ]);

  const series = useMemo(
    () =>
      (traceTelemetry?.series.length
        ? traceTelemetry.series
        : langsmithData.series
      ).map((point) => ({
        ...point,
        time: point.time.includes('T')
          ? new Date(point.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : point.time,
        traces: point.traces + (refreshTick % 2),
        errorRate: Number(((point.errors / point.traces) * 100).toFixed(2)),
        groundednessPct: point.groundedness * 100,
        citationsPct: point.citations * 100,
        evalPassPct: point.eval_pass * 100,
      })),
    [refreshTick, traceTelemetry],
  );
  const latest = series.at(-1) ?? series[0];
  const filteredTraces = langsmithData.traces.filter((trace) => {
    const query = traceSearch.trim().toLowerCase();
    return (
      (rack === 'All racks' || trace.rack === rack) &&
      (model === 'All models' || trace.model === model) &&
      (!query ||
        trace.id.toLowerCase().includes(query) ||
        trace.incident.toLowerCase().includes(query) ||
        trace.decision.toLowerCase().includes(query))
    );
  });
  const totalCost = series.reduce((sum, point) => sum + point.cost, 0);
  const successRate =
    (langsmithData.traces.filter((trace) => trace.status !== 'error').length /
      langsmithData.traces.length) *
    100;
  const totalLessons = learningWeeks.reduce(
    (sum, week) => sum + week.tasks.length,
    0,
  );
  const learningProgress = Math.round(
    (completedLessons.size / totalLessons) * 100,
  );
  const toggleLesson = (lessonId: string) => {
    setCompletedLessons((current) => {
      const next = new Set(current);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };
  const chartCommon = {
    stroke: '#3a3a3a',
    tick: { fill: '#9f9f9f', fontSize: 11 },
  };

  return (
    <main className="observe-shell ls-shell">
      <SiteHeader
        activePath="/ai-observability"
        pageLabel="AI Observability"
        actions={
          <>
            <button className="observe-search">
              <Search /> Search traces, runs and evaluations <kbd>⌘K</kbd>
            </button>
            <button className="site-header-icon" aria-label="Notifications">
              <Bell />
            </button>
            <button className="site-header-icon" aria-label="Settings">
              <Settings />
            </button>
          </>
        }
      />

      <div className="observe-crumbbar">
        <div>
          <LayoutDashboard />
          <span>Dashboards</span>
          <b>/</b>
          <strong>LangSmith AI reliability observability</strong>
        </div>
        <div>
          <a
            className="ls-source-link"
            href="/data/langsmith-observability.json"
            target="_blank"
            rel="noreferrer"
          >
            <FileJson2 /> Source data <ExternalLink />
          </a>
        </div>
      </div>

      <section className="ls-source-strip">
        <div>
          <Database />
          <span>DATA SOURCE</span>
          <strong>
            {traceSourceState === 'live'
              ? traceTelemetry?.source.engine
              : traceSourceState === 'connecting'
                ? 'Connecting to persistent trace store'
                : 'LangSmith-shaped trace replay'}
          </strong>
          <i className={traceSourceState}>
            {traceSourceState === 'live'
              ? 'PERSISTED'
              : traceSourceState === 'connecting'
                ? 'CONNECTING'
                : 'SIMULATED FALLBACK'}
          </i>
        </div>
        <p>
          {traceSourceState === 'live'
            ? `${traceTelemetry?.traceCount ?? 0} traces · ${traceTelemetry?.source.exportMode}`
            : 'Projects → traces → runs → metadata → feedback'}
        </p>
        <a href="/api/observability/traces" target="_blank" rel="noreferrer">
          Trace API <ExternalLink />
        </a>
        <a
          href="https://docs.langchain.com/langsmith/observability-concepts"
          target="_blank"
          rel="noreferrer"
        >
          LangSmith data model <ExternalLink />
        </a>
      </section>

      <section className="observe-toolbar" aria-label="AI dashboard controls">
        <div className="observe-variables">
          <label>
            Project
            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option>racklens-reliability-prod</option>
              <option>racklens-evaluation-lab</option>
              <option>racklens-adapter-canary</option>
            </select>
          </label>
          <label>
            Environment
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
            >
              <option>production replay</option>
              <option>staging</option>
              <option>evaluation</option>
            </select>
          </label>
          <label>
            Run type
            <select
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              <option>All run types</option>
              <option>llm</option>
              <option>tool</option>
              <option>retriever</option>
              <option>evaluator</option>
            </select>
          </label>
          <label>
            Data center
            <select
              value={dataCenter}
              onChange={(event) => setDataCenter(event.target.value)}
            >
              <option>DEN-01</option>
              <option>SJC-02</option>
              <option>IAD-01</option>
            </select>
          </label>
          <label>
            Rack
            <select
              value={rack}
              onChange={(event) => setRack(event.target.value)}
            >
              <option>All racks</option>
              <option>R01</option>
              <option>R02</option>
              <option>R03</option>
              <option>R04</option>
            </select>
          </label>
          <label>
            Model
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              <option>All models</option>
              <option>qwen3-8b-racklens-lora</option>
              <option>qwen3-8b-base</option>
            </select>
          </label>
          <label>
            Prompt
            <select
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            >
              <option>investigator-v7</option>
              <option>investigator-v6</option>
              <option>baseline-v3</option>
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
            aria-label={paused ? 'Resume dashboard' : 'Pause dashboard'}
          >
            {paused ? <Play /> : <Pause />}
          </button>
        </div>
      </section>

      <section className="observe-statusbar">
        <span>
          <i className={`status-live ${traceSourceState}`} />{' '}
          {paused ? 'Trace stream paused' : `Trace stream · refresh ${refresh}`}
        </span>
        <span>
          {project} / {environment} / {service} / {dataCenter} / {rack}
        </span>
        <span>
          <GitBranch /> 8 root traces · 52 child runs
        </span>
        <span>
          {traceSourceState === 'live'
            ? `Updated ${traceTelemetry?.freshnessSeconds ?? 0}s ago`
            : traceSourceState === 'connecting'
              ? 'Querying…'
              : 'Replay active'}
        </span>
      </section>

      <section
        className="observe-view-tabs ls-view-tabs"
        aria-label="AI observability views"
      >
        {views.map((item) => (
          <button
            key={item}
            className={view === item ? 'active' : ''}
            onClick={() => setView(item)}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="observe-stat-grid ls-stat-grid">
        <article>
          <span>
            <Activity /> Trace success
          </span>
          <strong>
            {successRate.toFixed(1)}
            <small>%</small>
          </strong>
          <b className="ok">SLO ≥ 95%</b>
        </article>
        <article>
          <span>
            <Clock3 /> P95 latency
          </span>
          <strong>
            {(latest.p95 / 1000).toFixed(2)}
            <small>s</small>
          </strong>
          <b className={latest.p95 > 8000 ? 'warn' : 'ok'}>SLO &lt; 8s</b>
        </article>
        <article>
          <span>
            <Coins /> Window cost
          </span>
          <strong>${totalCost.toFixed(2)}</strong>
          <b className="ok">BUDGET $25</b>
        </article>
        <article>
          <span>
            <ShieldCheck /> Eval pass
          </span>
          <strong>
            {latest.evalPassPct.toFixed(0)}
            <small>%</small>
          </strong>
          <b className="ok">5 EVALUATORS</b>
        </article>
      </section>

      <section className="ls-learning" id="learning-path">
        <header>
          <div>
            <span>
              <BookOpenCheck /> BUILD &amp; LEARN
            </span>
            <h2>Five-week RackLens learning checklist</h2>
            <p>
              Complete each lab against the telemetry, traces and evaluation
              evidence in this product.
            </p>
          </div>
          <div className="ls-learning-progress">
            <strong>
              {completedLessons.size}/{totalLessons}
            </strong>
            <span>labs complete · {learningProgress}%</span>
            <i>
              <em style={{ width: `${learningProgress}%` }} />
            </i>
            <button
              onClick={() => setCompletedLessons(new Set())}
              disabled={completedLessons.size === 0}
            >
              <RotateCcw /> Reset
            </button>
          </div>
        </header>
        <div className="ls-week-grid">
          {learningWeeks.map((week, weekIndex) => {
            const weekDone = week.tasks.filter((_, taskIndex) =>
              completedLessons.has(`${weekIndex}-${taskIndex}`),
            ).length;
            return (
              <article key={week.week}>
                <div className="ls-week-heading">
                  <span>{week.week}</span>
                  <b>{week.phase}</b>
                  <strong>{weekDone}/4</strong>
                </div>
                <h3>{week.title}</h3>
                <p>{week.outcome}</p>
                <div className="ls-week-tasks">
                  {week.tasks.map((task, taskIndex) => {
                    const lessonId = `${weekIndex}-${taskIndex}`;
                    const checked = completedLessons.has(lessonId);
                    return (
                      <label key={task} className={checked ? 'complete' : ''}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLesson(lessonId)}
                        />
                        <i>{checked && <Check />}</i>
                        <span>{task}</span>
                      </label>
                    );
                  })}
                </div>
                <a href={week.href}>{week.proof} →</a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="observe-grid ls-grid" id="ai-signals">
        <AiPanel
          title="Trace throughput & error rate"
          subtitle="Root runs · traces/min and error %"
          className="panel-wide"
          chart
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <ComposedChart
              data={series}
              margin={{ top: 12, right: 20, left: -10, bottom: 0 }}
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
                yAxisId="left"
                domain={[0, 70]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 10]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AiTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                yAxisId="right"
                y={5}
                stroke={palette.red}
                strokeDasharray="6 4"
                label={{
                  value: 'error SLO 5%',
                  fill: palette.red,
                  fontSize: 11,
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="traces"
                name="Root traces"
                fill={palette.blue}
                opacity={0.7}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="errorRate"
                name="Error rate %"
                stroke={palette.red}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </AiPanel>

        <AiPanel
          title="End-to-end trace latency"
          subtitle="Root trace percentile · milliseconds"
          className="panel-wide"
          chart
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <LineChart
              data={series}
              margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
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
                domain={[0, 11000]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AiTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={8000}
                stroke={palette.red}
                strokeDasharray="6 4"
                label={{ value: 'SLO 8s', fill: palette.red, fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="p50"
                name="p50"
                stroke={palette.green}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p95"
                name="p95"
                stroke={palette.orange}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p99"
                name="p99"
                stroke={palette.red}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </AiPanel>

        <AiPanel
          title="Tokens & estimated cost"
          subtitle="LLM runs · tokens and USD"
          className="panel-wide"
          chart
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <ComposedChart
              data={series}
              margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
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
                yAxisId="tokens"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                domain={[0, 3]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AiTooltip />} />
              <Legend verticalAlign="bottom" />
              <Bar
                yAxisId="tokens"
                dataKey="tokens"
                name="Tokens"
                fill={palette.purple}
                opacity={0.68}
              />
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                name="Cost USD"
                stroke={palette.yellow}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </AiPanel>

        <AiPanel
          title="Online evaluation scores"
          subtitle="Groundedness, citation validity and release gate"
          className="panel-wide"
          chart
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <LineChart
              data={series}
              margin={{ top: 12, right: 20, left: -2, bottom: 0 }}
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
                domain={[70, 100]}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AiTooltip />} />
              <Legend verticalAlign="bottom" iconType="line" />
              <ReferenceLine
                y={90}
                stroke={palette.orange}
                strokeDasharray="6 4"
                label={{
                  value: 'release 90%',
                  fill: palette.orange,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="groundednessPct"
                name="Groundedness"
                stroke={palette.cyan}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="citationsPct"
                name="Citation validity"
                stroke={palette.green}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="evalPassPct"
                name="Eval pass"
                stroke={palette.purple}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </AiPanel>

        <AiPanel
          title="Tool performance"
          subtitle={`${service} · calls and p95 latency`}
          className="panel-wide"
          chart
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 720, height: 255 }}
          >
            <BarChart
              data={langsmithData.tools}
              layout="vertical"
              margin={{ top: 5, right: 22, left: 28, bottom: 0 }}
            >
              <CartesianGrid
                stroke={chartCommon.stroke}
                strokeDasharray="2 2"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                tick={chartCommon.tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AiTooltip />} />
              <Legend verticalAlign="bottom" />
              <ReferenceLine
                x={3000}
                stroke={palette.red}
                strokeDasharray="6 4"
              />
              <Bar
                dataKey="p95_ms"
                name="p95 latency ms"
                fill={palette.blue}
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </AiPanel>

        <AiPanel
          id="rag-quality"
          title="RAG evidence quality"
          subtitle="Latest evaluated investigation"
          className="panel-tall"
        >
          <div className="ls-quality-list">
            {[
              ['Citation validity', 100, 'all evidence IDs resolve'],
              ['Groundedness', 92, 'claims supported by evidence'],
              ['Evidence recall', 89, 'golden evidence retrieved'],
              ['Retrieval relevance', 94, 'top-k evidence precision'],
              ['Hypothesis calibration', 91, 'confidence vs outcome'],
            ].map(([label, value, note]) => (
              <div key={label as string}>
                <span>
                  <strong>{label}</strong>
                  <b>{value}%</b>
                </span>
                <i>
                  <em style={{ width: `${value}%` }} />
                </i>
                <small>{note}</small>
              </div>
            ))}
          </div>
        </AiPanel>

        <AiPanel
          title="Safety & release gates"
          subtitle="Policy evaluators · current window"
          className="panel-tall"
        >
          <div className="ls-gate-list">
            {[
              ['Evidence IDs valid', '100%', 'pass'],
              ['Exactly 3 hypotheses', '100%', 'pass'],
              ['No production write', '100%', 'pass'],
              ['Human review boundary', '100%', 'pass'],
              ['Unsupported claims', '1 trace', 'warn'],
              ['Prompt injection flags', '0', 'pass'],
            ].map(([label, value, state]) => (
              <div key={label}>
                <span>
                  <i className={state} />
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </AiPanel>

        <AiPanel
          id="trace-waterfall"
          title="Selected trace waterfall"
          subtitle="tr_01J7K8M4 · 4.73s instrumented path"
          className="panel-wide panel-tall"
        >
          <div className="ls-waterfall">
            <div className="ls-waterfall-axis">
              <span>0s</span>
              <span>1s</span>
              <span>2s</span>
              <span>3s</span>
              <span>4s</span>
              <span>5s</span>
            </div>
            {langsmithData.waterfall.map((run) => (
              <div key={run.name}>
                <code>{run.name}</code>
                <span>
                  <i
                    className={`run-${run.kind}`}
                    style={{
                      marginLeft: `${(run.start_ms / 5000) * 100}%`,
                      width: `${Math.max(2, (run.duration_ms / 5000) * 100)}%`,
                    }}
                  />
                </span>
                <b>{run.duration_ms} ms</b>
              </div>
            ))}
            <div className="ls-waterfall-legend">
              <span>
                <i className="run-tool" />
                tool
              </span>
              <span>
                <i className="run-retriever" />
                retriever
              </span>
              <span>
                <i className="run-llm" />
                LLM
              </span>
              <span>
                <i className="run-evaluator" />
                evaluator
              </span>
            </div>
          </div>
        </AiPanel>

        <AiPanel
          title="Redfish → AI correlation"
          subtitle="Hardware events joined to LangSmith root traces"
          className="panel-wide panel-tall"
        >
          <div className="ls-correlation-table">
            <div>
              <span>Time</span>
              <span>Hardware event</span>
              <span>Trace</span>
              <span>AI finding</span>
              <span>Lead</span>
              <span>Conf.</span>
            </div>
            {langsmithData.correlations.map((item) => (
              <div key={item.trace_id}>
                <time>{item.time}</time>
                <strong>{item.hardware_event}</strong>
                <code>{item.trace_id}</code>
                <span>{item.ai_finding}</span>
                <b>{item.lead_time}</b>
                <em>{item.confidence}</em>
              </div>
            ))}
          </div>
        </AiPanel>

        <AiPanel
          title="Recent AI investigations"
          subtitle={`${filteredTraces.length} traces · selected filters`}
          className="panel-full panel-inventory"
        >
          <div className="observe-inventory-tools ls-inventory-tools">
            <label>
              <Search />
              <input
                value={traceSearch}
                onChange={(event) => setTraceSearch(event.target.value)}
                placeholder="Filter trace ID, incident or decision"
              />
            </label>
            <span>
              <Filter /> {view}
            </span>
            <a
              href="/data/langsmith-observability.json"
              target="_blank"
              rel="noreferrer"
            >
              <FileJson2 /> Open source JSON
            </a>
          </div>
          <table
            className="ls-trace-table"
            aria-label="Recent LangSmith-shaped AI traces"
          >
            <thead>
              <tr>
                <th>Trace</th>
                <th>Time</th>
                <th>Incident / rack</th>
                <th>Model</th>
                <th>Latency</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Eval</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraces.map((trace) => (
                <tr key={trace.id}>
                  <td>
                    <code>{trace.id}</code>
                  </td>
                  <td>
                    <time>{trace.time}</time>
                  </td>
                  <td>
                    <strong>{trace.incident}</strong>
                    <small>{trace.rack}</small>
                  </td>
                  <td>
                    <span>{trace.model}</span>
                  </td>
                  <td>{(trace.latency_ms / 1000).toFixed(2)}s</td>
                  <td>{trace.tokens.toLocaleString()}</td>
                  <td>${trace.cost.toFixed(3)}</td>
                  <td>
                    <b className={trace.eval < 0.9 ? 'warn' : ''}>
                      {Math.round(trace.eval * 100)}%
                    </b>
                  </td>
                  <td>
                    <i className={`trace-${trace.status}`}>
                      {trace.decision.replaceAll('_', ' ')}
                    </i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AiPanel>
      </section>

      <footer className="observe-footer ls-footer">
        <span>
          <Database /> Deterministic LangSmith-shaped replay; not a live
          LangSmith connection
        </span>
        <span>
          <Network /> Correlated with Redfish by incident_id, rack_id, GPU ID
          and event time
        </span>
        <span>
          <ShieldCheck /> Inputs are sanitized and no production writes are
          supported
        </span>
      </footer>
    </main>
  );
}

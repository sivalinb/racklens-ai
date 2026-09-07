import { env } from 'cloudflare:workers';

export type TelemetryTarget = {
  dataCenter: string;
  hall: string;
  row: string;
  rack: string;
  node: string;
  gpu: string;
};

export type LiveSeriesPoint = {
  timestamp: number;
  time: string;
  power: number;
  inlet: number;
  exhaust: number;
  fan: number;
  ingress: number;
  egress: number;
  clock: number;
  utilization: number;
  gpuTemperature: number;
  gpuPower: number;
  pollLatency: number;
};

type MetricDefinition = {
  name: string;
  field: keyof Omit<LiveSeriesPoint, 'timestamp' | 'time'>;
  unit: string;
  sourceKind: string;
  sourceUri: (target: TelemetryTarget) => string;
};

const metricDefinitions: MetricDefinition[] = [
  {
    name: 'rack.power_kw',
    field: 'power',
    unit: 'kW',
    sourceKind: 'Redfish Chassis/Power',
    sourceUri: (target) => `/redfish/v1/Chassis/${target.rack}/Power`,
  },
  {
    name: 'thermal.inlet_c',
    field: 'inlet',
    unit: 'Cel',
    sourceKind: 'Redfish Thermal',
    sourceUri: (target) =>
      `/redfish/v1/Chassis/${target.rack}/Thermal#/Temperatures/0`,
  },
  {
    name: 'thermal.exhaust_c',
    field: 'exhaust',
    unit: 'Cel',
    sourceKind: 'Redfish Thermal',
    sourceUri: (target) =>
      `/redfish/v1/Chassis/${target.rack}/Thermal#/Temperatures/1`,
  },
  {
    name: 'thermal.fan_duty_pct',
    field: 'fan',
    unit: '%',
    sourceKind: 'Redfish Thermal/Fans',
    sourceUri: (target) => `/redfish/v1/Chassis/${target.rack}/Thermal#/Fans/0`,
  },
  {
    name: 'network.ingress_tbps',
    field: 'ingress',
    unit: 'Tbit/s',
    sourceKind: 'Redfish NetworkAdapter',
    sourceUri: (target) =>
      `/redfish/v1/Chassis/${target.rack}/NetworkAdapters/ToR-A`,
  },
  {
    name: 'network.egress_tbps',
    field: 'egress',
    unit: 'Tbit/s',
    sourceKind: 'Redfish NetworkAdapter',
    sourceUri: (target) =>
      `/redfish/v1/Chassis/${target.rack}/NetworkAdapters/ToR-B`,
  },
  {
    name: 'gpu.clock_mhz',
    field: 'clock',
    unit: 'MHz',
    sourceKind: 'Redfish TelemetryService',
    sourceUri: (target) =>
      `/redfish/v1/TelemetryService/MetricReports/${target.rack}-${target.node}-${target.gpu}`,
  },
  {
    name: 'gpu.utilization_pct',
    field: 'utilization',
    unit: '%',
    sourceKind: 'Redfish OEM MetricReport',
    sourceUri: (target) =>
      `/redfish/v1/TelemetryService/MetricReports/${target.rack}-${target.node}-${target.gpu}`,
  },
  {
    name: 'gpu.temperature_c',
    field: 'gpuTemperature',
    unit: 'Cel',
    sourceKind: 'Redfish OEM MetricReport',
    sourceUri: (target) =>
      `/redfish/v1/TelemetryService/MetricReports/${target.rack}-${target.node}-${target.gpu}`,
  },
  {
    name: 'gpu.power_watts',
    field: 'gpuPower',
    unit: 'W',
    sourceKind: 'Redfish OEM MetricReport',
    sourceUri: (target) =>
      `/redfish/v1/TelemetryService/MetricReports/${target.rack}-${target.node}-${target.gpu}`,
  },
  {
    name: 'collector.poll_latency_ms',
    field: 'pollLatency',
    unit: 'ms',
    sourceKind: 'RackLens collector',
    sourceUri: () => '/redfish/v1',
  },
];

const allowedInventory = {
  'DEN-01': ['Hall A', 'Hall B'],
  'SJC-02': ['Hall A', 'Hall C'],
  'IAD-01': ['Hall B', 'Hall D'],
} as const;

function validateDemoTarget(target: TelemetryTarget) {
  const halls: readonly string[] | undefined =
    allowedInventory[target.dataCenter as keyof typeof allowedInventory];
  if (
    !halls?.includes(target.hall) ||
    !['Row 01', 'Row 02', 'Row 03'].includes(target.row) ||
    !['R01', 'R02', 'R03', 'R04'].includes(target.rack) ||
    !['U14', 'U18', 'U22', 'U26'].includes(target.node) ||
    !/^GPU[0-7]$/.test(target.gpu)
  )
    throw new Error('Unknown inventory target');
}

function database(): D1Database {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error('D1 telemetry binding is unavailable');
  return binding;
}

function pointAt(timestamp: number, index: number): LiveSeriesPoint {
  const phase = timestamp / 42_000 + index * 0.77;
  const thermalRise = Math.max(0, index - 7) * 0.43;
  const inlet = 23.4 + Math.sin(phase) * 0.7 + thermalRise;
  return {
    timestamp,
    time: new Date(timestamp).toISOString(),
    power: Number(
      (39.8 + Math.sin(phase * 0.71) * 2.2 + index * 0.09).toFixed(2),
    ),
    inlet: Number(inlet.toFixed(2)),
    exhaust: Number((inlet + 11.4 + Math.sin(phase * 0.31) * 0.6).toFixed(2)),
    fan: Number((69 + index * 1.7 + Math.sin(phase) * 2.8).toFixed(1)),
    ingress: Number((3.35 + Math.sin(phase * 1.3) * 0.42).toFixed(2)),
    egress: Number((3.08 + Math.sin(phase * 1.3 + 0.25) * 0.39).toFixed(2)),
    clock: Math.round(1830 - thermalRise * 19 + Math.sin(phase) * 24),
    utilization: Number((78 + Math.sin(phase * 0.92) * 11).toFixed(1)),
    gpuTemperature: Number((inlet + 36.8 + Math.sin(phase) * 1.8).toFixed(1)),
    gpuPower: Number((512 + Math.sin(phase * 0.71) * 36).toFixed(1)),
    pollLatency: Math.round(145 + Math.abs(Math.sin(phase * 1.9)) * 58),
  };
}

function sampleId(target: TelemetryTarget, metric: string, timestamp: number) {
  return [
    target.dataCenter,
    target.hall,
    target.row,
    target.rack,
    target.node,
    target.gpu,
    metric,
    timestamp,
  ]
    .join(':')
    .replaceAll(' ', '-');
}

async function insertPoints(
  db: D1Database,
  target: TelemetryTarget,
  points: LiveSeriesPoint[],
) {
  const statements = points.flatMap((point) =>
    metricDefinitions.map((metric) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO metric_samples
           (id, timestamp_ms, data_center, hall, row_name, rack_id, node_id, gpu_id,
            metric_name, value, unit, severity, source_kind, source_uri, incident_id,
            trace_id, attributes_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          sampleId(target, metric.name, point.timestamp),
          point.timestamp,
          target.dataCenter,
          target.hall,
          target.row,
          target.rack,
          target.node,
          target.gpu,
          metric.name,
          point[metric.field],
          metric.unit,
          point.inlet > 27 || point.fan > 90 ? 'warning' : 'ok',
          metric.sourceKind,
          metric.sourceUri(target),
          'inc_live_cooling_path',
          'tr_live_reliability',
          JSON.stringify({
            generated_by: 'racklens-hosted-simulator',
            replay: false,
          }),
        ),
    ),
  );
  if (statements.length) await db.batch(statements);
}

async function ensureLiveWindow(db: D1Database, target: TelemetryTarget) {
  validateDemoTarget(target);
  const newest = await db
    .prepare(
      `SELECT MAX(timestamp_ms) AS newest
       FROM metric_samples
       WHERE data_center = ? AND hall = ? AND row_name = ? AND rack_id = ?
         AND node_id = ? AND gpu_id = ?`,
    )
    .bind(
      target.dataCenter,
      target.hall,
      target.row,
      target.rack,
      target.node,
      target.gpu,
    )
    .first<{ newest: number | null }>();

  const now = Math.floor(Date.now() / 5_000) * 5_000;
  const points = newest?.newest
    ? newest.newest < now
      ? [pointAt(now, 11)]
      : []
    : Array.from({ length: 12 }, (_, index) =>
        pointAt(now - (11 - index) * 60_000, index),
      );
  await insertPoints(db, target, points);
  await db
    .prepare('DELETE FROM metric_samples WHERE timestamp_ms < ?')
    .bind(now - 30 * 24 * 60 * 60 * 1_000)
    .run();

  const eventTimestamp = now - 42_000;
  await db
    .prepare(
      `INSERT OR IGNORE INTO telemetry_events
       (id, timestamp_ms, data_center, hall, row_name, rack_id, node_id, gpu_id,
        severity, event_type, message, source_uri, incident_id, trace_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      `evt:${target.dataCenter}:${target.rack}:${Math.floor(eventTimestamp / 300000)}`,
      eventTimestamp,
      target.dataCenter,
      target.hall,
      target.row,
      target.rack,
      target.node,
      target.gpu,
      'warning',
      'Thermal.1.0.TempHigh',
      'Cold-aisle inlet is trending toward the warning threshold',
      `/redfish/v1/Chassis/${target.rack}/Thermal`,
      'inc_live_cooling_path',
      'tr_live_reliability',
    )
    .run();
}

export async function queryTelemetry(target: TelemetryTarget) {
  const db = database();
  await ensureLiveWindow(db, target);
  const since = Date.now() - 24 * 60 * 60 * 1_000;
  const result = await db
    .prepare(
      `SELECT timestamp_ms, metric_name, value
       FROM metric_samples
       WHERE data_center = ? AND hall = ? AND row_name = ? AND rack_id = ?
         AND node_id = ? AND gpu_id = ? AND timestamp_ms >= ?
       ORDER BY timestamp_ms ASC`,
    )
    .bind(
      target.dataCenter,
      target.hall,
      target.row,
      target.rack,
      target.node,
      target.gpu,
      since,
    )
    .all<{ timestamp_ms: number; metric_name: string; value: number }>();

  const grouped = new Map<number, Record<string, number>>();
  for (const row of result.results) {
    const values = grouped.get(row.timestamp_ms) ?? {};
    values[row.metric_name] = row.value;
    grouped.set(row.timestamp_ms, values);
  }
  const series = [...grouped.entries()]
    .slice(-120)
    .map(([timestamp, values]) => ({
      timestamp,
      time: new Date(timestamp).toISOString(),
      power: values['rack.power_kw'],
      inlet: values['thermal.inlet_c'],
      exhaust: values['thermal.exhaust_c'],
      fan: values['thermal.fan_duty_pct'],
      ingress: values['network.ingress_tbps'],
      egress: values['network.egress_tbps'],
      clock: values['gpu.clock_mhz'],
      utilization: values['gpu.utilization_pct'],
      gpuTemperature: values['gpu.temperature_c'],
      gpuPower: values['gpu.power_watts'],
      pollLatency: values['collector.poll_latency_ms'],
    }));
  const newest = series.at(-1)?.timestamp ?? null;
  return {
    source: {
      mode: 'hosted-live-demo',
      engine: 'Cloudflare D1 time-series store',
      ingestion: 'Redfish-shaped simulator → normalized metric rows',
      api: '/api/telemetry/query',
      clickhouseCompatible: true,
      persistent: true,
      productionWrites: false,
    },
    target,
    freshnessSeconds: newest
      ? Math.max(0, Math.round((Date.now() - newest) / 1000))
      : null,
    sampleCount: result.results.length,
    series,
  };
}

export async function ingestTelemetry(
  request: Request,
  samples: Array<{
    timestamp?: number;
    metric: string;
    value: number;
    unit: string;
    sourceUri: string;
    sourceKind?: string;
    target: TelemetryTarget;
    severity?: string;
    incidentId?: string;
    traceId?: string;
    attributes?: Record<string, unknown>;
  }>,
) {
  const configuredToken = (env as unknown as { RACKLENS_INGEST_TOKEN?: string })
    .RACKLENS_INGEST_TOKEN;
  const suppliedToken = request.headers.get('x-racklens-ingest-token');
  if (!configuredToken)
    throw new Error(
      'External ingestion is locked until a hosted ingest token is configured',
    );
  if (!suppliedToken || suppliedToken !== configuredToken)
    throw new Error('Unauthorized telemetry ingestion');
  if (!samples.length || samples.length > 1_000)
    throw new Error('Each batch must contain 1–1000 metric samples');
  for (const sample of samples) {
    if (
      !Number.isFinite(sample.value) ||
      !sample.metric ||
      sample.metric.length > 128 ||
      !sample.unit ||
      sample.unit.length > 32 ||
      !sample.sourceUri.startsWith('/redfish/') ||
      sample.sourceUri.length > 512 ||
      Object.values(sample.target).some(
        (value) => typeof value !== 'string' || !value || value.length > 64,
      )
    )
      throw new Error('Metric sample failed validation');
  }

  const db = database();
  const statements = samples.map((sample) => {
    const timestamp = sample.timestamp ?? Date.now();
    return db
      .prepare(
        `INSERT OR IGNORE INTO metric_samples
         (id, timestamp_ms, data_center, hall, row_name, rack_id, node_id, gpu_id,
          metric_name, value, unit, severity, source_kind, source_uri, incident_id,
          trace_id, attributes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        sampleId(sample.target, sample.metric, timestamp),
        timestamp,
        sample.target.dataCenter,
        sample.target.hall,
        sample.target.row,
        sample.target.rack,
        sample.target.node,
        sample.target.gpu,
        sample.metric,
        sample.value,
        sample.unit,
        sample.severity ?? 'ok',
        sample.sourceKind ?? 'Redfish collector',
        sample.sourceUri,
        sample.incidentId ?? null,
        sample.traceId ?? null,
        JSON.stringify(sample.attributes ?? {}),
      );
  });
  const results = await db.batch(statements);
  return {
    accepted: results.length,
    engine: 'Cloudflare D1 time-series store',
  };
}

export async function queryAiTraceSummary() {
  const db = database();
  const now = Math.floor(Date.now() / 10_000) * 10_000;
  const newest = await db
    .prepare('SELECT MAX(timestamp_ms) AS newest FROM ai_traces')
    .first<{ newest: number | null }>();
  if (!newest?.newest || newest.newest < now) {
    const start = newest?.newest ? now : now - 11 * 60_000;
    const count = newest?.newest ? 1 : 12;
    const statements = Array.from({ length: count }, (_, index) => {
      const timestamp = start + index * 60_000;
      const latency = Math.round(
        3_900 + Math.abs(Math.sin(timestamp / 73_000)) * 2_600,
      );
      const warning = index % 7 === 5;
      return db
        .prepare(
          `INSERT OR IGNORE INTO ai_traces
           (id, timestamp_ms, project, environment, data_center, rack_id, incident_id,
            status, latency_ms, prompt_tokens, completion_tokens, estimated_cost_usd,
            groundedness, citation_validity, model, prompt_version, redfish_event_id,
            export_mode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `tr_live_${timestamp}`,
          timestamp,
          'racklens-reliability-prod',
          'hosted-live-demo',
          'DEN-01',
          'R02',
          'inc_live_cooling_path',
          warning ? 'warning' : 'success',
          latency,
          11_800 + index * 310,
          1_650 + index * 42,
          Number((0.19 + index * 0.012).toFixed(3)),
          warning ? 0.88 : 0.96,
          warning ? 0.91 : 0.99,
          'reliability-copilot',
          'investigator-v7',
          `evt:DEN-01:R02:${Math.floor(timestamp / 300000)}`,
          'langsmith+otlp-hybrid',
        );
    });
    await db.batch(statements);
    await db
      .prepare('DELETE FROM ai_traces WHERE timestamp_ms < ?')
      .bind(now - 30 * 24 * 60 * 60 * 1_000)
      .run();
  }
  const rows = await db
    .prepare(
      `SELECT timestamp_ms, status, latency_ms, prompt_tokens, completion_tokens,
              estimated_cost_usd, groundedness, citation_validity
       FROM ai_traces ORDER BY timestamp_ms DESC LIMIT 120`,
    )
    .all<{
      timestamp_ms: number;
      status: string;
      latency_ms: number;
      prompt_tokens: number;
      completion_tokens: number;
      estimated_cost_usd: number;
      groundedness: number;
      citation_validity: number;
    }>();
  const ordered = [...rows.results].reverse();
  return {
    source: {
      mode: 'hosted-live-demo',
      engine: 'Cloudflare D1 + OpenTelemetry-compatible trace schema',
      exportMode: 'LangSmith + OTLP hybrid ready',
      api: '/api/observability/traces',
      persistent: true,
      liveLangSmithConnection: false,
    },
    freshnessSeconds: ordered.at(-1)
      ? Math.max(
          0,
          Math.round((Date.now() - ordered.at(-1)!.timestamp_ms) / 1000),
        )
      : null,
    traceCount: ordered.length,
    series: ordered.map((row) => ({
      time: new Date(row.timestamp_ms).toISOString(),
      traces: 1,
      errors: row.status === 'success' ? 0 : 1,
      p50: Math.round(row.latency_ms * 0.72),
      p95: row.latency_ms,
      p99: Math.round(row.latency_ms * 1.16),
      tokens: row.prompt_tokens + row.completion_tokens,
      cost: row.estimated_cost_usd,
      groundedness: row.groundedness,
      citations: row.citation_validity,
      eval_pass: row.status === 'success' ? 0.96 : 0.84,
    })),
  };
}

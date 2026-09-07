import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const metricSamples = sqliteTable(
  'metric_samples',
  {
    id: text('id').primaryKey(),
    timestampMs: integer('timestamp_ms').notNull(),
    tenantId: text('tenant_id').notNull().default('public-demo'),
    dataCenter: text('data_center').notNull(),
    hall: text('hall').notNull(),
    row: text('row_name').notNull(),
    rackId: text('rack_id').notNull(),
    nodeId: text('node_id').notNull().default('all'),
    gpuId: text('gpu_id').notNull().default('all'),
    metricName: text('metric_name').notNull(),
    value: real('value').notNull(),
    unit: text('unit').notNull(),
    severity: text('severity').notNull().default('ok'),
    sourceKind: text('source_kind').notNull(),
    sourceUri: text('source_uri').notNull(),
    incidentId: text('incident_id'),
    traceId: text('trace_id'),
    attributesJson: text('attributes_json').notNull().default('{}'),
  },
  (table) => [
    index('idx_metric_target_time').on(
      table.dataCenter,
      table.hall,
      table.row,
      table.rackId,
      table.nodeId,
      table.gpuId,
      table.timestampMs,
    ),
    index('idx_metric_incident').on(table.incidentId),
  ],
);

export const telemetryEvents = sqliteTable(
  'telemetry_events',
  {
    id: text('id').primaryKey(),
    timestampMs: integer('timestamp_ms').notNull(),
    dataCenter: text('data_center').notNull(),
    hall: text('hall').notNull(),
    row: text('row_name').notNull(),
    rackId: text('rack_id').notNull(),
    nodeId: text('node_id'),
    gpuId: text('gpu_id'),
    severity: text('severity').notNull(),
    eventType: text('event_type').notNull(),
    message: text('message').notNull(),
    sourceUri: text('source_uri').notNull(),
    incidentId: text('incident_id'),
    traceId: text('trace_id'),
  },
  (table) => [
    index('idx_event_target_time').on(
      table.dataCenter,
      table.rackId,
      table.timestampMs,
    ),
    index('idx_event_trace').on(table.traceId),
  ],
);

export const aiTraces = sqliteTable(
  'ai_traces',
  {
    id: text('id').primaryKey(),
    timestampMs: integer('timestamp_ms').notNull(),
    project: text('project').notNull(),
    environment: text('environment').notNull(),
    dataCenter: text('data_center').notNull(),
    rackId: text('rack_id').notNull(),
    incidentId: text('incident_id').notNull(),
    status: text('status').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    promptTokens: integer('prompt_tokens').notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    estimatedCostUsd: real('estimated_cost_usd').notNull(),
    groundedness: real('groundedness').notNull(),
    citationValidity: real('citation_validity').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    redfishEventId: text('redfish_event_id').notNull(),
    exportMode: text('export_mode').notNull().default('otel-hybrid'),
  },
  (table) => [
    index('idx_trace_project_time').on(table.project, table.timestampMs),
    index('idx_trace_incident').on(table.incidentId),
  ],
);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(
  new URL('../../components/observability-dashboard.tsx', import.meta.url),
  'utf8',
);
const aiDashboard = readFileSync(
  new URL(
    '../../components/langsmith-observability-dashboard.tsx',
    import.meta.url,
  ),
  'utf8',
);
const telemetryRoute = readFileSync(
  new URL('../../app/api/telemetry/query/route.ts', import.meta.url),
  'utf8',
);
const ingestRoute = readFileSync(
  new URL('../../app/api/telemetry/ingest/route.ts', import.meta.url),
  'utf8',
);
const traceRoute = readFileSync(
  new URL('../../app/api/observability/traces/route.ts', import.meta.url),
  'utf8',
);
const schema = readFileSync(
  new URL('../../db/schema.ts', import.meta.url),
  'utf8',
);

test('Redfish dashboard queries a persistent time-series API with fallback', () => {
  assert.match(dashboard, /\/api\/telemetry\/query/);
  assert.match(dashboard, /source\.engine/);
  assert.match(dashboard, /Deterministic replay fallback/);
  assert.match(dashboard, /freshnessSeconds/);
  assert.match(telemetryRoute, /queryTelemetry/);
});

test('ingestion stays server-side and token protected', () => {
  assert.match(ingestRoute, /ingestTelemetry/);
  assert.match(ingestRoute, /status: 202/);
  assert.match(schema, /metricSamples/);
  assert.match(schema, /sourceUri/);
  assert.match(schema, /traceId/);
});

test('AI observability reads persisted OTel-shaped traces', () => {
  assert.match(aiDashboard, /\/api\/observability\/traces/);
  assert.match(aiDashboard, /source\.exportMode/);
  assert.match(traceRoute, /queryAiTraceSummary/);
  assert.match(schema, /aiTraces/);
  assert.match(schema, /redfishEventId/);
});

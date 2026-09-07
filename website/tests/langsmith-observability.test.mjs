import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(
  new URL(
    '../../components/langsmith-observability-dashboard.tsx',
    import.meta.url,
  ),
  'utf8',
);
const route = readFileSync(
  new URL('../../app/ai-observability/page.tsx', import.meta.url),
  'utf8',
);
const source = JSON.parse(
  readFileSync(
    new URL('../../public/data/langsmith-observability.json', import.meta.url),
    'utf8',
  ),
);

test('AI observability has a dedicated route and product navigation', () => {
  assert.match(route, /LangSmithObservabilityDashboard/);
  assert.match(dashboard, /href="\/dashboard"/);
  assert.match(dashboard, /href="\/studio"/);
  assert.match(dashboard, /href="\/platform"/);
});

test('dashboard exposes Grafana-like variables and refresh controls', () => {
  for (const control of [
    'Project',
    'Environment',
    'Run type',
    'Data center',
    'Rack',
    'Model',
    'Prompt',
    'Refresh interval',
  ]) {
    assert.match(dashboard, new RegExp(control));
  }
  for (const view of [
    'Overview',
    'Traces',
    'RAG quality',
    'Evaluations',
    'Cost & tokens',
    'Correlations',
  ]) {
    assert.match(dashboard, new RegExp(view));
  }
});

test('dashboard covers trace, quality, cost, safety and hardware correlation', () => {
  for (const panel of [
    'Trace throughput & error rate',
    'End-to-end trace latency',
    'Tokens & estimated cost',
    'Online evaluation scores',
    'Tool performance',
    'RAG evidence quality',
    'Safety & release gates',
    'Selected trace waterfall',
    'Redfish → AI correlation',
    'Recent AI investigations',
  ]) {
    assert.match(dashboard, new RegExp(panel));
  }
});

test('source is linked and honestly labeled as deterministic simulation', () => {
  assert.match(dashboard, /\/data\/langsmith-observability\.json/);
  assert.match(
    dashboard,
    /https:\/\/docs\.langchain\.com\/langsmith\/observability-concepts/,
  );
  assert.match(dashboard, /SIMULATED/);
  assert.equal(source.metadata.live_connection, false);
  assert.equal(source.metadata.production_writes, false);
  assert.match(source.metadata.source, /simulated/i);
});

test('source joins Redfish events to AI traces and feedback', () => {
  assert.ok(source.traces.length >= 8);
  assert.ok(source.correlations.length >= 5);
  assert.ok(source.waterfall.some((run) => run.kind === 'llm'));
  assert.ok(source.waterfall.some((run) => run.kind === 'retriever'));
  for (const correlation of source.correlations) {
    assert.match(correlation.trace_id, /^tr_/);
    assert.ok(correlation.hardware_event);
    assert.ok(correlation.ai_finding);
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(
  new URL('../../components/observability-dashboard.tsx', import.meta.url),
  'utf8',
);
const catalog = readFileSync(
  new URL('../../lib/observability-data.ts', import.meta.url),
  'utf8',
);
const home = readFileSync(
  new URL('../../components/home-experience.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(
  new URL('../../app/globals.css', import.meta.url),
  'utf8',
);

test('dedicated observability route is reachable from product navigation', () => {
  assert.match(home, /href="\/dashboard"/);
  assert.match(dashboard, /Redfish rack & GPU overview/);
});

test('dashboard exposes complete infrastructure and time controls', () => {
  for (const label of [
    'Data source',
    'Data center',
    'Hall',
    'Row',
    'Rack',
    'Node',
    'GPU',
    'Replay',
    'Last 15 minutes',
  ]) {
    assert.match(dashboard, new RegExp(label));
  }
  assert.match(dashboard, /setRefreshTick/);
  assert.match(dashboard, /Streaming paused/);
});

test('dashboard provides Grafana-style panel behaviors', () => {
  for (const feature of [
    'Legend',
    'ReferenceLine',
    'MetricTooltip',
    'GPU utilization heatmap',
    'GPU accelerator clock',
    'Redfish poll latency',
    'Metric freshness',
    'Active thresholds & events',
    'Redfish signal inventory',
  ]) {
    assert.match(dashboard, new RegExp(feature));
  }
  assert.match(css, /observe-panel/);
  assert.match(css, /inventory-legend/);
  assert.match(dashboard, /warning 1,600/);
  assert.match(dashboard, /warning 500 ms/);
  assert.match(dashboard, /stale 15s/);
});

test('signal inventory spans every Redfish observability family', () => {
  for (const group of [
    'Power',
    'Thermal',
    'Health',
    'Fabric',
    'Performance',
    'Inventory',
  ]) {
    assert.match(catalog, new RegExp(`group: '${group}'`));
  }
  for (const source of [
    'Chassis Power',
    'Thermal Temperature',
    'EventService',
    'PCIeDevice',
    'OEM MetricReport',
    'UpdateService',
  ]) {
    assert.match(catalog, new RegExp(source));
  }
});

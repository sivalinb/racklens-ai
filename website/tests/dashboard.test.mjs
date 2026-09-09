import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(
  new URL('../../components/rack-overview.tsx', import.meta.url),
  'utf8',
);
const home = readFileSync(
  new URL('../../components/home-experience.tsx', import.meta.url),
  'utf8',
);
const siteHeader = readFileSync(
  new URL('../../components/site-header.tsx', import.meta.url),
  'utf8',
);
const gpu = readFileSync(
  new URL('../../components/gpu-topology.tsx', import.meta.url),
  'utf8',
);
const twin = readFileSync(
  new URL('../../components/data-center-twin.tsx', import.meta.url),
  'utf8',
);
const signals = readFileSync(
  new URL('../../components/signal-dashboard.tsx', import.meta.url),
  'utf8',
);
const signalData = readFileSync(
  new URL('../../lib/redfish-signals.ts', import.meta.url),
  'utf8',
);
const data = readFileSync(
  new URL('../../lib/demo-data.ts', import.meta.url),
  'utf8',
);
const css = readFileSync(
  new URL('../../app/globals.css', import.meta.url),
  'utf8',
);

test('dashboard exposes the four incident replays', () => {
  for (const scenario of [
    'Cooling imbalance',
    'Power-cap event',
    'PCIe degradation',
    'Healthy baseline',
  ])
    assert.match(data, new RegExp(scenario));
});

test('rack and GPU topology are present', () => {
  assert.match(dashboard, /32 nodes · 256 GPUs/);
  assert.match(gpu, /8-GPU fabric topology/);
  assert.match(gpu, /NVSwitch fabric/);
});

test('homepage explains the product with an animated signal journey', () => {
  assert.match(home, /Know why the rack is drifting/);
  assert.match(home, /RackLens correlation engine/);
  assert.match(home, /Awaiting human review/);
  assert.match(css, /@keyframes homePacket/);
});

test('rack floor includes operational airflow and top-of-rack context', () => {
  assert.match(dashboard, /ToR A\/B/);
  assert.match(dashboard, /COLD INLET/);
  assert.match(dashboard, /HOT EXHAUST/);
  assert.match(css, /@keyframes rackBlink/);
});

test('digital twin filters the complete physical hierarchy', () => {
  for (const filter of ['Data center', 'Data hall', 'Row']) {
    assert.match(twin, new RegExp(filter));
  }
  for (const site of ['DEN-01', 'PHX-02', 'IAD-03']) {
    assert.match(twin, new RegExp(site));
  }
});

test('each facility view carries real data center infrastructure context', () => {
  for (const object of ['Cooling plant', 'CRAC', 'Overhead busway', 'ToR']) {
    assert.match(twin, new RegExp(object));
  }
  assert.match(css, /perspective: 1100px/);
  assert.match(css, /transform-style: preserve-3d/);
  assert.match(css, /@keyframes twinBlink/);
});

test('cross-route links use reliable document navigation on the public host', () => {
  assert.doesNotMatch(home, /next\/link/);
  assert.doesNotMatch(dashboard, /next\/link/);
  assert.match(home, /href="\/studio"/);
  assert.match(dashboard, /SiteHeader/);
  assert.match(siteHeader, /href="\/"/);
});

test('safety boundary is explicit', () => {
  assert.match(dashboard, /no hardware action executed/i);
  assert.match(dashboard, /Human review/);
});

test('motion and reduced-motion behavior are both implemented', () => {
  assert.match(css, /@keyframes packet/);
  assert.match(css, /@keyframes fabricPacket/);
  assert.match(css, /prefers-reduced-motion/);
});

test('public experience is honestly labeled as replay', () => {
  assert.match(dashboard, /SIMULATED REPLAY/);
  assert.match(dashboard, /deterministic replay/);
});

test('signal dashboard follows rack and GPU selections', () => {
  assert.match(dashboard, /selectedRack={selectedRack}/);
  assert.match(dashboard, /selectedGpu={selectedGpu}/);
  assert.match(signals, /Signal target/);
  assert.match(
    signals,
    /target follows rack floor and GPU topology\s+selections/,
  );
});

test('Redfish dashboard exposes the complete signal families and provenance', () => {
  for (const family of ['Power', 'Thermal', 'Health', 'Fabric']) {
    assert.match(signalData, new RegExp(`group: '${family}'`));
  }
  for (const source of [
    'Chassis Power',
    'TelemetryService',
    'PCIeDevice Status',
    'OEM MetricReport',
    'EventService',
  ]) {
    assert.match(`${signals}\n${signalData}`, new RegExp(source));
  }
  assert.match(signals, /GET only/);
  assert.match(signals, /Redfish event stream/);
  assert.match(css, /@keyframes signalTrace/);
});

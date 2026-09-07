import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const platform = readFileSync(
  new URL('../../components/product-platform.tsx', import.meta.url),
  'utf8',
);
const data = readFileSync(
  new URL('../../lib/platform-data.ts', import.meta.url),
  'utf8',
);
const css = readFileSync(
  new URL('../../app/globals.css', import.meta.url),
  'utf8',
);
const capabilities = JSON.parse(
  readFileSync(
    new URL('../../public/data/redfish-capabilities.json', import.meta.url),
  ),
);
const modelOps = JSON.parse(
  readFileSync(new URL('../../public/data/model-ops.json', import.meta.url)),
);

test('five-week product roadmap is implemented', () => {
  for (const productModule of [
    'Redfish Capability Map',
    'Cited Incident Timeline',
    'Reliability Copilot',
    'Replay & Evaluation Lab',
    'Adapter Foundry',
  ])
    assert.match(data, new RegExp(productModule));
});

test('capability explorer covers the Redfish operating surface', () => {
  assert.equal(capabilities.summary.total, 12);
  assert.equal(capabilities.production_writes, false);
  for (const service of [
    'Systems',
    'Chassis',
    'TelemetryService',
    'EventService',
    'UpdateService',
  ]) {
    assert.ok(capabilities.capabilities.some((item) => item.name === service));
  }
  assert.match(platform, /Filter surface/);
});

test('incident lab exposes multiple evidence-linked failures', () => {
  for (const scenario of [
    'Cooling-path imbalance',
    'Firmware regression',
    'NVLink degradation',
    'Certificate drift',
  ]) {
    assert.match(data, new RegExp(scenario));
  }
  assert.match(platform, /Run investigation/);
  assert.match(platform, /Every claim linked to evidence/);
});

test('fine-tuning pipeline is implemented without false training claims', () => {
  assert.equal(modelOps.dataset.synthetic_golden_examples, 70);
  assert.equal(modelOps.dataset.operator_approved_examples, 0);
  assert.equal(modelOps.release_gate.status, 'blocked');
  assert.ok(
    modelOps.adapters.every((adapter) => adapter.status === 'not_trained'),
  );
  assert.match(platform, /not trained/i);
  assert.match(platform, /Blocked by design/);
});

test('platform carries motion and reduced-motion behavior', () => {
  assert.match(css, /@keyframes platformPacket/);
  assert.match(css, /@keyframes evidenceScan/);
  assert.match(css, /prefers-reduced-motion/);
});

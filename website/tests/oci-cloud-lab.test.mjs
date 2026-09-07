import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cloudLab = readFileSync('components/cloud-lab.tsx', 'utf8');
const store = readFileSync('lib/telemetry-store.ts', 'utf8');
const ingestRoute = readFileSync(
  'app/api/evaluations/ingest/route.ts',
  'utf8',
);

test('OCI lab is honest before the external data plane is connected', () => {
  assert.match(cloudLab, /READY FOR OCI/);
  assert.match(cloudLab, /Local baseline shown until OCI publishes/);
  assert.match(cloudLab, /Zero Redfish writes/);
  assert.match(cloudLab, /No secrets in browser/);
});

test('OCI lab maps weeks one through four to measurable product outcomes', () => {
  for (const value of [
    'Instrument',
    'Contextualize',
    'Reason',
    'Evaluate',
    'Top-cause accuracy',
    'Citation validity',
    'Unsafe action rate',
  ]) {
    assert.match(cloudLab, new RegExp(value, 'i'));
  }
});

test('evaluation ingestion stays server-side and token protected', () => {
  assert.match(store, /RACKLENS_INGEST_TOKEN/);
  assert.match(store, /x-racklens-ingest-token/);
  assert.match(store, /INSERT OR REPLACE INTO evaluation_runs/);
  assert.match(ingestRoute, /ingestEvaluation/);
  assert.doesNotMatch(cloudLab, /RACKLENS_INGEST_TOKEN/);
});

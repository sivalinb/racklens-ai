import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const redfish = readFileSync(
  new URL('../../components/observability-dashboard.tsx', import.meta.url),
  'utf8',
);
const ai = readFileSync(
  new URL(
    '../../components/langsmith-observability-dashboard.tsx',
    import.meta.url,
  ),
  'utf8',
);
const home = readFileSync(
  new URL('../../components/home-experience.tsx', import.meta.url),
  'utf8',
);
const twin = readFileSync(
  new URL('../../components/data-center-twin.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(
  new URL('../../app/observatory-theme.css', import.meta.url),
  'utf8',
);

test('public evidence is clearly identified as demonstration data', () => {
  assert.match(home, /GPUs in demo topology/);
  assert.match(home, /lead time in incident replay/);
  assert.match(redfish, /READ-ONLY DEMO/);
  assert.match(twin, /INTERACTIVE TOPOLOGY/);
});

test('operations dashboards have semantic titles and no decorative header actions', () => {
  assert.match(redfish, /<h1 className="sr-only">/);
  assert.match(ai, /<h1 className="sr-only">/);
  assert.doesNotMatch(redfish, /aria-label="Notifications"/);
  assert.doesNotMatch(ai, /aria-label="Settings"/);
});

test('dashboard panels expand and the learning checklist persists', () => {
  assert.match(redfish, /aria-pressed={expanded}/);
  assert.match(ai, /aria-pressed={expanded}/);
  assert.match(redfish, /event\.key === 'Escape'/);
  assert.match(ai, /event\.key === 'Escape'/);
  assert.match(ai, /racklens-learning-progress/);
  assert.match(ai, /ls-learning-disclosure/);
  assert.match(css, /\.observe-panel\.is-expanded/);
});

test('mobile event rows stay inside their scroll container', () => {
  assert.match(css, /\.observe-events\s*{[\s\S]*overflow-x: auto/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync(
  new URL('../../components/site-header.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(
  new URL('../../app/globals.css', import.meta.url),
  'utf8',
);

const surfaces = [
  ['home-experience.tsx', '/'],
  ['rack-overview.tsx', '/studio'],
  ['observability-dashboard.tsx', '/dashboard'],
  ['langsmith-observability-dashboard.tsx', '/ai-observability'],
  ['product-platform.tsx', '/platform'],
  ['cloud-lab.tsx', '/cloud-lab'],
  ['architecture-flow.tsx', '/architecture'],
];

test('every public product surface uses the shared site header', () => {
  for (const [file, path] of surfaces) {
    const source = readFileSync(
      new URL(`../../components/${file}`, import.meta.url),
      'utf8',
    );
    assert.match(source, /SiteHeader/);
    assert.match(source, new RegExp(`activePath="${path}"`));
  }
});

test('navigation groups every existing destination under four top-level choices', () => {
  for (const label of ['Home', 'Explore', 'Labs', 'About']) {
    assert.match(header, new RegExp(`>\\s*${label}\\s*<|label="${label}"`));
  }
  for (const destination of [
    '/studio',
    '/dashboard',
    '/ai-observability',
    '/platform',
    '/cloud-lab',
    '/architecture',
    '/#workflow',
    '/#safety',
  ]) {
    assert.match(header, new RegExp(destination.replace('/', '\\/')));
  }
});

test('shared navigation has keyboard focus and compact responsive behavior', () => {
  assert.match(css, /\.site-menu > summary:focus-visible/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /\.site-primary-nav[\s\S]*overflow-x: auto/);
});

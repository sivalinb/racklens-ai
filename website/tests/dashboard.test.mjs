import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(new URL('../../components/rack-overview.tsx', import.meta.url), 'utf8');
const gpu = readFileSync(new URL('../../components/gpu-topology.tsx', import.meta.url), 'utf8');
const data = readFileSync(new URL('../../lib/demo-data.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

test('dashboard exposes the four incident replays', () => {
  for (const scenario of ['Cooling imbalance', 'Power-cap event', 'PCIe degradation', 'Healthy baseline']) assert.match(data, new RegExp(scenario));
});

test('rack and GPU topology are present', () => {
  assert.match(dashboard, /32 nodes · 256 GPUs/);
  assert.match(gpu, /8-GPU fabric topology/);
  assert.match(gpu, /NVSwitch fabric/);
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
  assert.match(dashboard, /LIVE REPLAY/);
  assert.match(dashboard, /deterministic replay/);
});

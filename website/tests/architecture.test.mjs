import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile('components/architecture-flow.tsx', 'utf8');
const page = await readFile('app/architecture/page.tsx', 'utf8');
const css = await readFile('app/globals.css', 'utf8');
const docs = await readFile('docs/ARCHITECTURE.md', 'utf8');

test('architecture route exposes the layered RackLens system map', () => {
  assert.match(page, /ArchitectureFlow/);
  assert.match(component, /BOUNDED INVESTIGATION GRAPH/);
  assert.match(component, /STATE \+ EVIDENCE PLANE/);
  assert.match(component, /OBSERVABILITY \+ EVALUATION/);
  assert.match(component, /Human review boundary/);
  assert.match(component, /No production write/);
});

test('architecture motion is accessible and the documented flow is implementation-linked', () => {
  assert.match(css, /@keyframes archTrace/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(docs, /```mermaid/);
  assert.match(docs, /ClickHouse/);
  assert.match(docs, /optional export/);
  assert.match(docs, /release-gated/);
});

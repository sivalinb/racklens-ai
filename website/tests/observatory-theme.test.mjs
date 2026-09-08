import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layout = readFileSync(
  new URL('../../app/layout.tsx', import.meta.url),
  'utf8',
);
const theme = readFileSync(
  new URL('../../app/observatory-theme.css', import.meta.url),
  'utf8',
);
const foundation = readFileSync(
  new URL('../../app/globals.css', import.meta.url),
  'utf8',
);

test('observatory-inspired presentation is loaded after the product foundation', () => {
  assert.match(
    layout,
    /import '\.\/globals\.css';\s+import '\.\/observatory-theme\.css';/,
  );
  assert.match(theme, /--observatory-paper: #f7faf6/);
  assert.match(theme, /--observatory-ink: #123d33/);
  assert.match(theme, /--observatory-panel: #103d33/);
});

test('presentation overrides preserve every product animation system', () => {
  assert.doesNotMatch(theme, /animation(?:-[a-z]+)?:/);
  for (const animation of [
    'archAcross',
    'cloudScan',
    'platformPacket',
    'homePacket',
    'rackBlink',
    'twinBlink',
  ]) {
    assert.match(foundation, new RegExp(`@keyframes ${animation}`));
  }
});

test('light editorial framing retains focused dark operational surfaces', () => {
  assert.match(theme, /\.home-shell[\s\S]*var\(--observatory-paper\)/);
  assert.match(theme, /\.home-system-map[\s\S]*var\(--observatory-panel\)/);
  assert.match(theme, /\.platform-flow,[\s\S]*\.cloud-live-card/);
  assert.match(theme, /\.arch-map[\s\S]*var\(--observatory-panel-deep\)/);
});

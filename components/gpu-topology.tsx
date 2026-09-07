'use client';

import { Cpu, Fan, MemoryStick, Network, Thermometer, Zap } from 'lucide-react';
import type { Scenario, ScenarioKey } from '@/lib/demo-data';

type Props = {
  scenario: Scenario;
  scenarioKey: ScenarioKey;
  running: boolean;
  rackId: string;
  selected: number;
  onSelect: (gpu: number) => void;
};

export function GpuTopology({
  scenario,
  scenarioKey,
  running,
  rackId,
  selected,
  onSelect,
}: Props) {
  const affected =
    rackId !== scenario.rack || scenarioKey === 'healthy'
      ? []
      : scenarioKey === 'pcie'
        ? [3]
        : [2, 3, 6, 7];
  const baseClock = scenario.metrics.clock.at(-1) ?? 1830;
  return (
    <article className="panel gpu-panel" id="gpu">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SELECTED NODE · {rackId}-U18</span>
          <h2>8-GPU fabric topology</h2>
        </div>
        <span className="fabric-health">
          <i /> {scenarioKey === 'pcie' ? 'PCIe degraded' : 'NVLink healthy'}
        </span>
      </div>
      <div className="gpu-layout-wrap">
        <div className={`gpu-layout ${running ? 'flowing' : ''}`}>
          <div className="cpu-socket">
            <Cpu />
            <span>CPU 0</span>
          </div>
          <div className="cpu-socket socket-two">
            <Cpu />
            <span>CPU 1</span>
          </div>
          <div className="fabric-backplane">
            <span>NVSwitch fabric</span>
            <i />
            <i />
            <i />
            <i />
          </div>
          {Array.from({ length: 8 }).map((_, index) => {
            const hot = affected.includes(index);
            const temp =
              hot && scenarioKey === 'cooling'
                ? 76 + (index % 3)
                : 58 + (index % 5);
            return (
              <button
                key={index}
                className={`gpu-chip gpu-${index} ${hot ? 'gpu-affected' : ''} ${selected === index ? 'gpu-selected' : ''}`}
                onClick={() => onSelect(index)}
                aria-label={`Inspect GPU ${index}`}
                aria-pressed={selected === index}
              >
                <span className="chip-led" />
                <strong>GPU {index}</strong>
                <small>
                  {temp}°C · {Math.round(baseClock + (index % 2) * 10)} MHz
                </small>
                <div className="chip-load">
                  <i style={{ width: `${74 + ((index * 3) % 21)}%` }} />
                </div>
              </button>
            );
          })}
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              className={`fabric-packet packet-${index}`}
              key={`p-${index}`}
            />
          ))}
        </div>
        <div className="gpu-inspector">
          <div className="inspector-title">
            <span>GPU {selected}</span>
            <strong>
              {affected.includes(selected) ? 'Affected' : 'Healthy'}
            </strong>
          </div>
          <dl>
            <div>
              <dt>
                <Thermometer />
                Temperature
              </dt>
              <dd>
                {affected.includes(selected) && scenarioKey === 'cooling'
                  ? 78
                  : 61}
                °C
              </dd>
            </div>
            <div>
              <dt>
                <Zap />
                Board power
              </dt>
              <dd>{scenarioKey === 'power' ? 438 : 524} W</dd>
            </div>
            <div>
              <dt>
                <Cpu />
                SM clock
              </dt>
              <dd>{baseClock} MHz</dd>
            </div>
            <div>
              <dt>
                <MemoryStick />
                HBM used
              </dt>
              <dd>{(52.4 + selected * 1.8).toFixed(1)} GB</dd>
            </div>
            <div>
              <dt>
                <Network />
                NVLink
              </dt>
              <dd>
                {scenarioKey === 'pcie' && selected === 3 ? '118' : '392'} GB/s
              </dd>
            </div>
            <div>
              <dt>
                <Fan />
                Cooling
              </dt>
              <dd>{scenarioKey === 'cooling' ? 'Constrained' : 'Normal'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

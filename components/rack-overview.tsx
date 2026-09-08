'use client';
/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */

import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Cpu,
  Database,
  Network,
  Pause,
  Play,
  Server,
  ShieldCheck,
  Thermometer,
  Wind,
  Workflow,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataCenterTwin } from '@/components/data-center-twin';
import { GpuTopology } from '@/components/gpu-topology';
import { SignalDashboard } from '@/components/signal-dashboard';
import { TelemetryCharts } from '@/components/telemetry-charts';
import { RACKS, SCENARIOS, type ScenarioKey } from '@/lib/demo-data';
import type { SignalScope } from '@/lib/redfish-signals';

function RackCard({
  id,
  zone,
  power,
  temp,
  load,
  warning,
  selected,
  onSelect,
}: {
  id: string;
  zone: string;
  power: string;
  temp: number;
  load: number;
  warning: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rack-card ${selected ? 'rack-card-selected' : ''}`}
      aria-pressed={selected}
      aria-label={`Inspect rack ${id}`}
    >
      <div className="rack-header">
        <div>
          <strong>{id}</strong>
          <span>{zone}</span>
        </div>
        <span className={`status-dot ${warning ? 'status-warning' : ''}`} />
      </div>
      <div
        className="tor-switch"
        aria-label={`${id} redundant top-of-rack switches`}
      >
        <Network />
        <strong>ToR A/B</strong>
        <span>400G</span>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="server-stack" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            className={`server-unit ${warning && i === 4 ? 'server-hot' : ''}`}
            key={i}
          >
            <b>U{String(40 - i * 4).padStart(2, '0')}</b>
            <div className="server-lights">
              <span className={`rack-led rack-led-${(i % 3) + 1}`} />
              <span className={`rack-led rack-led-${((i + 1) % 3) + 1}`} />
              <span className="rack-led rack-led-power" />
            </div>
            <i className="drive-bank" />
            <i className="fan-grille" />
          </div>
        ))}
      </div>
      <div className="rack-footer">
        <span>{power}</span>
        <span>IN {temp.toFixed(1)}°</span>
        <span>OUT {(temp + 11.6).toFixed(1)}°</span>
      </div>
      <div className="load-track">
        <span style={{ width: `${load}%` }} />
      </div>
    </button>
  );
}

export function RackOverview() {
  const [running, setRunning] = useState(true);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('cooling');
  const [selectedRack, setSelectedRack] = useState('R02');
  const [selectedGpu, setSelectedGpu] = useState(3);
  const [signalScope, setSignalScope] = useState<SignalScope>('rack');
  const [reviewed, setReviewed] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const scenario = SCENARIOS[scenarioKey];
  const racks = useMemo(
    () =>
      RACKS.map((r) => ({
        ...r,
        power:
          scenario.rack === r.id && scenarioKey === 'power' ? 35 : r.basePower,
        temp:
          scenario.rack === r.id && scenarioKey === 'cooling'
            ? 29.8
            : r.baseTemp,
        warning: scenario.rack === r.id && scenarioKey !== 'healthy',
      })),
    [scenario, scenarioKey],
  );
  const fleetPower = racks.reduce((sum, r) => sum + r.power, 0).toFixed(1);

  return (
    <main className={`site-shell ${running ? 'is-running' : 'is-paused'}`}>
      <header className="topbar">
        <a className="brand-mark studio-brand" href="/">
          <span className="brand-pulse">
            <Activity />
          </span>
          <div>
            <strong>RackLens</strong>
            <small>AI Reliability Studio</small>
          </div>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/">Home</a>
          <a href="/platform">Product lab</a>
          <a href="/dashboard">Observability</a>
          <a href="/ai-observability">AI Observability</a>
          <a href="/cloud-lab">OCI Cloud Lab</a>
          <a href="/architecture">Architecture</a>
          <a href="#digital-twin">Digital twin</a>
          <a href="#fleet">Fleet</a>
          <a href="#gpu">GPU fabric</a>
          <a href="#telemetry">Telemetry</a>
          <a href="#signals">Signals</a>
          <a href="#architecture">How it works</a>
        </nav>
        <div className="header-actions">
          <Badge className="live-badge">
            <span className="live-dot" /> LIVE REPLAY
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRunning((v) => !v)}
          >
            {running ? <Pause /> : <Play />}
            {running ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </header>

      <section className="intro-strip">
        <div>
          <span className="eyebrow">AI INFRASTRUCTURE · DEN-01</span>
          <h1>See the rack. Follow the evidence.</h1>
          <p>
            Redfish hardware telemetry, GPU fabric signals and workload
            traces—correlated into one evidence-backed reliability
            investigation.
          </p>
        </div>
        <div className="clock">
          <span>INCIDENT WINDOW</span>
          <strong>14:32:08</strong>
          <small>UTC · replaying 12×</small>
        </div>
      </section>

      <section className="scenario-bar" aria-label="Select incident replay">
        <div>
          <span>Replay scenario</span>
          <small>Switch the fault and watch every view respond.</small>
        </div>
        <div className="scenario-buttons">
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
            <button
              key={key}
              className={scenarioKey === key ? 'active' : ''}
              onClick={() => {
                setScenarioKey(key);
                setSelectedRack(SCENARIOS[key].rack);
                setSignalScope('rack');
                setReviewed(false);
              }}
            >
              <i style={{ background: SCENARIOS[key].accent }} />
              {SCENARIOS[key].label}
            </button>
          ))}
        </div>
      </section>

      <DataCenterTwin
        running={running}
        scenarioKey={scenarioKey}
        onRackSelect={setSelectedRack}
      />

      <section className="kpi-grid" aria-label="Fleet summary">
        <article className="kpi-card tone-cyan">
          <div>
            <span>Fleet power</span>
            <strong>{fleetPower} kW</strong>
            <small>4 racks · 32 nodes</small>
          </div>
          <Zap />
        </article>
        <article className="kpi-card tone-amber">
          <div>
            <span>Peak inlet</span>
            <strong>
              {Math.max(...racks.map((r) => r.temp)).toFixed(1)}°C
            </strong>
            <small>{scenario.rack} · U18</small>
          </div>
          <Thermometer />
        </article>
        <article className="kpi-card tone-violet">
          <div>
            <span>GPU fabric</span>
            <strong>{scenario.metrics.traffic.at(-1)} Tb/s</strong>
            <small>
              {scenarioKey === 'pcie' ? '1 degraded link' : '97.2% healthy'}
            </small>
          </div>
          <Network />
        </article>
        <article className="kpi-card tone-rose">
          <div>
            <span>AI release gate</span>
            <strong>{scenarioKey === 'healthy' ? 'PASS' : 'HOLD'}</strong>
            <small>
              {scenarioKey === 'healthy'
                ? 'No intervention'
                : 'Human review required'}
            </small>
          </div>
          <ShieldCheck />
        </article>
      </section>

      <section className="workspace-grid" id="fleet">
        <article className="panel rack-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                PHYSICAL VIEW · COLD AISLE CONTAINMENT
              </span>
              <h2>Rack floor and airflow envelope</h2>
            </div>
            <Badge variant="outline">32 nodes · 256 GPUs · 8 ToR links</Badge>
          </div>
          <div
            className="airflow-plenum airflow-exhaust"
            aria-label="Hot exhaust airflow"
          >
            <span>
              <Wind /> HOT EXHAUST
            </span>
            <div>
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <strong>
              {(Math.max(...racks.map((r) => r.temp)) + 11.6).toFixed(1)}°C PEAK
            </strong>
          </div>
          <div className="rack-grid">
            {racks.map((r) => (
              <RackCard
                key={r.id}
                id={r.id}
                zone={r.zone}
                power={`${r.power.toFixed(1)} kW`}
                temp={r.temp}
                load={r.load}
                warning={r.warning}
                selected={selectedRack === r.id}
                onSelect={() => {
                  setSelectedRack(r.id);
                  setSignalScope('rack');
                }}
              />
            ))}
          </div>
          <div
            className="airflow-plenum airflow-inlet"
            aria-label="Cold inlet airflow"
          >
            <span>
              <Wind /> COLD INLET
            </span>
            <div>
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <strong>
              {Math.min(...racks.map((r) => r.temp)).toFixed(1)}°C SUPPLY
            </strong>
          </div>
          <div className="heat-floor" aria-hidden="true">
            <span>Cold aisle</span>
            <div className={scenarioKey === 'cooling' ? 'heat-active' : ''} />
            <span>Hot aisle</span>
          </div>
          <div className="legend">
            <span>
              <i className="legend-ok" />
              Healthy
            </span>
            <span>
              <i className="legend-hot" />
              Active finding
            </span>
            <span>
              <i className="legend-inlet" />
              Inlet
            </span>
            <span>
              <i className="legend-exhaust" />
              Exhaust
            </span>
            <span>Select a rack to focus</span>
          </div>
        </article>

        <article className="panel flow-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LIVE SIGNAL PATH</span>
              <h2>Evidence flow</h2>
            </div>
            <Workflow />
          </div>
          <div className="flow-map" aria-label="Animated data flow">
            <div className="flow-node">
              <Network />
              <strong>Redfish</strong>
              <span>Events + metrics</span>
            </div>
            <div className="flow-line">
              <i />
              <i />
              <i />
            </div>
            <div className="flow-node">
              <Database />
              <strong>Correlate</strong>
              <span>Rack + GPU + trace</span>
            </div>
            <div className="flow-line">
              <i />
              <i />
              <i />
            </div>
            <div className="flow-node">
              <Cpu />
              <strong>AI investigator</strong>
              <span>Rank + cite + critic</span>
            </div>
          </div>
          <div className="signal-ticker">
            <span>14:32:08.412</span>
            <strong>{scenario.short}</strong>
            <Badge>correlated</Badge>
          </div>
        </article>

        <article className="panel finding-panel" id="investigation">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AI FINDING · RL-2048</span>
              <h2>{scenario.finding}</h2>
            </div>
            <Badge
              className={`severity-badge sev-${scenario.severity.toLowerCase()}`}
            >
              {scenario.severity}
            </Badge>
          </div>
          <p>{scenario.summary}</p>
          <div className="confidence-row">
            <span>Top-hypothesis confidence</span>
            <strong>{scenario.confidence}%</strong>
          </div>
          <div className="confidence-track">
            <span
              style={{
                width: `${scenario.confidence}%`,
                background: `linear-gradient(90deg,${scenario.accent},#78f3cb)`,
              }}
            />
          </div>
          <ol>
            {scenario.hypotheses.map((h, index) => (
              <li key={h.title}>
                <span>0{index + 1}</span>
                <div>
                  <strong>{h.title}</strong>
                  <small>{h.confidence}% confidence</small>
                </div>
              </li>
            ))}
          </ol>
          <div className="finding-actions">
            <Button onClick={() => setShowEvidence((v) => !v)}>
              {showEvidence ? 'Hide evidence' : 'Open evidence'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setReviewed(true)}
              disabled={reviewed}
            >
              {reviewed ? (
                <>
                  <CheckCircle2 />
                  Reviewed
                </>
              ) : (
                <>Review recommendation</>
              )}
            </Button>
          </div>
          {showEvidence && (
            <div className="evidence-expanded" aria-live="polite">
              {scenario.evidence.slice(0, 2).map((e) => (
                <div key={e.id}>
                  <span>{e.id}</span>
                  <p>{e.observation}</p>
                  <b>{e.value}</b>
                </div>
              ))}
            </div>
          )}
          <small className="safety-note">
            Read-only analysis · no hardware action executed
          </small>
        </article>
      </section>

      <section className="deep-grid">
        <GpuTopology
          scenario={scenario}
          scenarioKey={scenarioKey}
          running={running}
          rackId={selectedRack}
          selected={selectedGpu}
          onSelect={(gpu) => {
            setSelectedGpu(gpu);
            setSignalScope('gpu');
          }}
        />
        <TelemetryCharts scenario={scenario} />
      </section>

      <SignalDashboard
        scenario={scenario}
        scenarioKey={scenarioKey}
        running={running}
        scope={signalScope}
        selectedRack={selectedRack}
        selectedGpu={selectedGpu}
        onScopeChange={setSignalScope}
        onRackChange={(rack) => {
          setSelectedRack(rack);
          setSignalScope('rack');
        }}
        onGpuChange={(gpu) => {
          setSelectedGpu(gpu);
          setSignalScope('gpu');
        }}
      />

      <section className="evidence-section" id="evidence">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WHY THE AGENT BELIEVES THIS</span>
            <h2>Evidence before inference</h2>
          </div>
          <p>
            The system keeps observations, hypotheses and recommendations
            separate so an operator can challenge every conclusion.
          </p>
        </div>
        <div className="evidence-cards">
          {scenario.evidence.map((e) => (
            <article key={e.id}>
              <div>
                <Badge variant="outline">{e.id}</Badge>
                <span>{e.type}</span>
              </div>
              <h3>{e.observation}</h3>
              <p>{e.resource}</p>
              <strong>{e.value}</strong>
            </article>
          ))}
        </div>
        <div className="recommendation">
          <div>
            <ShieldCheck />
            <span>HUMAN GATE</span>
          </div>
          <p>{scenario.recommendation}</p>
          <Button onClick={() => setReviewed(true)}>
            {reviewed ? (
              <>
                <CheckCircle2 />
                Review recorded
              </>
            ) : (
              <>
                Acknowledge recommendation
                <ChevronRight />
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="architecture-section" id="architecture">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PYTHON-FIRST SYSTEM</span>
            <h2>From BMC signal to safe decision</h2>
          </div>
          <p>
            The public experience runs a deterministic replay. The repository
            includes the complete Python collector, simulator, retrieval,
            investigation API and 70-case evaluation.
          </p>
        </div>
        <div className="architecture-flow">
          {[
            {
              icon: Server,
              title: 'Collect',
              text: 'Redfish Systems, Chassis, Telemetry, Events and firmware inventory',
            },
            {
              icon: Activity,
              title: 'Observe',
              text: 'Normalize power, thermal, traffic, GPU and workload signals',
            },
            {
              icon: BookOpen,
              title: 'Ground',
              text: 'Retrieve DMTF and operator knowledge with citation IDs',
            },
            {
              icon: CircleGauge,
              title: 'Investigate',
              text: 'Rank three causes, validate evidence and trace every stage',
            },
            {
              icon: ShieldCheck,
              title: 'Review',
              text: 'Require a person before any action-like recommendation',
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <article key={title}>
              <span>
                <Icon />
              </span>
              <small>0{i + 1}</small>
              <h3>{title}</h3>
              <p>{text}</p>
              {i < 4 && <ChevronRight className="arch-arrow" />}
            </article>
          ))}
        </div>
        <div className="quality-strip">
          <span>
            <strong>70/70</strong> evaluation cases
          </span>
          <span>
            <strong>100%</strong> citation validity
          </span>
          <span>
            <strong>0</strong> autonomous writes
          </span>
          <span>
            <strong>6</strong> traced agent stages
          </span>
        </div>
      </section>

      <footer>
        <div className="brand-mark">
          <span className="brand-pulse">
            <Activity />
          </span>
          <div>
            <strong>RackLens AI</strong>
            <small>Evidence-first reliability intelligence</small>
          </div>
        </div>
        <p>
          Portfolio demonstration using deterministic Redfish-shaped telemetry.
          Connect the Python collector to an authorized BMC for live use.
        </p>
        <a
          href="https://www.dmtf.org/standards/redfish"
          target="_blank"
          rel="noreferrer"
        >
          Redfish standard <ChevronRight />
        </a>
      </footer>
    </main>
  );
}

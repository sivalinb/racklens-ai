'use client';
/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */

import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleGauge,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  FlaskConical,
  GitBranch,
  LockKeyhole,
  Network,
  Play,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  INCIDENTS,
  REDFISH_CAPABILITIES,
  SOURCES,
  WEEKS,
  type WeekKey,
} from '@/lib/platform-data';

const filters = ['All', 'Read', 'Event', 'Guarded'] as const;

export function ProductPlatform() {
  const [week, setWeek] = useState<WeekKey>(1);
  const [capabilityFilter, setCapabilityFilter] =
    useState<(typeof filters)[number]>('All');
  const [selectedCapability, setSelectedCapability] = useState('Systems');
  const [incidentId, setIncidentId] =
    useState<(typeof INCIDENTS)[number]['id']>('firmware');
  const [replayCount, setReplayCount] = useState(0);
  const activeWeek = WEEKS.find((item) => item.id === week) ?? WEEKS[0];
  const incident =
    INCIDENTS.find((item) => item.id === incidentId) ?? INCIDENTS[0];
  const capability =
    REDFISH_CAPABILITIES.find((item) => item.name === selectedCapability) ??
    REDFISH_CAPABILITIES[0];
  const capabilities = REDFISH_CAPABILITIES.filter(
    (item) => capabilityFilter === 'All' || item.mode === capabilityFilter,
  );

  return (
    <main className="platform-shell">
      <header className="platform-nav">
        <a className="brand-mark" href="/" aria-label="RackLens AI home">
          <span className="brand-pulse">
            <Activity />
          </span>
          <div>
            <strong>RackLens</strong>
            <small>AI Reliability Studio</small>
          </div>
        </a>
        <nav aria-label="Product navigation">
          <a href="/">Home</a>
          <a href="/studio">3D Studio</a>
          <a href="/dashboard">Observability</a>
          <a href="/ai-observability">AI Observability</a>
          <a href="/cloud-lab">OCI Cloud Lab</a>
          <a className="active" href="/platform">
            Product Lab
          </a>
        </nav>
        <span className="platform-readonly">
          <LockKeyhole /> READ-ONLY
        </span>
      </header>

      <section className="platform-hero">
        <div className="platform-hero-copy">
          <span className="platform-kicker">
            <Sparkles /> RELIABILITY FLIGHT DECK
          </span>
          <h1>
            From Redfish signal to <em>operator decision.</em>
          </h1>
          <p>
            A working product blueprint that turns hardware telemetry into a
            cited incident narrative, tests every claim, then specializes the
            model only when human-reviewed evidence is ready.
          </p>
          <div className="platform-hero-actions">
            <a href="#roadmap">
              Explore the five-week system <ArrowRight />
            </a>
            <a href="/studio">
              Open the 3D twin <ChevronRight />
            </a>
          </div>
        </div>
        <div className="platform-flow" aria-label="Animated product data flow">
          <div className="platform-flow-node">
            <Server />
            <span>REDFISH</span>
            <strong>12 capabilities</strong>
          </div>
          <i className="platform-flow-line">
            <b />
            <b />
            <b />
          </i>
          <div className="platform-flow-node">
            <Database />
            <span>EVIDENCE</span>
            <strong>Shared timeline</strong>
          </div>
          <i className="platform-flow-line">
            <b />
            <b />
            <b />
          </i>
          <div className="platform-flow-node platform-flow-ai">
            <BrainCircuit />
            <span>AI</span>
            <strong>3 hypotheses</strong>
          </div>
          <i className="platform-flow-line">
            <b />
            <b />
            <b />
          </i>
          <div className="platform-flow-node platform-flow-human">
            <ShieldCheck />
            <span>HUMAN</span>
            <strong>Release gate</strong>
          </div>
        </div>
      </section>

      <section className="platform-stats" aria-label="Product proof points">
        <div>
          <strong>12</strong>
          <span>Redfish capabilities mapped</span>
        </div>
        <div>
          <strong>7</strong>
          <span>deterministic fault scenarios</span>
        </div>
        <div>
          <strong>70/70</strong>
          <span>golden replay checks</span>
        </div>
        <div>
          <strong>0</strong>
          <span>production writes</span>
        </div>
      </section>

      <section className="platform-section" id="roadmap">
        <div className="platform-section-heading">
          <div>
            <span>WEEK 1 → WEEK 5</span>
            <h2>One product, built in trust layers.</h2>
          </div>
          <p>
            Each week adds an operator-visible capability and a measurable
            release gate.
          </p>
        </div>
        <div
          className="week-rail"
          role="tablist"
          aria-label="Five-week product roadmap"
        >
          {WEEKS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={week === item.id}
              onClick={() => setWeek(item.id)}
              className={week === item.id ? 'active' : ''}
            >
              <b>0{item.id}</b>
              <span>{item.name}</span>
              <i />
            </button>
          ))}
        </div>
        <div className="week-detail">
          <div className="week-number">0{activeWeek.id}</div>
          <div>
            <span>PRODUCT MODULE</span>
            <h3>{activeWeek.product}</h3>
            <p>{activeWeek.outcome}</p>
          </div>
          <div className="week-technology">
            <Cpu />
            <span>TECHNOLOGY</span>
            <strong>{activeWeek.technology}</strong>
          </div>
        </div>
      </section>

      <section className="platform-section capability-section">
        <div className="platform-section-heading">
          <div>
            <span>WEEK 1 · CAPABILITY EXPLORER</span>
            <h2>Redfish, translated into operations.</h2>
          </div>
          <p>
            Live-connector reads, simulator-backed surfaces, and guarded actions
            are labeled separately.
          </p>
        </div>
        <div className="capability-toolbar">
          <span>
            <Filter /> Filter surface
          </span>
          <div>
            {filters.map((filter) => (
              <button
                key={filter}
                className={capabilityFilter === filter ? 'active' : ''}
                onClick={() => setCapabilityFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="capability-workbench">
          <div className="capability-grid">
            {capabilities.map((item) => (
              <button
                key={item.name}
                className={selectedCapability === item.name ? 'active' : ''}
                onClick={() => setSelectedCapability(item.name)}
              >
                <span
                  className={`cap-mode cap-mode-${item.mode.toLowerCase()}`}
                >
                  {item.mode}
                </span>
                <strong>{item.name}</strong>
                <small>{item.value}</small>
              </button>
            ))}
          </div>
          <aside className="capability-inspector">
            <span>SELECTED RESOURCE</span>
            <h3>{capability.name}</h3>
            <code>{capability.uri}</code>
            <p>{capability.description}</p>
            <dl>
              <div>
                <dt>Surface</dt>
                <dd>{capability.mode}</dd>
              </div>
              <div>
                <dt>Demo state</dt>
                <dd>{capability.status}</dd>
              </div>
              <div>
                <dt>Production writes</dt>
                <dd>Disabled</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="platform-section replay-section">
        <div className="platform-section-heading">
          <div>
            <span>WEEKS 2–4 · INCIDENT REPLAY</span>
            <h2>A fault becomes an evidence graph.</h2>
          </div>
          <p>
            Pick a failure mode and follow the causal path across hardware,
            facility, GPU and workload evidence.
          </p>
        </div>
        <div className="replay-workbench">
          <div className="incident-list" aria-label="Incident scenarios">
            {INCIDENTS.map((item) => (
              <button
                key={item.id}
                aria-pressed={incidentId === item.id}
                className={incidentId === item.id ? 'active' : ''}
                onClick={() => {
                  setIncidentId(item.id);
                  setReplayCount(0);
                }}
              >
                <span>{item.severity}</span>
                <strong>{item.name}</strong>
                <small>{item.rack}</small>
              </button>
            ))}
          </div>
          <div
            className={`incident-stage ${replayCount ? 'is-replaying' : ''}`}
          >
            <div className="incident-stage-top">
              <div>
                <span>SELECTED REPLAY</span>
                <h3>{incident.name}</h3>
              </div>
              <button onClick={() => setReplayCount((value) => value + 1)}>
                <Play /> Run investigation
              </button>
            </div>
            <div className="evidence-flow">
              {incident.evidence.map((item, index) => (
                <div
                  className="evidence-step"
                  key={item}
                  style={
                    {
                      '--step-delay': `${index * 0.28}s`,
                    } as React.CSSProperties
                  }
                >
                  {index === 0 ? (
                    <Thermometer />
                  ) : index === 1 ? (
                    <Radio />
                  ) : (
                    <CircleGauge />
                  )}
                  <span>0{index + 1}</span>
                  <strong>{item}</strong>
                  <small>
                    {index === 0
                      ? `${incident.lead} ${incident.delta}`
                      : index === 1
                        ? 'Correlated in incident window'
                        : 'Downstream impact confirmed'}
                  </small>
                </div>
              ))}
              <div className="evidence-arrow">
                <ArrowRight />
              </div>
              <div className="evidence-conclusion">
                <BrainCircuit />
                <span>TOP CAUSE</span>
                <strong>{incident.cause}</strong>
                <small>
                  {incident.confidence}% confidence · 3 cited hypotheses
                </small>
              </div>
            </div>
            <div className="incident-footer">
              <span>
                <GitBranch /> Deterministic run #{replayCount || 1}
              </span>
              <span>
                <BookOpen /> Every claim linked to evidence
              </span>
              <span>
                <ShieldCheck /> Human action required
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-section trust-section">
        <div className="platform-section-heading">
          <div>
            <span>WEEK 4 · EVALUATION</span>
            <h2>The AI has to earn deployment.</h2>
          </div>
          <p>
            Public numbers describe deterministic simulator checks, not
            production performance.
          </p>
        </div>
        <div className="trust-grid">
          <article>
            <FlaskConical />
            <span>SCENARIO ACCURACY</span>
            <strong>70 / 70</strong>
            <p>
              Expected root cause ranks first across seven scenarios and ten
              seeds.
            </p>
            <i>
              <b style={{ width: '100%' }} />
            </i>
          </article>
          <article>
            <BookOpen />
            <span>CITATION CONTRACT</span>
            <strong>100%</strong>
            <p>
              Hypotheses reference retrieved telemetry, events or knowledge
              records.
            </p>
            <i>
              <b style={{ width: '100%' }} />
            </i>
          </article>
          <article>
            <LockKeyhole />
            <span>SAFETY BOUNDARY</span>
            <strong>0 writes</strong>
            <p>
              The production connector exposes GET only; action calls remain
              simulated.
            </p>
            <i>
              <b style={{ width: '100%' }} />
            </i>
          </article>
          <article>
            <Activity />
            <span>TRACE COVERAGE</span>
            <strong>4 layers</strong>
            <p>
              Redfish, facility, GPU and workload evidence share one replay
              clock.
            </p>
            <i>
              <b style={{ width: '82%' }} />
            </i>
          </article>
        </div>
      </section>

      <section className="platform-section model-section">
        <div className="platform-section-heading">
          <div>
            <span>WEEK 5 · MODEL OPS</span>
            <h2>Fine-tuning with a real quality gate.</h2>
          </div>
          <p>
            LoRA and QLoRA are implemented as reproducible pipelines—not
            presented as trained models.
          </p>
        </div>
        <div className="model-pipeline">
          <article className="model-card model-live">
            <span>
              <Check /> EVALUATED
            </span>
            <BrainCircuit />
            <h3>Base model + hybrid RAG</h3>
            <p>
              Current decision engine. Structured evidence is retrieved before
              generation.
            </p>
            <small>Golden replay: 70/70</small>
          </article>
          <ArrowRight className="model-arrow" />
          <article className="model-card">
            <span>
              <Cpu /> CONFIGURED
            </span>
            <GitBranch />
            <h3>LoRA adapter</h3>
            <p>
              Rank 16 · alpha 32 · dropout 0.05. Optimized for full-precision
              training.
            </p>
            <small>Status: not trained</small>
          </article>
          <ArrowRight className="model-arrow" />
          <article className="model-card">
            <span>
              <Zap /> CONFIGURED
            </span>
            <Network />
            <h3>4-bit QLoRA</h3>
            <p>
              NF4 + double quantization for a lower-memory specialization path.
            </p>
            <small>Status: not trained</small>
          </article>
        </div>
        <div className="release-gate">
          <div>
            <TriangleAlert />
            <span>RELEASE GATE</span>
            <strong>Blocked by design</strong>
          </div>
          <div className="gate-meter">
            <span style={{ width: '0%' }} />
            <b>0 / 200 operator-approved examples</b>
          </div>
          <p>
            Synthetic cases can test the pipeline, but cannot approve an
            adapter. Operators must label, review and authorize a clean training
            split first.
          </p>
        </div>
      </section>

      <section className="platform-section source-section">
        <div className="platform-section-heading">
          <div>
            <span>PUBLIC FOUNDATION</span>
            <h2>Built on inspectable sources.</h2>
          </div>
          <p>
            Use emulators and public traces today; swap in authenticated
            data-center connectors later.
          </p>
        </div>
        <div className="source-grid">
          {SOURCES.map((source) => (
            <a
              key={source.name}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <span>{source.type}</span>
              <strong>{source.name}</strong>
              <ExternalLink />
            </a>
          ))}
        </div>
      </section>

      <footer className="platform-footer">
        <div>
          <Activity />
          <strong>RackLens AI</strong>
          <span>Flight recorder for AI data centers.</span>
        </div>
        <div>
          <a href="/">Home</a>
          <a href="/studio">3D Studio</a>
          <a
            href="https://github.com/sivalinb/racklens-ai"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */
import type { CSSProperties } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Database,
  FileCheck2,
  Gauge,
  GitBranch,
  Radio,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';

const stages = [
  {
    number: '01',
    title: 'Detect & scope',
    copy: 'Ingest Redfish events or select a deterministic incident replay.',
    icon: AlertTriangle,
    tone: 'blue',
  },
  {
    number: '02',
    title: 'Collect context',
    copy: 'Read Systems, Chassis, TelemetryService, PCIe and firmware inventory.',
    icon: Server,
    tone: 'cyan',
  },
  {
    number: '03',
    title: 'Normalize',
    copy: 'Bind every signal to data center, hall, row, rack, node and GPU.',
    icon: GitBranch,
    tone: 'green',
  },
  {
    number: '04',
    title: 'Correlate',
    copy: 'Align power, thermal, fabric, clock and event evidence in time.',
    icon: Activity,
    tone: 'orange',
  },
  {
    number: '05',
    title: 'Retrieve evidence',
    copy: 'Search reviewed Redfish guidance and operator knowledge with citations.',
    icon: Search,
    tone: 'violet',
  },
  {
    number: '06',
    title: 'Rank causes',
    copy: 'Return three competing hypotheses with evidence IDs and confidence.',
    icon: BrainCircuit,
    tone: 'pink',
  },
  {
    number: '07',
    title: 'Critic & trace',
    copy: 'Reject unsupported citations and preserve the complete decision trace.',
    icon: FileCheck2,
    tone: 'blue',
  },
] as const;

const capabilities = [
  {
    icon: Radio,
    title: 'Redfish tools',
    items: [
      'GET-only crawler',
      'Event + metric reports',
      '200-resource guardrail',
    ],
  },
  {
    icon: GitBranch,
    title: 'Signal intelligence',
    items: [
      'Vendor normalization',
      'Physical hierarchy',
      'Cross-signal timeline',
    ],
  },
  {
    icon: Search,
    title: 'RAG & evidence',
    items: ['Reviewed corpus', 'Hybrid retrieval', 'Stable citation IDs'],
  },
  {
    icon: BrainCircuit,
    title: 'Bounded reasoning',
    items: [
      'Structured hypotheses',
      'Deterministic baseline',
      'Optional model adapter',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'State & safety',
    items: [
      'Awaiting-review state',
      'No mutation tools',
      'Auditable decisions',
    ],
  },
  {
    icon: Activity,
    title: 'Observability',
    items: ['OTLP traces', 'LangSmith-ready export', 'Golden evaluations'],
  },
] as const;

const stores = [
  {
    icon: Database,
    title: 'ClickHouse telemetry',
    badge: 'OCI EDGE',
    copy: 'Raw Redfish-shaped metrics, 30-day TTL and one-minute rollups.',
  },
  {
    icon: Cloud,
    title: 'D1 public mirror',
    badge: 'PUBLIC',
    copy: 'Token-protected normalized samples and bounded evaluation summaries.',
  },
  {
    icon: FileCheck2,
    title: 'Object Storage',
    badge: 'PRIVATE',
    copy: 'Versioned full JSON evidence for every nightly 70-case evaluation.',
  },
  {
    icon: Sparkles,
    title: 'Training evidence',
    badge: 'GATED',
    copy: 'Reviewed examples and LoRA/QLoRA manifests; promotion stays blocked.',
  },
] as const;

const summary = [
  ['01', 'Observe', 'Redfish telemetry + events'],
  ['02', 'Understand', 'Normalize + correlate'],
  ['03', 'Investigate', 'Retrieve + rank causes'],
  ['04', 'Govern', 'Critic + human review'],
  ['05', 'Learn', 'Evaluate + gated tuning'],
] as const;

export function ArchitectureFlow() {
  return (
    <main className="arch-shell">
      <SiteHeader
        activePath="/architecture"
        pageLabel="Architecture"
        actions={
          <a className="arch-nav-action" href="/dashboard">
            Open live signals <ArrowRight />
          </a>
        }
      />

      <section className="arch-hero">
        <div>
          <p>
            <span /> END-TO-END REFERENCE ARCHITECTURE
          </p>
          <h1>
            From rack signal to <em>reviewed decision.</em>
          </h1>
          <small>
            Redfish + Python edge intelligence + evidence-first AI + OCI proof
            plane
          </small>
        </div>
        <aside>
          <i className="arch-live-dot" />
          <span>
            <strong>OCI-PHX-01</strong> evaluation plane connected
          </span>
          <b>GET ONLY</b>
        </aside>
      </section>

      <section className="arch-map" aria-label="RackLens architecture diagram">
        <aside className="arch-actors arch-layer">
          <div className="arch-layer-heading">
            <UserCheck />
            <span>
              <b>OPERATOR PLANE</b>
              <small>People, UI and approval</small>
            </span>
          </div>
          <article className="arch-actor-card">
            <UserCheck />
            <div>
              <strong>SRE / data-center operator</strong>
              <p>Select scope, inspect evidence, approve or reject.</p>
            </div>
          </article>
          <div className="arch-vertical-link">
            <ArrowDown />
            <i />
          </div>
          <article className="arch-actor-card accent">
            <Gauge />
            <div>
              <strong>RackLens web surfaces</strong>
              <p>3D twin, Grafana-style signals, AI traces and cloud proof.</p>
            </div>
          </article>
          <div className="arch-vertical-link">
            <ArrowDown />
            <i />
          </div>
          <article className="arch-actor-card review">
            <ShieldCheck />
            <div>
              <strong>Human review boundary</strong>
              <p>
                Recommendation and verification plan only. No production write.
              </p>
            </div>
          </article>
          <div className="arch-safety-note">
            <CheckCircle2 /> Every action-like outcome stops for review.
          </div>
        </aside>

        <div className="arch-core">
          <section className="arch-orchestrator arch-layer">
            <div className="arch-layer-heading wide">
              <Workflow />
              <span>
                <b>BOUNDED INVESTIGATION GRAPH</b>
                <small>
                  Deterministic state machine · retries · evidence gates · human
                  interrupt
                </small>
              </span>
              <em>LANGGRAPH-READY</em>
            </div>
            <div className="arch-stage-grid">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <article
                    className={`arch-stage tone-${stage.tone}`}
                    key={stage.number}
                    style={{ '--step': index } as CSSProperties}
                  >
                    <small>{stage.number}</small>
                    <Icon />
                    <strong>{stage.title}</strong>
                    <p>{stage.copy}</p>
                    {index < stages.length - 1 && (
                      <span className="arch-stage-link">
                        <ArrowRight />
                        <i />
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="arch-decision-loop">
              <article>
                <Gauge />
                <span>
                  <strong>Confidence gate</strong>
                  <small>Evidence quality + safety</small>
                </span>
              </article>
              <ArrowRight />
              <article className="human">
                <UserCheck />
                <span>
                  <strong>Human interrupt</strong>
                  <small>Approve / reject / request evidence</small>
                </span>
              </article>
              <ArrowRight />
              <article className="safe">
                <CheckCircle2 />
                <span>
                  <strong>Verification plan</strong>
                  <small>Idempotent simulated outcome</small>
                </span>
              </article>
              <span className="arch-loopback">
                REJECT / MORE EVIDENCE <i />
              </span>
            </div>
          </section>

          <section className="arch-capabilities arch-layer">
            <div className="arch-layer-heading wide green">
              <Wrench />
              <span>
                <b>AI + RELIABILITY CAPABILITY LAYER</b>
                <small>Used by every investigation stage</small>
              </span>
            </div>
            <div className="arch-capability-grid">
              {capabilities.map((capability, index) => {
                const Icon = capability.icon;
                return (
                  <article
                    key={capability.title}
                    style={{ '--step': index } as CSSProperties}
                  >
                    <Icon />
                    <strong>{capability.title}</strong>
                    <ul>
                      {capability.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="arch-integrations arch-layer">
          <div className="arch-layer-heading purple">
            <Cloud />
            <span>
              <b>SYSTEMS + TOOLS</b>
              <small>Private and public integrations</small>
            </span>
          </div>
          <article className="arch-integration-card primary">
            <Server />
            <div>
              <strong>Redfish endpoints</strong>
              <p>BMCs or DMTF emulator</p>
              <small>Systems · Chassis · Thermal · Power</small>
            </div>
            <i />
          </article>
          <article className="arch-integration-card">
            <Database />
            <div>
              <strong>ClickHouse + Grafana</strong>
              <p>Private time-series operations</p>
            </div>
            <i />
          </article>
          <article className="arch-integration-card">
            <Activity />
            <div>
              <strong>OpenTelemetry</strong>
              <p>Collector and ClickHouse traces</p>
            </div>
            <i />
          </article>
          <article className="arch-integration-card">
            <Cloud />
            <div>
              <strong>OCI evidence plane</strong>
              <p>Object Storage + Monitoring</p>
            </div>
            <i />
          </article>
          <article className="arch-integration-card dashed">
            <Sparkles />
            <div>
              <strong>LangSmith export</strong>
              <p>Optional hybrid trace destination</p>
              <small>Ready when API key is configured</small>
            </div>
            <i />
          </article>
          <div className="arch-read-path">
            <span /> READ / PUBLISH PATHS <span />
          </div>
        </aside>

        <section className="arch-data-plane arch-layer">
          <div className="arch-layer-heading orange">
            <Database />
            <span>
              <b>STATE + EVIDENCE PLANE</b>
              <small>
                Operational telemetry, public proof and model-learning artifacts
              </small>
            </span>
          </div>
          <div className="arch-store-grid">
            {stores.map((store, index) => {
              const Icon = store.icon;
              return (
                <article
                  key={store.title}
                  style={{ '--step': index } as CSSProperties}
                >
                  <Icon />
                  <div>
                    <span>
                      <strong>{store.title}</strong>
                      <b>{store.badge}</b>
                    </span>
                    <p>{store.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="arch-observe arch-layer">
          <div className="arch-layer-heading blue">
            <Activity />
            <span>
              <b>OBSERVABILITY + EVALUATION</b>
              <small>
                One trace from physical symptom to reviewed conclusion
              </small>
            </span>
          </div>
          <div className="arch-observe-grid">
            <article>
              <Radio />
              <span>
                <strong>Redfish signals</strong>
                <small>Power · thermal · health · fabric</small>
              </span>
            </article>
            <article>
              <Activity />
              <span>
                <strong>AI traces</strong>
                <small>Retrieval · reasoning · critic · review</small>
              </span>
            </article>
            <article>
              <Gauge />
              <span>
                <strong>Service metrics</strong>
                <small>Freshness · latency · errors · cost</small>
              </span>
            </article>
            <article>
              <ShieldCheck />
              <span>
                <strong>Safety audit</strong>
                <small>Decision trail · no-write assertion</small>
              </span>
            </article>
            <article>
              <FileCheck2 />
              <span>
                <strong>70-case suite</strong>
                <small>Accuracy · citations · unsafe actions</small>
              </span>
            </article>
          </div>
          <div className="arch-trace-line">
            <i />
            <i />
            <i />
            <i />
            <i />
            <span />
          </div>
        </section>
      </section>

      <section className="arch-summary">
        <div className="arch-summary-heading">
          <Zap />
          <span>
            <strong>END-TO-END FLOW</strong>
            <small>The product loop at a glance</small>
          </span>
        </div>
        <div className="arch-summary-flow">
          {summary.map(([number, title, copy], index) => (
            <div
              className="arch-summary-step"
              key={number}
              style={{ '--step': index } as CSSProperties}
            >
              <b>{number}</b>
              <span>
                <strong>{title}</strong>
                <small>{copy}</small>
              </span>
              {index < summary.length - 1 && <ArrowRight />}
            </div>
          ))}
        </div>
      </section>

      <footer className="arch-footer">
        <span>
          <i className="flow-solid" /> Control + data flow
        </span>
        <span>
          <i className="flow-dashed" /> Retrieval + optional integration
        </span>
        <span>
          <i className="flow-human" /> Human feedback loop
        </span>
        <a
          href="https://github.com/sivalinb/racklens-ai/blob/main/docs/ARCHITECTURE.md"
          target="_blank"
          rel="noreferrer"
        >
          Read the implementation map <ArrowRight />
        </a>
      </footer>
    </main>
  );
}

'use client';
/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */

import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  Database,
  ExternalLink,
  FileCheck2,
  Gauge,
  GitBranch,
  HardDrive,
  KeyRound,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type EvaluationRun = {
  runId: string;
  timestamp: number;
  provider: string;
  region: string;
  commitSha: string;
  suite: string;
  casesTotal: number;
  casesPassed: number;
  passRate: number;
  topCauseAccuracy: number;
  citationValidity: number;
  unsafeActionRate: number;
  p95LatencyMs: number;
  artifactUri: string | null;
  mode: string;
};

type EvaluationPayload = {
  cloudConnected: boolean;
  latest: EvaluationRun | null;
  runs: EvaluationRun[];
  source: { engine: string; api: string; ingestApi: string };
};

const fallbackRun: EvaluationRun = {
  runId: 'racklens-local-baseline-v1',
  timestamp: Date.now(),
  provider: 'racklens-local-ci',
  region: 'not-connected',
  commitSha: 'baseline',
  suite: 'golden-redfish-v1',
  casesTotal: 70,
  casesPassed: 70,
  passRate: 1,
  topCauseAccuracy: 1,
  citationValidity: 1,
  unsafeActionRate: 0,
  p95LatencyMs: 4,
  artifactUri:
    'https://github.com/sivalinb/racklens-ai/blob/main/docs/EVALUATION.md',
  mode: 'deterministic-baseline',
};

const weeks = [
  {
    week: '01',
    title: 'Instrument',
    body: 'GET-only Redfish collection, EventService correlation and normalized ClickHouse time series.',
    proof: 'Signal freshness + source URIs',
    icon: Activity,
  },
  {
    week: '02',
    title: 'Contextualize',
    body: 'Versioned runbooks, replay payloads and evidence packs retained in private Object Storage.',
    proof: 'Recall@5 + citation validity',
    icon: Database,
  },
  {
    week: '03',
    title: 'Reason',
    body: 'A bounded investigator calls deterministic tools and returns three ranked, cited hypotheses.',
    proof: 'Top-cause accuracy + tool contract',
    icon: BrainCircuit,
  },
  {
    week: '04',
    title: 'Evaluate',
    body: 'A nightly OCI timer replays 70 cases and publishes quality, latency and safety evidence.',
    proof: 'Regression gates + OTel traces',
    icon: FileCheck2,
  },
] as const;

const resources = [
  ['Ampere A1', '2 OCPU · 12 GB', 'Collector, API and evaluators', Server],
  ['Block storage', '100 GB configured', 'ClickHouse raw + rollups', HardDrive],
  ['Object Storage', 'Private bucket', 'Datasets and eval artifacts', Database],
  [
    'Instance principal',
    'No API key on disk',
    'Object and metric publishing',
    KeyRound,
  ],
] as const;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function CloudLab() {
  const [payload, setPayload] = useState<EvaluationPayload | null>(null);
  const [sourceState, setSourceState] = useState<
    'loading' | 'live' | 'fallback'
  >('loading');

  const load = () => {
    setSourceState('loading');
    fetch('/api/evaluations/latest', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('evaluation registry unavailable');
        return (await response.json()) as EvaluationPayload;
      })
      .then((data) => {
        setPayload(data);
        setSourceState('live');
      })
      .catch(() => setSourceState('fallback'));
  };

  useEffect(load, []);
  const latest = payload?.latest ?? fallbackRun;
  const cloudConnected = payload?.cloudConnected ?? false;

  return (
    <main className="cloud-shell">
      <header className="cloud-nav">
        <a href="/" className="cloud-brand" aria-label="RackLens home">
          <span>
            <Cloud />
          </span>
          <div>
            <strong>RackLens</strong>
            <small>OCI RELIABILITY LAB</small>
          </div>
        </a>
        <nav aria-label="Cloud lab navigation">
          <a href="/studio">3D Studio</a>
          <a href="/dashboard">Redfish Dashboard</a>
          <a href="/ai-observability">AI Observability</a>
          <a href="/platform">Product Lab</a>
          <a href="/architecture">Architecture</a>
        </nav>
        <a
          className="cloud-github"
          href="https://github.com/sivalinb/racklens-ai/tree/main/infra/oci"
          target="_blank"
          rel="noreferrer"
        >
          <Code2 /> Deployment source <ExternalLink />
        </a>
      </header>

      <section className="cloud-hero">
        <div className="cloud-hero-copy">
          <span className="cloud-kicker">
            <i /> OCI ALWAYS FREE · EVIDENCE PLANE
          </span>
          <h1>A real cloud backend for every reliability claim.</h1>
          <p>
            RackLens keeps Redfish access at the edge, persists infrastructure
            signals in ClickHouse, runs a frozen evaluation suite nightly and
            publishes only bounded evidence to the public product.
          </p>
          <div className="cloud-hero-actions">
            <a href="/api/evaluations/latest" target="_blank">
              Open evaluation API <ArrowRight />
            </a>
            <a href="#architecture">
              Inspect architecture <ChevronRight />
            </a>
          </div>
          <div className="cloud-guardrails">
            <span>
              <ShieldCheck /> Zero Redfish writes
            </span>
            <span>
              <KeyRound /> No secrets in browser
            </span>
            <span>
              <TimerReset /> Nightly regression gate
            </span>
          </div>
        </div>

        <div className="cloud-live-card">
          <header>
            <div>
              <span className={cloudConnected ? 'connected' : 'ready'} />
              <strong>
                {cloudConnected ? 'OCI CONNECTED' : 'READY FOR OCI'}
              </strong>
            </div>
            <button onClick={load} aria-label="Refresh OCI evaluation status">
              <RefreshCw
                className={sourceState === 'loading' ? 'spinning' : ''}
              />
            </button>
          </header>
          <div className="cloud-live-source">
            <span>Evaluation source</span>
            <strong>{latest.provider}</strong>
            <small>
              {cloudConnected
                ? `${latest.region} · ${latest.mode}`
                : 'Local baseline shown until OCI publishes its first run'}
            </small>
          </div>
          <div
            className="cloud-score-ring"
            style={
              { '--score': `${latest.passRate * 100}%` } as React.CSSProperties
            }
          >
            <div>
              <strong>{percent(latest.passRate)}</strong>
              <span>EVAL PASS</span>
            </div>
          </div>
          <div className="cloud-live-meta">
            <span>
              <b>
                {latest.casesPassed}/{latest.casesTotal}
              </b>{' '}
              cases
            </span>
            <span>
              <b>{latest.commitSha.slice(0, 8)}</b> commit
            </span>
            <span>
              <b>{latest.suite}</b> suite
            </span>
          </div>
        </div>
      </section>

      <section className="cloud-metrics" aria-label="Latest evaluation metrics">
        <article>
          <span>
            <Gauge /> Top-cause accuracy
          </span>
          <strong>{percent(latest.topCauseAccuracy)}</strong>
          <i style={{ width: percent(latest.topCauseAccuracy) }} />
        </article>
        <article>
          <span>
            <FileCheck2 /> Citation validity
          </span>
          <strong>{percent(latest.citationValidity)}</strong>
          <i style={{ width: percent(latest.citationValidity) }} />
        </article>
        <article>
          <span>
            <ShieldCheck /> Unsafe action rate
          </span>
          <strong>{percent(latest.unsafeActionRate)}</strong>
          <i className="safe" style={{ width: '100%' }} />
        </article>
        <article>
          <span>
            <TimerReset /> P95 evaluation latency
          </span>
          <strong>{latest.p95LatencyMs} ms</strong>
          <i style={{ width: `${Math.min(100, latest.p95LatencyMs / 80)}%` }} />
        </article>
      </section>

      <section className="cloud-architecture" id="architecture">
        <header>
          <span>DEPLOYMENT TOPOLOGY</span>
          <h2>Private data plane. Public proof plane.</h2>
          <p>
            The browser never reaches ClickHouse or a BMC. OCI sends normalized
            telemetry and evaluation summaries outbound through authenticated
            HTTPS.
          </p>
        </header>
        <div className="cloud-flow">
          <article>
            <Server />
            <span>AUTHORIZED EDGE</span>
            <strong>Redfish BMC or simulator</strong>
            <small>GET + EventService only</small>
          </article>
          <i>
            <ArrowRight />
          </i>
          <article>
            <Database />
            <span>OCI A1</span>
            <strong>Collector + ClickHouse</strong>
            <small>Raw signals + 1m rollups</small>
          </article>
          <i>
            <ArrowRight />
          </i>
          <article>
            <BrainCircuit />
            <span>EVALUATION PLANE</span>
            <strong>Agent + 70 frozen cases</strong>
            <small>Quality, safety and latency</small>
          </article>
          <i>
            <ArrowRight />
          </i>
          <article>
            <Network />
            <span>HTTPS EGRESS</span>
            <strong>Token-protected ingest</strong>
            <small>1–1000 samples per batch</small>
          </article>
          <i>
            <ArrowRight />
          </i>
          <article>
            <Cloud />
            <span>PUBLIC PRODUCT</span>
            <strong>RackLens dashboards</strong>
            <small>D1 registry + source links</small>
          </article>
        </div>
      </section>

      <section className="cloud-week-section">
        <header>
          <span>WEEKS 1–4 · DEMONSTRABLE OUTCOMES</span>
          <h2>One product story, four measurable layers.</h2>
        </header>
        <div className="cloud-week-grid">
          {weeks.map((week) => {
            const Icon = week.icon;
            return (
              <article key={week.week}>
                <div>
                  <b>{week.week}</b>
                  <Icon />
                </div>
                <h3>{week.title}</h3>
                <p>{week.body}</p>
                <span>
                  <CheckCircle2 /> {week.proof}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="cloud-lower-grid">
        <div className="cloud-resource-panel">
          <header>
            <span>ALWAYS FREE FOOTPRINT</span>
            <h2>Deliberately small. Operationally complete.</h2>
          </header>
          <div>
            {resources.map(([name, size, role, Icon]) => (
              <article key={name}>
                <Icon />
                <div>
                  <strong>{name}</strong>
                  <span>{role}</span>
                </div>
                <b>{size}</b>
              </article>
            ))}
          </div>
        </div>
        <div className="cloud-proof-panel">
          <span>PORTFOLIO PROOF</span>
          <h2>What this deployment demonstrates</h2>
          <ul>
            <li>
              <CheckCircle2 /> Hardware observability across power, thermal, GPU
              and fabric domains
            </li>
            <li>
              <CheckCircle2 /> Cloud infrastructure as code with a
              least-privilege instance identity
            </li>
            <li>
              <CheckCircle2 /> Evidence-grounded AI with deterministic baselines
              and release gates
            </li>
            <li>
              <CheckCircle2 /> OpenTelemetry and LangSmith-shaped trace
              correlation
            </li>
            <li>
              <CheckCircle2 /> Cost-aware engineering that stays inside an
              Always Free envelope
            </li>
          </ul>
          <div>
            <a
              href="https://github.com/sivalinb/racklens-ai"
              target="_blank"
              rel="noreferrer"
            >
              <GitBranch /> Review implementation <ExternalLink />
            </a>
            <a href="/ai-observability">
              Open AI observability <ArrowRight />
            </a>
          </div>
        </div>
      </section>

      <footer className="cloud-footer">
        <span>RackLens OCI Reliability Lab</span>
        <span>
          {sourceState === 'live'
            ? 'Evaluation registry available'
            : 'Local fallback active'}
        </span>
        <span>Production writes: 0</span>
      </footer>
    </main>
  );
}

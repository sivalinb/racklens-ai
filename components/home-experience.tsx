/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Network,
  Server,
  ShieldCheck,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';

const rackUnits = Array.from({ length: 7 });

function MiniRack({ label, hot = false }: { label: string; hot?: boolean }) {
  return (
    <div className={`home-mini-rack ${hot ? 'home-mini-rack-hot' : ''}`}>
      <div className="home-tor">
        <Network />
        <span>ToR</span>
        <i />
        <i />
      </div>
      <div className="home-rack-units" aria-hidden="true">
        {rackUnits.map((_, index) => (
          <div className="home-rack-unit" key={index}>
            <span className={`home-led home-led-${(index % 3) + 1}`} />
            <span className={`home-led home-led-${((index + 1) % 3) + 1}`} />
            <b />
            <i />
          </div>
        ))}
      </div>
      <strong>{label}</strong>
      <small>8 nodes · 64 GPUs</small>
    </div>
  );
}

export function HomeExperience() {
  return (
    <main className="home-shell">
      <header className="home-nav">
        <a className="brand-mark" href="/" aria-label="RackLens AI home">
          <span className="brand-pulse">
            <Activity />
          </span>
          <div>
            <strong>RackLens</strong>
            <small>AI Reliability Studio</small>
          </div>
        </a>
        <nav aria-label="Home navigation">
          <a href="/dashboard">Observability</a>
          <a href="/ai-observability">AI Observability</a>
          <a href="/cloud-lab">OCI Cloud Lab</a>
          <a href="/platform">Product lab</a>
          <a href="#workflow">How it works</a>
          <a href="#safety">Safety</a>
        </nav>
        <a className="home-nav-cta" href="/studio">
          Launch live studio <ArrowRight />
        </a>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-kicker">
            <span /> REDFISH + GPU + AI RELIABILITY
          </div>
          <h1>
            Know why the rack is drifting <em>before</em> the job fails.
          </h1>
          <p>
            RackLens turns BMC, thermal, power, fabric and workload signals into
            one shared timeline—then gives operators three evidence-backed
            causes to review.
          </p>
          <div className="home-actions">
            <a className="home-primary" href="/studio">
              Explore the incident replay <ArrowRight />
            </a>
            <a className="home-secondary" href="#workflow">
              See how evidence flows <ChevronRight />
            </a>
          </div>
          <div className="home-trust-row">
            <span>
              <CheckCircle2 /> Read-only Redfish
            </span>
            <span>
              <CheckCircle2 /> Human release gate
            </span>
            <span>
              <CheckCircle2 /> Every claim cited
            </span>
          </div>
        </div>

        <div
          className="home-system-map"
          aria-label="Animated RackLens signal journey from racks to an evidence-backed decision"
        >
          <div className="home-map-topline">
            <span>
              <i /> INCIDENT REPLAY · DEN-01
            </span>
            <b>14:32:08 UTC</b>
          </div>
          <div className="home-map-body">
            <div className="home-physical-stage">
              <div className="home-air home-air-cold">
                <Wind />
                <span>COLD INLET</span>
                <i />
                <i />
                <i />
              </div>
              <div className="home-rack-pair">
                <MiniRack label="R01" />
                <MiniRack label="R02" hot />
              </div>
              <div className="home-air home-air-hot">
                <i />
                <i />
                <i />
                <span>HOT EXHAUST</span>
                <Wind />
              </div>
            </div>
            <div className="home-signal-rail" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="home-intelligence-stage">
              <div className="home-stage-label">
                <BrainCircuit />
                <span>RackLens correlation engine</span>
                <b>LIVE</b>
              </div>
              <div className="home-signal-cards">
                <div>
                  <Thermometer />
                  <span>Thermal</span>
                  <strong>+5.6°C</strong>
                </div>
                <div>
                  <Zap />
                  <span>Power</span>
                  <strong>34.7 kW</strong>
                </div>
                <div>
                  <Network />
                  <span>Fabric</span>
                  <strong>7.8 Tb/s</strong>
                </div>
              </div>
              <div className="home-timeline">
                <span />
                <span />
                <span />
                <span />
                <i />
              </div>
              <div className="home-correlation">
                <Database />
                <p>
                  Inlet rise leads clock loss by <strong>94 seconds</strong>
                </p>
              </div>
            </div>
            <div className="home-signal-rail" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="home-decision-stage">
              <span className="home-ai-label">
                <Cpu /> AI INVESTIGATION
              </span>
              <h2>Cooling-path imbalance</h2>
              <div className="home-confidence">
                <span>Confidence</span>
                <strong>91%</strong>
              </div>
              <div className="home-confidence-track">
                <i />
              </div>
              <ol>
                <li>
                  <b>01</b> Cooling imbalance
                </li>
                <li>
                  <b>02</b> Fan-zone degradation
                </li>
                <li>
                  <b>03</b> Workload saturation
                </li>
              </ol>
              <div className="home-human-gate">
                <ShieldCheck />
                <span>Awaiting human review</span>
              </div>
            </div>
          </div>
          <div className="home-map-footer">
            <span>
              <i /> 18 signals aligned
            </span>
            <span>3 hypotheses</span>
            <span>0 production writes</span>
          </div>
        </div>
      </section>

      <section className="home-proof" aria-label="Product results">
        <div>
          <strong>256</strong>
          <span>GPUs mapped</span>
        </div>
        <div>
          <strong>94s</strong>
          <span>leading indicator found</span>
        </div>
        <div>
          <strong>70/70</strong>
          <span>evaluation cases</span>
        </div>
        <div>
          <strong>0</strong>
          <span>autonomous writes</span>
        </div>
      </section>

      <section className="home-platform" id="platform">
        <div className="home-section-heading">
          <span>ONE INCIDENT · EVERY LAYER</span>
          <h2>A rack is a system, not a sensor.</h2>
          <p>
            See physical airflow, electrical demand, GPU interconnect health and
            workload impact together—without flattening away the evidence.
          </p>
        </div>
        <div className="home-capability-grid">
          <article>
            <span>
              <Server />
            </span>
            <small>01 · PHYSICAL</small>
            <h3>Rack-aware observability</h3>
            <p>
              Model racks, nodes, GPUs, top-of-rack switches and
              inlet-to-exhaust airflow as one operating envelope.
            </p>
            <b>Redfish Systems + Chassis</b>
          </article>
          <article>
            <span>
              <Activity />
            </span>
            <small>02 · TEMPORAL</small>
            <h3>Shared-timeline correlation</h3>
            <p>
              Align thermal, power, traffic, clock and event data to expose
              which signal moved first.
            </p>
            <b>Telemetry + workload traces</b>
          </article>
          <article>
            <span>
              <BrainCircuit />
            </span>
            <small>03 · DECISION</small>
            <h3>Evidence before inference</h3>
            <p>
              Rank three competing explanations, cite every observation and let
              an operator make the final call.
            </p>
            <b>AI + citation critic</b>
          </article>
        </div>
      </section>

      <section className="home-workflow" id="workflow">
        <div className="home-section-heading">
          <span>FROM SIGNAL TO SAFE DECISION</span>
          <h2>Five stages. One auditable path.</h2>
        </div>
        <div className="home-workflow-track">
          {[
            ['01', 'Collect', 'Read Redfish inventory, events and metrics'],
            ['02', 'Unify', 'Normalize rack, GPU and workload signals'],
            ['03', 'Correlate', 'Find timing, topology and peer relationships'],
            ['04', 'Investigate', 'Rank three evidence-cited hypotheses'],
            ['05', 'Review', 'Hold every recommendation for a person'],
          ].map(([n, title, text]) => (
            <article key={n}>
              <b>{n}</b>
              <i />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-safety" id="safety">
        <div>
          <ShieldCheck />
          <span>BUILT FOR OPERATOR TRUST</span>
        </div>
        <h2>
          AI can explain the evidence.
          <br />
          Only a human releases the action.
        </h2>
        <p>
          The public studio is a deterministic replay. The Python service uses
          read-only Redfish collection and deliberately implements no production
          hardware writes.
        </p>
        <a href="/studio">
          Open the reliability studio <ArrowRight />
        </a>
        <a href="/platform">
          Explore the five-week product <ArrowRight />
        </a>
      </section>

      <footer className="home-footer">
        <div className="brand-mark">
          <span className="brand-pulse">
            <Activity />
          </span>
          <div>
            <strong>RackLens AI</strong>
            <small>Evidence-first reliability intelligence</small>
          </div>
        </div>
        <p>Python-first · Redfish-native · Human-controlled</p>
        <a href="/platform">
          Product lab <ChevronRight />
        </a>
        <a
          href="https://github.com/sivalinb/racklens-ai"
          target="_blank"
          rel="noreferrer"
        >
          View source <ChevronRight />
        </a>
      </footer>
    </main>
  );
}

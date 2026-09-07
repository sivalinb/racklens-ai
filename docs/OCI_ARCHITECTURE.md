# OCI proof-plane architecture

## Data flow

```text
Private Redfish / deterministic simulator
               │ GET only
               ▼
        Python edge collector ─────► ClickHouse ─────► Grafana
               │                         ▲                │
               │                         │ OTLP           │ Bastion tunnel
               ├──── normalized data ─► OTel collector ───┘
               │
               ├──── nightly 70-case evaluator
               │              ├──► private OCI Object Storage artifact
               │              └──► OCI Monitoring quality metrics
               │
               └──── outbound HTTPS summaries ─► Sites + D1 public proof plane
```

The public application never connects to ClickHouse, Grafana, a BMC, or OCI credentials. Its D1-backed APIs accept bounded normalized batches only when a deployment secret matches. A failure to receive an OCI run leaves the page in `READY FOR OCI`; it never converts replay data into a cloud claim.

## Threat model and controls

| Risk | Control |
| --- | --- |
| Public BMC compromise | No inbound BMC access; collector runs at the trusted edge and uses GET only |
| OCI credential leakage | Instance principal; no OCI API key in the VM, repo, browser, or Terraform variables |
| Database/admin exposure | ClickHouse, Grafana, OTLP, and FastAPI bind to loopback; access is via time-limited Bastion session |
| Forged portfolio evidence | Private full artifacts, commit SHA, immutable run ID, source link, and a token-protected hosted summary |
| Autonomous unsafe action | No Redfish mutation method exists; each case must remain `awaiting_review`; unsafe-action rate is a release metric |
| Cost surprise | Always Free-sized A1/boot/object footprint and optional $1/$5 budget alerts; no paid managed services |
| Secret in infrastructure state | Post-provision interactive secret setup writes `/etc/racklens/racklens.env` mode `0600` |

## Weeks 1–5 mapped to a real product

| Week | OCI-backed product proof | Measured result |
| --- | --- | --- |
| 1 — Instrument | Redfish normalizer and continuous simulator/collector on A1; ClickHouse target dimensions and source URIs | Freshness, schema coverage, collection latency |
| 2 — Contextualize | Evidence packs and replay artifacts in private versioned Object Storage | Citation validity and retrieval provenance |
| 3 — Reason | Bounded investigation graph with deterministic tools and human review state | Correct incident family and tool-contract adherence |
| 4 — Evaluate | Nightly systemd timer, 70 golden cases, OCI custom metrics, full JSON/JSONL evidence | Pass rate, top-cause accuracy, citation validity, unsafe-action rate, P95 latency |
| 5 — Specialize | Operator-reviewed datasets exported from the evidence plane; LoRA/QLoRA remains gated until review threshold | Challenger-versus-baseline comparison; no unearned “trained” claim |

OCI adds portfolio value because the repository, infrastructure plan, running system, cloud identity, stored evidence, and public scorecard form one verifiable chain. It demonstrates platform judgment—not merely a dashboard screenshot—including cost constraints, access boundaries, operational telemetry, AI evaluation, and explicit model-release safety.

# RackLens AI

**See the rack. Follow the evidence.**

RackLens AI is a Python-first reliability intelligence studio for AI infrastructure. It correlates Redfish hardware telemetry with GPU, network, power, thermal, and workload signals; produces three evidence-cited hypotheses; and stops at a human review boundary before any action-like recommendation.

**Live demo:** [racklens-ai.siva-babu.chatgpt.site](https://racklens-ai.siva-babu.chatgpt.site)

**Product lab:** [racklens-ai.siva-babu.chatgpt.site/platform](https://racklens-ai.siva-babu.chatgpt.site/platform)

**AI observability:** [racklens-ai.siva-babu.chatgpt.site/ai-observability](https://racklens-ai.siva-babu.chatgpt.site/ai-observability)

> The public website persists live Redfish-shaped demo telemetry and AI traces in a server-side time-series store, with an explicit replay fallback. The Python edge service can collect from an authorized Redfish endpoint and send batches to ClickHouse or the hosted ingestion API. No Redfish write operation is implemented.

## Product experience

The dashboard provides:

- Narrative product homepage with an animated rack-to-evidence signal journey
- Five-week interactive product lab spanning Redfish, RAG, agents, evaluation, and model specialization
- Filterable map of 12 Redfish read, event, and guarded-action capabilities
- Filterable 3D digital twin spanning data center, data hall, row, and rack views
- Interactive four-rack floor with 32 nodes and 256 simulated GPUs
- Enlarged rack cabinets with redundant top-of-rack switches, activity LEDs, and inlet-to-exhaust airflow
- Eight-GPU/NVSwitch topology with moving traffic packets
- Grafana-style Redfish signal explorer that follows the selected rack or GPU
- Dedicated `/dashboard` observability workspace with data-center, hall, row,
  rack, node, GPU, time-range, replay, and refresh controls
- Dedicated `/ai-observability` workspace for LangSmith-shaped traces, nested
  runs, tool latency, token cost, RAG quality, online evaluations, safety gates,
  and Redfish-to-AI incident correlation
- Interactive five-week learning checklist that moves from Redfish collection
  through evidence/RAG, bounded agents, LangSmith evaluation, and LoRA/QLoRA
  release gating, with a product proof link for every week
- Downloadable, deterministic AI-observability source at
  `/data/langsmith-observability.json`, linked from every AI dashboard view
- Persistent hosted telemetry APIs at `/api/telemetry/query` and
  `/api/observability/traces`, with freshness, source mode, and safe fallback
- Token-protected `/api/telemetry/ingest` batches for an authorized edge collector
- ClickHouse, OpenTelemetry Collector, and Grafana Compose stack for a production-shaped lab
- 42 selected-target Redfish and OEM measurements with searchable provenance,
  legends, thresholds, heatmaps, events, and status rollups
- Power, thermal, health, fabric, threshold, source URI, and event-stream panels
- Shared power, thermal, fabric-traffic, and clock timeline
- Cooling, power-cap, PCIe, firmware, NVLink, certificate, and healthy scenarios
- Evidence-backed AI investigation with competing hypotheses
- Human recommendation review and an explicit no-write safety boundary
- Responsive layout and reduced-motion accessibility

## Architecture

```text
Redfish BMC / DMTF emulator
  ├─ Systems + Chassis inventory
  ├─ TelemetryService metric reports
  ├─ EventService events
  └─ Firmware inventory
             │
             ▼
Python collector → normalizer → D1 / ClickHouse time-series store
             │                    │
             │                    ├─ OTLP → ClickHouse / LangSmith
             │                    └─ query API → dashboards
             ▼
signal correlation → GPU / fabric / power / thermal evidence
             │
             ▼
Local hybrid RAG → three hypotheses → citation critic
             │                    │
             │                    └─ LangSmith-shaped traces + feedback
             │
             ▼
Human review → verification plan (no production write)
             │
             ▼
Golden replay lab → operator-reviewed dataset → LoRA / QLoRA release gate
```

The default agent is deterministic so evaluation is reproducible. An optional OpenAI-compatible adapter supports Fireworks, Mistral, Ollama/Qwen, or another compatible provider through environment variables.

## Python quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

racklens investigate cooling_imbalance
racklens capabilities
racklens evaluate
racklens model-ops
racklens build-training-dataset training-data
racklens collect-redfish --interval 30
uvicorn racklens.api:app --reload
```

Open `http://localhost:8000/docs` for the generated API explorer.

### Connect an authorized Redfish service

```bash
export REDFISH_BASE_URL="https://your-bmc"
export REDFISH_USERNAME="readonly-observer"
export REDFISH_PASSWORD="your-local-secret"
```

The included collector issues only `GET` requests. Start development safely with the [DMTF Redfish Interface Emulator](https://github.com/DMTF/Redfish-Interface-Emulator).

### Optional local AI model

```bash
export RACKLENS_LLM_BASE_URL="http://localhost:11434/v1"
export RACKLENS_LLM_API_KEY="ollama"
export RACKLENS_LLM_MODEL="qwen3:4b"
```

Provider mode must return exactly three hypotheses with valid evidence IDs. Missing or invalid citations fail the investigation contract.

## Web development

```bash
npm install
npm run dev
npm run build
```

## API

| Endpoint                               | Purpose                                |
| -------------------------------------- | -------------------------------------- |
| `GET /api/health`                      | Service and safety status              |
| `GET /api/scenarios`                   | Available deterministic incidents      |
| `GET /api/redfish/capabilities`        | Redfish capability and safety matrix   |
| `GET /api/model-ops`                   | Adapter configuration and release gate |
| `GET /api/telemetry/query`             | Query normalized stored measurements   |
| `POST /api/telemetry/ingest`           | Ingest a bounded metric batch           |
| `GET /api/fleet/{scenario}`            | Complete Redfish-shaped fleet snapshot |
| `GET /api/events/{scenario}`           | Server-Sent Events telemetry replay    |
| `POST /api/investigations/{scenario}`  | Evidence-first investigation           |
| `POST /api/investigations/{id}/review` | Record human approval or rejection     |

## Evaluation

`racklens evaluate` runs 70 cases—10 variations across seven scenarios. Every case requires:

- Exactly three ranked hypotheses
- All evidence citations to resolve to collected evidence
- Correct top-ranked incident family
- An `awaiting_review` state
- No production write

The unit suite additionally validates topology size, scenario isolation, safe human review, source-linked retrieval, and invalid-state handling.

## Week 1–5 product map

| Week | Operator product        | Core technology                                | Release evidence                    |
| ---- | ----------------------- | ---------------------------------------------- | ----------------------------------- |
| 1    | Redfish Capability Map  | DMTF resources, discovery, GET-only collection | Schema coverage and safe access     |
| 2    | Cited Incident Timeline | Hybrid RAG and structured evidence retrieval   | Every claim resolves to evidence    |
| 3    | Reliability Copilot     | Tool-using investigation stages                | Three ranked causes and human gate  |
| 4    | Replay & Evaluation Lab | Deterministic scenarios and traces             | 70/70 checked-in golden cases       |
| 5    | Adapter Foundry         | PEFT LoRA and 4-bit QLoRA                      | Blocked until 200 reviewed examples |

The optional training stack is installed with `pip install -e '.[training]'`. The repository implements dataset export and both training paths, but does not ship or claim a trained adapter. See [Model operations](docs/MODEL_OPS.md).

## Honest boundaries

- The public site persists Redfish-shaped simulator data; attaching a real BMC still requires an authorized edge collector and hosted ingest token.
- The AI observability page persists OTel-shaped demo trace summaries and uses
  a labeled detailed replay; it does not claim a live LangSmith connection.
- The simulator uses generic `H100 SXM` labels for a realistic AI-rack demonstration; no vendor-specific management extension is claimed.
- Recommendations are decision support, not autonomous remediation.
- Real deployment requires least-privilege BMC accounts, TLS verification, secrets management, network isolation, access control, audit retention, and operator validation.
- Evaluation results apply to the checked-in scenarios, not every hardware failure.

## Authoritative references

- [DMTF Redfish standard](https://www.dmtf.org/standards/redfish)
- [Redfish specification](https://redfish.dmtf.org/schemas/DSP0266_1.20.1.html)
- [Redfish Telemetry white paper](https://www.dmtf.org/sites/default/files/standards/documents/DSP2051_1.0.1.pdf)
- [DMTF Redfish Interface Emulator](https://github.com/DMTF/Redfish-Interface-Emulator)
- [DMTF Redfish Service Validator](https://github.com/DMTF/Redfish-Service-Validator)
- [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts)

See [Live telemetry and free-cloud deployment](docs/LIVE_TELEMETRY.md) for the complete ClickHouse, OpenTelemetry, Grafana, hosted ingestion, and LangSmith setup.

# Architecture and design decisions

## Why Redfish

Redfish provides the resource model connecting physical systems, chassis, thermal and power measurements, events, firmware inventory, and telemetry reports. RackLens preserves resource paths and timestamps so signals can be correlated without losing their physical origin.

## Investigation stages

1. **Collect:** Read the service root, systems, chassis, telemetry, events, and firmware inventory.
2. **Normalize:** Convert vendor payloads into common rack, node, GPU, metric, and event records.
3. **Correlate:** Align power, temperature, traffic, clock, and event evidence by resource and time.
4. **Retrieve:** Search reviewed DMTF/operator knowledge and attach stable citation IDs.
5. **Reason:** Produce three ranked causes instead of a single premature conclusion.
6. **Critic:** Reject hypotheses containing unknown evidence IDs.
7. **Review:** Save a human decision and verification plan. No write action is executed.

## Data modes

| Mode                 | Telemetry                  | Reasoning               | Intended use                     |
| -------------------- | -------------------------- | ----------------------- | -------------------------------- |
| Deterministic replay | Python simulator           | Evidence rules          | Public demo, tests, CI           |
| Live read-only       | Authorized Redfish service | Evidence rules          | Lab and operator validation      |
| Optional model       | Replay or live             | OpenAI-compatible model | Structured hypothesis comparison |

## Five-layer product architecture

| Layer          | Product surface         | Implementation                                                      |
| -------------- | ----------------------- | ------------------------------------------------------------------- |
| Signal         | Redfish Capability Map  | Capability catalog, GET-only client, event replay, simulator        |
| Evidence       | Cited Incident Timeline | Normalized evidence IDs and hybrid structured/text retrieval        |
| Decision       | Reliability Copilot     | Collect, retrieve, reason, critic, trace, human-review stages       |
| Trust          | Replay & Evaluation Lab | Seven scenario families, deterministic variation, citation contract |
| Specialization | Adapter Foundry         | Versioned data export, LoRA/QLoRA configs, blocked promotion gate   |

The browser product lab mirrors these layers at `/platform`. Static JSON manifests under `public/data/` make the capability and model-ops claims directly inspectable.

## Signal observability surface

The studio signal explorer follows the currently selected rack or GPU. Rack panels cover chassis power, power caps, supply voltage/current, inlet/exhaust temperature, fans, aggregate health, events, logs, top-of-rack traffic, and link errors. GPU panels cover PCIeDevice status and interface health plus optional OEM MetricReport values for board power, temperatures, clocks, utilization, and fabric throughput. Every chart exposes its Redfish resource URI and distinguishes standard resources from optional OEM telemetry.

## Safety boundary

The Redfish client exposes `GET` only. UpdateService firmware inventory is readable, while reset, power control, configuration, firmware installation, composition, and virtual-media writes are outside the production connector. Guarded actions appear only as simulated capabilities. Approval records that a recommendation was reviewed; it does not turn the recommendation into an action.

## Model specialization boundary

The Week 5 pipeline exports synthetic, provenance-tagged instruction records into train, validation, and test splits. LoRA and 4-bit QLoRA use PEFT configurations with rank 16, alpha 32, and dropout 0.05. Promotion stays blocked until at least 200 operator-reviewed examples exist and a candidate beats the base-plus-RAG system on held-out accuracy, citation validity, safety, and latency. Synthetic replay data alone cannot clear this gate.

## Production extension points

- Pinecone for a larger reviewed operations corpus
- Neo4j for rack, firmware, GPU, fabric, and workload dependency graphs
- LangGraph for durable checkpoints and resumable multi-agent orchestration
- LangSmith or OpenTelemetry for hosted trace inspection
- Prometheus/Grafana for long-term time-series operations
- Vendor-specific GPU telemetry adapters kept separate from the Redfish standard model

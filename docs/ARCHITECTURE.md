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

| Mode | Telemetry | Reasoning | Intended use |
|---|---|---|---|
| Deterministic replay | Python simulator | Evidence rules | Public demo, tests, CI |
| Live read-only | Authorized Redfish service | Evidence rules | Lab and operator validation |
| Optional model | Replay or live | OpenAI-compatible model | Structured hypothesis comparison |

## Safety boundary

The Redfish client exposes `GET` only. `UpdateService`, reset, power control, configuration, and virtual-media writes are outside the implementation. Approval records that a recommendation was reviewed; it does not turn the recommendation into an action.

## Production extension points

- Pinecone for a larger reviewed operations corpus
- Neo4j for rack, firmware, GPU, fabric, and workload dependency graphs
- LangGraph for durable checkpoints and resumable multi-agent orchestration
- LangSmith or OpenTelemetry for hosted trace inspection
- Prometheus/Grafana for long-term time-series operations
- Vendor-specific GPU telemetry adapters kept separate from the Redfish standard model

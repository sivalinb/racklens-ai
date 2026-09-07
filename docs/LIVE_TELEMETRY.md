# Live telemetry and free-cloud deployment

RackLens has two deployable data paths that share the same normalized contract.

1. The public Sites deployment uses a persistent Cloudflare D1 store and same-origin query APIs. It generates Redfish-shaped demo samples when no edge collector is attached, and labels that mode explicitly.
2. The production-shaped local/cloud stack uses ClickHouse, an OpenTelemetry Collector, Grafana, the Python edge collector, and the RackLens FastAPI service.

The browser never receives database or BMC credentials. Redfish BMCs stay on the private management network; an edge collector reads them with a least-privilege account and pushes normalized batches outbound over HTTPS.

## Public API contract

| Endpoint | Purpose |
| --- | --- |
| `GET /api/telemetry/query` | Filtered, downsample-ready time-series data plus source and freshness metadata |
| `POST /api/telemetry/ingest` | Token-protected batch ingestion, limited to 1–1000 samples |
| `GET /api/observability/traces` | Persistent AI trace summaries with LangSmith/OTLP correlation fields |
| `GET /api/evaluations/latest` | Latest local/OCI evaluation result, history, provenance, and connection state |
| `POST /api/evaluations/ingest` | Token-protected evaluation summary from the OCI evidence plane |

External ingestion is disabled until `RACKLENS_INGEST_TOKEN` is configured in the hosted environment. The public simulator can populate the D1 store without granting any hardware write capability.

When both `CLICKHOUSE_URL` and the hosted URL/token are present, the collector fans each bounded batch to both stores. Use `racklens simulate-telemetry --once` for one full Redfish-shaped rack pass or omit `--once` for a continuous feed.

## Run the ClickHouse product stack

```bash
docker compose -f infra/docker-compose.yml up -d
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev,observability]'
export CLICKHOUSE_URL=http://localhost:8123
export CLICKHOUSE_PASSWORD=racklens-local
uvicorn racklens.api:app --reload
```

Grafana is available at `http://localhost:3001`, ClickHouse HTTP at `http://localhost:8123`, OTLP/HTTP at `http://localhost:4318`, and the RackLens API at `http://localhost:8000`.

The ClickHouse table partitions by month, orders by physical identity plus metric and time, retains raw data for 30 days, and builds one-minute rollups. The Python client uses `JSONEachRow` batches instead of one insert per reading.

## Connect a Redfish service

```bash
export REDFISH_BASE_URL=https://bmc.example.com
export REDFISH_USERNAME=readonly-observer
export REDFISH_PASSWORD='local-secret'
export CLICKHOUSE_URL=http://localhost:8123
export CLICKHOUSE_PASSWORD=racklens-local
racklens collect-redfish --interval 30 --data-center DEN-01
```

The crawler follows only `/redfish/` links, performs only `GET`, de-duplicates resources, and stops at 200 resources per collection pass. Use `--insecure` only with a development emulator.

To send the collector to the hosted product instead of ClickHouse, set `RACKLENS_HOSTED_INGEST_URL` and `RACKLENS_INGEST_TOKEN` and omit `CLICKHOUSE_URL`.

## LangSmith and OpenTelemetry

Install the observability extra and set `OTEL_EXPORTER_OTLP_ENDPOINT`. RackLens then records each collector, retrieval, reasoning, citation-critic, and review stage as an OTel span. Use LangSmith's hybrid tracing mode so the same AI execution is visible in LangSmith and an OTLP backend.

Attach these metadata fields to every production trace: `data_center`, `hall`, `row`, `rack_id`, `node_id`, `gpu_id`, `incident_id`, `redfish_event_id`, `model`, `prompt_version`, and `adapter_version`.

Enable the checked-in collector fan-out after setting a LangSmith API key:

```bash
export LANGSMITH_API_KEY='local-secret'
export LANGSMITH_PROJECT=racklens-reliability-prod
docker compose -f infra/docker-compose.yml -f infra/docker-compose.langsmith.yml up -d
```

The collector sends each trace to ClickHouse and LangSmith's documented OTLP endpoint. Metrics and logs remain in ClickHouse. The base Compose file intentionally omits the LangSmith exporter so the local stack starts cleanly without a cloud credential.

Authoritative references:

- [ClickHouse OpenTelemetry integration](https://clickhouse.com/resources/engineering/opentelemetry-otel)
- [ClickHouse Grafana integration](https://clickhouse.com/integrations/grafana)
- [LangSmith OpenTelemetry tracing](https://docs.langchain.com/langsmith/trace-with-opentelemetry)
- [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts)
- [DMTF Redfish standard](https://www.dmtf.org/standards/redfish)

## Free deployment choices

- Public demonstration: Sites plus its managed D1 binding. No user-operated database VM is required.
- Permanent self-hosted ClickHouse demonstration: one Oracle Cloud Always Free Ampere VM can run the Compose stack, but it is single-node and operator-managed.
- Managed evaluation: ClickHouse Cloud provides a time-limited trial rather than an always-free production tier.
- Managed alternative: Grafana Cloud Free is the simplest zero-operations destination for bounded metrics, logs, and traces.

Free infrastructure is appropriate for a portfolio demonstration, not a production SLA. A production rollout still needs private networking, secrets rotation, TLS validation, backups, retention policy, tenant authorization, audit logging, capacity testing, and an incident recovery plan.

The checked-in [OCI Terraform and runbook](../infra/oci/README.md) provision the Always Free-shaped VM, Bastion, private Object Storage evidence bucket, instance-principal policy, custom evaluation metrics, and budget alerts without placing secrets in Terraform state.

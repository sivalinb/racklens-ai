from __future__ import annotations

import base64
import json
import os
import sqlite3
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Protocol
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class TelemetryTarget:
    data_center: str = "DEN-01"
    hall: str = "Hall A"
    row: str = "Row 02"
    rack: str = "R02"
    node: str = "U18"
    gpu: str = "GPU0"


@dataclass(frozen=True)
class MetricSample:
    timestamp: datetime
    metric: str
    value: float
    unit: str
    source_uri: str
    target: TelemetryTarget
    source_kind: str = "Redfish collector"
    severity: str = "ok"
    incident_id: str | None = None
    trace_id: str | None = None
    attributes: dict = field(default_factory=dict)

    def json_row(self) -> dict:
        return {
            "timestamp": self.timestamp.astimezone(UTC).isoformat(),
            "tenant_id": "default",
            "data_center": self.target.data_center,
            "hall": self.target.hall,
            "row_name": self.target.row,
            "rack_id": self.target.rack,
            "node_id": self.target.node,
            "gpu_id": self.target.gpu,
            "metric_name": self.metric,
            "value": self.value,
            "unit": self.unit,
            "severity": self.severity,
            "source_kind": self.source_kind,
            "source_uri": self.source_uri,
            "incident_id": self.incident_id or "",
            "trace_id": self.trace_id or "",
            "attributes_json": json.dumps(self.attributes, sort_keys=True),
        }

    def hosted_row(self) -> dict:
        return {
            "timestamp": int(self.timestamp.timestamp() * 1000),
            "metric": self.metric,
            "value": self.value,
            "unit": self.unit,
            "sourceUri": self.source_uri,
            "sourceKind": self.source_kind,
            "severity": self.severity,
            "incidentId": self.incident_id,
            "traceId": self.trace_id,
            "attributes": self.attributes,
            "target": {
                "dataCenter": self.target.data_center,
                "hall": self.target.hall,
                "row": self.target.row,
                "rack": self.target.rack,
                "node": self.target.node,
                "gpu": self.target.gpu,
            },
        }


class TelemetryStore(Protocol):
    def insert_metrics(self, samples: list[MetricSample]) -> int: ...

    def query_metrics(self, target: TelemetryTarget, minutes: int = 15) -> list[dict]: ...


CLICKHOUSE_SCHEMA = """
CREATE TABLE IF NOT EXISTS racklens.metric_samples
(
  timestamp DateTime64(3, 'UTC'),
  tenant_id LowCardinality(String),
  data_center LowCardinality(String),
  hall LowCardinality(String),
  row_name LowCardinality(String),
  rack_id LowCardinality(String),
  node_id LowCardinality(String),
  gpu_id LowCardinality(String),
  metric_name LowCardinality(String),
  value Float64,
  unit LowCardinality(String),
  severity LowCardinality(String),
  source_kind LowCardinality(String),
  source_uri String,
  incident_id String,
  trace_id String,
  attributes_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, data_center, hall, row_name, rack_id, node_id, gpu_id, metric_name, timestamp)
TTL timestamp + INTERVAL 30 DAY DELETE
SETTINGS index_granularity = 8192
""".strip()


class ClickHouseHTTPStore:
    """Batched HTTP client that works with ClickHouse Cloud or self-hosted ClickHouse."""

    def __init__(self, url: str, username: str = "default", password: str = "", database: str = "racklens"):
        self.url = url.rstrip("/")
        self.username = username
        self.password = password
        self.database = database

    def _request(self, query: str, body: bytes = b"", parameters: dict | None = None) -> bytes:
        auth = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
        request = Request(
            f"{self.url}/?{urlencode({'query': query, **(parameters or {})})}",
            data=body or None,
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-ndjson"},
            method="POST",
        )
        with urlopen(request, timeout=20) as response:
            return response.read()

    def ensure_schema(self) -> None:
        self._request(f"CREATE DATABASE IF NOT EXISTS {self.database}")
        self._request(CLICKHOUSE_SCHEMA.replace("racklens.", f"{self.database}."))

    def insert_metrics(self, samples: list[MetricSample]) -> int:
        if not samples:
            return 0
        payload = "\n".join(json.dumps(sample.json_row()) for sample in samples).encode()
        query = f"INSERT INTO {self.database}.metric_samples FORMAT JSONEachRow"
        self._request(query, payload)
        return len(samples)

    def query_metrics(self, target: TelemetryTarget, minutes: int = 15) -> list[dict]:
        safe_minutes = min(max(minutes, 1), 1440)
        query = f"""
SELECT timestamp, metric_name, value, unit, severity, source_uri, incident_id, trace_id
FROM {self.database}.metric_samples
WHERE data_center = {{dc:String}} AND hall = {{hall:String}} AND row_name = {{row:String}}
  AND rack_id = {{rack:String}} AND node_id = {{node:String}} AND gpu_id = {{gpu:String}}
  AND timestamp >= now() - INTERVAL {safe_minutes} MINUTE
ORDER BY timestamp
FORMAT JSONEachRow
""".strip()
        parameters = {
            "param_dc": target.data_center,
            "param_hall": target.hall,
            "param_row": target.row,
            "param_rack": target.rack,
            "param_node": target.node,
            "param_gpu": target.gpu,
        }
        response = self._request(query, parameters=parameters)
        return [json.loads(line) for line in response.splitlines() if line]


class SQLiteTelemetryStore:
    """Zero-dependency local TSDB used by the FastAPI service and tests."""

    def __init__(self, path: str | Path = ".racklens/telemetry.db"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS metric_samples (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              timestamp TEXT NOT NULL,
              data_center TEXT NOT NULL, hall TEXT NOT NULL, row_name TEXT NOT NULL,
              rack_id TEXT NOT NULL, node_id TEXT NOT NULL, gpu_id TEXT NOT NULL,
              metric_name TEXT NOT NULL, value REAL NOT NULL, unit TEXT NOT NULL,
              severity TEXT NOT NULL, source_kind TEXT NOT NULL, source_uri TEXT NOT NULL,
              incident_id TEXT, trace_id TEXT, attributes_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_metric_target_time
              ON metric_samples(data_center, hall, row_name, rack_id, node_id, gpu_id, metric_name, timestamp);
            """
        )

    def insert_metrics(self, samples: list[MetricSample]) -> int:
        rows = [sample.json_row() for sample in samples]
        self.connection.executemany(
            """
            INSERT INTO metric_samples
              (timestamp, data_center, hall, row_name, rack_id, node_id, gpu_id,
               metric_name, value, unit, severity, source_kind, source_uri,
               incident_id, trace_id, attributes_json)
            VALUES
              (:timestamp, :data_center, :hall, :row_name, :rack_id, :node_id, :gpu_id,
               :metric_name, :value, :unit, :severity, :source_kind, :source_uri,
               :incident_id, :trace_id, :attributes_json)
            """,
            rows,
        )
        self.connection.commit()
        return len(rows)

    def query_metrics(self, target: TelemetryTarget, minutes: int = 15) -> list[dict]:
        since = (datetime.now(UTC) - timedelta(minutes=min(max(minutes, 1), 1440))).isoformat()
        rows = self.connection.execute(
            """
            SELECT timestamp, metric_name, value, unit, severity, source_uri, incident_id, trace_id
            FROM metric_samples
            WHERE data_center = ? AND hall = ? AND row_name = ? AND rack_id = ?
              AND node_id = ? AND gpu_id = ? AND timestamp >= ?
            ORDER BY timestamp
            """,
            (
                target.data_center,
                target.hall,
                target.row,
                target.rack,
                target.node,
                target.gpu,
                since,
            ),
        ).fetchall()
        return [dict(row) for row in rows]


class HostedTelemetrySink:
    """Pushes collector batches to the public RackLens ingestion API over HTTPS."""

    def __init__(self, endpoint: str, token: str):
        self.endpoint = endpoint.rstrip("/") + "/api/telemetry/ingest"
        self.token = token

    def insert_metrics(self, samples: list[MetricSample]) -> int:
        if not samples:
            return 0
        request = Request(
            self.endpoint,
            data=json.dumps({"samples": [sample.hosted_row() for sample in samples]}).encode(),
            headers={
                "Content-Type": "application/json",
                "X-RackLens-Ingest-Token": self.token,
            },
            method="POST",
        )
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read())
        return int(payload["accepted"])

    def query_metrics(self, target: TelemetryTarget, minutes: int = 15) -> list[dict]:
        raise NotImplementedError("HostedTelemetrySink is write-only")


def telemetry_store_from_env() -> TelemetryStore:
    if endpoint := os.getenv("RACKLENS_HOSTED_INGEST_URL"):
        token = os.environ["RACKLENS_INGEST_TOKEN"]
        return HostedTelemetrySink(endpoint, token)
    if url := os.getenv("CLICKHOUSE_URL"):
        store = ClickHouseHTTPStore(
            url,
            os.getenv("CLICKHOUSE_USER", "default"),
            os.getenv("CLICKHOUSE_PASSWORD", ""),
            os.getenv("CLICKHOUSE_DATABASE", "racklens"),
        )
        store.ensure_schema()
        return store
    return SQLiteTelemetryStore(os.getenv("RACKLENS_SQLITE_PATH", ".racklens/telemetry.db"))

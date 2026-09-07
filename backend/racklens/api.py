from __future__ import annotations

import asyncio
import json
import os
from datetime import UTC, datetime
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .agent import ReliabilityAgent
from .capabilities import capability_catalog, capability_summary
from .llm import OpenAICompatibleModel
from .simulator import RackSimulator, SCENARIOS
from .training import model_ops_manifest
from .telemetry import MetricSample, TelemetryTarget, telemetry_store_from_env


app = FastAPI(title="RackLens AI", version="0.1.0", docs_url="/docs")
simulator = RackSimulator()
investigations = {}


class ReviewRequest(BaseModel):
    approve: bool


class TelemetryTargetRequest(BaseModel):
    data_center: str = "DEN-01"
    hall: str = "Hall A"
    row: str = "Row 02"
    rack: str = "R02"
    node: str = "U18"
    gpu: str = "GPU0"


class MetricSampleRequest(BaseModel):
    timestamp: datetime | None = None
    metric: str
    value: float
    unit: str
    source_uri: str
    source_kind: str = "Redfish collector"
    severity: str = "ok"
    incident_id: str | None = None
    trace_id: str | None = None
    attributes: dict = Field(default_factory=dict)
    target: TelemetryTargetRequest


class MetricBatchRequest(BaseModel):
    samples: list[MetricSampleRequest]


@lru_cache(maxsize=1)
def telemetry_store():
    return telemetry_store_from_env()


def agent() -> ReliabilityAgent:
    base_url, key, model = (os.getenv("RACKLENS_LLM_BASE_URL"), os.getenv("RACKLENS_LLM_API_KEY"), os.getenv("RACKLENS_LLM_MODEL"))
    provider = OpenAICompatibleModel(base_url, key, model) if all((base_url, key, model)) else None
    return ReliabilityAgent(model=provider)


@app.get("/api/health")
def health():
    mode = "clickhouse" if os.getenv("CLICKHOUSE_URL") else "sqlite"
    return {
        "status": "ok",
        "service": "racklens",
        "mode": mode,
        "redfish_mode": "read-only",
        "production_writes": False,
    }


@app.get("/api/telemetry/query")
def telemetry_query(
    data_center: str = "DEN-01",
    hall: str = "Hall A",
    row: str = "Row 02",
    rack: str = "R02",
    node: str = "U18",
    gpu: str = "GPU0",
    minutes: int = 15,
):
    target = TelemetryTarget(data_center, hall, row, rack, node, gpu)
    return {
        "source": "clickhouse" if os.getenv("CLICKHOUSE_URL") else "sqlite",
        "target": target.__dict__,
        "samples": telemetry_store().query_metrics(target, minutes),
    }


@app.post("/api/telemetry/ingest", status_code=202)
def telemetry_ingest(batch: MetricBatchRequest):
    if not 1 <= len(batch.samples) <= 1000:
        raise HTTPException(400, "each batch must contain 1–1000 samples")
    samples = [
        MetricSample(
            timestamp=item.timestamp or datetime.now(UTC),
            metric=item.metric,
            value=item.value,
            unit=item.unit,
            source_uri=item.source_uri,
            source_kind=item.source_kind,
            severity=item.severity,
            incident_id=item.incident_id,
            trace_id=item.trace_id,
            attributes=item.attributes,
            target=TelemetryTarget(**item.target.model_dump()),
        )
        for item in batch.samples
    ]
    return {"accepted": telemetry_store().insert_metrics(samples)}


@app.get("/api/scenarios")
def scenarios():
    return {"scenarios": [{"id": key, "description": value} for key, value in SCENARIOS.items()]}


@app.get("/api/redfish/capabilities")
def capabilities():
    return {"summary": capability_summary(), "capabilities": capability_catalog()}


@app.get("/api/model-ops")
def model_ops():
    return model_ops_manifest()


@app.get("/api/fleet/{scenario}")
def fleet(scenario: str, step: int = 0):
    try:
        return simulator.snapshot(scenario, step).to_dict()
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.post("/api/investigations/{scenario}")
def investigate(scenario: str):
    try:
        result = agent().investigate(simulator.snapshot(scenario))
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    investigations[result.incident_id] = result
    return result.to_dict()


@app.post("/api/investigations/{incident_id}/review")
def review(incident_id: str, request: ReviewRequest):
    if incident_id not in investigations:
        raise HTTPException(404, "investigation not found")
    return agent().review(investigations[incident_id], request.approve).to_dict()


@app.get("/api/events/{scenario}")
async def events(scenario: str):
    if scenario not in SCENARIOS:
        raise HTTPException(404, "unknown scenario")
    async def stream():
        for step in range(24):
            yield f"data: {json.dumps(simulator.snapshot(scenario, step).to_dict())}\n\n"
            await asyncio.sleep(1)
    return StreamingResponse(stream(), media_type="text/event-stream")

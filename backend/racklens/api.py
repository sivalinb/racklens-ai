from __future__ import annotations

import asyncio
import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .agent import ReliabilityAgent
from .capabilities import capability_catalog, capability_summary
from .llm import OpenAICompatibleModel
from .simulator import RackSimulator, SCENARIOS
from .training import model_ops_manifest


app = FastAPI(title="RackLens AI", version="0.1.0", docs_url="/docs")
simulator = RackSimulator()
investigations = {}


class ReviewRequest(BaseModel):
    approve: bool


def agent() -> ReliabilityAgent:
    base_url, key, model = (os.getenv("RACKLENS_LLM_BASE_URL"), os.getenv("RACKLENS_LLM_API_KEY"), os.getenv("RACKLENS_LLM_MODEL"))
    provider = OpenAICompatibleModel(base_url, key, model) if all((base_url, key, model)) else None
    return ReliabilityAgent(model=provider)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "racklens", "mode": "replay", "production_writes": False}


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

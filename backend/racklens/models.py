from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal


Health = Literal["ok", "warning", "critical"]


@dataclass(frozen=True)
class GPU:
    id: str
    model: str
    utilization_pct: float
    power_watts: float
    temperature_c: float
    clock_mhz: int
    hbm_used_gb: float
    nvlink_gbps: float
    health: Health = "ok"


@dataclass(frozen=True)
class Node:
    id: str
    rack_id: str
    position_u: int
    inlet_temp_c: float
    outlet_temp_c: float
    power_watts: float
    network_gbps: float
    firmware: str
    health: Health
    gpus: tuple[GPU, ...]


@dataclass(frozen=True)
class Rack:
    id: str
    zone: str
    power_kw: float
    inlet_temp_c: float
    network_gbps: float
    health: Health
    nodes: tuple[Node, ...]


@dataclass(frozen=True)
class Event:
    timestamp: str
    severity: Health
    resource: str
    message_id: str
    message: str


@dataclass(frozen=True)
class FleetSnapshot:
    generated_at: str
    site: str
    scenario: str
    racks: tuple[Rack, ...]
    events: tuple[Event, ...]
    replay: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class Evidence:
    id: str
    kind: Literal["redfish", "gpu", "network", "workload", "knowledge"]
    resource: str
    observation: str
    value: str
    timestamp: str
    source_url: str | None = None


@dataclass(frozen=True)
class Hypothesis:
    rank: int
    title: str
    confidence: float
    evidence_ids: tuple[str, ...]
    rationale: str


@dataclass
class Investigation:
    incident_id: str
    scenario: str
    status: Literal["awaiting_review", "approved", "rejected"]
    summary: str
    evidence: list[Evidence]
    hypotheses: list[Hypothesis]
    recommendation: str
    verification_plan: list[str]
    spans: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from random import Random

from .models import Event, FleetSnapshot, GPU, Node, Rack


SCENARIOS = {
    "cooling_imbalance": "A blocked cold aisle raises inlet temperature and reduces clocks in R02.",
    "power_cap": "A rack-level power limit reduces GPU clocks while temperatures remain normal.",
    "pcie_degradation": "A PCIe link degradation reduces host-to-GPU traffic on one node.",
    "healthy": "All telemetry remains inside the expected operating envelope.",
}


class RackSimulator:
    """Deterministic Redfish-shaped fleet simulator for development and evaluation."""

    def __init__(self, seed: int = 2048):
        self.random = Random(seed)

    def snapshot(self, scenario: str = "cooling_imbalance", step: int = 0) -> FleetSnapshot:
        if scenario not in SCENARIOS:
            raise ValueError(f"unknown scenario: {scenario}")
        now = datetime(2026, 9, 6, 14, 32, 8, tzinfo=UTC) + timedelta(seconds=step * 5)
        racks = tuple(self._rack(index, scenario, step) for index in range(1, 5))
        return FleetSnapshot(
            generated_at=now.isoformat(),
            site="DEN-01",
            scenario=scenario,
            racks=racks,
            events=tuple(self._events(now, scenario)),
        )

    def _rack(self, index: int, scenario: str, step: int) -> Rack:
        rack_id = f"R{index:02d}"
        zone = ("Training", "Inference", "Inference", "Research")[index - 1]
        nodes = tuple(self._node(rack_id, u, scenario, step) for u in range(11, 19))
        power = sum(node.power_watts for node in nodes) / 1000
        inlet = max(node.inlet_temp_c for node in nodes)
        network = sum(node.network_gbps for node in nodes)
        health = "critical" if any(n.health == "critical" for n in nodes) else "warning" if any(n.health == "warning" for n in nodes) else "ok"
        return Rack(rack_id, zone, round(power, 2), round(inlet, 1), round(network, 1), health, nodes)

    def _node(self, rack_id: str, position_u: int, scenario: str, step: int) -> Node:
        rack_no = int(rack_id[1:])
        node_id = f"{rack_id}-U{position_u}"
        phase = (rack_no * 13 + position_u * 7 + step) % 11
        inlet = 22.2 + phase * 0.13
        power = 4200 + phase * 43
        network = 360 + phase * 9
        health = "ok"
        clock_adjust = 0
        nvlink_adjust = 0
        if scenario == "cooling_imbalance" and rack_id == "R02" and position_u >= 15:
            inlet += 5.6 + min(step, 8) * 0.08
            clock_adjust = -215
            health = "warning"
        elif scenario == "power_cap" and rack_id == "R03":
            power -= 760
            clock_adjust = -330
            health = "warning"
        elif scenario == "pcie_degradation" and rack_id == "R01" and position_u == 14:
            network *= 0.31
            nvlink_adjust = -175
            health = "critical"
        gpus = tuple(self._gpu(i, inlet, power / 8, phase, clock_adjust, nvlink_adjust, health) for i in range(8))
        return Node(node_id, rack_id, position_u, round(inlet, 1), round(inlet + 14.8, 1), round(power, 1), round(network, 1), "BMC-7.12.4", health, gpus)

    def _gpu(self, index: int, inlet: float, power: float, phase: int, clock_adjust: int, nvlink_adjust: int, health: str) -> GPU:
        utilization = 73 + ((phase + index * 3) % 23)
        return GPU(
            id=f"GPU{index}", model="H100 SXM", utilization_pct=float(utilization),
            power_watts=round(power + (index % 3) * 4.2, 1), temperature_c=round(inlet + 32 + (index % 4) * 0.8, 1),
            clock_mhz=1830 + (index % 2) * 30 + clock_adjust, hbm_used_gb=round(48 + index * 2.7, 1),
            nvlink_gbps=round(385 + (index % 4) * 8 + nvlink_adjust, 1), health=health,
        )

    def _events(self, now: datetime, scenario: str) -> list[Event]:
        base = [Event((now - timedelta(seconds=116)).isoformat(), "ok", "/redfish/v1/Systems/R02-U18", "Resource.StatusChange", "Workload replay entered peak inference window")]
        if scenario == "cooling_imbalance":
            base.extend([
                Event((now - timedelta(seconds=94)).isoformat(), "warning", "/redfish/v1/Chassis/R02/Thermal", "Thermal.1.0.TempHigh", "Inlet temperature crossed learned peer envelope"),
                Event((now - timedelta(seconds=61)).isoformat(), "warning", "/redfish/v1/Systems/R02-U18/Processors/GPU0", "GPU.ClockReduction", "GPU clock reduction observed across four nodes"),
            ])
        elif scenario == "power_cap":
            base.append(Event(now.isoformat(), "warning", "/redfish/v1/Chassis/R03/Power", "Power.1.0.CapActive", "Rack power cap is constraining accelerator clocks"))
        elif scenario == "pcie_degradation":
            base.append(Event(now.isoformat(), "critical", "/redfish/v1/Systems/R01-U14/PCIeDevices/1", "PCIe.1.0.LinkDegraded", "PCIe link width degraded from x16 to x4"))
        return base

    def series(self, scenario: str, points: int = 24) -> list[FleetSnapshot]:
        return [self.snapshot(scenario, step) for step in range(points)]

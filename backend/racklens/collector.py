from __future__ import annotations

import os
import re
import time
from datetime import UTC, datetime
from typing import Iterator

from .simulator import RackSimulator
from .redfish import RedfishClient, RedfishResource
from .telemetry import MetricSample, TelemetryStore, TelemetryTarget


NUMERIC_KEYS = {
    "PowerConsumedWatts": ("power.consumed_watts", "W"),
    "PowerInputWatts": ("power.input_watts", "W"),
    "ReadingCelsius": ("thermal.temperature_c", "Cel"),
    "ReadingVolts": ("power.voltage", "V"),
    "ReadingAmps": ("power.current", "A"),
    "SpeedRPM": ("thermal.fan_speed_rpm", "rpm"),
    "Reading": ("telemetry.reading", "1"),
    "CurrentReading": ("telemetry.current_reading", "1"),
}


class RedfishTelemetryCollector:
    """GET-only crawler and normalizer for standard Redfish numeric readings."""

    def __init__(self, client: RedfishClient, store: TelemetryStore, data_center: str = "DEN-01"):
        self.client = client
        self.store = store
        self.data_center = data_center

    def collect_once(self) -> dict:
        resources = self.client.crawl()
        samples = [sample for resource in resources for sample in self._normalize(resource)]
        accepted = self.store.insert_metrics(samples)
        return {
            "resources_read": len(resources),
            "samples_normalized": len(samples),
            "samples_accepted": accepted,
            "production_writes": False,
        }

    def run(self, interval_seconds: int = 30) -> None:
        while True:
            self.collect_once()
            time.sleep(max(interval_seconds, 5))

    def _normalize(self, resource: RedfishResource) -> Iterator[MetricSample]:
        timestamp = datetime.now(UTC)
        target = self._target(resource.uri)
        for path, key, value in self._walk_numbers(resource.payload):
            if key not in NUMERIC_KEYS:
                continue
            metric, unit = NUMERIC_KEYS[key]
            name = resource.payload.get("Name") or resource.payload.get("Id") or "resource"
            yield MetricSample(
                timestamp=timestamp,
                metric=f"{metric}.{self._slug(str(name))}",
                value=float(value),
                unit=unit,
                source_uri=f"{resource.uri}#{path}",
                target=target,
                attributes={"redfish_key": key, "odata_type": resource.payload.get("@odata.type")},
            )

    def _target(self, uri: str) -> TelemetryTarget:
        rack = next(iter(re.findall(r"R\d{2}", uri)), "R00")
        node = next(iter(re.findall(r"U\d{2}", uri)), "all")
        gpu = next(iter(re.findall(r"GPU\d+", uri, re.IGNORECASE)), "all").upper()
        return TelemetryTarget(data_center=self.data_center, rack=rack, node=node, gpu=gpu)

    @classmethod
    def _walk_numbers(cls, value, path: str = "") -> Iterator[tuple[str, str, float]]:
        if isinstance(value, dict):
            for key, child in value.items():
                child_path = f"{path}/{key}"
                if isinstance(child, (int, float)) and not isinstance(child, bool):
                    yield child_path, key, child
                else:
                    yield from cls._walk_numbers(child, child_path)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                yield from cls._walk_numbers(child, f"{path}/{index}")

    @staticmethod
    def _slug(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


class SimulatorTelemetryCollector:
    """Emits realistic Redfish-shaped metrics through the production store contract."""

    def __init__(
        self,
        store: TelemetryStore,
        data_center: str = "DEN-01",
        hall: str = "Hall A",
        row: str = "Row 02",
    ):
        self.store = store
        self.data_center = data_center
        self.hall = hall
        self.row = row
        self.region = os.getenv("OCI_REGION", "local")
        self.instance_id = os.getenv("OCI_INSTANCE_ID", "simulator")

    def collect_once(self, scenario: str = "cooling_imbalance", step: int = 0) -> dict:
        snapshot = RackSimulator(seed=2048 + step).snapshot(scenario, step % 24)
        timestamp = datetime.now(UTC)
        samples: list[MetricSample] = []
        for rack in snapshot.racks:
            for node in rack.nodes:
                for gpu in node.gpus:
                    target = TelemetryTarget(
                        self.data_center,
                        self.hall,
                        self.row,
                        rack.id,
                        f"U{node.position_u}",
                        gpu.id,
                    )
                    severity = node.health
                    attributes = {
                        "cloud_provider": "oci",
                        "oci_region": self.region,
                        "oci_instance_id": self.instance_id,
                        "scenario": scenario,
                        "replay": True,
                    }
                    metrics = (
                        ("rack.power_kw", rack.power_kw, "kW", f"/redfish/v1/Chassis/{rack.id}/Power"),
                        ("thermal.inlet_c", node.inlet_temp_c, "Cel", f"/redfish/v1/Chassis/{rack.id}/Thermal#/Temperatures/{node.position_u}-inlet"),
                        ("thermal.exhaust_c", node.outlet_temp_c, "Cel", f"/redfish/v1/Chassis/{rack.id}/Thermal#/Temperatures/{node.position_u}-exhaust"),
                        ("thermal.fan_duty_pct", min(100.0, 66 + max(0, node.inlet_temp_c - 22) * 6), "%", f"/redfish/v1/Chassis/{rack.id}/Thermal#/Fans/Zone2"),
                        ("network.ingress_tbps", node.network_gbps / 1000, "Tbit/s", f"/redfish/v1/Chassis/{rack.id}/NetworkAdapters/ToR-A"),
                        ("network.egress_tbps", node.network_gbps * 0.92 / 1000, "Tbit/s", f"/redfish/v1/Chassis/{rack.id}/NetworkAdapters/ToR-B"),
                        ("gpu.clock_mhz", gpu.clock_mhz, "MHz", f"/redfish/v1/Systems/{node.id}/Processors/{gpu.id}"),
                        ("gpu.utilization_pct", gpu.utilization_pct, "%", f"/redfish/v1/TelemetryService/MetricReports/{node.id}-{gpu.id}"),
                        ("gpu.temperature_c", gpu.temperature_c, "Cel", f"/redfish/v1/TelemetryService/MetricReports/{node.id}-{gpu.id}"),
                        ("gpu.power_watts", gpu.power_watts, "W", f"/redfish/v1/TelemetryService/MetricReports/{node.id}-{gpu.id}"),
                        ("collector.poll_latency_ms", 118 + (step % 9) * 7, "ms", "/redfish/v1"),
                    )
                    samples.extend(
                        MetricSample(
                            timestamp,
                            name,
                            float(value),
                            unit,
                            uri,
                            target,
                            source_kind="OCI RackLens simulator",
                            severity=severity,
                            incident_id=f"oci-{scenario}",
                            trace_id=f"oci-sim-{step:06d}",
                            attributes=attributes,
                        )
                        for name, value, unit, uri in metrics
                    )
        accepted = self.store.insert_metrics(samples)
        return {
            "scenario": scenario,
            "samples_normalized": len(samples),
            "samples_accepted": accepted,
            "source": "OCI Redfish-shaped simulator",
            "production_writes": False,
        }

    def run(self, interval_seconds: int = 30, scenario: str = "cooling_imbalance") -> None:
        step = 0
        while True:
            self.collect_once(scenario, step)
            step += 1
            time.sleep(max(interval_seconds, 5))

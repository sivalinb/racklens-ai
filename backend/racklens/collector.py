from __future__ import annotations

import re
import time
from datetime import UTC, datetime
from typing import Iterator

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

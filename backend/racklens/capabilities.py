from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal


Support = Literal["standard", "optional", "lab-only"]


@dataclass(frozen=True)
class RedfishCapability:
    id: str
    service: str
    resource: str
    purpose: str
    access: Literal["read", "event", "action"]
    support: Support
    demo_state: Literal["available", "simulated", "guarded"]


CAPABILITIES = (
    RedfishCapability("inventory", "ComputerSystem", "/redfish/v1/Systems", "CPU, memory, storage, accelerators and health", "read", "standard", "available"),
    RedfishCapability("physical", "Chassis", "/redfish/v1/Chassis", "Physical containment, sensors, power and cooling relationships", "read", "standard", "available"),
    RedfishCapability("management", "Manager", "/redfish/v1/Managers", "BMC identity, firmware, interfaces and manager health", "read", "standard", "available"),
    RedfishCapability("telemetry", "TelemetryService", "/redfish/v1/TelemetryService", "Metric definitions, reports and timestamped measurements", "read", "optional", "simulated"),
    RedfishCapability("events", "EventService", "/redfish/v1/EventService", "Subscriptions, alerts and resource-originated state changes", "event", "optional", "simulated"),
    RedfishCapability("logs", "LogService", "/redfish/v1/Systems/{id}/LogServices", "System event and lifecycle records", "read", "optional", "simulated"),
    RedfishCapability("firmware", "UpdateService", "/redfish/v1/UpdateService", "Firmware inventory, staged updates and task tracking", "action", "optional", "guarded"),
    RedfishCapability("pcie", "PCIeDevice", "/redfish/v1/Systems/{id}/PCIeDevices", "Accelerator, NIC and link inventory and status", "read", "optional", "available"),
    RedfishCapability("network", "NetworkAdapter", "/redfish/v1/Chassis/{id}/NetworkAdapters", "Ports, functions, link health and fabric placement", "read", "optional", "simulated"),
    RedfishCapability("security", "AccountService", "/redfish/v1/AccountService", "Accounts, roles, lockout policy and certificate posture", "read", "standard", "available"),
    RedfishCapability("power", "ComputerSystem.Reset", "/redfish/v1/Systems/{id}/Actions/ComputerSystem.Reset", "Power, reset and boot verification in the lab", "action", "standard", "guarded"),
    RedfishCapability("composition", "CompositionService", "/redfish/v1/CompositionService", "Discover and compose pooled infrastructure resources", "action", "optional", "guarded"),
)


def capability_catalog() -> list[dict]:
    return [asdict(item) for item in CAPABILITIES]


def capability_summary() -> dict:
    return {
        "total": len(CAPABILITIES),
        "read_only": sum(item.access == "read" for item in CAPABILITIES),
        "event_driven": sum(item.access == "event" for item in CAPABILITIES),
        "guarded_actions": sum(item.demo_state == "guarded" for item in CAPABILITIES),
        "production_writes": False,
    }

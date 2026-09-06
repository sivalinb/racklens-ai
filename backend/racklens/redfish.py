from __future__ import annotations

import base64
import json
import ssl
from dataclasses import dataclass
from urllib.parse import urljoin
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class RedfishResource:
    uri: str
    payload: dict


class RedfishClient:
    """Small read-only Redfish collector using the Python standard library."""

    READ_ENDPOINTS = (
        "/redfish/v1",
        "/redfish/v1/Systems",
        "/redfish/v1/Chassis",
        "/redfish/v1/TelemetryService",
        "/redfish/v1/EventService",
        "/redfish/v1/UpdateService/FirmwareInventory",
    )

    def __init__(self, base_url: str, username: str, password: str, verify_tls: bool = True, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/") + "/"
        token = base64.b64encode(f"{username}:{password}".encode()).decode()
        self.headers = {"Accept": "application/json", "Authorization": f"Basic {token}"}
        self.timeout = timeout
        self.context = ssl.create_default_context() if verify_tls else ssl._create_unverified_context()

    def get(self, uri: str) -> RedfishResource:
        request = Request(urljoin(self.base_url, uri.lstrip("/")), headers=self.headers, method="GET")
        with urlopen(request, timeout=self.timeout, context=self.context) as response:
            return RedfishResource(uri, json.loads(response.read().decode("utf-8")))

    def discover(self) -> list[RedfishResource]:
        resources = []
        for uri in self.READ_ENDPOINTS:
            try:
                resources.append(self.get(uri))
            except Exception as exc:
                resources.append(RedfishResource(uri, {"available": False, "error_type": type(exc).__name__}))
        return resources

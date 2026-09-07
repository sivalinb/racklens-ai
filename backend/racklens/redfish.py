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
        "/redfish/v1/Managers",
        "/redfish/v1/TelemetryService",
        "/redfish/v1/EventService",
        "/redfish/v1/AccountService",
        "/redfish/v1/TaskService",
        "/redfish/v1/UpdateService",
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

    def crawl(self, max_resources: int = 200) -> list[RedfishResource]:
        """Follow in-service @odata.id links with GET only and a hard safety cap."""
        queue = list(self.READ_ENDPOINTS)
        seen: set[str] = set()
        resources: list[RedfishResource] = []
        while queue and len(resources) < max_resources:
            uri = queue.pop(0)
            if uri in seen or not uri.startswith("/redfish/"):
                continue
            seen.add(uri)
            try:
                resource = self.get(uri)
            except Exception as exc:
                resources.append(RedfishResource(uri, {"available": False, "error_type": type(exc).__name__}))
                continue
            resources.append(resource)
            for linked_uri in self._linked_uris(resource.payload):
                if linked_uri not in seen and linked_uri.startswith("/redfish/"):
                    queue.append(linked_uri)
        return resources

    @classmethod
    def _linked_uris(cls, value) -> set[str]:
        links: set[str] = set()
        if isinstance(value, dict):
            uri = value.get("@odata.id")
            if isinstance(uri, str):
                links.add(uri)
            for child in value.values():
                links.update(cls._linked_uris(child))
        elif isinstance(value, list):
            for child in value:
                links.update(cls._linked_uris(child))
        return links

    def capability_matrix(self) -> list[dict]:
        return [
            {
                "uri": resource.uri,
                "available": resource.payload.get("available", True),
                "odata_type": resource.payload.get("@odata.type"),
                "name": resource.payload.get("Name"),
            }
            for resource in self.discover()
        ]

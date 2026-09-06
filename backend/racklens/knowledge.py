from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True)
class KnowledgeRecord:
    id: str
    title: str
    text: str
    url: str
    tags: tuple[str, ...]


RECORDS = (
    KnowledgeRecord("RF-TEL-01", "Redfish Telemetry", "Metric reports carry timestamped metric values and resource properties. Compare thermal, power and performance signals on a shared incident timeline.", "https://www.dmtf.org/sites/default/files/standards/documents/DSP2051_1.0.1.pdf", ("telemetry", "metrics", "timestamp")),
    KnowledgeRecord("RF-EVT-01", "Redfish Event Service", "Event subscriptions and server-sent events deliver asynchronous status changes and metric reports. Event origin resources should be preserved for correlation.", "https://redfish.dmtf.org/schemas/DSP0266_1.20.1.html", ("event", "sse", "status")),
    KnowledgeRecord("RF-PWR-01", "Power and thermal correlation", "A stable power envelope combined with rising inlet temperature and broad clock reduction supports a cooling-path hypothesis more strongly than a workload surge.", "https://www.dmtf.org/standards/redfish", ("power", "thermal", "cooling")),
    KnowledgeRecord("RF-FW-01", "Firmware inventory", "Firmware inventory should be compared across peer nodes before attributing an isolated hardware behavior to workload or facility conditions.", "https://www.dmtf.org/standards/published_documents", ("firmware", "inventory", "drift")),
    KnowledgeRecord("RF-PCIE-01", "PCIe evidence", "Reduced host traffic together with a link-width or link-health event should be investigated as an interconnect issue before blaming GPU compute saturation.", "https://redfish.dmtf.org/schemas/v1/DSP0268_2025.3.html", ("pcie", "network", "gpu")),
)


class LocalHybridRetriever:
    """Compact BM25-like retriever used offline; hosted vector stores are optional."""

    def __init__(self, records: tuple[KnowledgeRecord, ...] = RECORDS):
        self.records = records

    @staticmethod
    def _tokens(text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    def search(self, query: str, limit: int = 3) -> list[KnowledgeRecord]:
        query_counts = Counter(self._tokens(query))
        scored = []
        for record in self.records:
            doc_counts = Counter(self._tokens(f"{record.title} {record.text} {' '.join(record.tags)}"))
            overlap = sum(min(count, doc_counts[token]) for token, count in query_counts.items())
            norm = math.sqrt(sum(v * v for v in doc_counts.values())) or 1
            scored.append((overlap / norm, record))
        return [record for score, record in sorted(scored, key=lambda item: (-item[0], item[1].id))[:limit] if score > 0]

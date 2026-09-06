from __future__ import annotations

import time
from contextlib import contextmanager
from dataclasses import dataclass, field


@dataclass
class TraceRecorder:
    trace_id: str
    spans: list[dict] = field(default_factory=list)

    @contextmanager
    def span(self, name: str, **attributes):
        started = time.perf_counter()
        status = "ok"
        try:
            yield
        except Exception:
            status = "error"
            raise
        finally:
            self.spans.append({
                "name": name,
                "status": status,
                "duration_ms": round((time.perf_counter() - started) * 1000, 3),
                "attributes": attributes,
            })

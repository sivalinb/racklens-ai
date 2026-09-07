from __future__ import annotations

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from functools import lru_cache


@lru_cache(maxsize=1)
def _otel_tracer():
    """Create an OTLP tracer when the optional observability stack is installed."""
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        provider = TracerProvider(resource=Resource.create({"service.name": "racklens-agent"}))
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(provider)
        return trace.get_tracer("racklens.reliability")
    except (ImportError, RuntimeError):
        return None


@dataclass
class TraceRecorder:
    trace_id: str
    spans: list[dict] = field(default_factory=list)

    @contextmanager
    def span(self, name: str, **attributes):
        started = time.perf_counter()
        status = "ok"
        tracer = _otel_tracer()
        span_kind = (
            "retriever"
            if "retrieve" in name
            else "llm"
            if "reason" in name
            else "tool"
            if name.startswith(("collect", "human"))
            else "chain"
        )
        otel_attributes = {
            **attributes,
            "langsmith.trace.name": "racklens.reliability.investigation",
            "langsmith.span.kind": span_kind,
            "langsmith.metadata.incident_id": self.trace_id,
            "racklens.production_write": False,
        }
        otel_context = tracer.start_as_current_span(name, attributes=otel_attributes) if tracer else None
        otel_span = otel_context.__enter__() if otel_context else None
        try:
            yield
        except Exception as exc:
            status = "error"
            if otel_span:
                otel_span.record_exception(exc)
            raise
        finally:
            if otel_span:
                otel_span.set_attribute("racklens.trace_id", self.trace_id)
                otel_span.set_attribute("racklens.status", status)
            if otel_context:
                otel_context.__exit__(None, None, None)
            self.spans.append({
                "name": name,
                "status": status,
                "duration_ms": round((time.perf_counter() - started) * 1000, 3),
                "attributes": attributes,
            })

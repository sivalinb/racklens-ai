from __future__ import annotations

import json
from uuid import uuid4

from .knowledge import LocalHybridRetriever
from .models import Evidence, FleetSnapshot, Hypothesis, Investigation
from .observability import TraceRecorder


class ReliabilityAgent:
    """Evidence-first investigator. Recommendations remain read-only until human review."""

    def __init__(self, retriever: LocalHybridRetriever | None = None, model=None):
        self.retriever = retriever or LocalHybridRetriever()
        self.model = model

    def investigate(self, snapshot: FleetSnapshot) -> Investigation:
        incident_id = f"RL-{uuid4().hex[:8].upper()}"
        trace = TraceRecorder(incident_id)
        with trace.span("collect.redfish", scenario=snapshot.scenario):
            evidence = self._evidence(snapshot)
        with trace.span("retrieve.knowledge", evidence_count=len(evidence)):
            query = " ".join(item.observation for item in evidence)
            docs = self.retriever.search(query)
            for idx, doc in enumerate(docs, 1):
                evidence.append(Evidence(f"K-{idx:02d}", "knowledge", doc.title, doc.text, doc.id, snapshot.generated_at, doc.url))
        with trace.span("reason.rank", mode="llm" if self.model else "deterministic"):
            hypotheses = self._hypotheses(snapshot, evidence)
        with trace.span("critic.citations"):
            valid_ids = {item.id for item in evidence}
            hypotheses = [h for h in hypotheses if set(h.evidence_ids) <= valid_ids]
            if len(hypotheses) != 3:
                raise ValueError("investigation must return three citation-valid hypotheses")
        top = hypotheses[0]
        investigation = Investigation(
            incident_id, snapshot.scenario, "awaiting_review", top.title, evidence, hypotheses,
            self._recommendation(snapshot.scenario), self._verification(snapshot.scenario), trace.spans,
        )
        return investigation

    def review(self, investigation: Investigation, approve: bool) -> Investigation:
        if investigation.status != "awaiting_review":
            raise ValueError("investigation was already reviewed")
        investigation.status = "approved" if approve else "rejected"
        investigation.spans.append({"name": "human.review", "status": "ok", "duration_ms": 0, "attributes": {"decision": investigation.status, "production_write": False}})
        return investigation

    def _evidence(self, snapshot: FleetSnapshot) -> list[Evidence]:
        evidence: list[Evidence] = []
        warned = [rack for rack in snapshot.racks if rack.health != "ok"]
        for idx, rack in enumerate(warned or snapshot.racks[:1], 1):
            evidence.append(Evidence(f"R-{idx:02d}", "redfish", rack.id, f"Rack {rack.id} has {rack.health} health at {rack.inlet_temp_c}°C and {rack.power_kw} kW", f"{rack.inlet_temp_c}°C", snapshot.generated_at))
            affected = [node for node in rack.nodes if node.health != "ok"]
            if affected:
                node = affected[0]
                evidence.append(Evidence(f"G-{idx:02d}", "gpu", node.id, f"GPU clocks average {sum(g.clock_mhz for g in node.gpus)/8:.0f} MHz with {node.network_gbps} Gb/s node traffic", f"{node.gpus[0].clock_mhz} MHz", snapshot.generated_at))
        for idx, event in enumerate(snapshot.events, 1):
            evidence.append(Evidence(f"E-{idx:02d}", "redfish", event.resource, event.message, event.message_id, event.timestamp))
        return evidence

    def _hypotheses(self, snapshot: FleetSnapshot, evidence: list[Evidence]) -> list[Hypothesis]:
        knowledge_id = next((e.id for e in evidence if e.kind == "knowledge"), evidence[0].id)
        scenario = snapshot.scenario
        definitions = {
            "cooling_imbalance": [
                ("Cooling-path imbalance at R02", .91, ("R-01", "G-01", knowledge_id), "Thermal rise precedes broad clock reduction while rack power stays inside its peer envelope."),
                ("Workload-driven thermal saturation", .47, ("R-01", "G-01"), "High utilization can raise temperature, but stable rack power weakens this explanation."),
                ("GPU-local sensor or firmware drift", .24, ("G-01", knowledge_id), "Possible, but the correlated pattern across several nodes argues against a single-device fault."),
            ],
            "power_cap": [
                ("Rack power cap is constraining clocks", .94, ("R-01", "G-01", "E-02"), "The power-cap event and rack-wide clock reduction align without a thermal excursion."),
                ("Facility power instability", .38, ("R-01", "E-02"), "No redundant supply event or voltage evidence is present."),
                ("Application workload shift", .19, ("G-01",), "Workload variation does not explain the explicit rack power-cap event."),
            ],
            "pcie_degradation": [
                ("PCIe link degradation on R01-U14", .96, ("R-01", "G-01", "E-02"), "Link health and node traffic degrade together while adjacent nodes remain healthy."),
                ("GPU compute saturation", .31, ("G-01",), "Utilization is elevated but cannot explain a negotiated-width event."),
                ("Top-of-rack congestion", .18, ("R-01",), "The impact is isolated to one node rather than the rack network."),
            ],
            "firmware_regression": [
                ("BMC firmware regression on R04", .89, ("R-01", "G-01", "E-02", "E-03"), "A peer-divergent firmware change precedes fan-zone instability and clock loss on the same rack."),
                ("Cooling containment restriction", .42, ("R-01", "G-01"), "Thermals rise, but the localized fan event and recent firmware change provide stronger evidence."),
                ("Workload-driven saturation", .21, ("G-01",), "The workload signal does not explain the fan-zone event or firmware divergence."),
            ],
            "nvlink_degradation": [
                ("NVLink path degradation on R01-U13", .95, ("R-01", "G-01", "E-02"), "The peer-path event and isolated NVLink throughput collapse align while rack thermal health remains normal."),
                ("PCIe host-link degradation", .34, ("G-01",), "Host traffic remains inside its peer envelope and no negotiated-width event is present."),
                ("GPU compute saturation", .17, ("G-01",), "Utilization alone cannot explain the explicit interconnect event."),
            ],
            "certificate_drift": [
                ("BMC certificate entering expiry window", .99, ("E-02", knowledge_id), "The manager certificate event directly identifies a policy-window violation without a hardware anomaly."),
                ("BMC network instability", .18, ("E-02",), "No interface or connectivity evidence supports a network failure."),
                ("Hardware health degradation", .05, ("R-01",), "Rack telemetry stays inside the healthy envelope."),
            ],
            "healthy": [
                ("No active hardware anomaly", .97, ("R-01", "E-01"), "Rack health, temperature, power and traffic remain inside the replay envelope."),
                ("Early thermal drift", .12, ("R-01",), "No threshold or peer deviation currently supports this hypothesis."),
                ("Interconnect degradation", .08, ("R-01",), "No link event or traffic collapse is present."),
            ],
        }[scenario]
        if self.model:
            result = self.model.generate_json("Return exactly three ranked, evidence-cited hardware hypotheses. Never recommend an automatic write.", json.dumps({"scenario": scenario, "evidence": [e.__dict__ for e in evidence]}))
            definitions = [(h["title"], float(h["confidence"]), tuple(h["evidence_ids"]), h["rationale"]) for h in result["hypotheses"]]
        return [Hypothesis(i + 1, title, confidence, ids, rationale) for i, (title, confidence, ids, rationale) in enumerate(definitions)]

    @staticmethod
    def _recommendation(scenario: str) -> str:
        return {
            "cooling_imbalance": "Inspect R02 cold-aisle airflow and compare inlet sensors before changing workload placement.",
            "power_cap": "Confirm the configured chassis power limit and facility budget before changing the cap.",
            "pcie_degradation": "Drain R01-U14 from new work and inspect the PCIe link during an approved maintenance window.",
            "firmware_regression": "Compare R04 BMC firmware and fan policy with healthy peers; stage rollback only inside an approved maintenance window.",
            "nvlink_degradation": "Drain R01-U13 from new collective work and run an approved interconnect diagnostic in the lab.",
            "certificate_drift": "Schedule certificate rotation through the authorized change workflow before the policy window closes.",
            "healthy": "Continue monitoring; no intervention is supported by current evidence.",
        }[scenario]

    @staticmethod
    def _verification(scenario: str) -> list[str]:
        return ["Capture a fresh Redfish metric report", "Compare the affected resource with two healthy peers", "Confirm GPU clocks and workload throughput recover", "Close only after an engineer reviews the evidence"]

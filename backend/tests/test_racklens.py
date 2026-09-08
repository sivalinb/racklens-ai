import unittest
import json
from datetime import UTC, datetime
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch

from racklens.agent import ReliabilityAgent
from racklens.capabilities import capability_catalog, capability_summary
from racklens.collector import SimulatorTelemetryCollector
from racklens.evaluation import OCIArtifactPublisher, EXPECTED_TOP_CAUSES, publish_hosted, run_evaluation
from racklens.knowledge import LocalHybridRetriever
from racklens.simulator import RackSimulator, SCENARIOS
from racklens.training import build_training_examples, export_training_dataset, model_ops_manifest, train_adapter
from racklens.telemetry import CompositeTelemetryStore, MetricSample, SQLiteTelemetryStore, TelemetryTarget


class SimulatorTests(unittest.TestCase):
    def test_all_scenarios_create_four_racks_and_256_gpus(self):
        for scenario in SCENARIOS:
            snapshot = RackSimulator().snapshot(scenario)
            self.assertEqual(len(snapshot.racks), 4)
            self.assertEqual(sum(len(n.gpus) for r in snapshot.racks for n in r.nodes), 256)

    def test_cooling_scenario_marks_r02_only(self):
        snapshot = RackSimulator().snapshot("cooling_imbalance")
        self.assertEqual([r.id for r in snapshot.racks if r.health != "ok"], ["R02"])

    def test_power_cap_keeps_temperature_below_warning(self):
        snapshot = RackSimulator().snapshot("power_cap")
        rack = next(r for r in snapshot.racks if r.id == "R03")
        self.assertLess(rack.inlet_temp_c, 27)

    def test_extended_scenarios_emit_the_expected_redfish_events(self):
        expected = {
            "firmware_regression": "UpdateSuccessful",
            "nvlink_degradation": "InterconnectDegraded",
            "certificate_drift": "CertificateExpiring",
        }
        for scenario, message in expected.items():
            snapshot = RackSimulator().snapshot(scenario)
            self.assertTrue(any(message in event.message_id for event in snapshot.events))

    def test_unknown_scenario_is_rejected(self):
        with self.assertRaises(ValueError):
            RackSimulator().snapshot("invented")


class AgentTests(unittest.TestCase):
    def setUp(self):
        self.agent = ReliabilityAgent()

    def test_every_scenario_returns_three_valid_hypotheses(self):
        for scenario in SCENARIOS:
            result = self.agent.investigate(RackSimulator().snapshot(scenario))
            self.assertEqual(len(result.hypotheses), 3)
            evidence = {item.id for item in result.evidence}
            self.assertTrue(all(set(h.evidence_ids) <= evidence for h in result.hypotheses))

    def test_expected_top_hypothesis(self):
        expected = {"cooling_imbalance": "Cooling-path", "power_cap": "power cap", "pcie_degradation": "PCIe", "healthy": "No active"}
        for scenario, phrase in expected.items():
            top = self.agent.investigate(RackSimulator().snapshot(scenario)).hypotheses[0].title
            self.assertIn(phrase.lower(), top.lower())

    def test_human_review_executes_no_write(self):
        result = self.agent.investigate(RackSimulator().snapshot("power_cap"))
        approved = self.agent.review(result, True)
        self.assertEqual(approved.status, "approved")
        self.assertFalse(approved.spans[-1]["attributes"]["production_write"])

    def test_second_review_is_rejected(self):
        result = self.agent.investigate(RackSimulator().snapshot("healthy"))
        self.agent.review(result, False)
        with self.assertRaises(ValueError):
            self.agent.review(result, True)

    def test_retriever_returns_cited_sources(self):
        records = LocalHybridRetriever().search("thermal power cooling")
        self.assertGreaterEqual(len(records), 1)
        self.assertTrue(all(record.url.startswith("https://") for record in records))


class ProductPlatformTests(unittest.TestCase):
    def test_capability_catalog_covers_read_events_and_guarded_actions(self):
        catalog = capability_catalog()
        self.assertGreaterEqual(len(catalog), 12)
        self.assertEqual({item["access"] for item in catalog}, {"read", "event", "action"})
        self.assertFalse(capability_summary()["production_writes"])

    def test_training_dataset_has_versionable_splits_and_provenance(self):
        examples = build_training_examples(4)
        self.assertEqual(len(examples), len(SCENARIOS) * 4)
        self.assertEqual({item["split"] for item in examples}, {"train", "validation", "test"})
        self.assertTrue(all(item["provenance"] for item in examples))
        self.assertTrue(all(not item["human_approved"] for item in examples))

    def test_model_ops_keeps_untrained_adapters_blocked(self):
        manifest = model_ops_manifest()
        self.assertEqual(manifest["release_gate"]["status"], "blocked")
        self.assertTrue(all(item["status"] == "not_trained" for item in manifest["experiments"]))

    def test_training_refuses_unapproved_synthetic_data(self):
        with TemporaryDirectory() as directory:
            export_training_dataset(directory)
            with self.assertRaisesRegex(ValueError, "training gate blocked"):
                train_adapter(directory, f"{directory}/adapter")


class TelemetryStoreTests(unittest.TestCase):
    def test_sqlite_store_persists_normalized_redfish_samples(self):
        with TemporaryDirectory() as directory:
            store = SQLiteTelemetryStore(f"{directory}/telemetry.db")
            target = TelemetryTarget()
            sample = MetricSample(
                timestamp=datetime.now(UTC),
                metric="thermal.inlet_c",
                value=24.6,
                unit="Cel",
                source_uri="/redfish/v1/Chassis/R02/Thermal#/Temperatures/0",
                target=target,
                trace_id="tr_test",
            )
            self.assertEqual(store.insert_metrics([sample]), 1)
            rows = store.query_metrics(target)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["metric_name"], "thermal.inlet_c")
            self.assertEqual(rows[0]["trace_id"], "tr_test")

    def test_composite_store_fans_out_and_returns_common_accepted_count(self):
        class Sink:
            def __init__(self, accepted):
                self.accepted = accepted
                self.calls = 0

            def insert_metrics(self, samples):
                self.calls += 1
                return min(len(samples), self.accepted)

            def query_metrics(self, target, minutes=15):
                return []

        first, second = Sink(2), Sink(1)
        store = CompositeTelemetryStore([first, second])
        sample = MetricSample(
            datetime.now(UTC), "gpu.utilization_pct", 92, "%", "/redfish/v1", TelemetryTarget()
        )
        self.assertEqual(store.insert_metrics([sample, sample]), 1)
        self.assertEqual((first.calls, second.calls), (1, 1))

    def test_simulator_collector_emits_redfish_shaped_gpu_and_facility_metrics(self):
        with TemporaryDirectory() as directory:
            store = SQLiteTelemetryStore(f"{directory}/telemetry.db")
            result = SimulatorTelemetryCollector(store).collect_once("cooling_imbalance")
            self.assertEqual(result["samples_accepted"], 2816)
            self.assertFalse(result["production_writes"])
            rows = store.connection.execute(
                "SELECT DISTINCT metric_name, source_uri FROM metric_samples"
            ).fetchall()
            names = {row["metric_name"] for row in rows}
            self.assertTrue({"rack.power_kw", "thermal.inlet_c", "gpu.utilization_pct"} <= names)
            self.assertTrue(all(row["source_uri"].startswith("/redfish/") for row in rows))


class EvaluationTests(unittest.TestCase):
    def test_oci_publisher_uses_the_monitoring_ingestion_endpoint(self):
        oci = MagicMock()
        with patch.dict("sys.modules", {"oci": oci}):
            OCIArtifactPublisher("evaluations", "ocid1.compartment.test", "us-phoenix-1")

        oci.monitoring.MonitoringClient.assert_called_once_with(
            {"region": "us-phoenix-1"},
            signer=oci.auth.signers.InstancePrincipalsSecurityTokenSigner.return_value,
            service_endpoint="https://telemetry-ingestion.us-phoenix-1.oraclecloud.com",
        )

    def test_regression_suite_writes_a_complete_auditable_artifact(self):
        with TemporaryDirectory() as directory:
            summary, cases = run_evaluation(directory)
            self.assertEqual(summary.total_cases, len(SCENARIOS) * 10)
            self.assertEqual(summary.passed_cases, summary.total_cases)
            self.assertEqual(summary.citation_validity, 1.0)
            self.assertEqual(summary.unsafe_action_rate, 0.0)
            self.assertEqual({case.scenario for case in cases}, set(EXPECTED_TOP_CAUSES))
            self.assertTrue((__import__("pathlib").Path(summary.artifact_uri)).exists())

    def test_hosted_publish_uses_the_token_protected_run_envelope(self):
        class Response:
            status = 202

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        with TemporaryDirectory() as directory:
            summary, _ = run_evaluation(directory)
            with patch("racklens.evaluation.urlopen", return_value=Response()) as request_call:
                publish_hosted(summary, "https://racklens.example", "secret")
            request = request_call.call_args.args[0]
            payload = json.loads(request.data)
            self.assertEqual(payload["run"]["runId"], summary.id)
            self.assertEqual(request.headers["X-racklens-ingest-token"], "secret")


if __name__ == "__main__":
    unittest.main()

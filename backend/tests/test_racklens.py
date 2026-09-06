import unittest

from racklens.agent import ReliabilityAgent
from racklens.knowledge import LocalHybridRetriever
from racklens.simulator import RackSimulator, SCENARIOS


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


if __name__ == "__main__":
    unittest.main()

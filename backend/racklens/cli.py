from __future__ import annotations

import argparse
import json

from .agent import ReliabilityAgent
from .simulator import RackSimulator, SCENARIOS


def evaluate() -> int:
    simulator, agent = RackSimulator(), ReliabilityAgent()
    passed = 0
    for scenario in SCENARIOS:
        for seed in range(10):
            result = agent.investigate(RackSimulator(seed).snapshot(scenario, seed % 5))
            valid_ids = {e.id for e in result.evidence}
            valid = len(result.hypotheses) == 3 and all(set(h.evidence_ids) <= valid_ids for h in result.hypotheses) and result.status == "awaiting_review"
            passed += int(valid)
            print(json.dumps({"scenario": scenario, "case": seed + 1, "passed": valid, "top": result.hypotheses[0].title}))
    print(f"summary: {passed}/40 passed")
    return 0 if passed == 40 else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="RackLens Redfish reliability intelligence")
    sub = parser.add_subparsers(dest="command", required=True)
    investigate = sub.add_parser("investigate")
    investigate.add_argument("scenario", choices=SCENARIOS)
    sub.add_parser("evaluate")
    args = parser.parse_args()
    if args.command == "evaluate":
        raise SystemExit(evaluate())
    result = ReliabilityAgent().investigate(RackSimulator().snapshot(args.scenario))
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()

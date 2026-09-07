from __future__ import annotations

import argparse
import json
import os

from .agent import ReliabilityAgent
from .capabilities import capability_catalog, capability_summary
from .simulator import RackSimulator, SCENARIOS
from .training import export_training_dataset, model_ops_manifest, train_adapter
from .collector import RedfishTelemetryCollector
from .redfish import RedfishClient
from .telemetry import telemetry_store_from_env


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
    total = len(SCENARIOS) * 10
    print(f"summary: {passed}/{total} passed")
    return 0 if passed == total else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="RackLens Redfish reliability intelligence")
    sub = parser.add_subparsers(dest="command", required=True)
    investigate = sub.add_parser("investigate")
    investigate.add_argument("scenario", choices=SCENARIOS)
    sub.add_parser("evaluate")
    sub.add_parser("capabilities")
    dataset = sub.add_parser("build-training-dataset")
    dataset.add_argument("output")
    sub.add_parser("model-ops")
    train = sub.add_parser("train-adapter")
    train.add_argument("dataset")
    train.add_argument("output")
    train.add_argument("--method", choices=("lora", "qlora"), default="qlora")
    train.add_argument("--model", default="Qwen/Qwen2.5-3B-Instruct")
    collect = sub.add_parser("collect-redfish")
    collect.add_argument("--interval", type=int, default=0, help="poll interval; zero runs once")
    collect.add_argument("--data-center", default="DEN-01")
    collect.add_argument("--insecure", action="store_true", help="development only: disable TLS verification")
    args = parser.parse_args()
    if args.command == "evaluate":
        raise SystemExit(evaluate())
    if args.command == "capabilities":
        print(json.dumps({"summary": capability_summary(), "capabilities": capability_catalog()}, indent=2))
        return
    if args.command == "build-training-dataset":
        print(json.dumps(export_training_dataset(args.output), indent=2))
        return
    if args.command == "model-ops":
        print(json.dumps(model_ops_manifest(), indent=2))
        return
    if args.command == "train-adapter":
        train_adapter(args.dataset, args.output, args.method, args.model)
        return
    if args.command == "collect-redfish":
        required = ("REDFISH_BASE_URL", "REDFISH_USERNAME", "REDFISH_PASSWORD")
        missing = [name for name in required if not os.getenv(name)]
        if missing:
            parser.error(f"missing environment variables: {', '.join(missing)}")
        client = RedfishClient(
            os.environ["REDFISH_BASE_URL"],
            os.environ["REDFISH_USERNAME"],
            os.environ["REDFISH_PASSWORD"],
            verify_tls=not args.insecure,
        )
        collector = RedfishTelemetryCollector(client, telemetry_store_from_env(), args.data_center)
        if args.interval:
            collector.run(args.interval)
        else:
            print(json.dumps(collector.collect_once(), indent=2))
        return
    result = ReliabilityAgent().investigate(RackSimulator().snapshot(args.scenario))
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()

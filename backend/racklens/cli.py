from __future__ import annotations

import argparse
import json
import os

from .agent import ReliabilityAgent
from .capabilities import capability_catalog, capability_summary
from .collector import RedfishTelemetryCollector, SimulatorTelemetryCollector
from .evaluation import OCIArtifactPublisher, publish_hosted, run_evaluation
from .redfish import RedfishClient
from .simulator import RackSimulator, SCENARIOS
from .telemetry import telemetry_store_from_env
from .training import export_training_dataset, model_ops_manifest, train_adapter


def main() -> None:
    parser = argparse.ArgumentParser(description="RackLens Redfish reliability intelligence")
    sub = parser.add_subparsers(dest="command", required=True)
    investigate = sub.add_parser("investigate")
    investigate.add_argument("scenario", choices=SCENARIOS)
    evaluation = sub.add_parser("evaluate")
    evaluation.add_argument("--output-dir", default=".racklens/evaluations")
    evaluation.add_argument("--publish-oci", action="store_true")
    evaluation.add_argument("--publish-hosted", action="store_true")
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
    simulate = sub.add_parser("simulate-telemetry")
    simulate.add_argument("--interval", type=int, default=30)
    simulate.add_argument("--once", action="store_true")
    simulate.add_argument("--scenario", choices=SCENARIOS, default="cooling_imbalance")
    simulate.add_argument("--data-center", default="OCI-PHX-01")
    simulate.add_argument("--hall", default="Hall A")
    simulate.add_argument("--row", default="Row 02")
    args = parser.parse_args()
    if args.command == "evaluate":
        summary, _ = run_evaluation(args.output_dir)
        if args.publish_oci:
            required = ("OCI_BUCKET_NAME", "OCI_COMPARTMENT_OCID", "OCI_REGION")
            missing = [name for name in required if not os.getenv(name)]
            if missing:
                parser.error(f"missing environment variables: {', '.join(missing)}")
            publisher = OCIArtifactPublisher(
                os.environ["OCI_BUCKET_NAME"],
                os.environ["OCI_COMPARTMENT_OCID"],
                os.environ["OCI_REGION"],
            )
            artifact_uri = publisher.publish(summary, summary.artifact_uri)
            summary = type(summary)(**{**summary.__dict__, "artifact_uri": artifact_uri})
        if args.publish_hosted:
            required = ("RACKLENS_HOSTED_INGEST_URL", "RACKLENS_INGEST_TOKEN")
            missing = [name for name in required if not os.getenv(name)]
            if missing:
                parser.error(f"missing environment variables: {', '.join(missing)}")
            publish_hosted(
                summary,
                os.environ["RACKLENS_HOSTED_INGEST_URL"],
                os.environ["RACKLENS_INGEST_TOKEN"],
            )
        print(json.dumps(summary.hosted_row(), indent=2))
        raise SystemExit(0 if summary.passed_cases == summary.total_cases else 1)
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
    if args.command == "simulate-telemetry":
        collector = SimulatorTelemetryCollector(
            telemetry_store_from_env(), args.data_center, args.hall, args.row
        )
        if args.once:
            print(json.dumps(collector.collect_once(args.scenario), indent=2))
        else:
            collector.run(args.interval, args.scenario)
        return
    result = ReliabilityAgent().investigate(RackSimulator().snapshot(args.scenario))
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()

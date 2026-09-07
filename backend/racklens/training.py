from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from .agent import ReliabilityAgent
from .simulator import RackSimulator, SCENARIOS


@dataclass(frozen=True)
class AdapterConfig:
    method: str
    base_model: str
    rank: int
    alpha: int
    dropout: float
    target_modules: str
    quantization: str | None
    status: str = "not_trained"


ADAPTER_EXPERIMENTS = (
    AdapterConfig("LoRA", "3B–8B instruct model", 16, 32, 0.05, "attention projections", None),
    AdapterConfig("QLoRA", "3B–8B instruct model", 16, 32, 0.05, "all-linear", "4-bit NF4 + double quantization"),
)


def build_training_examples(variations: int = 10) -> list[dict]:
    """Create reproducible, synthetic instruction records from golden scenarios."""
    examples: list[dict] = []
    agent = ReliabilityAgent()
    for scenario in SCENARIOS:
        for variation in range(variations):
            snapshot = RackSimulator(seed=2048 + variation).snapshot(scenario, variation % 6)
            result = agent.investigate(snapshot)
            affected = [rack.id for rack in snapshot.racks if rack.health != "ok"]
            examples.append(
                {
                    "id": f"{scenario}-{variation + 1:03d}",
                    "scenario": scenario,
                    "split": "train" if variation < max(1, variations - 2) else "validation" if variation == variations - 2 else "test",
                    "messages": [
                        {
                            "role": "system",
                            "content": "Classify Redfish evidence and return a concise, citation-valid reliability brief. Never authorize a hardware write.",
                        },
                        {
                            "role": "user",
                            "content": json.dumps(
                                {
                                    "site": snapshot.site,
                                    "events": [asdict(event) for event in snapshot.events],
                                    "affected_racks": affected,
                                },
                                separators=(",", ":"),
                            ),
                        },
                        {
                            "role": "assistant",
                            "content": json.dumps(
                                {
                                    "fault_family": scenario,
                                    "summary": result.summary,
                                    "top_hypothesis": result.hypotheses[0].title,
                                    "confidence": result.hypotheses[0].confidence,
                                    "evidence_ids": result.hypotheses[0].evidence_ids,
                                    "next_safe_step": result.recommendation,
                                    "production_write": False,
                                },
                                separators=(",", ":"),
                            ),
                        },
                    ],
                    "provenance": "RackLens deterministic Redfish-shaped simulator",
                    "human_approved": False,
                }
            )
    return examples


def export_training_dataset(directory: str | Path, variations: int = 10) -> dict:
    output = Path(directory)
    output.mkdir(parents=True, exist_ok=True)
    examples = build_training_examples(variations)
    counts = {"train": 0, "validation": 0, "test": 0}
    handles = {split: (output / f"{split}.jsonl").open("w", encoding="utf-8") for split in counts}
    try:
        for example in examples:
            split = example["split"]
            handles[split].write(json.dumps(example, ensure_ascii=False) + "\n")
            counts[split] += 1
    finally:
        for handle in handles.values():
            handle.close()
    return {"total": len(examples), "splits": counts, "human_approved": 0}


def model_ops_manifest() -> dict:
    examples = build_training_examples()
    return {
        "dataset": {
            "synthetic_golden_examples": len(examples),
            "operator_approved_examples": sum(bool(item["human_approved"]) for item in examples),
            "promotion_minimum": 200,
            "provenance": "deterministic simulator",
        },
        "experiments": [asdict(item) for item in ADAPTER_EXPERIMENTS],
        "baseline": {"name": "deterministic rules + hybrid RAG", "status": "evaluated", "cases": len(examples)},
        "release_gate": {
            "status": "blocked",
            "reason": "LoRA and QLoRA remain untrained until operator-reviewed examples meet the data-quality gate.",
            "required": ["structured output >= 98%", "citation validity = 100%", "unsafe writes = 0", "no safety regression"],
        },
    }


def _validate_training_gate(dataset_directory: str | Path) -> int:
    directory = Path(dataset_directory)
    approved = 0
    total = 0
    for split in ("train", "validation"):
        source = directory / f"{split}.jsonl"
        if not source.exists():
            raise ValueError(f"missing required dataset split: {source}")
        with source.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.strip():
                    continue
                total += 1
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"invalid JSON in {source}:{line_number}") from exc
                approved += int(record.get("human_approved") is True)
    if total < 200 or approved != total:
        raise ValueError(
            "training gate blocked: at least 200 train/validation examples must all be operator approved"
        )
    return approved


def train_adapter(dataset_directory: str | Path, output_directory: str | Path, method: str = "qlora", model_id: str = "Qwen/Qwen2.5-3B-Instruct") -> None:
    """Optional PEFT/TRL training entry point; imports stay optional for the public demo."""
    _validate_training_gate(dataset_directory)
    try:
        import torch
        from datasets import load_dataset
        from peft import LoraConfig
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        from trl import SFTConfig, SFTTrainer
    except ImportError as exc:
        raise RuntimeError("Install racklens-ai[training] before training an adapter") from exc

    normalized = method.lower()
    if normalized not in {"lora", "qlora"}:
        raise ValueError("method must be lora or qlora")
    quantization = None
    if normalized == "qlora":
        quantization = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4_use_double_quant=True,
            bnb_4_compute_dtype=torch.bfloat16,
        )
    model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=quantization, device_map="auto")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    dataset = load_dataset("json", data_files={split: str(Path(dataset_directory) / f"{split}.jsonl") for split in ("train", "validation")})
    peft_config = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM", target_modules="all-linear" if normalized == "qlora" else ["q_proj", "v_proj"])
    trainer = SFTTrainer(
        model=model,
        processing_class=tokenizer,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        peft_config=peft_config,
        args=SFTConfig(output_dir=str(output_directory), num_train_epochs=2, learning_rate=1e-4, assistant_only_loss=True, report_to="none"),
    )
    trainer.train()
    trainer.save_model(str(output_directory))

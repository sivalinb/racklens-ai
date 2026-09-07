# Model operations

RackLens specializes models only after retrieval, evaluation, and human labeling are working. This keeps fine-tuning focused on the narrow behaviors that examples can teach: Redfish vocabulary, incident-summary structure, hypothesis ranking, and operator playbook style.

## Current state

- Base model plus hybrid RAG: evaluated against 70 deterministic replay cases
- Synthetic golden examples: 70
- Operator-approved training examples: 0
- LoRA adapter: configured, not trained
- QLoRA adapter: configured, not trained
- Release gate: blocked until at least 200 examples are reviewed

## Dataset contract

`racklens build-training-dataset training-data` creates versionable JSONL records with instruction, evidence-rich input, structured output, scenario, split, source provenance, and `human_approved: false`. Deterministic generation keeps examples in stable train, validation, and test splits.

Before training, an operator must verify the cited evidence, chosen cause, rejected alternatives, safety language, and any proposed verification steps. The training command enforces the gate: the train and validation files must contain at least 200 records and every record must set `human_approved` to `true`.

## Training paths

Install the optional dependencies:

```bash
pip install -e '.[training]'
```

Run full-precision LoRA:

```bash
racklens train-adapter reviewed.jsonl adapters/lora --method lora
```

Run memory-efficient 4-bit QLoRA:

```bash
racklens train-adapter reviewed.jsonl adapters/qlora --method qlora
```

Both use PEFT with rank 16, alpha 32, and dropout 0.05. QLoRA adds NF4 four-bit loading and double quantization. The default base model is `Qwen/Qwen2.5-3B-Instruct`, and can be replaced with `--model`.

## Promotion rubric

A candidate adapter must be compared with the base-plus-RAG system on the same frozen holdout set. Promotion requires:

- no regression in top-cause accuracy;
- 100% valid evidence citations;
- exactly three ranked hypotheses;
- preserved human-review and zero-write boundaries;
- acceptable p95 investigation latency;
- operator review of failure clusters and slice results.

The adapter should be rejected when it memorizes simulator wording, invents unsupported Redfish fields, weakens uncertainty language, or fails on a hardware/vendor slice.

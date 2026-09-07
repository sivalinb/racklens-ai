# Evaluation methodology

RackLens uses a frozen scenario family rather than claiming universal diagnostic accuracy.

## Golden scenarios

| Scenario            | Expected top cause            | Primary evidence                                    |
| ------------------- | ----------------------------- | --------------------------------------------------- |
| Cooling imbalance   | Cooling-path restriction      | inlet rise, broad clock loss, stable power          |
| Power cap           | Active chassis cap            | cap event, rack-wide clock loss, normal thermal     |
| PCIe degradation    | Negotiated link degradation   | link event, isolated traffic collapse               |
| Firmware regression | BMC firmware regression       | update event, fan-policy shift, thermal rise        |
| NVLink degradation  | Interconnect path degradation | fabric event, replay errors, collective slowdown    |
| Certificate drift   | BMC certificate expiry risk   | manager policy, certificate event, healthy hardware |
| Healthy             | No active anomaly             | healthy states and stable envelopes                 |

Each scenario is executed with ten deterministic step/seed variations for 70 total cases.

`racklens evaluate --output-dir .racklens/evaluations` writes a complete JSON artifact and one JSONL row per case. On OCI, the daily timer uploads the full JSON to a private Object Storage bucket, posts the aggregate metrics to the `racklens_ai` OCI Monitoring namespace, and sends the same bounded summary to `/api/evaluations/ingest`. The public `/cloud-lab` page links the data source and labels local versus OCI evidence.

```bash
racklens evaluate
racklens evaluate --publish-oci --publish-hosted
```

The publish flags require an OCI instance principal and environment values documented in [the OCI deployment guide](../infra/oci/README.md).

## Release gates

- Top cause matches the golden incident family
- Three competing hypotheses are returned
- Citation validity equals 100%
- Human review remains required
- Production writes equal zero
- Unit tests and web build pass

## Model promotion gates

Fine-tuning is evaluated as a challenger, never assumed to improve the product. A LoRA or QLoRA candidate must use a frozen, operator-approved test split and satisfy all existing safety and citation contracts. The current manifest contains 70 synthetic golden examples and zero operator-approved examples, so both adapters remain `not_trained` and release remains blocked.

## What this does not prove

The suite validates the checked-in model and safety contracts. It does not prove accuracy across every BMC vendor, OEM extension, server generation, GPU platform, or facility condition. Live deployments require a representative hardware validation set and human calibration.

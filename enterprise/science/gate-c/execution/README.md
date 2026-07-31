`execution/` is the mutable half of Gate C.

Rules:

1. Only run-local outputs may be written here.
2. No immutable specification artifact may be copied here and then edited.
3. Every run must live under `execution/runs/run-<NNN>/`.
4. Witnesses, evaluations, optional governance verdicts, logs, metrics, and reports belong to the current run only.
5. The authoritative scientific definition always remains in `../specification/`.

Required run layout:

```text
execution/runs/run-<NNN>/
├── run-manifest.yaml
├── actual/
│   ├── observations/
│   ├── witness/
│   │   ├── authority/
│   │   ├── meaning/
│   │   └── proof/
│   ├── evaluations/
│   └── verdicts/
├── logs/
├── metrics/
└── report.yaml
```

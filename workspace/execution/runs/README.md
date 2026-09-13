Create one directory per empirical run:

- `run-001`
- `run-002`
- `run-003`

Each run is mutable execution history. Do not place templates or immutable specification artifacts here.
Use `../../specification/manifests/run-manifest.example.yaml` as the authoring reference for `run-manifest.yaml`.
Use `../coverage-matrix.yaml` as the operational Gate C1 dashboard for objective progress across Positive Control,
Negative Control, coverage expansion, and falsification-analysis phases.
Use `../acceptance-contract.yaml` as the frozen operational contract for acceptance decisions, and
use `../acceptance-decisions.yaml` as the append-only acceptance decision log.
Acceptance evidence is stored outside run directories under `../acceptance/run-<NNN>/` as immutable,
decision-scoped artifacts named `GATE-C-ACCEPT-DECISION-*.yaml`.
Historical execution evidence under `run-<NNN>/` MUST be treated as immutable once established.
If operational interpretation changes, regenerate projections such as `../coverage-matrix.yaml` and
`../gate-c-status.yaml` instead of mutating historical evidence.

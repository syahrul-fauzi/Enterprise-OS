# Gate C Scientific Conformance Package

Gate C is the first scientific conformance framework for the frozen constitutional theory in [CC-001](file:///root/Enterprise%20OS/governance/CC-001-CONSTITUTIONAL-CHARTER.md). It is not a feature test for document management. Document workflows are only the first subject domain used to falsify or corroborate the three-predicate model.

The architectural decision now locked in this package is:

1. `constitution/` defines what is legitimate.
2. `governance/` defines how change is ratified.
3. `science/` defines how the theory is experimentally tested.

Gate C now also makes a kernel boundary explicit:

1. **Constitution Kernel** defines normative legitimacy.
2. **Science Kernel** defines how the theory is objectively tested.
3. **Implementation Kernel** realizes experiments across runtimes.

Within `science/`, Gate C now makes a second separation explicit:

1. **Specification** is immutable.
2. **Execution** is mutable.

That split is what allows Gate C to evolve from an internal experiment bundle into a scientific conformance suite comparable in shape to W3C conformance tests, LLVM test suites, or SQLite conformance harnesses.

## Package Model

```text
enterprise/science/gate-c/
├── README.md
├── specification/                         # Immutable scientific definition
│   ├── hypothesis.yaml                    # Theory under test
│   ├── protocol.yaml                      # Scientific method and acceptance rules
│   ├── truth-table.yaml                   # Executable 2^3 predicate truth table
│   ├── oracle/
│   │   └── oracle.yaml                    # Evaluator-only contract
│   ├── experiments/                       # Reference experiment specifications
│   ├── fixtures/                          # Canonical immutable dataset inputs
│   ├── dataset/                           # Portable reference dataset manifest
│   ├── expected/
│   │   ├── predicates/                    # Expected predicate vectors
│   │   └── evaluations/                   # Expected evaluation contracts
│   ├── manifests/                         # Reproducibility and witness bundle contracts
│   ├── schemas/                           # Machine-readable contracts
│   ├── tests/                             # Suite definitions by scientific hypothesis
│   │   ├── positive/
│   │   ├── negative/
│   │   ├── independence/
│   │   ├── metamorphic/
│   │   ├── counterfactual/
│   │   └── minimality/
│   └── candidate-predicate/               # Minimality candidates D1..Dn
└── execution/                             # Mutable run history only
    ├── README.md
    └── runs/
        └── run-<NNN>/
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

## Scientific Boundaries

### Specification

`specification/` is frozen input to the experiment. Running Gate C must not mutate:

- `hypothesis.yaml`
- `protocol.yaml`
- `truth-table.yaml`
- `experiments/**/*.yaml`
- `fixtures/**`
- `expected/**`
- `oracle/oracle.yaml`
- `manifests/**`
- `schemas/**`

### Execution

`execution/runs/run-<NNN>/` is the only mutable area. A run may add:

- observations
- witness bundles
- logs
- metrics
- evaluation artifacts
- optional governance verdict artifacts
- final report

No witness belongs inside `expected/`. Witnesses are observations produced by execution, not reference truth.

## Oracle Model

Gate C now treats the Oracle as a first-class scientific component:

```text
Specification
  -> Execution
  -> Witness
  -> Oracle
  -> Evaluation
  -> Verdict
```

The Oracle is evaluator-only:

- it reads immutable specification artifacts,
- it evaluates actual witness bundles,
- it maps predicate vectors to the truth table,
- it emits evaluations,
- it never generates witnesses and never edits fixtures.

This preserves the distinction between:

1. experiment definition,
2. experiment execution,
3. factual evaluation,
4. governance decision.

## Truth Table as Executable Specification

`truth-table.yaml` is normative executable specification, not prose documentation.

Every evaluated experiment must:

1. produce one predicate vector `A,B,C`,
2. map to exactly one truth-table row `P1..N7`, or
3. become `INCONCLUSIVE` if the predicates cannot be evaluated.

This means the truth table is the scientific oracle contract for constitutional validity, not a descriptive appendix.

## Reproducibility

Gate C includes a reproducibility layer so runs can be independently repeated across runtimes.

Specification-side reproducibility now consists of:

- a portable reference dataset manifest,
- a reproducibility manifest that acts as the laboratory notebook,
- a run manifest schema,
- a witness bundle layout contract.

Execution-side reproducibility consists of:

- immutable references to spec versions,
- run-local actual outputs,
- copied logs and metrics,
- enough metadata for an external implementation to replay the run.

## Scientific Test Suites

Gate C test taxonomy is now separated by scientific claim, not by implementation convenience:

1. `positive/` verifies the single `P1` pass row.
2. `negative/` tracks coverage for `N1..N7`.
3. `independence/` proves each witness is individually necessary.
4. `metamorphic/` checks evaluation invariance under strategy or runtime substitutions.
5. `counterfactual/` tests whether predicted predicate flips occur after controlled evidence changes.
6. `minimality/` tests whether new constitutional predicates are reducible to `A,B,C`.

This makes independence and minimality first-class scientific claims rather than afterthought checks.

## Current Status

### Completed

- Specification and execution are explicitly separated in the package model.
- Oracle is defined as an evaluator-only artifact.
- Oracle, Evaluation, and Verdict are explicitly separated.
- Truth table is treated as executable specification.
- Mutable execution output is isolated under `execution/runs/`.
- Test suite families are explicitly modeled for future expansion.
- Minimality and reference dataset have dedicated specification locations.

### Remaining High-Priority Work

1. Complete negative reference experiments to achieve full `8/8` truth-table coverage.
2. Freeze the portable reference dataset archive and populate final hashes.
3. Implement at least one concrete run under `execution/runs/run-001/`.
4. Add multi-runtime conformance runners so the same dataset can be replayed by TypeScript, Python, Rust, Go, and Java implementations.
5. Use counterfactual and minimality results as formal evidence for Epoch-1 constitution freeze readiness.

## Epoch-1 Readiness Criterion

Gate C becomes an actual scientific conformance framework when all four are true:

1. `Specification` and `Execution` are structurally separated.
2. Oracle is formal and evaluator-only.
3. Reproducibility metadata is machine-readable.
4. The reference dataset is portable across runtimes.

That is the point where Gate C stops being an internal experiment package and becomes a reusable scientific certification substrate for EOS.

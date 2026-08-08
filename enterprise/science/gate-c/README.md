# Gate C Scientific Conformance Package

Gate C is the first scientific conformance framework for the frozen constitutional theory in [CC-001](file:///root/Enterprise-OS/governance/CC-001-CONSTITUTIONAL-CHARTER.md). It is not a feature test for document management. Document workflows are only the first subject domain used to falsify or corroborate the three-predicate model.

The architectural decision now locked in this package is:

1. `constitution/` defines what is legitimate.
2. `governance/` defines how change is ratified.
3. `science/` defines how the theory is experimentally tested.

Gate C now also makes a kernel boundary explicit:

1. **Constitution Kernel** defines normative legitimacy.
2. **Science Kernel** defines how the theory is objectively tested.
3. **Implementation Kernel** realizes experiments across runtimes.

Gate C also now splits its scientific lifecycle into two epistemically distinct gates:

1. **Gate C0** calibrates the measurement apparatus.
2. **Gate C1** tests CC-001 using the calibrated apparatus.

That ordering is mandatory. Gate C0 does not test the theory. It certifies that the Oracle, Witness,
Manifest, Dataset, and Protocol are fit to measure the theory without contaminating later results.

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
    ├── acceptance-contract.yaml           # Frozen acceptance invariant contract
    ├── acceptance-decisions.yaml          # Append-only acceptance decision log
    ├── acceptance/
    │   └── run-<NNN>/
    │       └── GATE-C-ACCEPT-DECISION-*.yaml
    ├── gate-c-status.yaml                 # SSOT operational read model / projection
    ├── coverage-matrix.yaml               # Detailed Gate C1 coverage projection
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

## Gate Structure

```text
Gate C0
Scientific Instrument Calibration
  theory under test: NONE
  object under test: Oracle, Witness, Manifest, Dataset, Protocol
  output: calibration-report.yaml + instrument certificates

Gate C1
Constitutional Falsification Experiment
  theory under test: CC-001
  object under test: Reference Workflow
  precondition: overall.calibrated = true
```

This is the last point at which the Science Kernel may change. Once Gate C0 passes, the measurement
apparatus is calibrated and frozen until Epoch-1 unless an instrument defect is demonstrated.

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

## Governance Evidence

Gate C now separates governance evidence into three layers:

1. `acceptance-decisions.yaml` = append-only decision log
2. `acceptance/run-<NNN>/GATE-C-ACCEPT-DECISION-*.yaml` = immutable acceptance evidence per decision
3. `gate-c-status.yaml` = disposable projection regenerated from historical evidence

Acceptance evidence is written once per decision id and is never updated in place. If an acceptance state changes,
the system emits a new decision and a new acceptance artifact instead of overwriting the old one.

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
- calibration report identity and certificate identities for the measurement apparatus,
- run-local actual outputs,
- copied logs and metrics,
- enough metadata for an external implementation to replay the run.

Each Gate C1 run therefore states not only the Oracle version, but the exact calibration identity used to
measure the run, for example `SC-ORACLE-001`.

## Evidence Classes

Gate C uses three epistemic evidence classes:

1. `CLASS_I_CALIBRATION` proves the measurement apparatus is fit for use.
2. `CLASS_II_EXPERIMENTAL` records theory-testing evidence gathered under calibrated conditions.
3. `CLASS_III_CERTIFICATION` records conformance and cross-runtime certification results.

Calibration evidence is never reused as corroboration evidence for CC-001. It only proves the apparatus.

## Scientific Test Suites

Gate C test taxonomy is now separated by scientific claim, not by implementation convenience.
Terminology uses scientific CONTROL terminology (not "Test") to reflect Gate C's epistemological role:

1. `positive/` = **Positive Control** suite — establishes the PASS baseline. Verifies the single `P1` pass row under calibrated conditions.
2. `negative/` = **Negative Control** suite — falsification suite. Exercising coverage for each `N1..N7` truth table negative rows against H1 (all individually necessary and jointly sufficient).
3. `independence/` = **Independence Controls** — proves each witness is individually necessary (remove witness_A alone; PASS must become INCONCLUSIVE).
4. `metamorphic/` = **Metamorphic Controls** — checks evaluation invariance under strategy or runtime substitutions (Strategy fungibility test of Predicate B).
5. `counterfactual/` = **Counterfactual Controls** — tests whether predicted predicate flips occur after controlled evidence changes (prediction vs retrodiction check of H1).
6. `minimality/` = **Minimality Controls** — tests whether new constitutional predicates are reducible to `A,B,C` or whether H1 is under-specified.

### Scientific Phase Ordering (Mandatory)

Phase 1. **Positive Control Establishment** (P1 PASS with calibrated apparatus) → completed at run-001.  
Phase 2. **Negative Control Calibration** (≥1 negative control per predicate, 5 hardened Exit Criteria each) → N1 complete; N2 and N4 are the next individual-predicate controls required before joint-failure rows.
Phase 3. **Truth Table Coverage Expansion** (all 8/8 rows P1..N7 exercised).  
Phase 4. **Falsification Analysis** (independence + minimality + counterfactual suites green = corroboration claim; any 9th row, any failure in controls = FALSIFICATION).

This ordering ensures each successive phase has its measurement apparatus validated before scientific results are claimed.


## Current Status

### Completed

- Specification and execution are explicitly separated in the package model.
- Gate C0 is defined as Scientific Instrument Calibration and Gate C1 as the Constitutional Falsification Experiment.
- Oracle is defined as an evaluator-only artifact.
- Oracle, Evaluation, and Verdict are explicitly separated.
- Science Kernel freeze after Gate C0 is explicitly modeled.
- Truth table is treated as executable specification.
- Mutable execution output is isolated under `execution/runs/`.
- Calibration evidence, experimental evidence, and certification evidence are explicitly separated.
- Test suite families are explicitly modeled for future expansion.
- Minimality and reference dataset have dedicated specification locations.

### Remaining High-Priority Work

1. Complete negative reference experiments to achieve full `8/8` truth-table coverage.
2. Materialize final frozen hashes for the already calibrated specification bundle and portable dataset archive.
3. Implement at least one concrete run under `execution/runs/run-001/`.
4. Add multi-runtime conformance runners so the same dataset can be replayed by TypeScript, Python, Rust, Go, and Java implementations.
5. Use counterfactual and minimality results as formal evidence for Epoch-1 constitution freeze readiness.

## Epoch-1 Readiness Criterion

Gate C becomes an actual scientific conformance framework when all four are true:

1. `Specification` and `Execution` are structurally separated.
2. Gate C0 calibration certificates and kernel epistemic status are frozen and referenced by every run.
3. Oracle is formal and evaluator-only.
4. Reproducibility metadata is machine-readable.
5. The reference dataset is portable across runtimes.

That is the point where Gate C stops being an internal experiment package and becomes a reusable scientific certification substrate for EOS.

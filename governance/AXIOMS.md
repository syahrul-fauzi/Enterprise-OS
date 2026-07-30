# Axioms Index

Status: Frozen Reference

This file is an operational index for Sprint 0. It does not replace the
constitutional source of truth.

## Canonical References

- `CONSTITUTION.md` is the constitutional baseline.
- `enterprise/specifications/architecture-baseline-v1.yaml` is the frozen
  architecture baseline.
- `enterprise/specifications/specification-authoring-guide.md` governs
  specification authoring.
- `enterprise/specifications/specification-execution-specification.md` governs
  deterministic execution from specification to proof artifacts.

## Axioms Applied in Sprint 0

1. Evidence first
2. Contract first
3. Controlled evolution through governance
4. Requirement identity as root aggregate anchor
5. Canonical contracts as single source of truth
6. Deterministic build and proof production
7. No duplicated business logic across package boundaries
8. No structural evolution without ADR-backed approval

## Implementation Axioms (Sprint 0 Locked — No-Discussion Zone)

### AXIOM-IMP-001: Engine is Executor, Not Knowledge Creator

> Engine tidak pernah menjadi tempat lahirnya pengetahuan. Engine hanya menjadi executor dari pengetahuan yang telah dibekukan dalam artefak canonical.

Ontological position: Engine is a Layer 5 consumer of Layer 4 canonical artifacts. Engine MUST NOT contain hardcoded transformation logic, business predicates, or architectural knowledge. All behavior MUST be resolved via registry lookup from canonical artifacts.

Anti-patterns explicitly forbidden:
- `switch(id) case "T001": executeHardcoded()` branching in runtime source
- Business knowledge encoded as conditional logic inside engine packages
- Hardcoded pipeline step names or transformation sequences by literal ID

### AXIOM-IMP-002: Knowledge Before Execution (KBE)

> Tidak ada executable behavior yang boleh dibuat sebelum canonical knowledge yang mendefinisikannya tersedia.

For any `executeT<NNN>()` or equivalent runtime function to exist, ALL of the following MUST be present and parseable by tooling BEFORE the first line of implementation is written:
1. Contract (`contracts/transformations/t<NNN>-*.contract.yaml`)
2. Schema (TypeScript types + Zod schemas in the relevant canonical package)
3. Predicate (minimum 3 predicates registered in predicate-registry)
4. Registry Entry (transformation-registry declares the transformation with lifecycle ≥ DRAFT)
5. Golden Reference (input artifact with stable identity and hash)

Implementation completion claim WITHOUT all 5 knowledge artifacts present = AUTOMATIC REJECT per governance ACL.

---

### AXIOM-IMP-003: Contract MUST NOT Know Executable

Dependency direction: Contract layer points DOWNWARD to Canonical, NEVER upward to executable implementation.

Contract MUST NOT contain references to:
- Specific function names or implementation module paths
- Programming language constructs (TS, Python, Rust types outside canonical schema)
- Engine runtime identifiers or scheduler queue names

Consequence: `Contract → Schema → Registry → Executable` is the ONLY allowed edge direction. Reverse edges (`Executable → Contract` consumer reads are ALLOWED for resolution; `Contract → Executable` producer writes are FORBIDDEN).

### AXIOM-IMP-004: Registry MUST NOT Know Engine

Dependency direction: Registry entries are pure canonical declarations. Engine is a downstream consumer of registry, NEVER a structural dependency of registry.

Registry source files (`@repo/core-transformation-registry/*`, `@repo/core-predicate-registry/*`) MUST NOT:
- Import from `packages/engine/*`
- Import from `packages/tooling/*-cli`
- Reference scheduler lifecycle events, worker pools, or CI run IDs

Consequence: Registy packages are publishable as standalone canonical definition bundles with ZERO runtime-platform dependencies.

### AXIOM-IMP-005: Predicate MUST NOT Know Runtime

Predicate declarations are mathematical boolean properties over inputs and outputs. They do not encode HOW evaluation happens, only WHAT property is evaluated.

Predicate registry entries MUST NOT contain:
- Runtime function pointers or closures
- References to `process.env`, `Date.now()`, timers, or OS syscalls
- Import from any engine/runner/emitter packages

Predicate *evaluator* implementations live in tooling packages. Predicate *declarations* live in the canonical predicate registry package and contain only identity, phase, order, severity, and property description.

### AXIOM-IMP-006: Transformation MUST NOT Know Scheduler

A standalone transformation function (`runT001`, `runT002`, …) is a pure function of canonical input only. It has zero awareness that it is being run inside a DAG pipeline, scheduled, retried, or distributed.

Transformation implementation source MUST NOT:
- Import `dagre`, `cron`, bull-queue, airflow, or any scheduler/queue library
- Accept `run_id`, `attempt`, `scheduled_at`, or pipeline identity as parameters
- Communicate with sibling transformations via global/shared mutable state

Only the **Transformation Engine (Gate D)** is allowed to read precedence / predecessor rules from the catalog and schedule accordingly. Individual transformations are oblivious.

### AXIOM-IMP-007: Proof MUST NOT Know Orchestrator

Proof objects are the emitted result of observing execution. They do not reference the orchestrator that produced them. The only identity Proof may reference is its own canonical chain.

TransformationProofEntry / ExecutionProofEntry / RepositoryProofEntry schemas MUST NOT contain:
- Orchestrator hostname, process ID, CI job URL fields
- Engine version strings or CLI build hashes as proof fields
- Mutable pointers back to orchestrator state

Proof Ledger append-only structure is self-authenticating via hash chain. Orchestrator metadata, IF required for audit, lives in a SIDE append-only *Execution Audit Log* that is NEVER read back by the proof verifier.

---

### AXIOM-IMP-003..007 Combined Corollary: Dependency Graph MUST Remain a DAG

All five invariants (003-007) together produce a strict **Directed Acyclic Graph**:

```
Constitution → Governance → Canonical Contracts
    ↓                          ↓
Transformation Catalog → Transformation Registry  →  Transformation Implementation
    ↓                          ↓                          ↓
Predicate Registry      →      Predicate Evaluator    →  Predicate Results
                                              ↘              ↓
Proof Schema (Transformation / Execution / Repository) → Proof Ledger
                                                             ↑
Engine (Gate D onwards) = downstream consumer ONLY — NO upward edges
```

Any code change that introduces a cycle in this graph = AUTOMATIC REJECT per architecture conformance check (`pnpm arch-check` fail with architecture_cycle error code).

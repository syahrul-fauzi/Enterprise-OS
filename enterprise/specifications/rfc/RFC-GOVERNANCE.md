# RFC Governance and Constitutional Traceability

## Status
✅ Active

## Purpose
Define how RFCs must trace back to the frozen constitutional layer and how
changes must be classified to prevent architecture drift.

## RFC Maturity Model
Every RFC MUST declare one maturity status from the controlled set below.
The machine-readable source of truth for lifecycle ordering and policy floors is
`enterprise/specifications/evolution/maturity-model.yaml`.

| Status | Meaning | Implementation Allowed? |
| --- | --- | --- |
| `Draft` | Early design, unstable semantics | No |
| `Proposed` | Reviewed specification candidate | Experimental only |
| `Accepted` | Official contract baseline | Yes |
| `Implemented` | Backed by implementation evidence | Yes |
| `Conformant` | Backed by mandatory conformance evidence | Yes |
| `Verified` | Backed by verification evidence in live governance flow | Yes |
| `Stable` | Verified across release cycles without open drift | Yes |
| `Deprecated` | Superseded by newer RFC or contract | Migration only |

Normative rules:

1. Implementations MUST NOT claim conformance to an RFC with status `Draft`.
2. Experimental implementations MAY target `Proposed` RFCs only when clearly
   marked non-canonical.
3. `Accepted` MUST indicate the specification is stable enough to govern
   contract and runtime work.
4. `Implemented` MUST require implementation evidence.
5. `Conformant` MUST require passing conformance evidence for mandatory clauses.
6. `Verified` MUST require verification evidence and reference tests.
7. `Stable` SHOULD require repeated verified use across release cycles.
8. `Deprecated` MUST include migration notes and successor references.

## Constitutional Traceability Requirement
Every RFC MUST declare:

1. which ADR invariants it realizes
2. which contracts it constrains
3. which implementation surfaces it governs
4. which verification surfaces prove conformance

Canonical chain:

```text
ADR (Invariant)
        ↓
RFC (Specification)
        ↓
Contracts
        ↓
Implementation
        ↓
Verification
```

An RFC that cannot be traced to constitutional invariants is not ready for
implementation.

An implementation change that cannot be traced to an RFC is not ready for
integration.

## Dependency and Traceability Metadata
Every RFC MUST declare implementation-facing metadata in a structured form.

Minimum metadata:

```yaml
depends_on:
  - ADR-0009
required_by:
  - RFC-XXXX
implemented_by:
  - runtime-contracts/models/*
verified_by:
  - tests/example.test.ts
```

Rules:

1. `depends_on` MUST identify constitutional and specification dependencies.
2. `required_by` SHOULD identify downstream RFCs or contracts.
3. `implemented_by` MUST point to the contract or implementation surfaces
   expected to realize the RFC.
4. `verified_by` MUST identify verification evidence once available.
5. RFCs that depend on `RFC-0001` MUST reuse its vocabulary for identity,
   reference, digest, snapshot, version, and artifact semantics instead of
   redefining those terms locally.

## Required RFC Header
Every RFC MUST include:

- `Status`
- `Type`
- `Owner`
- `Purpose`
- `Specification Metadata`
- `Constitutional Traceability`
- `Scope`
- `Normative Requirements`
- `Conformance Requirements`
- `Contracts`
- `Validation`
- `Acceptance Criteria`
- `Implementation Evidence`
- `Verification Evidence`
- `Reference Tests`
- `Migration Notes`
- `Traceability`

## Normative Language
All binding requirements in an RFC MUST use approved normative vocabulary:

- `MUST`
- `MUST NOT`
- `SHALL`
- `SHALL NOT`
- `SHOULD`
- `SHOULD NOT`
- `MAY`

Words such as "sebaiknya", "disarankan", "idealnya", or similar advisory prose
MUST NOT be interpreted as binding contract language unless paired with the
approved normative vocabulary above.

## Change Classification
Every substantive change in the control plane MUST be classified as one of:

### ADR Change
Use only when a frozen platform invariant changes.

### RFC Change
Use when a technical specification evolves without changing the constitutional
layer.

Canonical identity, reference, digest, and snapshot semantics MUST be treated
as RFC-layer changes, not as incidental implementation edits.

Specification meta-model changes MUST be handled in `RFC-0001`, not duplicated
across downstream RFCs.

### Implementation Change
Use when code changes to realize an existing RFC.

### Policy Change
Use when evaluator or decision rules evolve without changing architecture or
runtime contracts.

## Conformance and Exit Criteria
Every RFC MUST define explicit conformance and exit criteria.

Conformance requirements MUST state:

- what a contract implementation MUST do
- what it MUST NOT do
- what verification MUST confirm

Exit criteria MUST provide auditable movement across maturity states:

`Draft -> Proposed -> Accepted -> Implemented -> Conformant -> Verified -> Stable -> Deprecated`

State advancement MUST be justified by evidence, not by opinion alone.

## Review Rules
1. RFC review MUST verify constitutional traceability first.
2. RFC review MUST verify maturity status and exit criteria before approval.
3. Contract review MUST verify RFC alignment before implementation detail.
4. Implementation review MUST verify contract conformance before optimization.
5. Policy review MUST verify it does not silently change architectural
   boundaries.

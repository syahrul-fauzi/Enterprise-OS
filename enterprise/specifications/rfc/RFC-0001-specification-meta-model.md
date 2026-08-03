# RFC-0001: Specification Meta-Model

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the formal specification language for the EOS control plane, including
the canonical vocabulary, identity model, reference semantics, digest rules,
snapshot semantics, artifact taxonomy, lifecycle classes, version semantics,
and compatibility placement rules that every downstream RFC MUST reuse.

## Specification Metadata
```yaml
depends_on:
  - ADR-0009
  - ADR-0010
  - ADR-0011
  - ADR-0012
required_by:
  - RFC-0002
  - RFC-0003
  - RFC-0004
  - RFC-0005
  - RFC-0006
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/*
verified_by:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - ECG is the SSOT for control-plane facts and relations
    - Compatibility is edge semantics
  ADR-0010:
    - Facts and decisions are separated semantically
    - Decision replay requires stable references
  ADR-0011:
    - Runtime layering is frozen
    - Platform consolidation starts with contracts before implementation
  ADR-0012:
    - Runtime implementations depend on contracts, not each other
    - DTO are immutable contract objects
```

## Scope
- In scope:
  - specification vocabulary
  - canonical identity families
  - canonical identifier grammar
  - canonical references
  - digest semantics
  - snapshot semantics
  - artifact taxonomy
  - lifecycle classes
  - version and revision semantics
  - compatibility placement rules
- Out of scope:
  - graph traversal algorithms
  - evaluator lifecycle
  - automation execution lifecycle

## Problem Statement
The platform now has frozen architectural layers, but downstream RFCs still
need a shared language. Without a specification meta-model, each RFC can drift
in how it defines identity, reference, digest, snapshot, artifact, lifecycle,
or compatibility semantics. That drift would eventually leak into contracts,
runtime behavior, replay, storage layout, and automation.

## Normative Requirements
1. Every downstream RFC MUST reuse the vocabulary defined in this RFC for
   identity, reference, digest, snapshot, version, revision, artifact,
   evidence, evaluation, decision, and action semantics.
2. Every control-plane object MUST be addressable through a canonical identity.
3. Runtime contracts MUST exchange references, not filesystem paths.
4. References MUST carry enough linkage to support replay independent of
   storage implementation.
5. Digest semantics MUST be stable for semantically equivalent snapshots.
6. Snapshot identity MUST be separable from storage location.
7. Compatibility SHALL belong to relationships, not to identity.
8. Artifact categories MUST declare whether they are immutable, authoritative,
   generated, and presentation-oriented.

## Conformance Requirements
1. Contract models MUST expose canonical identity and reference shapes without
   embedding storage paths.
2. Downstream RFCs MUST NOT redefine identity, reference, digest, or snapshot
   semantics locally.
3. Runtime implementations MUST NOT use filesystem location as canonical
   addressing.
4. Verification MUST confirm identity, reference, digest, snapshot, and
   artifact semantics are deterministic and reused consistently.

## Contracts
- Vocabulary:
  - `Identity`
  - `Reference`
  - `Digest`
  - `Snapshot`
  - `Version`
  - `Revision`
  - `Schema`
  - `Artifact`
  - `Evidence`
  - `Evaluation`
  - `Decision`
  - `Action`
- Identity families:
  - `NodeId`
  - `EdgeId`
  - `DecisionId`
  - `EvaluationId`
  - `LedgerEntryId`
  - `EvidenceId`
  - `PolicyId`
  - `SessionId`
  - `ExecutionId`
- Reference families:
  - `IdentityReference`
  - `SnapshotReference`
  - `DecisionReference`
  - `EvidenceReference`
  - `VersionReference`
- SPI interfaces:
  - consumed by all future SPI
- Digest / identity semantics:
  - `id`
  - `version`
  - `digest`
  - `sequence`
  - `snapshot`

## Vocabulary Definitions
| Term | Meaning |
| --- | --- |
| `Identity` | Canonical stable identifier for a control-plane object |
| `Reference` | Addressable pointer to an identity, optionally bound to snapshot, version, sequence, or digest |
| `Digest` | Deterministic content-derived fingerprint used for replay and verification |
| `Snapshot` | Time-bound or sequence-bound view of facts or decisions |
| `Version` | Semantically governed compatibility version |
| `Revision` | Successive change to the same semantic object within version semantics |
| `Schema` | Formal structure governing machine-readable contract payloads |
| `Artifact` | Materialized object produced or governed by the control plane |
| `Evidence` | Fact-bearing artifact used to support evaluation or verification |
| `Evaluation` | Structured assessment result produced from facts |
| `Decision` | Synthesized outcome produced from evaluations |
| `Action` | Executable consequence triggered from a decision |

## Canonical Identifier Grammar
Canonical identifiers SHOULD converge toward one stable grammar family such as:

- `urn:eos:capability:<id>`
- `urn:eos:decision:<id>`
- `urn:eos:evaluation:<id>`
- `urn:eos:artifact:<id>`
- `urn:eos:snapshot:<id>`
- `urn:eos:ledger:<id>`

The final accepted lexical grammar MUST be:

- storage-agnostic
- deterministic
- parseable
- namespace-safe
- reusable across API, query, storage, MCP, and automation boundaries

## Reference Semantics
Reference categories are not interchangeable.

- `IdentityReference`: points to a canonical identity
- `SnapshotReference`: binds lookup to a specific captured view
- `DecisionReference`: binds decision identity to ledger lookup semantics
- `EvidenceReference`: addresses evidence without assuming storage layout
- `VersionReference`: binds lookup to a governed version surface

Every reference SHOULD be able to carry the minimal tuple needed for replay:

- `id`
- `version` or `sequence` where relevant
- `digest` where verification is required

## Artifact Taxonomy
| Artifact | Immutable | Source of Truth | Generated | Purpose |
| --- | --- | --- | --- | --- |
| `ECG` | Yes | Yes | No | Facts |
| `Evaluator Result` | Yes | No | Yes | Evaluation |
| `Decision Ledger` | Yes | Yes | Yes | Decisions |
| `Projection` | No | No | Yes | Presentation |
| `Dashboard` | No | No | Yes | Visualization |
| `Gate C Status` | No | No | Yes | Operational readout |

Artifact taxonomy MUST answer:

- whether the artifact is immutable
- whether it is authoritative
- whether it is generated
- what semantic purpose it serves

## Lifecycle Classes
Artifact lifecycle classes are distinct and MUST NOT be conflated.

### Artifact lifecycle
- `Draft`
- `Materialized`
- `Verified`
- `Superseded`
- `Archived`

### Decision lifecycle
- `Pending`
- `Approved`
- `Blocked`
- `Executed`
- `Expired`

### RFC maturity lifecycle
- `Draft`
- `Proposed`
- `Accepted`
- `Implemented`
- `Verified`
- `Deprecated`

## Version and Revision Semantics
`Version` and `Revision` serve different purposes.

- `Version` captures governed compatibility meaning
- `Revision` captures successive updates within that semantic scope

Downstream RFCs MUST state whether they evolve through:

- version change
- revision change
- snapshot supersession

and MUST NOT treat those transitions as interchangeable.

## Compatibility Placement Rules
Compatibility is a relationship concern, not an identity concern.

- Compatibility SHALL NOT belong to `Identity`
- Compatibility SHALL NOT be embedded as a permanent attribute of object identity
- Compatibility SHALL belong to `Relationship`
- Compatibility SHALL be evaluated against versioned references and dependency context

## Lifecycle
- States:
  - `draft`
  - `stable`
  - `versioned`
- Transitions:
  - `draft -> stable`
  - `stable -> versioned`
- Preconditions:
  - canonical identifier grammar
  - canonical reference grammar

## Validation
- Contract validation:
  - canonical vocabulary validation
  - canonical id grammar validation
  - canonical reference shape validation
  - artifact taxonomy consistency validation
- Replay / determinism validation:
  - identical snapshots produce identical digests and references
- Boundary validation:
  - contracts do not exchange filesystem paths
  - downstream RFCs do not redefine vocabulary owned by RFC-0001

## Acceptance Criteria
- Core specification vocabulary is enumerated and reusable.
- Canonical identity families are enumerated and versioned.
- Reference shapes are defined independently of storage implementation.
- Artifact taxonomy distinguishes authoritative objects from projections.
- Digest and snapshot linkage rules are explicit enough to support replay.
- Compatibility placement rules prevent drift into identity semantics.

## Implementation Evidence
- Current status: Planned
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models`

## Verification Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Migration Notes
- Existing `RuntimeIdentifierSchema` is a temporary baseline and will require
  typed identity families when this RFC becomes `Accepted`.
- Existing references to projections, status files, and readouts should be
  aligned to the artifact taxonomy rather than treated as equivalent objects.

## Traceability
```text
ADR-0009/0010/0011/0012
        ↓
RFC-0001
        ↓
runtime-contracts/models/*
        ↓
future graph, ledger, evaluator, and automation specs
        ↓
implementation contracts and verification
```

## Implementation Notes
- Reference package paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models`
- Migration notes:
  - existing `RuntimeIdentifierSchema` should evolve toward typed identity
    families once the RFC is finalized
  - downstream RFCs should progressively replace local wording with RFC-0001
    vocabulary
- Compatibility notes:
  - identity and reference grammar changes require versioned migration

## Open Questions
- Should all identity families share one lexical grammar or use typed prefixes?
- Should references always include digest, or allow lazy lookup by id only?
- Should artifact taxonomy distinguish between projections and operational
  readouts beyond the current wave-one set?

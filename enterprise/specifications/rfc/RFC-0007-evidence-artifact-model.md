# RFC-0007: Evidence Artifact Model

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the canonical evidence artifact grammar for EOS so that conformance,
runtime, build, policy, and governance evidence surfaces share one auditable
envelope with stable identity, digest, projection lineage, and claim boundary.

## Specification Metadata
```yaml
depends_on:
  - ADR-0009
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
required_by:
  - none
implemented_by:
  - workspace/packages/tooling/eos-cli/src/evidence-artifact-runtime.ts
  - workspace/packages/tooling/eos-cli/src/specification-projection-runtime.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/evidence-artifact-runtime.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - Evidence artifacts SHALL remain explicit decision-support artifacts inside the enterprise control graph
  ADR-0010:
    - Governance surfaces SHALL consume materialized results rather than re-evaluating facts implicitly
  ADR-0011:
    - Evidence materialization SHALL remain a distinct runtime boundary
  ADR-0012:
    - Evidence producers and consumers SHALL communicate through stable contracts and digest linkage
```

## Scope
- In scope:
  - canonical evidence envelope fields
  - subject linkage
  - projection linkage
  - canonical digest materialization
  - unsigned signature placeholder semantics
  - claim boundary semantics
- Out of scope:
  - cryptographic signing provider implementation
  - tenant-specific retention policy
  - domain-specific evidence body schemas

## Problem Statement
EOS already materializes reports, projections, and evidence, but governance
cannot remain self-describing if each evidence family invents its own grammar.
Without one canonical evidence model, auditability, cross-runtime consumption,
and Gate C integration drift toward report-specific logic.

## Normative Requirements
1. Every canonical evidence artifact MUST expose `artifact_id`,
   `artifact_type`, `schema_version`, `generated_at_utc`, `subject`,
   `projection`, `summary`, `findings`, `evidence`, `digest`, `signature`,
   and `claim_boundary`.
2. Every canonical evidence artifact MUST link to its governed subject through
   `subject_ref` and `subject_type`, and SHOULD include `subject_digest` when
   the subject surface is materialized.
3. Every canonical evidence artifact derived from a projection MUST carry
   `projection_id`, `projection_type`, and `projection_digest`, and MAY carry
   `projection_ref` when the projection is persisted.
4. The `digest` MUST be computed from canonical artifact content and MUST NOT
   depend on storage path or incidental formatting.
5. The `claim_boundary` MUST state what the artifact proves and what remains
   outside the claim.
6. Evidence producers MAY emit `signature.status = UNSIGNED`, but they MUST
   provide an explicit reason until governed trust signing is materialized.

## Conformance Requirements
1. Verification MUST confirm the canonical evidence envelope fields are
   materialized for active evidence artifacts.
2. Verification MUST confirm digest determinism across repeated
   materialization with identical governed inputs.
3. Verification MUST confirm projection lineage is preserved when evidence is
   persisted and re-consumed by governance surfaces.

## Contracts
- Canonical fields:
  - `artifact_id`
  - `artifact_type`
  - `schema_version`
  - `generated_at_utc`
  - `subject`
  - `projection`
  - `summary`
  - `findings`
  - `evidence`
  - `digest`
  - `signature`
  - `claim_boundary`
- Runtime surfaces:
  - `materializeCanonicalEvidenceArtifact`
  - `writeCanonicalEvidenceArtifact`

## Validation
- Canonicalization validation:
  - evidence digest is stable for identical canonical content
- Linkage validation:
  - subject and projection lineage remain explicit
- Signature placeholder validation:
  - unsigned state is explicit and machine-readable

## Acceptance Criteria
- EOS evidence producers share one canonical evidence envelope.
- Materialized evidence is projection-aware and digest-addressable.
- Governance surfaces can consume evidence without report-specific parsing.

## Implementation Evidence
- Current status: Materialized
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/evidence-artifact-runtime.ts`
  - `workspace/packages/tooling/eos-cli/src/specification-projection-runtime.ts`

## Verification Evidence
- Current status: Materialized
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/evidence-artifact-runtime.test.ts`
  - `workspace/foundation/evidence/verification/specification-conformance-evidence.json`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/evidence-artifact-runtime.test.ts`

## Migration Notes
- Existing JSON reports MAY remain as compatibility projections, but canonical
  governance evidence MUST converge to the evidence artifact model defined here.

## Traceability
```text
ADR-0009/0010/0011/0012
        ↓
RFC-0007
        ↓
evidence-artifact-runtime.ts
        ↓
projection-aware evidence producers
        ↓
canonical evidence artifacts
        ↓
Gate C / governance consumers
```

## Implementation Notes
- The evidence model is intentionally domain-agnostic at the envelope layer.
- Domain-specific summaries and evidence bodies remain extensible.

## Open Questions
- Should governed signing profiles become a dedicated `SPEC-*` family once the
  trust framework is generalized?
- Should canonical evidence carry mandatory retention metadata or remain
  consumer-specific?

# CONF-0007: Evidence Artifact Model Conformance

## Status
Conformant

## Type
Conformance Specification

## Owner
Lead Enterprise Architect

## Purpose
Define how EOS proves conformance to the canonical evidence artifact model in
RFC-0007.

## Specification Traceability
```yaml
proves:
  - RFC-0007
depends_on:
  - RFC-0001
contracts:
  - workspace/packages/tooling/eos-cli/src/evidence-artifact-runtime.ts
  - workspace/packages/tooling/eos-cli/src/specification-projection-runtime.ts
implementations:
  - workspace/packages/tooling/eos-cli/src/evidence-artifact-runtime.ts
  - workspace/packages/tooling/eos-cli/src/specification-projection-runtime.ts
tests:
  - workspace/packages/tooling/eos-cli/tests/evidence-artifact-runtime.test.ts
evidence:
  - workspace/foundation/evidence/verification/specification-conformance-projection.json
  - workspace/foundation/evidence/verification/specification-conformance-evidence.json
```

## Scope
- In scope:
  - canonical evidence envelope fields
  - deterministic digest materialization
  - subject and projection linkage
  - explicit unsigned signature placeholder
- Out of scope:
  - external signing authority integration
  - retention and archival policy

## Conformance Clauses
1. Canonical evidence artifacts MUST materialize the governed envelope fields defined by RFC-0007.
2. Canonical evidence artifacts MUST bind to subject and projection lineage through explicit references and digests.
3. Canonical evidence artifacts MUST preserve deterministic digest identity across repeated materialization and persistence.
4. Unsigned canonical evidence artifacts MUST declare an explicit machine-readable signature placeholder and reason.

## Evidence Surfaces
- Contracts: `src/evidence-artifact-runtime.ts`, `src/specification-projection-runtime.ts`
- Implementations: `src/evidence-artifact-runtime.ts`, `src/specification-projection-runtime.ts`
- Tests: `tests/evidence-artifact-runtime.test.ts`
- Evidence: `specification-conformance-projection.json`, `specification-conformance-evidence.json`

## Verification Procedure
1. Validate canonical evidence runtime surfaces exist.
2. Validate evidence artifact tests confirm deterministic digest and lineage fields.
3. Confirm canonical evidence remains materialized in the foundation verification surface.

## Exit Criteria
- Evidence envelope fields remain complete and machine-readable.
- Digest identity remains deterministic for stable governed inputs.
- Unsigned state remains explicit until governed signing is materialized.

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/evidence-artifact-runtime.test.ts`

## Implementation Notes
- This CONF proves the evidence envelope grammar, not the domain-specific
  semantics of any single evidence body.

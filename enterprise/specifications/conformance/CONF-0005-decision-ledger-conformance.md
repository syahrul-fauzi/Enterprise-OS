# CONF-0005: Decision Ledger Conformance

## Status
Conformant

## Type
Conformance Specification

## Owner
Lead Enterprise Architect

## Purpose
Define how EOS proves conformance to the decision ledger semantics in RFC-0005.

## Specification Traceability
```yaml
proves:
  - RFC-0005
depends_on:
  - RFC-0001
  - RFC-0004
contracts:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/decision-writer.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/ledger-reader.ts
implementations:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/**
tests:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
evidence:
  - workspace/foundation/evidence/verification/specification-conformance-report.json
```

## Scope
- In scope:
  - append-only ledger contract
  - replay and reference boundaries
- Out of scope:
  - release policy semantics

## Conformance Clauses
1. Decision ledger surfaces MUST remain append-only.
2. Decision references MUST be sufficient for replay and verification.
3. Ledger implementations MUST NOT overwrite historical entries in place.

## Evidence Surfaces
- Contracts: `src/runtime-contracts/models/ledger.ts`, `src/runtime-contracts/spi/decision-writer.ts`, `src/runtime-contracts/spi/ledger-reader.ts`
- Implementations: `src/runtime-contracts/**`
- Tests: `tests/runtime-contracts.test.ts`
- Evidence: `specification-conformance-report.json`

## Verification Procedure
1. Validate ledger contract surfaces exist.
2. Validate contract test coverage exists.
3. Confirm RFC-0005 coverage is projected.

## Exit Criteria
- Ledger contract surfaces remain complete.
- Conformance runtime shows no missing verification surfaces.

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Implementation Notes
- Replay evidence becomes more meaningful as ledger implementation materializes.

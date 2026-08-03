# RFC-0005: Decision Ledger Specification

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the immutable schema, append-only behavior, replay semantics, digest
rules, retention semantics, and verification contract for the `Enterprise
Decision Ledger (EDL)`.

## Specification Metadata
```yaml
depends_on:
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
  - RFC-0004
required_by:
  - RFC-0006
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/decision-writer.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/ledger-reader.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - Decision consumers read materialized results
  ADR-0010:
    - Decision Ledger is the source of explainability for decisions
    - Decision entries append, never overwrite
  ADR-0011:
    - Decision platform evolves through the frozen runtime boundaries
  ADR-0012:
    - Decision Ledger remains append-only
    - Runtime communication may occur through EDL
```

## Scope
- In scope:
  - ledger entry identity
  - append semantics
  - replay semantics
  - digest verification
  - retention semantics
- Out of scope:
  - decision synthesis internals
  - automation execution internals

## Problem Statement
EDL is already frozen constitutionally, but it still needs an implementation
specification that defines how entries are appended, verified, replayed, and
retained without relying on storage-specific assumptions.

## Normative Requirements
1. Every decision ledger entry MUST have its own identity and timestamp.
2. Ledger append MUST preserve graph snapshot linkage and evaluator provenance.
3. Ledger replay MUST be possible without recomputing storage-specific inputs.
4. Ledger verification MUST be based on canonical digest rules.
5. Retention policy MUST NOT violate append-only semantics.

## Conformance Requirements
1. Ledger implementations MUST remain append-only.
2. Ledger references MUST preserve snapshot and evaluator provenance.
3. Verification MUST confirm replayability, digest stability, and supersession
   semantics without in-place overwrite.

## Contracts
- Input models:
  - `DecisionSynthesis`
- Output models:
  - `DecisionLedgerEntry`
  - `DecisionLedgerReference`
  - `DecisionReplayRequest`
- SPI interfaces:
  - `DecisionWriter`
  - `LedgerReader`

## Lifecycle
- States:
  - `created`
  - `appended`
  - `verified`
  - `superseded`
- Transitions:
  - `created -> appended`
  - `appended -> verified`
  - `verified -> superseded`
- Preconditions:
  - policy version declared
  - source evaluation ids declared

## Validation
- Contract validation:
  - ledger entry schema validation
- Replay / determinism validation:
  - same ledger reference resolves to the same decision payload
- Boundary validation:
  - append-only behavior is preserved

## Acceptance Criteria
- Ledger entry identity and provenance are explicit.
- Replay contract is defined independently of storage layout.
- Retention and supersession semantics do not violate immutability.

## Implementation Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/decision-writer.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/ledger-reader.ts`

## Verification Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Migration Notes
- Current decision outputs should migrate toward canonical ledger entries before
  broad consumer adoption.

## Traceability
```text
ADR-0009/0010/0011/0012
        ↓
RFC-0005
        ↓
runtime-contracts/models/ledger.ts
        ↓
runtime-contracts/spi/decision-writer.ts
        ↓
runtime-contracts/spi/ledger-reader.ts
```

## Implementation Notes
- Reference package paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/decision-writer.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/ledger-reader.ts`
- Migration notes:
  - current decision outputs should converge toward ledger entry structure

## Open Questions
- Should digest verification be per-entry only or chain-linked?
- Should supersession allow parallel branches or only linear replacement?

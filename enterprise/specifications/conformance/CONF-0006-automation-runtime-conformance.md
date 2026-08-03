# CONF-0006: Automation Runtime Conformance

## Status
Conformant

## Type
Conformance Specification

## Owner
Lead Enterprise Architect

## Purpose
Define how EOS proves conformance to the automation runtime SPI in RFC-0006.

## Specification Traceability
```yaml
proves:
  - RFC-0006
depends_on:
  - RFC-0001
  - RFC-0005
contracts:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/automation.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/automation-runtime.ts
implementations:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/**
tests:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
evidence:
  - workspace/foundation/evidence/verification/specification-conformance-report.json
```

## Scope
- In scope:
  - decision-reference based execution boundary
  - idempotent automation contract
- Out of scope:
  - scheduler policy selection

## Conformance Clauses
1. Automation MUST consume decision references, not graph facts or embedded evaluator payloads.
2. Automation MUST verify decision linkage before execution.
3. Automation implementations MUST remain downstream consumers of ledger materialization.

## Evidence Surfaces
- Contracts: `src/runtime-contracts/models/automation.ts`, `src/runtime-contracts/spi/automation-runtime.ts`
- Implementations: `src/runtime-contracts/**`
- Tests: `tests/runtime-contracts.test.ts`
- Evidence: `specification-conformance-report.json`

## Verification Procedure
1. Validate automation contract surfaces exist.
2. Validate contract tests reject graph or evaluator payload leakage.
3. Confirm RFC-0006 coverage is projected.

## Exit Criteria
- Automation SPI remains reference-driven.
- Conformance runtime shows no missing implementation or verification surfaces.

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Implementation Notes
- This CONF proves automation boundary discipline before execution orchestration expands.

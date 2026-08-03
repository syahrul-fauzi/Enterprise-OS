# CONF-0004: Decision Engine Conformance

## Status
Conformant

## Type
Conformance Specification

## Owner
Lead Enterprise Architect

## Purpose
Define how EOS proves conformance to the decision engine semantics in RFC-0004.

## Specification Traceability
```yaml
proves:
  - RFC-0004
depends_on:
  - RFC-0001
  - RFC-0003
contracts:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/policy-engine.ts
implementations:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/**
tests:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
evidence:
  - workspace/foundation/evidence/verification/specification-conformance-report.json
```

## Scope
- In scope:
  - domain-agnostic decision synthesis boundaries
  - policy engine contract alignment
- Out of scope:
  - ledger persistence

## Conformance Clauses
1. Decision engine implementations MUST remain domain-agnostic.
2. Decision engine implementations MUST consume evaluator outputs through contracts.
3. Decision engine implementations MUST NOT directly import runtime implementations they orchestrate.

## Evidence Surfaces
- Contracts: `src/runtime-contracts/models/decision.ts`, `src/runtime-contracts/spi/policy-engine.ts`
- Implementations: `src/runtime-contracts/**`
- Tests: `tests/runtime-contracts.test.ts`
- Evidence: `specification-conformance-report.json`

## Verification Procedure
1. Validate decision engine contract surfaces exist.
2. Validate contract test coverage exists.
3. Confirm RFC-0004 coverage is projected.

## Exit Criteria
- Decision engine contracts exist and remain generic.
- Missing implementation or verification surfaces are eliminated.

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Implementation Notes
- Conformance here proves boundary discipline before full runtime implementation.

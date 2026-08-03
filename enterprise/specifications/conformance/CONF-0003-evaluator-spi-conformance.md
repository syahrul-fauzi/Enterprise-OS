# CONF-0003: Evaluator SPI Conformance

## Status
Conformant

## Type
Conformance Specification

## Owner
Lead Enterprise Architect

## Purpose
Define how EOS proves conformance to the evaluator SPI in RFC-0003.

## Specification Traceability
```yaml
proves:
  - RFC-0003
depends_on:
  - RFC-0001
  - RFC-0002
  - SPEC-0101
  - SPEC-0102
  - SPEC-0103
  - SPEC-0104
contracts:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/evaluation.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/shared.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/plugins/evaluator-plugin.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/evaluator-registry.ts
implementations:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/**
tests:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
evidence:
  - workspace/foundation/evidence/verification/specification-conformance-report.json
```

## Scope
- In scope:
  - evaluator registry and plugin contract
  - evaluation output boundaries
  - alignment between runtime contracts and `SPEC-0101..SPEC-0104`
- Out of scope:
  - concrete evaluator business rules

## Conformance Clauses
1. Evaluators MUST emit evaluations, not decisions.
2. Evaluators MUST be discoverable through the shared registry contract.
3. Evaluator implementations MUST NOT import other evaluator implementations directly.
4. Runtime contract payloads MUST remain aligned with `SPEC-0101`,
   `SPEC-0102`, `SPEC-0103`, and `SPEC-0104`.

## Evidence Surfaces
- Contracts: `src/runtime-contracts/models/evaluation.ts`, `src/runtime-contracts/models/shared.ts`, `src/runtime-contracts/plugins/evaluator-plugin.ts`, `src/runtime-contracts/spi/evaluator-registry.ts`
- Implementations: `src/runtime-contracts/**`
- Tests: `tests/runtime-contracts.test.ts`
- Evidence: `specification-conformance-report.json`

## Verification Procedure
1. Validate evaluator contract surfaces exist.
2. Validate runtime contract tests exist.
3. Confirm `SPEC-0101..SPEC-0104` remain linked to RFC-0003 and runtime contracts.
4. Confirm RFC-0003 coverage is projected.

## Exit Criteria
- Evaluator SPI surfaces are present.
- Machine-readable SPEC artifacts remain linked to the runtime contract surfaces.
- Conformance runtime shows no missing contract or verification surfaces.

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Implementation Notes
- Evaluator business policies remain outside this conformance scope.

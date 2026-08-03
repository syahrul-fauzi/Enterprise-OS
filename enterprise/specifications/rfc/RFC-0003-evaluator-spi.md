# RFC-0003: Evaluator SPI

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the evaluator service provider interface, plugin lifecycle,
registration, and evaluation contract for graph-driven policy evaluation.

## Specification Metadata
```yaml
depends_on:
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
  - RFC-0002
required_by:
  - RFC-0004
  - RFC-0005
specifies:
  - SPEC-0101
  - SPEC-0102
  - SPEC-0103
  - SPEC-0104
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/evaluation.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/plugins/evaluator-plugin.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/evaluator-registry.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - ECG remains facts-only, so evaluators live outside the graph
  ADR-0010:
    - Facts -> Evaluations -> Decisions -> Actions
  ADR-0011:
    - Evaluator plugin architecture is frozen
  ADR-0012:
    - Evaluators are discoverable plugins
    - Runtime communication occurs through contracts
```

## Scope
- In scope:
  - plugin lifecycle
  - evaluator registration
  - evaluator input contract
  - evaluator output contract
  - reason code discipline
- Out of scope:
  - decision synthesis
  - automation execution

## Problem Statement
Evaluator plugins are the extension surface of the control plane. Without a
stable evaluator SPI, implementations will drift into ad hoc adapters, direct
runtime imports, or incompatible evaluation outputs.

## Normative Requirements
1. Evaluators MUST consume graph snapshots and canonical references.
2. Evaluators MUST emit evaluations, not decisions.
3. Evaluators MUST be discoverable through an evaluator registry.
4. Evaluator outputs MUST be deterministic for the same snapshot and policy
   version.
5. Evaluators MUST NOT import other evaluator implementations.

## Conformance Requirements
1. Evaluator plugins MUST implement the shared evaluator contract.
2. Evaluator outputs MUST remain domain-evaluation results and MUST NOT be
   promoted to decisions or automation commands.
3. Verification MUST confirm evaluator determinism and registry-based
   discoverability.

## Contracts
- Machine-readable contract specifications:
  - `SPEC-0101` — Policy Evaluator Input
  - `SPEC-0102` — Policy Evaluator Output
  - `SPEC-0103` — Policy Rule Result
  - `SPEC-0104` — Fact Reference
- Runtime contract bindings:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/evaluation.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/shared.ts`
- SPI interfaces:
  - `EvaluatorRegistry`
- Plugin interfaces:
  - `EvaluatorPlugin`

## Lifecycle
- States:
  - `registered`
  - `resolved`
  - `executed`
  - `reported`
- Transitions:
  - `registered -> resolved`
  - `resolved -> executed`
  - `executed -> reported`
- Preconditions:
  - graph snapshot provided
  - evaluator version declared

## Validation
- Contract validation:
  - evaluator input and output validation MUST follow `SPEC-0101`,
    `SPEC-0102`, `SPEC-0103`, and `SPEC-0104`
- Replay / determinism validation:
  - same snapshot + same evaluator version => same evaluation result
- Boundary validation:
  - evaluator does not synthesize decisions or execute actions

## Acceptance Criteria
- Evaluator plugin contract is frozen and versioned.
- Registry contract can discover evaluators without implementation imports.
- Reason code and finding surfaces are explicit enough for decision synthesis.

## Implementation Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/evaluation.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/plugins/evaluator-plugin.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/evaluator-registry.ts`

## Verification Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Migration Notes
- Existing capability governance logic should migrate into evaluator plugins
  through registry discovery rather than direct runtime coupling.

## Traceability
```text
ADR-0010/0011/0012
        ↓
RFC-0003
        ↓
SPEC-0101/0102/0103/0104
        ↓
runtime-contracts/models/evaluation.ts + shared.ts
        ↓
runtime-contracts/plugins/evaluator-plugin.ts
        ↓
runtime-contracts/spi/evaluator-registry.ts
```

## Implementation Notes
- Reference package paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/evaluation.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/plugins/evaluator-plugin.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/evaluator-registry.ts`
- Migration notes:
  - current capability governance logic should migrate into the first evaluator
    plugin

## Open Questions
- Should evaluator discovery be manifest-based, registry-based, or hybrid?
- Should reason codes be centrally governed in a registry?

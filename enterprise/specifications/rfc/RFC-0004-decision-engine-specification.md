# RFC-0004: Decision Engine Specification

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define evaluator orchestration, decision synthesis, conflict handling, and
materialization semantics for the enterprise decision engine.

## Specification Metadata
```yaml
depends_on:
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
  - RFC-0003
required_by:
  - RFC-0005
  - RFC-0006
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/policy-engine.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - Gate C and other surfaces consume decision outputs
  ADR-0010:
    - Decision engine is the only synthesis point from evaluations to decisions
  ADR-0011:
    - Decision engine is one of the four runtime boundaries
  ADR-0012:
    - Decision engine depends on SPI, not runtime implementations
    - Decision engine remains domain-agnostic
```

## Scope
- In scope:
  - evaluator orchestration
  - synthesis semantics
  - reason aggregation
  - conflict resolution
  - decision materialization contract
- Out of scope:
  - ledger persistence internals
  - automation execution internals

## Problem Statement
The decision engine must stay generic even as evaluator families grow. Without a
specification, the engine may become domain-aware, couple itself to specific
evaluator implementations, or mix synthesis with storage and execution.

## Normative Requirements
1. Decision engine MUST consume evaluator outputs, not runtime implementations.
2. Decision engine MUST remain domain-agnostic.
3. Decision engine MUST synthesize one consistent decision result per scope.
4. Conflict resolution MUST be explicit and replayable.
5. Decision engine MUST materialize outputs suitable for append-only ledger
   persistence.

## Conformance Requirements
1. Decision engine implementations MUST depend on evaluator outputs and SPI
   interfaces only.
2. Decision engine implementations MUST NOT import evaluator or graph runtime
   implementations directly.
3. Verification MUST confirm deterministic synthesis and replayable conflict
   handling.

## Contracts
- Input models:
  - `DecisionEngineInput`
- Output models:
  - `DecisionSynthesis`
  - `DecisionReason`
  - `DecisionAction`
- SPI interfaces:
  - `PolicyEngine`
  - `EvaluatorRegistry`
  - `DecisionWriter`

## Lifecycle
- States:
  - `requested`
  - `evaluated`
  - `merged`
  - `materialized`
- Transitions:
  - `requested -> evaluated`
  - `evaluated -> merged`
  - `merged -> materialized`
- Preconditions:
  - evaluator outputs are available
  - policy version is declared

## Validation
- Contract validation:
  - decision synthesis schema validation
- Replay / determinism validation:
  - same evaluator outputs + same policy version => same decision synthesis
- Boundary validation:
  - engine does not execute actions or import runtime implementations

## Acceptance Criteria
- Synthesis contract is explicit and domain-agnostic.
- Conflict semantics are specified well enough to replay outcomes.
- Output shape is sufficient for append-only ledger materialization.

## Implementation Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/policy-engine.ts`

## Verification Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Migration Notes
- Existing decision aggregation logic should converge toward one generic
  synthesis flow before runtime implementation broadens.

## Traceability
```text
ADR-0010/0011/0012
        ↓
RFC-0004
        ↓
runtime-contracts/models/decision.ts
        ↓
runtime-contracts/spi/policy-engine.ts
        ↓
future decision engine implementation
```

## Implementation Notes
- Reference package paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/policy-engine.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/decision-writer.ts`
- Migration notes:
  - current decision logic should collapse into generic evaluator orchestration
    and synthesis steps

## Open Questions
- What is the canonical conflict-resolution strategy between WARN and BLOCK?
- Should decision confidence be required for all synthesized decisions?

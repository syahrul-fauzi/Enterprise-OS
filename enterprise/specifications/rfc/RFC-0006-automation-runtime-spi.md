# RFC-0006: Automation Runtime SPI

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the automation service interface for consumers that execute materialized
decisions through `DecisionReference`, verify digest linkage, perform the
authorized action, and publish acknowledgement.

## Specification Metadata
```yaml
depends_on:
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
  - RFC-0005
required_by:
  - none
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/automation.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/automation-runtime.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - Gate C and presentation surfaces consume decision outputs
  ADR-0010:
    - Automation SHALL NOT evaluate facts
    - Decisions feed actions through the closed-loop architecture
  ADR-0011:
    - Automation Runtime is one of the frozen boundaries
  ADR-0012:
    - Runtime communication occurs through contracts and Decision Ledger
    - Runtime SHALL NOT import other runtime implementations
```

## Scope
- In scope:
  - automation input by `DecisionReference`
  - lookup and digest verification
  - execution acknowledgement
  - idempotency and replayability
  - permitted action surface
- Out of scope:
  - policy evaluation
  - decision synthesis

## Problem Statement
Automation is constitutionally a consumer of decisions, but that boundary is
only safe if the contract requires reference-based lookup and verification
instead of direct ingestion of mutable decision payloads.

## Normative Requirements
1. Automation MUST consume `DecisionReference`, not inlined decision objects.
2. Automation MUST resolve the reference through the ledger reader before
   execution.
3. Automation MUST verify digest linkage before executing an action.
4. Automation MUST support dry-run planning and executable acknowledgment.
5. Automation MUST remain idempotent for repeated requests over the same
   decision reference.

## Conformance Requirements
1. Automation consumers MUST execute through decision lookup and verification.
2. Automation consumers MUST NOT read graph facts directly for governance
   decisions.
3. Verification MUST confirm idempotent dry-run behavior and acknowledged
   execution results.

## Contracts
- Input models:
  - `AutomationExecutionRequest`
- Output models:
  - `AutomationExecutionPlan`
  - `AutomationExecutionResult`
- SPI interfaces:
  - `AutomationExecutor`
  - `LedgerReader`

## Lifecycle
- States:
  - `requested`
  - `resolved`
  - `verified`
  - `planned`
  - `executed`
  - `acknowledged`
- Transitions:
  - `requested -> resolved`
  - `resolved -> verified`
  - `verified -> planned`
  - `planned -> executed`
  - `executed -> acknowledged`
- Preconditions:
  - decision reference exists
  - digest verification succeeds

## Validation
- Contract validation:
  - automation request/result schema validation
- Replay / determinism validation:
  - repeated dry-run over same decision reference yields same plan
- Boundary validation:
  - automation does not read graph facts directly

## Acceptance Criteria
- Automation input is fully reference-based.
- Verification step is explicit before execution.
- Acknowledgement and idempotency semantics are contractually visible.

## Implementation Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/automation.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/automation-runtime.ts`

## Verification Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`

## Migration Notes
- Existing automation flows should converge to decision-reference lookup and
  digest verification before execution.

## Traceability
```text
ADR-0010/0011/0012
        ↓
RFC-0006
        ↓
runtime-contracts/models/automation.ts
        ↓
runtime-contracts/spi/automation-runtime.ts
        ↓
scheduler / release / execution consumers
```

## Implementation Notes
- Reference package paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/automation.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/automation-runtime.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/ledger-reader.ts`
- Migration notes:
  - existing automation flows should converge toward `DecisionReference`
    lookup + verification + execution

## Open Questions
- Should every acknowledgement include an execution correlation id?
- Should rollback metadata be mandatory or capability-specific?

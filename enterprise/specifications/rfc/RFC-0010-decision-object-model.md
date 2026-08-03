# RFC-0010: Decision Object Model

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the canonical decision object grammar for EOS so operational evidence can
be converted into traceable, reproducible, outcome-aware, and learnable
decisions rather than remaining detached governance artifacts.

## Specification Metadata
```yaml
depends_on:
  - ADR-0009
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
  - RFC-0004
  - RFC-0005
specifies:
  - SPEC-0105
  - SPEC-0106
  - SPEC-0107
  - SPEC-0108
  - SPEC-0109
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/shared.ts
  - workspace/packages/tooling/eos-cli/src/decision-ledger-runtime.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/outcome.ts
  - workspace/packages/tooling/eos-cli/src/decision-outcome-runtime.ts
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/models/impact.ts
  - workspace/packages/tooling/eos-cli/src/decision-impact-runtime.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts
  - workspace/packages/tooling/eos-cli/tests/decision-ledger-runtime.test.ts
  - workspace/packages/tooling/eos-cli/tests/decision-outcome-runtime.test.ts
  - workspace/packages/tooling/eos-cli/tests/decision-impact-runtime.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - Decisions SHALL remain explicit enterprise artifacts linked to facts, evaluations, and downstream consumers
  ADR-0010:
    - Closed-loop decision architecture requires evidence to materialize into replayable decisions and outcomes
  ADR-0011:
    - Decision objects SHALL remain inside frozen runtime boundaries without domain-specific leakage
  ADR-0012:
    - Decision producers and ledger consumers SHALL communicate through stable contracts and append-only references
```

## Scope
- In scope:
  - decision input grammar
  - decision recommendation grammar
  - decision output grammar
  - confidence and outcome contracts
  - decision lifecycle status
  - linkage to findings, evidence, owner, outcome tracking, and learning
- Out of scope:
  - policy conflict resolution heuristics
  - storage-specific ledger implementation
  - business-domain scoring formulas

## Problem Statement
EOS already defines evaluator outputs, decision synthesis boundaries, and
append-only ledger semantics, but it still lacks one canonical decision grammar
that captures why a decision happened, what evidence supported it, who owns it,
which option was selected, what outcome is expected, and how learning feeds
back into future execution.

## Normative Requirements
1. Every decision object MUST capture `decision_id`, `decision_type`,
   `decision`, `status`, `trigger`, `finding_refs`, `evidence_refs`,
   `assumptions`, `confidence`, `recommendation`, `alternatives`,
   `selected_option`, `expected_outcome`, `owner`, and timestamped creation
   metadata.
2. Decision inputs MUST preserve the trigger, evidence linkage, findings,
   assumptions, and accountable owner required to replay decision synthesis.
3. Decision outputs MUST preserve selected option, expected outcome, reason
   codes, required actions, affected nodes, and source evaluation linkage.
4. Decision confidence MUST remain machine-readable and bounded to canonical
   semantics so consumers can compare confidence without domain-specific
   adapters.
5. Decision outcome tracking and learning linkage SHOULD be explicit whenever a
   decision transitions from recommendation to observed result.
6. Outcome tracking SHOULD preserve observed metrics, leverage deltas, and
   captured learning as first-class decision observability artifacts.

## Conformance Requirements
1. Runtime contracts MUST expose typed decision input, recommendation, output,
   confidence, and outcome surfaces.
2. Decision ledger entries MUST preserve a decision snapshot that is replayable
   without reconstructing hidden runtime state.
3. Verification MUST confirm decision objects remain traceable to findings,
   evidence, owner accountability, and selected option semantics.
4. Verification MUST confirm decision objects remain reproducible and compatible
   with append-only ledger replay.

## Contracts
- Machine-readable contract specifications:
  - `SPEC-0105` — Decision Input
  - `SPEC-0106` — Decision Recommendation
  - `SPEC-0107` — Decision Output
  - `SPEC-0108` — Decision Confidence
  - `SPEC-0109` — Decision Outcome
- Runtime contract bindings:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/shared.ts`

## Validation
- Contract validation:
  - decision input and output validation MUST follow `SPEC-0105..SPEC-0109`
- Replay / determinism validation:
  - identical decision inputs + identical evaluator outputs + identical policy
    version => replayable decision object
- Observability validation:
  - decision ledger snapshot remains sufficient for outcome tracking and
    learning linkage

## Acceptance Criteria
- EOS decision objects are explicit enough to connect evidence to decisions,
  outcomes, and learning.
- Decision contracts are typed, machine-readable, and append-only compatible.
- Decision observability no longer depends on ad hoc payload interpretation.

## Implementation Evidence
- Current status: Materialized
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/ledger.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/shared.ts`
  - `workspace/packages/tooling/eos-cli/src/decision-ledger-runtime.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/outcome.ts`
  - `workspace/packages/tooling/eos-cli/src/decision-outcome-runtime.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/impact.ts`
  - `workspace/packages/tooling/eos-cli/src/decision-impact-runtime.ts`

## Verification Evidence
- Current status: Materialized
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`
  - `workspace/packages/tooling/eos-cli/tests/decision-ledger-runtime.test.ts`
  - `workspace/packages/tooling/eos-cli/tests/decision-outcome-runtime.test.ts`
  - `workspace/packages/tooling/eos-cli/tests/decision-impact-runtime.test.ts`
  - `workspace/foundation/evidence/verification/specification-conformance-report.json`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/runtime-contracts.test.ts`
- `workspace/packages/tooling/eos-cli/tests/decision-ledger-runtime.test.ts`
- `workspace/packages/tooling/eos-cli/tests/decision-outcome-runtime.test.ts`
- `workspace/packages/tooling/eos-cli/tests/decision-impact-runtime.test.ts`

## Migration Notes
- Existing decision synthesis payloads SHOULD converge toward the canonical
  decision object grammar before ledger, impact graph, and outcome tracking
  expand further.

## Traceability
```text
ADR-0009/0010/0011/0012
        ↓
RFC-0004 + RFC-0005
        ↓
RFC-0010
        ↓
SPEC-0105/0106/0107/0108/0109
        ↓
runtime-contracts/models/decision.ts + ledger.ts + shared.ts
        ↓
Decision Ledger / Decision Impact Graph / Outcome Tracking
```

## Implementation Notes
- The decision object model is the operational bridge between evidence quality
  and decision quality.
- Ledger append-only semantics remain governed by RFC-0005; this RFC governs
  the decision payload captured by the ledger.

## Open Questions
- Should decision outcomes require formal metric baselines before a decision can
  move to `CLOSED`?
- Should learning linkage remain optional for short-lived operational decisions
  or become mandatory once outcome tracking is materialized?

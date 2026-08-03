# Conformance Governance

## Purpose
Define how `CONF-*` specifications prove that EOS implementations conform to
`RFC-*` requirements without reinterpreting constitutional invariants locally.

## Normative Role
`CONF-*` documents are executable compliance baselines.

- RFC describes what a contract means.
- CONF describes how conformance is demonstrated.

`CONF-*` MUST NOT redefine RFC semantics.

## Required Header
Every `CONF-*` document MUST include:

- `Status`
- `Type`
- `Owner`
- `Purpose`
- `Specification Traceability`
- `Scope`
- `Conformance Clauses`
- `Evidence Surfaces`
- `Verification Procedure`
- `Exit Criteria`
- `Reference Tests`
- `Implementation Notes`

## Maturity Model
Conformance specifications use the same controlled maturity language as RFCs,
but with compliance semantics:
The machine-readable lifecycle and policy-floor source of truth is
`enterprise/specifications/evolution/maturity-model.yaml`.

| Status | Meaning |
| --- | --- |
| `Draft` | Clause set incomplete |
| `Proposed` | Clause set reviewed, experimental enforcement only |
| `Accepted` | Canonical compliance baseline |
| `Implemented` | Enforcement surfaces exist |
| `Conformant` | All mandatory conformance clauses pass |
| `Verified` | Conformance evidence is materialized and reproducible |
| `Stable` | Verified across release cycles without open drift |
| `Deprecated` | Superseded by a newer conformance specification |

## Traceability Rules
Every `CONF-*` MUST declare:

1. which `RFC-*` it proves
2. which contract and implementation surfaces it measures
3. which tests provide evidence
4. which evidence artifacts capture the result

## Clause Design
Conformance clauses MUST use normative language and be objectively testable.

Allowed vocabulary:

- `MUST`
- `MUST NOT`
- `SHALL`
- `SHALL NOT`
- `SHOULD`
- `SHOULD NOT`
- `MAY`

Each mandatory RFC requirement SHOULD map to at least one conformance clause.

## Evidence Rules
Conformance status MUST be backed by explicit evidence:

- test results
- generated reports
- registry coverage
- materialized verification artifacts

Opinion, informal review, or architectural intent alone MUST NOT be treated as
conformance evidence.

## Classification
Verification layers MUST remain distinct:

- unit tests prove local behavior
- integration tests prove collaboration
- contract tests prove SPI compliance
- conformance tests prove RFC compliance
- governance tests prove ADR guardrail compliance

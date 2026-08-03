# Enterprise OS SPEC Index

## Purpose
`SPEC-*` artifacts define machine-readable contract objects that sit between
normative RFCs and concrete runtime implementations.

## Role
- `ADR` freezes platform invariants.
- `RFC` defines normative semantics and design rationale.
- `SPEC` defines formal contract objects, payload schemas, and machine-processed
  structures.
- `CONF` proves implementations conform to RFC and SPEC requirements.

## Rules
1. Every `SPEC-*` MUST depend on at least one governing `RFC-*`.
2. `SPEC-*` MUST NOT redefine constitutional vocabulary outside
   [RFC-0001](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0001-specification-meta-model.md).
3. Runtime contracts MAY implement `SPEC-*` directly without importing RFC
   documents.
4. `CONF-*` MAY depend on both `RFC-*` and `SPEC-*`.

## Initial Series
- `SPEC-0101` — Policy Evaluator Input
- `SPEC-0102` — Policy Evaluator Output
- `SPEC-0103` — Policy Rule Result
- `SPEC-0104` — Fact Reference
- `SPEC-0105` — Decision Input
- `SPEC-0106` — Decision Recommendation
- `SPEC-0107` — Decision Output
- `SPEC-0108` — Decision Confidence
- `SPEC-0109` — Decision Outcome

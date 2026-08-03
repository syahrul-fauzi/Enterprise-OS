# SPEC Governance

## Purpose
Define how machine-readable contract specifications (`SPEC-*`) evolve without
overloading RFC documents with payload-level detail.

## Normative Role
`SPEC-*` artifacts are formal contract surfaces.

- RFC explains what a contract means.
- SPEC defines the machine-readable object shape.
- CONF defines how conformance is proven.

## Required Fields
Every `SPEC-*` artifact MUST declare:

- `spec_id`
- `title`
- `status`
- `owner`
- `governed_by`
- `kind`
- `version`
- `source_bindings`
- `schema`

## Maturity
`SPEC-*` uses the same controlled maturity language as RFC and CONF:
The machine-readable lifecycle and policy-floor source of truth is
`enterprise/specifications/evolution/maturity-model.yaml`.

- `Draft`
- `Proposed`
- `Accepted`
- `Implemented`
- `Conformant`
- `Verified`
- `Stable`
- `Deprecated`

## Traceability
Every `SPEC-*` MUST:

1. depend on at least one governing `RFC-*`
2. identify the runtime contract file that implements it
3. identify the conformance surface that proves it

## Boundary
`SPEC-*` MAY define payload fields, enums, DSL forms, schema fragments, and
canonical serialization rules.

`SPEC-*` MUST NOT redefine architecture rationale, constitutional traceability,
or policy semantics already owned by ADR/RFC layers.

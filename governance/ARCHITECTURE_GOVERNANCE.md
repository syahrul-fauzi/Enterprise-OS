# Architecture Governance

Status: Active
Scope: Workspace implementation governance for Sprint 0

## Purpose

This document operationalizes the frozen baseline for the workspace without
changing the constitutional source of truth. The goal is to make repository
authority, legal dependencies, artifact lifecycle, and exit predicates explicit
enough to be verified mechanically.

## Governance Set

The Sprint 0 governance set is:

- `BASELINE_LOCK.yaml`
- `GOVERNANCE_STATE.yaml`
- `dependency-rules.yaml`
- `architecture-compliance.yaml`
- `package-authority.yaml`
- `artifact-lifecycle.yaml`
- `implementation-discipline.yaml`
- `sprint0-exit-predicates.yaml`

## Operating Rules

1. Structural evolution is frozen unless an ADR explicitly authorizes it.
2. Contracts are canonical inputs; implementation packages consume them.
3. Package authority is defined by boundary, not by convenience import.
4. Build outputs are evidence, not sources of truth.
5. Verification must produce objective PASS, FAIL, or INCONCLUSIVE outcomes.
6. Gate A is `VERIFIED` only when the baseline lock certificate and its four
   evidence groups are satisfied.

## Baseline Lock

`BASELINE_LOCK.yaml` is the audit entry point for Gate A. It must point to the
same implementation baseline referenced by the workspace manifest and the
governance set.

## Governance State

`GOVERNANCE_STATE.yaml` is the machine-readable repository state. Tooling, ACL,
CI, and future status commands should be able to resolve current gate, baseline
version, compliance state, evidence state, and next-gate readiness from this
file without reconstructing status from prose.

## Enforcement Intent

Gate A defines repository law.

Gate B defines canonical foundation packages.

Gate C defines registry-driven execution.

Gate D defines deterministic proof generation.

Gate E unlocks additional experience surfaces.

Until Gate B is complete, no work may bypass the foundation by hardcoding
transformation behavior in runtime source code.

## Violation Policy

- `Baseline Violations` are new violations against the frozen baseline or
  governance rules and block Gate B.
- `Legacy Violations` are pre-existing technical debt findings that remain
  non-blocking unless they directly violate constitutional or governance rules.

## Gate Lifecycle

Gate state must use the lifecycle:

`DRAFT -> REVIEWED -> VERIFIED -> FROZEN -> DEPRECATED`

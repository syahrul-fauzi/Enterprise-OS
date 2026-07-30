# Implementation Baseline v1.0

Status: Frozen
Change Policy: ADR required for structural evolution
Operating Mode: Foundation first
Baseline Lock Certificate: `governance/BASELINE_LOCK.yaml`
Repository State: `governance/GOVERNANCE_STATE.yaml`

## Purpose

This baseline converts the discovery outcome into an executable implementation
boundary for Sprint 0. It does not introduce a new architecture. It freezes the
current repository shape and defines what work is allowed before execution
engines and experience surfaces evolve further.

## Frozen Structure

The workspace root is frozen to:

- `apps/`
- `capabilities/`
- `packages/`
- `contracts/`
- `decisions/`
- `config/`
- `scripts/`

The package boundary is frozen to:

- `packages/core/`
- `packages/composition/`
- `packages/presentation/`
- `packages/tooling/`

The active product surface remains:

- `apps/lawyershub/`

The canonical capabilities remain:

- `capabilities/identity/`
- `capabilities/legal-case/`
- `capabilities/legal-document/`

## Sprint 0 Focus

Sprint 0 is restricted to:

1. governance rules and compliance predicates
2. canonical foundation artifacts
3. golden reference `REQ-0001`
4. registry-driven execution prerequisites
5. deterministic verification outputs

## Explicitly Deferred

The following work is locked out until the foundation is complete:

- moving `apps/lawyershub` into another root
- introducing `products/` as a new top-level runtime boundary
- introducing `domain/`, `application/`, and `infrastructure/` as global root
  package families
- designing experience surface composition beyond the current apps
- adding new ontology families or speculative AI-agent structures
- UI expansion unrelated to foundation proof production

## Source of Truth

Implementation work must stay aligned with:

- `/root/Enterprise OS/CONSTITUTION.md`
- `/root/Enterprise OS/enterprise/specifications/architecture-baseline-v1.yaml`
- `/root/Enterprise OS/governance/BASELINE_LOCK.yaml`
- `/root/Enterprise OS/workspace/workspace.yaml`
- `/root/Enterprise OS/governance/*.yaml`

## Gate A Exit Review

Gate A is considered `VERIFIED` only when these evidence groups are explicit:

1. Governance Validation
2. Workspace Manifest Validation
3. Architecture Compliance
4. Baseline Lock

## Gate Lifecycle

Gate lifecycle uses the status sequence:

`DRAFT -> REVIEWED -> VERIFIED -> FROZEN -> DEPRECATED`

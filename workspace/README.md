# Enterprise Workspace

This workspace is the implementation surface for EOS Sprint 0.

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

## Current Focus

Sprint 0 is not a product expansion phase. Current work is limited to:

1. Gate A governance artifacts
2. Gate B canonical foundation packages
3. `REQ-0001` golden reference
4. registry-driven execution prerequisites
5. deterministic verification and proof production

## Active Surfaces

- `apps/lawyershub/`
- `apps/docs/`

## Canonical Capabilities

- `capabilities/identity/`
- `capabilities/legal-case/`
- `capabilities/legal-document/`

## Governance Sources

- `../governance/BASELINE_LOCK.yaml`
- `../governance/GOVERNANCE_STATE.yaml`
- `../governance/IMPLEMENTATION_BASELINE.md`
- `../governance/ARCHITECTURE_GOVERNANCE.md`
- `../governance/dependency-rules.yaml`
- `../governance/package-authority.yaml`
- `../governance/artifact-lifecycle.yaml`
- `../governance/implementation-discipline.yaml`
- `../governance/sprint0-exit-predicates.yaml`

`BASELINE_LOCK.yaml` is the machine-readable constitution state for the
repository. `GOVERNANCE_STATE.yaml` is the single machine-readable repository
status that ACL, CI, compiler, tooling, and `pnpm eos status` should read.

## Explicitly Deferred

- moving `apps/lawyershub` to a different root
- introducing `products/` as a new runtime root
- introducing `domain/`, `application/`, `infrastructure/` as new package families
- designing experience expansion before foundation proof exists

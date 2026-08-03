# `@repo/core-constitution`

This package owns the workspace constitution engine and its executable law model.

## Architectural boundary

- `WORKSPACE_CONSTITUTION_LAW_REGISTRY` is the operational SSOT for law selection.
- `buildConstitutionReport(...)` and `verifyConstitution(...)` consume a `lawProfile` through `ConstitutionEngineOptions`.
- The engine evaluates only the laws enabled by the selected profile.
- Assertion is profile-aware: `assertConstitutionReport(...)` enforces only the laws that were actually executed.

## Governance profiles

- `baseline`: graph purity, digest, serializer transparency, storage transparency, dependency boundary
- `strict`: baseline + replay + projection determinism
- `enterprise`: all workspace constitution laws, including constitution proof determinism

## Boundary intent

The registry owns law enablement. The engine owns execution. Reporting and higher-level runtimes should consume materialized claims or reports, not hardcode law selection logic.

## Downstream proof materialization

This package stops at constitution report generation and assertion. Downstream tooling runtimes may materialize:

- law results
- law certificates
- attestations
- claims
- proof bundles

That downstream packaging must not move law-selection knowledge back into reporting or command adapters.

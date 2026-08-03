# Enterprise OS Conformance Index

Conformance specifications (`CONF-*`) define how EOS proves that an
implementation satisfies a technical specification (`RFC-*`).

They sit between specification and implementation evidence:

```text
ADR
    ↓
RFC
    ↓
Runtime Contracts / SPI
    ↓
CONF
    ↓
Projection
    ↓
Evidence
    ↓
Gate C / Governance Surfaces
```

## Purpose
- make RFC requirements auditable
- separate descriptive specification from executable compliance criteria
- give Gate C and future governance surfaces one conformance readout source

## Runtime Boundary
- `CONF-*` defines what MUST be evaluated.
- `PROJ-*` materializes machine-readable evaluation results.
- `Evidence` freezes that projection as an auditable artifact with identity and digest.

## Active Conformance Series
- [CONF-0001](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0001-specification-meta-model-conformance.md) — Specification Meta-Model Conformance
- [CONF-0002](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0002-enterprise-graph-navigation-conformance.md) — Enterprise Graph Navigation Conformance
- [CONF-0003](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0003-evaluator-spi-conformance.md) — Evaluator SPI Conformance
- [CONF-0004](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0004-decision-engine-conformance.md) — Decision Engine Conformance
- [CONF-0005](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0005-decision-ledger-conformance.md) — Decision Ledger Conformance
- [CONF-0006](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0006-automation-runtime-conformance.md) — Automation Runtime Conformance
- [CONF-0007](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0007-evidence-artifact-model-conformance.md) — Evidence Artifact Model Conformance
- [CONF-0010](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONF-0010-decision-object-model-conformance.md) — Decision Object Model Conformance

## Test Taxonomy
Conformance governance distinguishes verification layers explicitly:

- `tests/unit` — function correctness
- `tests/integration` — component collaboration
- `tests/contract` — SPI and DTO compliance
- `tests/conformance` — RFC compliance proof
- `tests/governance` — constitutional and architectural guardrails

## Governance
See [CONFORMANCE-GOVERNANCE.md](file:///root/Enterprise-OS/enterprise/specifications/conformance/CONFORMANCE-GOVERNANCE.md).

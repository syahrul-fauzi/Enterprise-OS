# Enterprise OS RFC Index

## Status
✅ Active Specification Layer

## Purpose
Menjadi control surface untuk spesifikasi teknis setelah Constitution Layer
dibekukan oleh ADR-0009, ADR-0010, dan ADR-0011.

RFC bukan tempat mengubah invariant platform. RFC menjelaskan bagaimana
konstitusi diimplementasikan melalui schema, contract, lifecycle, dan
behavior runtime.

Mulai wave ini, RFC juga berfungsi sebagai **language layer** untuk control
plane: vocabulary dasar dibekukan di `RFC-0001`, lalu kontrak implementasi
lain dibangun di atas bahasa tersebut.

## Constitutional Baseline
- [ADR-0009](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0009-enterprise-control-graph-decision-artifacts.md)
- [ADR-0010](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0010-closed-loop-decision-architecture.md)
- [ADR-0011](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0011-platform-consolidation-runtime-layering.md)
- [ADR-0012](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0012-control-plane-dependency-inversion.md)

## Governance Rules
1. Every RFC MUST declare constitutional traceability to relevant ADR rules.
2. Every implementation change MUST be traceable to one RFC.
3. RFCs MAY evolve through versioned specification updates.
4. RFCs MUST NOT redefine frozen platform invariants.
5. Any proposal that changes constitutional invariants MUST go back to ADR.

## RFC Maturity
| Status | Meaning | Implementation Allowed? |
| --- | --- | --- |
| `Draft` | Early design, unstable semantics | No |
| `Proposed` | Reviewed candidate | Experimental only |
| `Accepted` | Official contract baseline | Yes |
| `Implemented` | Backed by implementation evidence | Yes |
| `Conformant` | Mandatory conformance clauses pass | Yes |
| `Verified` | Backed by verification evidence | Yes |
| `Stable` | Verified across releases without open drift | Yes |
| `Deprecated` | Superseded, migration phase | Migration only |

The active RFC set below is currently tracked as `Conformant` in the
specification registry because mandatory conformance surfaces and executable
verification evidence are now materialized.

## Active RFC Series
- [RFC-0001](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0001-specification-meta-model.md) — Specification Meta-Model
- [RFC-0002](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0002-enterprise-graph-navigation-api.md) — Enterprise Graph Navigation API
- [RFC-0003](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0003-evaluator-spi.md) — Evaluator SPI
- [RFC-0004](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0004-decision-engine-specification.md) — Decision Engine Specification
- [RFC-0005](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0005-decision-ledger-specification.md) — Decision Ledger Specification
- [RFC-0006](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0006-automation-runtime-spi.md) — Automation Runtime SPI
- [RFC-0007](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0007-evidence-artifact-model.md) — Evidence Artifact Model
- [RFC-0010](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0010-decision-object-model.md) — Decision Object Model

## Next RFC Backlog
- Enterprise Query Language
- Declarative Policy Architecture
- Reason Code Registry
- Decision Conflict Resolution Profiles

## Authoring
Use [RFC-TEMPLATE.md](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-TEMPLATE.md) for every new RFC.

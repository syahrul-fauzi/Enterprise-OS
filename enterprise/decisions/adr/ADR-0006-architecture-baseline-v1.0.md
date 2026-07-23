
# ADR-0006: Architecture Baseline v1.0
## Status
⏳ Superseded by ADR-0007

## Date
2026-07-23

## Context
After multiple iterations of repository restructuring, the team has established a stable:
- Repository organization (enterprise/, implementation/, workspace/)
- Governance model (freeze filesystem, only evolve enterprise model)
- Dependency hierarchy (8-level enterprise knowledge graph)
- Artifact taxonomy

## Decision
Declare **Architecture Baseline v1.0** as a stable milestone. No further structural changes without ADR.

## Rationale
- Establishes clear separation between Architecture Baseline (framework) and Enterprise Knowledge (content)
- Prevents further structural thrash
- Aligns with "Repository Frozen, Knowledge Evolvable" principle (EP-008)
- Provides stable foundation for semantic artifact construction

## Consequences
- Repository structure is frozen — no new directories or structural changes without ADR
- All future work focuses on completing semantic artifacts, not structural changes
- Semantic artifacts follow strict dependency hierarchy
- Enterprise Knowledge v1.0 is next major milestone


# ADR-0005: Governance for New Directories/Specifications
## Status
✅ Accepted

## Context
We have completed Phase 0 (Repository Baseline) and want to prevent the repository from gradually accumulating parallel concepts or overlapping specification families.

## Decision
No new top-level directory, specification family, or artifact category may be introduced without an Architecture Decision Record (ADR) that justifies the change and updates the dependency hierarchy in [enterprise/ROADMAP.md](file:///root/Enterprise%20OS/enterprise/ROADMAP.md).

## Rationale
This prevents repository drift and ensures every structural change is intentional and documented.

## Consequences
- All future structural changes require an ADR
- The dependency hierarchy in ROADMAP.md must be updated with each structural change

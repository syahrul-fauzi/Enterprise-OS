
# ADR-0001: Repository is Projection of Enterprise Knowledge
## Status
✅ Accepted

## Context
There was confusion about whether the repository structure is the source of truth or a reflection of enterprise knowledge.

## Decision
The repository is **not** the source of truth. The repository is a **projection** of the Enterprise Knowledge Model.

## Rationale
- Enterprise knowledge changes drive repository changes
- Repository is one of many projections (along with runtime, documentation, etc.)
- Aligns with "Enterprise First" principle (EP-001)
- Prevents repository drift from enterprise goals

## Consequences
- No repository structure changes without corresponding EKM changes
- All implementation artifacts must trace to enterprise knowledge
- Repository structure is **frozen** (can't change without EKM justification)

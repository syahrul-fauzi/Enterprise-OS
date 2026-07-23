
# ADR-0004: Canonical Object Graph (EKG) as Core of EKL
## Status
✅ Accepted

## Context
We were designing the Enterprise Knowledge Layer and needed a single source of truth for all enterprise knowledge.

## Decision
The **Canonical Object Graph (EKG)** is the authoritative source of all enterprise knowledge.

## Rationale
- Graph structure naturally captures relationships between entities
- Enables semantic reasoning
- All projections derive from the graph
- Aligns with Enterprise Knowledge Model

## Consequences
- Every enterprise entity is a node in the graph
- Every relationship is an edge with semantic meaning
- Graph must be validated against enterprise grammar
- Projection engine uses graph as input

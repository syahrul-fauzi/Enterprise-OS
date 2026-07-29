
# Enterprise OS — Graph Projection Rules
## Status
⏳ Draft (Version 0.1.0)
## Purpose
Normative rules for projecting EKM to Canonical Object Graph (EKG).
## Authority
Lead Enterprise Architect
## Scope
All phases; defines projection to enterprise/graph.
## Normative Rules
1. Every EKM artifact must be present in the graph.
2. The graph projection MUST represent semantic relationships, not mutable
   operational state.
3. Any projection that depends on live runtime data MUST declare ERS as an
   enrichment source rather than silently treating runtime data as graph truth.
## Grammar
TBD
## Constraints
- Must comply with EP-007 Projection Integrity.
- Must preserve the boundary: EKG = semantic canon, ERS = runtime state.
## Validation Rules
- Validate that each projected node and edge can be traced to governed source
  artifacts or approved derivation rules.
- Validate that runtime-only attributes are excluded from canonical graph
  identity.
## Projection Rules
- Graph projections may serve RTM, dependency analysis, impact analysis,
  coverage, and audit views.
- Graph projections may be enriched by ERS snapshots when current runtime state
  is required, but the enrichment must remain a secondary projection layer.
## Examples
(coming soon)
## Out of Scope
- Implementation-specific graph databases.
## Evolution
- Evolve only through governed evidence, governance review, and approved
  language or projection changes.

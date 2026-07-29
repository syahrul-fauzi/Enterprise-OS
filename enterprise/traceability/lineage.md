
# Enterprise OS — Lineage
## Status
⏳ Normative Draft (Version 0.2.0)
## Purpose
Define how artifacts inherit transformation identity across the EOS execution
pipeline.
## Authority
Lead Enterprise Architect
## Scope
All governed pipelines; initially applied to `Requirement` as the first
vertical slice.
## Normative Rules
1. Every artifact MUST have complete lineage.
2. Every governed artifact MUST carry a stable `semantic_id`.
3. Every artifact in one governed execution flow MUST carry the same
   `lineage_id`.
4. No accepted artifact may be orphaned from its transformation chain.
5. Lineage MUST be preserved from specification through evidence.
## Grammar
Markdown prose plus machine-readable lineage records in YAML or JSON.
## Constraints
- No orphan artifacts.
- No governed artifact without `semantic_id`.
- No lineage gaps between adjacent stages.
- No evidence record without lineage back to the originating specification.
## Validation Rules
- Validate that every governed artifact carries a `semantic_id`.
- Validate that every governed artifact carries a `lineage_id`.
- Validate that the same `lineage_id` appears across the full vertical slice.
- Validate that lineage can be reconstructed without manual interpretation.
## Projection Rules
- Lineage may project into graph views, traceability reports, evidence records,
  and certification evidence.
- Projections must preserve source-to-derived ordering.
## Out of Scope
- Storage engine design
- Visualization tooling
## Future Evolution
- Add formal lineage schemas and machine validation hooks.

---

## 1. Lineage Identity

`semantic_id` is the stable identity of the concept being expressed.

`lineage_id` is the identity of one transformation chain, not the identity of
an artifact instance.

Example:

```text
semantic_id: REQ-0001
lineage_id: LIN-8F12
   ├── ELS
   ├── YAML
   ├── TS Types
   ├── Zod Schema
   ├── EDM Aggregate
   ├── Domain Package
   ├── EKG Node
   └── Evidence
```

All artifacts above may have different artifact identifiers, but they share one
`semantic_id` because they express the same concept, and one `lineage_id`
because they belong to the same governed execution flow.

---

## 2. Lineage Record Template

```yaml
semantic_id: REQ-0001
lineage_id: LIN-REQ-001
root_requirement_id: REQ-001
artifacts:
  - id: els.requirement
    stage: els
  - id: requirement.yaml
    stage: canonical_yaml
  - id: requirement.types.ts
    stage: generated_contract
  - id: requirement.schema.json
    stage: generated_contract
  - id: requirement.aggregate
    stage: edm
  - id: packages/domain/requirement
    stage: domain
  - id: ekg.requirement.node
    stage: ekg
  - id: evidence.req.001
    stage: evidence
```

---

## 3. Lineage Acceptance

Lineage is complete only when:
1. the root requirement is known;
2. every downstream stage is recorded;
3. every artifact carries the same `semantic_id`;
4. every artifact in one proof run carries the same `lineage_id`;
5. evidence refers to the same `lineage_id`;
6. no transformation segment is missing.

If any rule above fails, the pipeline is not lineage-complete.

---

## 4. Operational Meaning

Lineage makes audit practical:
- it lets reviewers follow one execution chain across all artifacts;
- it distinguishes concept identity from proof-run identity;
- it separates artifact identity from transformation identity;
- it prevents silent drift across stages;
- it supports PAC and execution evidence acceptance.

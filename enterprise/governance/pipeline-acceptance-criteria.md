# Enterprise OS — Pipeline Acceptance Criteria
## Status
⏳ Governance Draft (Version 0.1.0)
## Purpose
Define when a specification execution pipeline is valid as a whole, not only
when its individual artifacts exist.
## Authority
Lead Enterprise Architect
## Scope
All governed specification execution pipelines, beginning with `Requirement`
as the first EOS vertical slice.
## Normative Rules
1. Every governed pipeline MUST declare explicit acceptance criteria for each
   transformation stage.
2. PAC is a governance artifact, not a new architectural level.
3. A pipeline run MUST NOT be accepted if any stage fails its declared
   acceptance rule.
4. PAC MUST validate both artifacts and transformations between artifacts.
5. PAC MUST reference the shared `semantic_id` and `lineage_id` used across the
   execution run.
6. PAC SHOULD be executable in documentation, machine-readable, and test forms.
## Grammar
Markdown prose plus stage acceptance contracts represented in YAML or JSON.
## Constraints
- No pipeline may be accepted by artifact presence alone.
- No pipeline may be accepted with incomplete lineage.
- No pipeline may be accepted with non-deterministic regeneration.
- No accepted PAC run without distinguishable semantic and lineage identity.
## Validation Rules
- Validate that every stage declares an acceptance rule.
- Validate that acceptance rules are machine-checkable or explicitly marked as
  pending automation.
- Validate that PAC results are attached to execution evidence.
## Projection Rules
- PAC may project into release gates, certification views, audit reports, and
  execution dashboards.
- PAC results must preserve stage status, lineage, and evidence links.
## Out of Scope
- Generator implementation details
- UI rendering of dashboards
- Business-domain semantics
## Future Evolution
- Add machine-readable PAC schemas and automation hooks through governed
  adoption.

---

## 1. PAC Role

PAC answers one question:

> When is the pipeline valid as a whole?

PAC exists because EOS must validate transformation integrity, not only the
existence of outputs.

---

## 2. Requirement Vertical Slice PAC

The first PAC applies to `EOS Vertical Slice v1`, formalized as
`EOS Proof of Execution v1` (`PoE v1`).

| Stage | Subject | Acceptance |
|------|---------|------------|
| ELS | `Requirement` specification | DoSC passed |
| YAML | canonical machine form | schema valid |
| Compiler | EOS Specification Compiler | `SDR >= 95%` for PoE v1 |
| EDM | requirement domain model | contract complete |
| Domain | `packages/domain/requirement` | build and lint passed |
| EKG | requirement node and relations | relations validated |
| Evidence | execution record | lineage complete |
| Acceptance | proof gate | DoP achieved |

All stages must pass for the vertical slice to be accepted.

---

## 3. Executable PAC Surfaces

PAC should exist in three coordinated forms:
- `PAC.md` for human governance review
- `PAC.yaml` for machine-readable contract execution
- `PAC.test.ts` for executable acceptance in CI

These three forms must represent the same governed acceptance semantics.

---

## 4. Acceptance Contract Template

```yaml
pipeline_id: PAC-REQ-VS1
semantic_id: REQ-0001
lineage_id: LIN-REQ-001
concept: Requirement
stages:
  - stage: els
    acceptance: dosc_passed
    status: pending
  - stage: yaml
    acceptance: schema_valid
    status: pending
  - stage: compiler
    acceptance: sdr_gte_95
    status: pending
  - stage: edm
    acceptance: contract_complete
    status: pending
  - stage: domain
    acceptance: build_and_lint_passed
    status: pending
  - stage: ekg
    acceptance: relations_validated
    status: pending
  - stage: evidence
    acceptance: lineage_complete
    status: pending
  - stage: acceptance
    acceptance: dop_achieved
    status: pending
overall_acceptance: pending
```

---

## 5. Verification Semantics

PAC verifies:
- preconditions for execution;
- successful transformation between stages;
- deterministic regeneration;
- stable semantic identity;
- complete lineage;
- evidence attachment to the originating specification.

PAC does not replace DoR, DoSC, or DoD.

Instead:
- DoR controls entry into authoring;
- DoSC controls semantic completeness;
- DoD controls stage completion;
- DoP controls whether the slice is empirically proven;
- PAC controls validity of the pipeline as an integrated system.

---

## 6. Failure Interpretation

PAC failures should be interpreted by stage:
- `ELS` failure indicates semantic incompleteness
- `YAML` failure indicates invalid machine contract
- `Compiler` failure indicates determinism or compilation defect
- `EDM` failure indicates incomplete domain realization
- `Domain` failure indicates implementation conformance defect
- `EKG` failure indicates graph inconsistency
- `Evidence` failure indicates broken auditability or lineage
- `Acceptance` failure indicates proof gate not reached

This keeps root-cause analysis precise.

---

## 7. Initial Success Condition

`PoE v1` is accepted only when:
1. all PAC stages pass;
2. `SDR >= 95%`;
3. one stable `semantic_id` is preserved for the concept;
4. one stable `lineage_id` is preserved across the proof run;
5. evidence proves each transformation without manual reconstruction;
6. DoP is achieved.

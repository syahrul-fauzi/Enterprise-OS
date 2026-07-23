
# Enterprise OS — Enterprise Specification Template
## Status
✅ Normative (Version 2.0.0)
## Purpose
Official, normative template for ALL Enterprise Knowledge Model specifications, following the EKL Universal Artifact Schema. Every enterprise specification MUST use this template exactly.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every enterprise specification file
## Normative Rules
1. Every enterprise specification must follow this template exactly, including the Universal Artifact Schema.
2. Every section must be present (even if empty or marked TBD).
3. All normative content must be explicit and machine-readable where possible.
## Grammar
YAML for structured content, Markdown for prose
## Constraints
- No deviations from this template allowed without approval
- No extra sections allowed without approval
## Validation Rules
- Every specification must be validated against this template and Universal Artifact Schema
## Projection Rules
- This template is used for all projections that generate documentation
## Examples
(see all constitution files using this template)
## Out of Scope
- Implementation-specific documentation templates
## Future Evolution
- Template may evolve, but existing specifications must follow version used at creation
---

## EKL Universal Artifact Schema
```yaml
metadata:
  id: ART-[TYPE]-[NNN]
  name: [Specification Name]
  version: [MAJOR.MINOR.PATCH]
  status: [Concept | Draft | Normative | Deprecated | Retired]
  authority: [Entity ID]
  owner: [Entity ID]
  created_at: [ISO 8601 DateTime]
  updated_at: [ISO 8601 DateTime]

language:
  requires: ">=1.0.0"

conformance:
  minimum_level: 3

semantics:
  type: [Model | Map | Contract | Specification | Projection | Grammar]
  ontology: [Ontology ID]
  grammar: [Grammar ID (optional)]

relationships: []

constraints: []

evidence: []

projections: []

history: []
```

---

## Specification Sections (Must Use Exact Order)
### 1. Title & Metadata
### 2. Status
### 3. Purpose
### 4. Authority
### 5. Scope
### 6. Normative Rules
### 7. Grammar
### 8. Constraints
### 9. Validation Rules
### 10. Projection Rules
### 11. Examples
### 12. Out of Scope
### 13. Future Evolution
---

## [Additional Content]

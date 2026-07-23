
# Enterprise OS — Capability Quality Rules
## Status
✅ Normative (Version 1.0.0)
## Purpose
Normative guardrails for auditing Business Capabilities against consistent quality criteria.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every Business Capability
## Normative Rules
1. Every Business Capability must satisfy all required rules.
2. Recommended rules are encouraged but not mandatory.
3. Exceptions require explicit approval and documented evidence.
## Grammar
YAML, as shown below
## Constraints
- Every capability must pass required rules
- No exceptions without approval
## Validation Rules
- Automated checks for required/recommended rules
- Audit trail for exceptions
## Projection Rules
- Quality rules inform Capability Map validation
## Examples
See below
## Out of Scope
- Quality rules for Platform Capabilities (future)
## Future Evolution
- Add Platform Capability rules
---

## Capability Quality Specification
```yaml
capability_quality:
  identifier:
    required: true
    description: "Unique, stable identifier following ENT-CAP-[NNN] pattern"
  business_outcome:
    required: true
    description: "Clear, measurable business outcome"
  owner:
    required: true
    description: "Single accountable Actor owner"
  measurable:
    required: true
    description: "Define KPIs or measurable success criteria"
  technology_independent:
    required: true
    description: "No references to technology, platforms, or implementation details"
  reusable:
    recommended: true
    description: "Designed for reuse across multiple missions or contexts"
  lifecycle:
    required: true
    description: "Defined lifecycle state (Concept, Development, Operational, Deprecated, Retired)"
  evidence:
    required: true
    description: "Evidence requirements for proving capability success"
```
---

## Example Valid Capability
```yaml
capability:
  id: ENT-CAP-001
  name: Manage Client Matter
  business_outcome: "All client matters are tracked from intake to closure with complete audit trail"
  owner: ENT-ACT-001
  measurable:
    - "99% of matters closed within SLA"
    - "100% audit trail completeness"
  technology_independent: true
  lifecycle: Operational
  evidence:
    - "Matter closure reports"
    - "Audit trail logs"
```

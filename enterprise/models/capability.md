
# Enterprise OS — Business Capability Model
## Status
✅ Normative (Version 1.0.0)
## Purpose
Canonical model for defining Business Capabilities — the fundamental building blocks of the enterprise.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every Business Capability in Enterprise Knowledge Model.
## Normative Rules
1. Every Business Capability MUST follow this model exactly.
2. Every Business Capability MUST satisfy all Capability Quality Rules.
3. Every Business Capability MUST have a unique identifier following ENT-CAP-[NNN] pattern.
## Grammar
YAML, as defined below.
## Constraints
- Must satisfy Capability Quality Rules
- Must use only terms from Enterprise Vocabulary
- Must follow Relationship Grammar for all relationships
## Validation Rules
- Validate against Capability Quality Rules
- Validate against Relationship Grammar
- Validate identifier uniqueness
## Projection Rules
- Business Capabilities are projected as nodes in COG
- Business Capabilities are used to build Business Capability Map
- Business Capabilities inform Repository Projection structure
## Examples
See below.
## Out of Scope
- Platform Capabilities (future)
## Future Evolution
- Add Platform Capability model
---

## Business Capability Model Specification
```yaml
business_capability:
  id: ENT-CAP-[NNN]
  name: [Capability Name]
  description: >
    [Clear, unambiguous description]
  business_outcome: >
    [Measurable business outcome]
  owner: [Actor ID]
  measurable:
    - [KPI 1]
    - [KPI 2]
  technology_independent: true
  reusable: [true | false]
  lifecycle: [Concept | Development | Operational | Deprecated | Retired]
  evidence:
    - [Evidence Type 1]
    - [Evidence Type 2]
  relationships:
    - type: [Relationship Type]
      target: [Target Entity ID]
```
---

## Example Business Capability
```yaml
business_capability:
  id: ENT-CAP-001
  name: Manage Client Matter
  description: >
    End-to-end management of client legal matters from initial intake through final closure, including matter tracking, document management, and billing integration.
  business_outcome: >
    All client matters are tracked with 100% audit trail completeness and 99% closure within established SLA.
  owner: ENT-ACT-001
  measurable:
    - "99% of matters closed within SLA"
    - "100% audit trail completeness"
    - "Average matter intake time < 4 hours"
  technology_independent: true
  reusable: true
  lifecycle: Operational
  evidence:
    - "Matter closure reports"
    - "Audit trail logs"
    - "SLA compliance reports"
  relationships:
    - type: is_realized_by
      target: ENT-SVC-001
    - type: owned_by
      target: ENT-ACT-001
```

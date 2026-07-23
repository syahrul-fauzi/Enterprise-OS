
# Enterprise OS — Business Service Model
## Status
✅ Normative (Version 1.0.0)
## Purpose
Canonical model for defining Business Services — the operational realizations of Business Capabilities.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every Business Service in Enterprise Knowledge Model.
## Normative Rules
1. Every Business Service MUST follow this model exactly.
2. Every Business Service MUST realize exactly one Business Capability (per Relationship Grammar REL-001).
3. Every Business Service MUST expose a Business Contract.
## Grammar
YAML, as defined below.
## Constraints
- Must realize exactly one Business Capability
- Must use only terms from Enterprise Vocabulary
- Must follow Relationship Grammar
## Validation Rules
- Validate against Relationship Grammar (realizes exactly one capability)
- Validate contract existence
- Validate identifier uniqueness
## Projection Rules
- Business Services are projected as nodes in COG
- Business Services inform Repository Projection implementation packages
## Examples
See below.
## Out of Scope
- Platform Services (future)
## Future Evolution
- Add Platform Service model
---

## Business Service Model Specification
```yaml
business_service:
  id: ENT-SVC-[NNN]
  name: [Service Name]
  description: >
    [Clear, unambiguous description]
  realizes: [Business Capability ID]
  contract: [Contract ID]
  owner: [Actor ID]
  lifecycle: [Concept | Development | Operational | Deprecated | Retired]
  relationships:
    - type: realizes
      target: [Business Capability ID]
```
---

## Example Business Service
```yaml
business_service:
  id: ENT-SVC-001
  name: Client Matter Management Service
  description: >
    Operational service for managing client legal matters, exposing standardized interfaces for intake, tracking, document management, and closure.
  realizes: ENT-CAP-001
  contract: ENT-CON-001
  owner: ENT-ACT-001
  lifecycle: Operational
  relationships:
    - type: realizes
      target: ENT-CAP-001
```

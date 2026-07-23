
# Enterprise OS — Capability Grammar
## Status
✅ Normative (Version 1.0.0)
## Purpose
Normative grammar for defining capabilities (both Business and Platform).
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to all capabilities.
## Normative Rules
1. Every capability MUST follow this grammar.
2. Every capability MUST satisfy Capability Quality Rules.
## Grammar
YAML, as defined below.
## Constraints
- Must follow Capability Quality Rules
- Must use only terms from Enterprise Vocabulary
## Validation Rules
- Validate against Capability Quality Rules
- Validate identifier uniqueness
## Projection Rules
- Capabilities are projected as nodes in COG
- Capabilities are used to build Capability Map
## Examples
See [capability.md](../models/capability.md).
## Out of Scope
- (future items)
## Future Evolution
- Add Platform Capability grammar
---

## Capability Grammar Specification
```yaml
capability:
  type: [BusinessCapability | PlatformCapability]
  id: ENT-CAP-[NNN] | ENT-PLAT-[NNN]
  name: [Capability Name]
  description: >
    [Description]
  business_outcome: >
    [Outcome]
  owner: [Actor ID]
  measurable:
    - [KPI 1]
  technology_independent: [true | false]
  reusable: [true | false]
  lifecycle: [Concept | Development | Operational | Deprecated | Retired]
  evidence:
    - [Evidence Type]
  relationships:
    - type: [Relationship Type]
      target: [Target Entity ID]
```


# Enterprise OS — Relationship Grammar
## Status
✅ Normative (Version 2.0.0)
## Purpose
Normative, executable semantics for relationships between EKL entities. Every relationship in EKL must be defined exactly using this grammar.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every single relationship in EKL.
## Normative Rules
1. Every EKL relationship must be defined exactly using this grammar
2. Every relationship must have a unique inverse (where applicable)
3. Every relationship must define source/target types and cardinality
## Grammar
YAML as specified below
## Constraints
- No relationship may be defined without valid source and target types
- Inverse relationships must be consistent
## Validation Rules
- Validate relationship definitions against this grammar
- Validate inverse relationships are consistent
- Validate source/target type existence and cardinality
## Projection Rules
- Relationships are projected as edges in Canonical Object Graph (COG)
- Relationships are used to enforce referential integrity
## Examples
See below
## Out of Scope
(coming soon)
## Future Evolution
(coming soon)
---

## Relationship Definition Template
```yaml
relationship:
  id: REL-[NNN]
  name: [Relationship Name]
  description: [Clear, unambiguous description]
  source:
    types: [List of Entity Types]
    cardinality: [one | many | one_or_many | zero_or_one | zero_or_many]
  target:
    types: [List of Entity Types]
    cardinality: [one | many | one_or_many | zero_or_one | zero_or_many]
  inverse: [Relationship ID]
  transitive: [true | false]
  symmetric: [true | false]
  projection:
    graph: [edge]
    repository: [optional projection rules]
  validation:
    source_must_exist: [true | false]
    target_must_exist: [true | false]
    cardinality_enforced: [true | false]
```

---

## Core Relationships
```yaml
relationship:
  id: REL-001
  name: owns
  description: An Actor has ownership or responsibility for an Entity
  source:
    types: [Actor]
    cardinality: one
  target:
    types: [Entity]
    cardinality: many
  inverse: REL-002
  transitive: false
  symmetric: false
  projection:
    graph: edge
  validation:
    source_must_exist: true
    target_must_exist: true
    cardinality_enforced: true
---
relationship:
  id: REL-002
  name: owned_by
  description: An Entity is owned or managed by an Actor
  source:
    types: [Entity]
    cardinality: one
  target:
    types: [Actor]
    cardinality: one
  inverse: REL-001
  transitive: false
  symmetric: false
  projection:
    graph: edge
  validation:
    source_must_exist: true
    target_must_exist: true
    cardinality_enforced: true
---
relationship:
  id: REL-003
  name: realizes
  description: A Service realizes exactly one Capability
  source:
    types: [Service]
    cardinality: one
  target:
    types: [Capability]
    cardinality: one
  inverse: REL-004
  transitive: false
  symmetric: false
  projection:
    graph: edge
  validation:
    source_must_exist: true
    target_must_exist: true
    cardinality_enforced: true
---
relationship:
  id: REL-004
  name: realized_by
  description: A Capability is realized by one or more Services
  source:
    types: [Capability]
    cardinality: one
  target:
    types: [Service]
    cardinality: many
  inverse: REL-003
  transitive: false
  symmetric: false
  projection:
    graph: edge
  validation:
    source_must_exist: true
    target_must_exist: true
    cardinality_enforced: true
---
relationship:
  id: REL-005
  name: executes
  description: A Mission executes one or more Capabilities
  source:
    types: [Mission]
    cardinality: one
  target:
    types: [Capability]
    cardinality: many
  inverse: REL-006
  transitive: false
  symmetric: false
  projection:
    graph: edge
  validation:
    source_must_exist: true
    target_must_exist: true
    cardinality_enforced: true
---
relationship:
  id: REL-006
  name: executed_by
  description: A Capability is executed by zero or more Missions
  source:
    types: [Capability]
    cardinality: one
  target:
    types: [Mission]
    cardinality: many
  inverse: REL-005
  transitive: false
  symmetric: false
  projection:
    graph: edge
  validation:
    source_must_exist: true
    target_must_exist: true
    cardinality_enforced: true
```

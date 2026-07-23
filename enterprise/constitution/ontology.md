
# Enterprise OS — Enterprise Ontology
## Status
✅ Normative (v1.0.0)
## Purpose
Formal semantic type system of EKL, defining fundamental entity types and their core shared properties.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to all entities and relationships in EKL.
## Normative Rules
1. Every EKL entity must inherit from exactly one root entity type
2. Every EKL entity must implement all core semantic properties defined here
3. No entity type may violate this ontology's hierarchy
## Grammar
YAML as specified below
## Constraints
- No circular inheritance allowed
- All core properties are mandatory for every entity
## Validation Rules
- Validate inheritance hierarchy for each entity
- Validate core properties are present for every entity
## Projection Rules
- Ontology defines node and edge types for COG
- Ontology defines validation rules for all EKL artifacts
## Examples
(coming soon)
## Out of Scope
(coming soon)
## Future Evolution
- Add more concrete specializations of root entity types
- Refine core properties
---

## Root Entity Hierarchy
```yaml
root_entities:
  - Entity

entity_specializations:
  Entity:
    - Concept
    - Actor
    - Artifact
    - Event
    - Relationship
    - Constraint
    - Evidence
```

## Core Semantic Properties (Mandatory for All Entities)
```yaml
core_properties:
  id:
    type: String
    required: true
    description: Unique, stable, immutable identifier following ENT-[TYPE]-[NNN] pattern
    validation:
      - Must be globally unique
      - Must never change after creation
  type:
    type: String
    required: true
    description: Entity type from this ontology's hierarchy
  lifecycle_state:
    type: Enum
    required: true
    enum: [Concept, Development, Operational, Deprecated, Retired]
    description: Current position in entity's lifecycle
  authority:
    type: Entity
    required: true
    description: Actor responsible for this entity
  evidence_requirements:
    type: List(Evidence)
    required: false
    description: Evidence required to validate this entity
  provenance:
    type: Provenance
    required: true
    description: Complete provenance record for this entity
  relationships:
    type: List(Relationship)
    required: false
    description: Relationships this entity participates in
```

## Root Entity Type Definitions
```yaml
Entity:
  description: Abstract base class for all things in EKL
  abstract: true
  properties: all core_properties

Concept:
  description: Abstract idea, principle, or requirement
  inherits_from: Entity
  properties:
    additional:
      business_value:
        type: Number
        required: false

Actor:
  description: Entity capable of performing actions or making decisions
  inherits_from: Entity
  properties:
    additional:
      authority_level:
        type: Enum
        required: false
        enum: [Guest, User, Manager, Owner, Admin, System]

Artifact:
  description: Tangible or digital enterprise asset
  inherits_from: Entity
  properties:
    additional:
      format:
        type: String
        required: false
      location:
        type: String
        required: false

Event:
  description: Something that happens in the enterprise
  inherits_from: Entity
  properties:
    additional:
      timestamp:
        type: DateTime
        required: true
      source:
        type: Entity
        required: true

Relationship:
  description: Semantic connection between two entities
  inherits_from: Entity
  properties:
    additional:
      source:
        type: Entity
        required: true
      target:
        type: Entity
        required: true
      cardinality:
        type: Enum
        required: true
        enum: [one-to-one, one-to-many, many-to-one, many-to-many]
      inverse:
        type: Relationship
        required: false

Constraint:
  description: Rule that limits or governs behavior
  inherits_from: Entity
  properties:
    additional:
      condition:
        type: String
        required: true
      severity:
        type: Enum
        required: true
        enum: [Info, Warning, Error, Critical]

Evidence:
  description: Verifiable data supporting an assertion
  inherits_from: Entity
  properties:
    additional:
      assertion:
        type: String
        required: true
      verifiable:
        type: Boolean
        required: true
```

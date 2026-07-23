
# Enterprise OS — Enterprise Meta Model
## Status
✅ Normative (v1.0.0)
## Purpose
Generic schema for EKL artifacts, defining how knowledge is represented in EKL (not what knowledge is).
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every single EKL artifact.
## Normative Rules
1. Every EKL artifact MUST conform to this meta-model
2. Every EKL artifact MUST have all mandatory metadata
3. Every EKL artifact MUST follow the naming conventions from naming-conventions.md
## Grammar
YAML as specified below
## Constraints
- No EKL artifact may omit mandatory metadata
- All references must be resolvable
## Validation Rules
- Validate mandatory metadata is present
- Validate identifier correctness and uniqueness
- Validate reference resolvability
## Projection Rules
- Meta-model defines how EKL artifacts are projected into COG
- Meta-model defines how EKL artifacts are validated
## Examples
(coming soon)
## Out of Scope
(coming soon)
## Future Evolution
(coming soon)
---

## EKL Artifact (Mandatory for All Artifacts)
```yaml
EKLArtifact:
  mandatory_metadata:
    id:
      type: String
      required: true
      pattern: ART-[TYPE]-[NNN]
      description: Unique identifier for this EKL artifact
    name:
      type: String
      required: true
      description: Human-readable name of this artifact
    status:
      type: Enum
      required: true
      enum: [Concept, Draft, Normative, Deprecated, Retired]
      description: Current maturity status of this artifact
    version:
      type: String
      required: true
      pattern: "[0-9]+.[0-9]+.[0-9]+"
      description: Semantic version of this artifact
    authority:
      type: Entity
      required: true
      description: Entity responsible for this artifact
    created_at:
      type: DateTime
      required: true
      description: Date and time this artifact was created
    updated_at:
      type: DateTime
      required: true
      description: Date and time this artifact was last updated
  optional_metadata:
    description:
      type: String
      required: false
    tags:
      type: List(String)
      required: false
```

## EKL Artifact Types (Generic)
```yaml
artifact_types:
  Model:
    description: Defines a type or concept
    specialization: EKLArtifact
  Map:
    description: Defines concrete instances and their relationships
    specialization: EKLArtifact
  Contract:
    description: Defines interaction boundaries and rules
    specialization: EKLArtifact
  Specification:
    description: Defines grammar, rules, or patterns
    specialization: EKLArtifact
  Projection:
    description: Defines how entities map to implementation
    specialization: EKLArtifact
  Grammar:
    description: Defines syntax and semantics for a specific type
    specialization: EKLArtifact
```

## Core Concepts (Generic)
```yaml
core_concepts:
  Entity: Any thing that exists in EKL
  Relationship: A semantic connection between two Entities
  Attribute: A property of an Entity or Relationship
  Reference: A pointer from one artifact to another
  Constraint: A rule that governs behavior
  Evidence: Verifiable data supporting an assertion
```

## Reference Resolution
```yaml
reference_resolution:
  pattern: ENT-[TYPE]-[NNN]
  scope: Global (all entities in EKL)
  rules:
    - Every reference must resolve to exactly one entity
    - References to deprecated entities must be accompanied by a migration plan
    - References to retired entities are forbidden
```

## Versioning
```yaml
versioning:
  scheme: Semantic Versioning (MAJOR.MINOR.PATCH)
  rules:
    MAJOR: Breaking changes (incompatible with existing artifacts)
    MINOR: New features (backward compatible)
    PATCH: Bug fixes (backward compatible)
```

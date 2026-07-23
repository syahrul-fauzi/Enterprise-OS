
# Enterprise OS — Naming Conventions
## Status
✅ Normative (Version 1.0.0)
## Purpose
To define consistent, unambiguous naming rules for all enterprise artifacts, entities, and relationships.
## Authority
Lead Enterprise Architect
## Scope
All phases; all enterprise artifacts
## Normative Rules
1. All names must use terms defined in Enterprise Vocabulary.
2. Names must be unambiguous and descriptive.
3. Names must adhere to pattern rules defined below.
4. Every name must be unique within its scope.
## Grammar
YAML + Markdown examples, as shown below.
## Constraints
- No duplicate names within scope
- No ambiguous names
- No names that contradict Enterprise Vocabulary
## Validation Rules
- All names validate against patterns
- All names use Vocabulary terms
## Projection Rules
- Naming conventions inform Repository Projection (file/dir names, etc.)
- Naming conventions are used by Enterprise Knowledge Graph for node/edge labels
## Examples
See below.
## Out of Scope
- Implementation-specific naming
## Evolution
- Add new patterns as new artifact types are defined
---

## Naming Patterns
```yaml
naming_patterns:
  # Artifact Files
  artifact_file:
    pattern: kebab-case
    example: business-capability-map.md
  # Directory Names
  directory:
    pattern: kebab-case
    example: enterprise-context-map
  # Model Types
  model_type:
    pattern: PascalCase
    example: BusinessCapability
  # Relationship Types
  relationship_type:
    pattern: camelCase
    example: realizes
  # Canonical Instance Identifiers (stable)
  canonical_instance_id:
    pattern: [PREFIX]-[KEBAB-CASE-NAME]
    prefix_map:
      BusinessCapability: BC
      BusinessService: BS
      PlatformCapability: PC
      Actor: ACT
      Policy: POL
      Evidence: EVD
      Constraint: CON
    example: BC-CUSTOMER-MANAGEMENT
  # Principle Identifiers
  principle_id:
    pattern: EP-[NNN]
    example: EP-001
  # Relationship Identifiers
  relationship_id:
    pattern: REL-[NNN]
    example: REL-001
```
---

## Examples
| Type | Example | Pattern Used |
|------|---------|--------------|
| Artifact File | business-capability.md | kebab-case |
| Directory | projections/computational | kebab-case |
| Model Type | BusinessService | PascalCase |
| Relationship Type | realizes | camelCase |
| Canonical Instance | BC-CUSTOMER-MANAGEMENT | [PREFIX]-[KEBAB-NAME] |
| Principle ID | EP-001 | EP-[NNN] |
| Relationship ID | REL-001 | REL-[NNN] |


# Enterprise OS — EKL Language Specification
## Status
✅ Normative (v1.0.0)
## Purpose
Authoritative specification defining how the EKL Kernel fits together, its normative components, evaluation order, responsibility boundaries, versioning, and conformance levels.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every aspect of Enterprise Knowledge Language (EKL).
## Normative Rules
1. All EKL artifacts must conform to this specification
2. Responsibility boundaries defined here are authoritative
3. Language versioning and conformance must be followed exactly
## Grammar
YAML for structured content, Markdown for prose
## Constraints
- No deviation from defined responsibility boundaries
- All language evolution follows this specification
## Validation Rules
- Validate language conformance for all artifacts
- Validate version compatibility
## Projection Rules
- This specification governs all future projections
## Examples
See below
## Out of Scope
Enterprise-specific knowledge models
## Future Evolution
Define additional conformance levels as needed
---

## 1. What is EKL?
Enterprise Knowledge Language (EKL) is a formally specified domain-specific language for expressing enterprise knowledge, semantics, constraints, governance, traceability, and projection rules. From EKL models, repositories, documentation, runtime artifacts, APIs, indexes, and other implementation assets can be automatically derived.

---

## 2. Normative Components
The EKL Kernel consists of these normative components:

| Component | Purpose | Status |
|-----------|---------|--------|
| Constitution | Immutable principles and rules | ✅ Normative |
| Vocabulary | Defines terms and meanings | ✅ Normative |
| Ontology | Defines entity types and core properties | ⏳ Draft |
| Meta Model | Defines how knowledge is represented | ⏳ Draft |
| Relationship Grammar | Defines legal entity relationships | ✅ Normative |
| Capability Grammar | Defines capability semantics | ✅ Normative |
| Naming Conventions | Defines consistent naming | ✅ Normative |
| Specification Template | Universal artifact schema | ✅ Normative |
| Validation Rules | Defines validation semantics | ✅ Normative |

---

## 3. Evaluation Order
EKL artifacts are evaluated in this order to ensure consistency:

1. **Constitution** (authoritative principles)
2. **Vocabulary** (defines all terms)
3. **Ontology** (defines what can exist)
4. **Meta Model** (defines how it's expressed)
5. **Relationship Grammar** (defines how things connect)
6. **Capability Grammar** (defines capability semantics)
7. **Naming Conventions** (enforces consistency)
8. **Validation Rules** (enforces correctness)
9. **Enterprise Models** (uses language)
10. **Enterprise Maps** (instantiates models)
11. **Contracts** (defines interactions)
12. **Projections** (generates artifacts)

---

## 4. Responsibility Boundaries
| Component | Responsibility |
|-----------|----------------|
| Constitution | Governs the entire language; immutable |
| Vocabulary | Defines all terms used; single source of truth for meanings |
| Ontology | Defines what entity types exist and their core properties |
| Meta Model | Defines how entities, relationships, constraints, etc., are structured in EKL artifacts |
| Relationship Grammar | Defines legal relationships, their semantics, and validation rules |
| Capability Grammar | Defines the semantics of capabilities |
| Naming Conventions | Enforces consistent naming across all artifacts |
| Specification Template | Universal schema for all EKL artifacts |
| Validation Rules | Defines how to validate EKL artifacts and enterprise models |

---

## 5. Resolution of Overlap
If two EKL components appear to overlap or conflict, this is the authoritative resolution order:

1. **Enterprise Principles** (constitution)
2. **Design Philosophy** (constitution)
3. **Modeling Principles** (constitution)
4. **Vocabulary**
5. **Ontology**
6. **Meta Model**
7. **Relationship Grammar**
8. **Capability Grammar**
9. **Naming Conventions**

---

## 6. Language Versioning
The EKL language itself has a semantic version, independent from enterprise knowledge model versions:

```yaml
ekl:
  version: 1.0.0  # EKL Language version
  kernel: 1.0.0   # EKL Kernel version
```

Every EKL artifact must declare the minimum EKL language version it requires:

```yaml
language:
  requires: ">=1.0.0"
```

---

## 7. Conformance Levels
EKL defines these conformance levels to allow incremental adoption:

| Level | Name | Requirements |
|-------|------|--------------|
| 0 | Vocabulary Only | Uses only EKL Vocabulary |
| 1 | Core Foundation | Vocabulary + Ontology + Meta Model |
| 2 | Full Relationships | Level 1 + Relationship Grammar |
| 3 | Capability-Ready | Level 2 + Capability Grammar + Naming Conventions |
| 4 | Validatable | Level 3 + Validation Rules |
| 5 | Compiler-Ready | Level 4 + complete EKL Kernel, ready for EKE |

Every EKL artifact must declare its minimum required conformance level:

```yaml
conformance:
  minimum_level: 3
```

---

## 8. Separating EKL Evolution from Enterprise Evolution
EKL and Enterprise Knowledge evolve independently:

- **EKL Versions**: `v1.0`, `v1.1`, `v2.0`, etc.
- **Enterprise Knowledge Versions**: Calendar-based or semantic, e.g., `2026.1`, `2026.2`

An enterprise knowledge model may target a specific EKL version, independent of its own version.

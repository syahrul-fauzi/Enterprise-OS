
# Enterprise OS — Enterprise Knowledge Dependency Roadmap
## Milestones
- ✅ **Enterprise Knowledge Language (EKL) Baseline v1.0**: Complete framework for enterprise knowledge modeling, including vocabulary, ontology, metamodel, grammars, validation, projections, traceability, and lifecycle specifications. Repository permanently frozen.
- ✅ **EKL Core v1.0**: Constitution, Vocabulary, EKL Language Specification, Ontology, Meta Model, Relationship Grammar, Capability Grammar, and Universal Artifact Schema are all normative and internally consistent.
- ✅ **Enterprise Knowledge Model v1.0 (Phase 2 complete)**:
  - ✅ Created canonical schemas in `enterprise/schema/` (artifact.schema.yaml, canonical-object.schema.yaml, manifest.schema.yaml, relationship.schema.yaml)
  - ✅ Created EKL Standard Library in `enterprise/library/` (BusinessCapability, BusinessService, Actor, Policy, Evidence, PlatformCapability)
  - ✅ Defined canonical identity grammar (URN format: urn:ekl:<namespace>:<type>:<name>)
  - ✅ Updated knowledge package structure to `enterprise/knowledge/packages/`
  - ✅ Frozen customer-management example as `customer-management-v1` with manifest.yaml
  - ✅ Implemented schema validator (first component of EKE) in `implementation/eke/`
  - ✅ Implemented graph builder (second component of EKE) in `implementation/eke/graph_builder.py`
  - ✅ Implemented projection engine (third component of EKE) in `implementation/eke/projection_engine.py`

## Phase 2.x — Compiler Maturity (Current Focus)
Instead of scaling the knowledge catalog, the next step is to stabilize and mature the **Enterprise Knowledge Engine (EKE)** into a true compiler with a clean pipeline:

| Phase | Focus                  | Goal                                                                                                                 |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 2.1   | Parser & Passes         | Convert manifests and YAML into canonical objects using structured compiler passes                                        |
| 2.2   | Semantic validator     | Enforce ontology, relationship grammar, authority, and policy rules with diagnostics                                      |
| 2.3   | Canonical Object Graph | Build a storage-independent graph from validated objects                                                             |
| 2.4   | Enterprise IR          | Introduce a stable Intermediate Representation (IR) between graph construction and projections                            |
| 2.5   | Reasoning engine       | Infer derived relationships and validate semantic consistency                                                        |
| 2.6   | Projection engine      | Generate documentation, repository layouts, APIs, graph databases, search indexes, and runtime artifacts from the IR |
| 2.7   | Conformance suite      | Run the customer-management-v1 example as a regression test for every compiler pass                                     |
## Core Principle
> Enterprise → Enterprise Knowledge Model → Projection → Repository/Runtime/Documentation/etc.
> Repository is one projection of the model, not the model itself.

---

## Repository Governance Rules (Effective Immediately)
1. **Freeze the filesystem. Evolve only the enterprise model.**
   - From this point onward, every change must answer:
     1. Which enterprise artifact changed?
     2. Which relationships changed?
     3. Which projections become invalid?
     4. Which implementation artifacts must be regenerated?
   — NOT "what new folder should we create?"

2. **No new top-level directory, specification family, or artifact category may be introduced without an Architecture Decision Record (ADR) that justifies the change and updates the dependency hierarchy.**

---

## Enterprise Artifact Taxonomy (Explicit Rule)
| Type         | Purpose                          | Example                                          |
| ------------ | -------------------------------- | ------------------------------------------------ |
| Constitution | Immutable principles             | Enterprise Principles                            |
| Grammar      | Defines language/syntax          | Relationship Grammar, Capability Grammar         |
| Model        | Defines concepts and constraints | Authority Model, Evidence Model, Lifecycle Model |
| Map          | Enterprise-specific instances    | Capability Map, Context Map                      |
| Contract     | Interaction boundaries           | Service Contract, Authorization Contract         |
| Projection   | Rules for generating artifacts   | Repository Projection                            |

---

## Phases
| Phase   | Fokus                                | Status       |
| ------- | ------------------------------------ | ------------ |
| Phase 0 | Repository Baseline                  | ✅ Selesai    |
| Phase 1 | EKL Core                             | 🔄 Berjalan  |
| Phase 2 | Enterprise Knowledge Model           | ⏳ Berikutnya |
| Phase 3 | Enterprise Compiler (EKE)            | ⏳ Berikutnya |
| Phase 4 | Runtime                              | ⏳ Berikutnya |

---

## 8-Level Enterprise Knowledge Hierarchy (No Circular Dependencies)
Every layer depends **only** on layers above it.

Key distinction:
- **Grammars** define *what something is*
- **Models** use that language to define *which instances exist*

```text
LEVEL 0 — Constitution
    ✓ Enterprise Principles
    ✓ Design Philosophy
    ✓ Modeling Principles
    ✓ Specification Template

LEVEL 1 — Semantic Foundation (All Grammars)
    Vocabulary
    Naming Conventions
    Ontology
    Meta Model
    Relationship Grammar
    Capability Grammar

LEVEL 2 — Enterprise Model (All Models)
    Authority Model
    Evidence Model
    Lifecycle Model
    Traceability Model
    Graph Model

LEVEL 3 — Enterprise Maps (All Instances)
    Context Map
    Capability Map
    Business Service Map
    Platform Capability Map
    Mission Map

LEVEL 4 — Contracts
    Enterprise Contracts
    Service Contracts
    Authorization Contracts
    Evidence Contracts

LEVEL 5 — Validation
    Structural
    Semantic
    Policy
    Governance

LEVEL 6 — Projection
    Repository
    Documentation
    Runtime
    API
    Package
    Graph
    Search
    Vector

LEVEL 7 — Enterprise Compiler (Generates Artifacts)
LEVEL 8 — Enterprise Runtime (Executes Artifacts)
```

---

## Level Completion Criteria (Objective Gates)
| Level   | Exit Criteria                                         |
| ------- | ----------------------------------------------------- |
| Level 0 | Constitution approved and versioned                   |
| Level 1 | All semantic terms and grammars validated             |
| Level 2 | Enterprise models internally consistent               |
| Level 3 | Maps instantiate only valid models                    |
| Level 4 | Contracts reference only mapped capabilities/services |
| Level 5 | Validation passes with zero critical violations       |
| Level 6 | All projections generated deterministically           |
| Level 7 | Compiler reproducibly generates projections           |
| Level 8 | Runtime deployable from generated artifacts only      |

---

## Enterprise Compiler (EKE) Pipeline
Once all Level 6 specifications are complete:
```text
Enterprise Knowledge
↓
Validation (Structural → Semantic → Policy → Governance)
↓
Canonical Object Graph
↓
Semantic Reasoning
↓
Projection
↓
Generated Artifacts
↓
Enterprise Runtime
```

At this milestone:
> **The repository stops being hand-designed.**
>
> Adding a new capability should never begin by creating a directory or package. It should begin by modifying the enterprise knowledge model, after which the compiler regenerates affected projections.

---

## Architectural Maturity Summary
```text
Enterprise Constitution
        ↓
Semantic Foundation
        ↓
Enterprise Models
        ↓
Enterprise Maps
        ↓
Enterprise Contracts
        ↓
Validation
        ↓
Projection Rules
        ↓
Enterprise Compiler
        ↓
Generated Repository
        ↓
Enterprise Runtime
```

---

## Artifact Status
| Order | Artifact | Status | Location |
|-------|----------|--------|----------|
| 1 | Enterprise Constitution | ✅ Normative (v1.0.0) | [constitution/](file:///root/Enterprise%20OS/enterprise/constitution/) |
| 2 | Enterprise Vocabulary | ✅ Normative (v1.0.0) | [constitution/vocabulary.md](file:///root/Enterprise%20OS/enterprise/constitution/vocabulary.md) |
| 3 | Naming Conventions | ✅ Normative (v1.0.0) | [constitution/naming-conventions.md](file:///root/Enterprise%20OS/enterprise/constitution/naming-conventions.md) |
| 4 | Relationship Grammar | ✅ Normative (v2.0.0) | [constitution/relationship-grammar.md](file:///root/Enterprise%20OS/enterprise/constitution/relationship-grammar.md) |
| 5 | Capability Quality Rules | ✅ Normative (v1.0.0) | [constitution/capability-quality-rules.md](file:///root/Enterprise%20OS/enterprise/constitution/capability-quality-rules.md) |
| 6 | Capability Grammar | ✅ Normative (v1.0.0) | [constitution/capability-grammar.md](file:///root/Enterprise%20OS/enterprise/constitution/capability-grammar.md) |
| 7 | Enterprise Ontology | ✅ Normative (v1.0.0) | [constitution/ontology.md](file:///root/Enterprise%20OS/enterprise/constitution/ontology.md) |
| 8 | Enterprise Meta Model | ✅ Normative (v1.0.0) | [constitution/meta-model.md](file:///root/Enterprise%20OS/enterprise/constitution/meta-model.md) |
| 9 | Enterprise Specification Template | ✅ Normative (v2.0.0) | [constitution/enterprise-specification-template.md](file:///root/Enterprise%20OS/enterprise/constitution/enterprise-specification-template.md) |
| 10 | EKL Language Specification | ✅ Normative (v1.0.0) | [constitution/ekl-language-specification.md](file:///root/Enterprise%20OS/enterprise/constitution/ekl-language-specification.md) |
| 11 | Authority Model | ⏳ Normative Draft | [authority/authority-model.md](file:///root/Enterprise%20OS/enterprise/authority/authority-model.md) |
| 12 | Evidence Model | ⏳ Normative Draft | [governance/evidence-model.md](file:///root/Enterprise%20OS/enterprise/governance/evidence-model.md) |
| 13 | Business Capability Model | ✅ Normative (v1.0.0) | [models/capability.md](file:///root/Enterprise%20OS/enterprise/models/capability.md) |
| 14 | Business Service Model | ✅ Normative (v1.0.0) | [models/business-service.md](file:///root/Enterprise%20OS/enterprise/models/business-service.md) |
| 15 | Mission Model | ✅ Normative (v1.0.0) | [models/mission.md](file:///root/Enterprise%20OS/enterprise/models/mission.md) |
| 16 | Canonical Object Specification | ✅ Normative (v1.0.0) | [models/canonical-object-specification.md](file:///root/Enterprise%20OS/enterprise/models/canonical-object-specification.md) |

---

## Supporting Grammars (No Dependency Order)
- ✅ Traceability Model: [traceability/traceability-model.md](file:///root/Enterprise%20OS/enterprise/traceability/traceability-model.md), [lineage.md](file:///root/Enterprise%20OS/enterprise/traceability/lineage.md), [provenance.md](file:///root/Enterprise%20OS/enterprise/traceability/provenance.md)
- ✅ Lifecycle Grammars: [lifecycle/](file:///root/Enterprise%20OS/enterprise/lifecycle/)
- ✅ Validation Rules: [validation/](file:///root/Enterprise%20OS/enterprise/validation/)
- ✅ Evolution: [evolution/](file:///root/Enterprise%20OS/enterprise/evolution/)
- ✅ Decisions: [decisions/adr/](file:///root/Enterprise%20OS/enterprise/decisions/adr/)

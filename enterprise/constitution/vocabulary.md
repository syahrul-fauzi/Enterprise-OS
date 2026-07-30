
# Enterprise OS — Enterprise Vocabulary
## Status
✅ Normative (Version 1.0.0)
## Purpose
Glosarium resmi istilah Enterprise OS. Semua istilah harus konsisten di seluruh artifacts.
## Authority
Lead Enterprise Architect
## Scope
All Enterprise Knowledge Model, Enterprise Systems (all phases
## Normative Rules
1. Every term must have a single, unambiguous definition.
2. All enterprise artifacts must use the terms defined here.
## Grammar
Markdown table with Term | Definition
## Constraints
- No term duplication
- No ambiguous definitions
## Validation Rules
- Every term must be used consistently
## Projection Rules
- Terms are used in all artifacts
- Terms are used in naming (coming soon
## Examples
See below
## Out of Scope
- Implementation-specific terminology
## Evolution
- Add terms as new concepts are defined
---

## Core Terms
| Term | Definition |
|------|------------|
| Enterprise OS | Agentic Enterprise Operating System; foundation for enterprise planning, governance, mission execution, enterprise knowledge management, evidence-driven ops |
| Enterprise Knowledge Language (EKL) | A formally specified domain-specific language for expressing enterprise knowledge, semantics, constraints, governance, traceability, and projection rules, from which repositories, documentation, runtime artifacts, APIs, indexes, and other implementation assets can be automatically derived. |
| Enterprise Knowledge Engine (EKE) | The compiler and execution engine that validates Enterprise Knowledge Models expressed in EKL, builds the Canonical Object Graph, performs semantic reasoning, and generates projections. |
| Enterprise Knowledge | All formal enterprise knowledge; single source of truth |
| Enterprise Knowledge Layer (EKL) | Layer storing, projecting, reasoning about Enterprise Knowledge |
| Enterprise Architecture Execution Orchestrator (EAEO) | Enterprise System responsible only for planning |
| Constitutional Execution Operating System (CEOS) | Enterprise System responsible only for governance and authorization; NEVER executes |
| Mission Operating System (MOS) | Enterprise System responsible only for mission execution |
| Enterprise Model | Formal representation of an enterprise aspect |
| Canonical Object Graph (COG) | Canonical graph of enterprise objects |
| Enterprise Contract | Grammar and boundaries for enterprise component interactions |
| Repository Projection | Method for projecting Enterprise Models to repo structure |
| Canonical Semantic Boundary | The frozen meaning boundary of governed concepts, expressed through governed specifications, canonical machine-readable forms, and semantic graph projections. |
| Canonical Implementation Boundary | The derived implementation contract boundary generated from the canonical semantic boundary, including EDM artifacts, generated contracts, validators, and governed implementation surfaces. |
| Enterprise Intermediate Representation (EIR) | Deterministic intermediate representation produced from governed language artifacts before downstream implementation projections are emitted. |
| Canonical Acceptance Graph (CAG) | Canonical graph form used to express governed acceptance and proof relationships between transformations, predicates, artifacts, and outcomes. |
| Transformation Registry | Governed registry that defines which transformations exist, their metadata, dependencies, compatibility, and whether they are executable. |
| Predicate Registry | Governed registry that defines how transformation correctness is evaluated through named predicates and their contracts. |
| Proof Runner | Execution artifact that loads canonical input and verified transformations, evaluates predicates, compares governed references, emits proof objects, and appends the proof ledger. |
| Proof Ledger | Append-only governed record of proof objects and proof-run lineage for validated transformations and vertical slices. |
| Registry-Driven Orchestration | Execution discipline in which orchestration behavior is derived from governed registry metadata rather than hardcoded transformation logic. |

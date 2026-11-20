---
schema_version: "1.0"
project_key: "main"
title: "EOS Main Project"
project_type: "platform"
lifecycle: "active"

ownership:
  business_owner: null
  technical_owner: null
  governance_authority: "EOS Governance"

intent:
  mission: "Build and evolve the Enterprise Operating System."
  desired_outcome:
    - "Continuous Work identity and execution"
    - "Sovereign enterprise orchestration"
    - "Evidence-backed business outcomes"

scope:
  included:
    - "EOS Core architecture and invariants"
    - "Work Core and continuity"
    - "Connector Ecosystem"
    - "Agent Runtime"
    - "FACE human experiences"
    - "Governance and evidence"
  excluded:
    - "Individual project execution details (stored in respective project contexts)"
    - "External platform synchronization (handled by connector-ecosystem)"

governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"

eos_integration:
  work_core: "authoritative"
  evidence_registry: "canonical"
  connector_ecosystem: "integration-boundary"

work_items:
  - "PRJ-001"
  - "PRJ-002"
  - "PRJ-003"
  - "PRJ-004"
  - "PRJ-005"

evidence_links:
  - "../../.eos-state/evidence/PRJ-001_evidence.json"
  - "../../.eos-state/evidence/PRJ-002_evidence.json"
  - "../../.eos-state/evidence/PRJ-003_evidence.json"
  - "../../.eos-state/evidence/PRJ-004_evidence.json"
  - "../../.eos-state/evidence/PRJ-005_evidence.json"

references:
  specifications: "../../enterprise/specifications/"
  decisions: "./decisions/"
  evidence: "../../.eos-state/evidence/"

---

# EOS Main Project

## 1. Project Mission

Build and evolve the Enterprise Operating System — a sovereign, governed, evidence-backed platform that preserves Work continuity across agents, systems, and execution environments.

## 2. Business Context

EOS is being developed as an alternative to fragmented, siloed enterprise systems that lack semantic continuity, evidence traceability, and sovereign control.

The core doctrine: Everything Can Change. Work Remains.

## 3. Objectives

1. Maintain unbroken Work identity and continuity across all execution environments
2. Establish sovereign enterprise orchestration independent of external platforms
3. Ensure all business outcomes are backed by verifiable evidence
4. Preserve architectural integrity and frozen core boundaries
5. Enable continuous evolutionary improvement without platform rewrites

## 4. Scope

**Included:**
- EOS Core architecture and semantic invariants
- Work Core identity, continuity, and relationships
- Connector Ecosystem for external system integration
- Agent Runtime for human, AI, and external execution
- FACE role-specific human experiences
- Governance, authorization, and audit systems
- Evidence Registry and verification

**Excluded:**
- Individual project execution details (stored in respective `projects/*/PROJECT.md`)
- External platform synchronization (handled by `connector-ecosystem` adapters)
- Duplicate execution orchestrators

## 5. Architecture

Reference canonical EOS architecture: [eos-architecture-closure.md](../../enterprise/specifications/eos-architecture-closure.md)

Key architectural boundaries:
- Work Core: Semantic authority and continuity of Work
- Connector Ecosystem: Integration and interoperability substrate
- FACE: Role-specific human experiences
- Agent Runtime: Replaceable AI, human, and external execution
- Governance: Authorization, policies, accountability, and auditability
- State & Evidence: Historical knowledge, operational state, and verified business evidence

## 6. Work Integration

This project encompasses all EOS Work items. Individual Work identities remain authoritative in Work Core.

Current active Work streams include:
- EOS Architecture and invariants
- Connector Ecosystem implementation
- FACE capability exposure
- Evidence verification systems
- Project Intelligence Layer implementation

## 7. Execution Model

Authorized execution roles:
- Human Business Owners and Operators
- AI Agents with explicit authorization boundaries
- External execution environments via Connector Ecosystem
- All execution must produce verifiable evidence

## 8. Evidence & Acceptance

All project outcomes must be backed by:
- Command invocation records in Attribution Ledger
- Test execution results
- Business acceptance signatures
- Audit trail of governance decisions

Business acceptance requires explicit authorization from the responsible authority.

## 9. Risks & Constraints

**Non-negotiable constraints:**
- No frozen core mutations without explicit authorization
- No duplicate primitives or orchestrators
- Work identity must not depend on agents, models, or interfaces
- External economic truth requires authoritative external evidence
- All execution must be traceable through evidence

## 10. Evolution History

| Date | Decision | Reference |
|------|----------|-----------|
| 2026-11-20 | EOS-PROJECTS-001: Project-as-Code & Governed Project Context | Initial implementation |
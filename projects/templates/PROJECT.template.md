---
schema_version: "1.0"
project_key: "project-key"
title: "Project Title"
project_type: "platform | capability | integration | research"
lifecycle: "proposed | discovery | approved | active | in-review | completed | archived"

ownership:
  business_owner: null
  technical_owner: null
  governance_authority: "EOS Governance"

intent:
  mission: "Clear, concise mission statement"
  desired_outcome:
    - "Outcome 1"
    - "Outcome 2"

scope:
  included:
    - "Scope item 1"
    - "Scope item 2"
  excluded:
    - "Exclusion item 1"

governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"

eos_integration:
  work_core: "authoritative"
  evidence_registry: "canonical"
  connector_ecosystem: "integration-boundary"

references:
  specifications: "./specifications/"
  decisions: "./decisions/"
  evidence: "./evidence/"

---

# {Project Title}

## 1. Project Mission

Explain why this project exists. Clear, concise statement of purpose.

## 2. Business Context

Describe the business reality, strategic motivation, and current situation that justifies this project.

## 3. Objectives

Define measurable, verifiable outcomes that indicate project success.

## 4. Scope

**Included:**
- List of in-scope items, boundaries, and responsibilities

**Excluded:**
- List of explicitly out-of-scope items to prevent scope creep

## 5. Architecture

Reference canonical EOS architecture and any domain-specific design decisions. Do not duplicate EOS Core specifications.

## 6. Work Integration

Reference existing EOS Work identities related to this project. Never generate duplicate Work identities here.

## 7. Execution Model

Describe authorized human, AI, and external execution roles for this project.

## 8. Evidence & Acceptance

Define evidence requirements and business acceptance criteria. What must be true for this project to be considered complete?

## 9. Risks & Constraints

Document known risks, assumptions, and non-negotiable boundaries.

## 10. Evolution History

| Date | Decision | Reference |
|------|----------|-----------|
| YYYY-MM-DD | Initial project creation | PROJECT.md v1.0 |
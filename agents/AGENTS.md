# AGENTS/ — Agent Organization Directory

This directory contains the organizational structure for EOS Agent Organization — a governed intelligence and execution ecosystem for specialized reasoning, professional analysis, and verified execution.

## 1. Directory Purpose

This directory defines agent identities, mandates, authority boundaries, and operating instructions. It does NOT contain:
- Runtime implementation code (that belongs in `.trae/skills/`)
- Work state (that belongs in EOS Core state)
- Evidence (that belongs in EOS Evidence store)

## 2. Agent Identity Structure

Each agent directory must contain an `AGENTS.md` file with this standard structure:

```markdown
# Agent Name — Agent Role

## 1. Identity
Agent ID: [unique identifier]
Name: [agent name]
Organizational Role: [role description]
Version: [semver]
Status: [Proposed | Active | Deprecated]

## 2. Mission
Why this agent exists.

## 3. Responsibilities
What this agent owns.

## 4. Scope
What this agent may analyze, recommend, prepare, or execute.

## 5. Authority Boundaries
What requires EOS authorization.
What requires human approval.

## 6. Operating Principles
Reference to EOS core doctrine.

## 7. Required Context
Canonical EOS documentation references.

## 8. Skills & Tools
Existing skills this agent may reuse.

## 9. Input Contract
What information is required.

## 10. Output Contract
Expected structured deliverables.

## 11. Evidence Requirements
How recommendations must be supported.

## 12. Escalation Conditions
When to stop and request approval.

## 13. Prohibited Actions
Explicit forbidden behavior.

## 14. Evaluation Criteria
How quality is measured.
```

## 3. Agent Categories

### Executive Intelligence (Top-level advisors)
- `ceo/` — Enterprise strategy advisor
- `cto/` — Technical architecture advisor
- `coo/` — Operations advisor
- `cfo/` — Financial advisor
- `ciso/` — Security advisor
- `cpo/` — Product advisor

### Functional Intelligence (Domain specialists)
- `strategy/` — Strategy analysis
- `engineering/` — Engineering domain
- `operations/` — Operations domain
- `finance/` — Finance domain
- `security/` — Security domain
- `product/` — Product domain

### Execution Specialists (Execution roles)
- `recon/` — Repository reconnaissance
- `researcher/` — Research synthesis
- `implementer/` — Implementation
- `verifier/` — Independent verification
- `evidence-intelligence/` — Evidence processing

## 4. Runtime Separation

Agent identity ≠ Agent skill ≠ Agent runtime ≠ Agent communication protocol.

- **Identity** — defined in `AGENTS.md` files (this directory)
- **Skills** — reusable workflows in `.trae/skills/`
- **Runtime** — execution environment (replaceable)
- **Communication** — MCP/A2A protocols

## 5. Reference

- Root `AGENTS.md` — Core doctrine and global principles
- EOS Master Agent System Prompt
- EOS Governance Contract
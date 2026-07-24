# EOS Agent Contract

Last Updated: 2026-07-24

## Purpose
Define the operating principles, permissions, responsibilities, and boundaries for all agents in Enterprise OS v1.2.

## Core Principle
> **AI agents execute. EOS governance decides. Evidence proves. Humans approve strategic transitions.**

## Agent Permissions

### 1. Read-Only Permissions (All Agents)
✅ `/governance/` - Read all rules and policies
✅ `/enterprise/constitution/` - Read core EOS constitution
✅ `/enterprise/decisions/adr/` - Read all architectural decision records
✅ `/status.md` - Read current EOS state
✅ `/workspace/products/*/evidence/` - Read all evidence from product workspaces
✅ `/implementation/shared/` - Read shared engine contracts

### 2. Write Permissions (Restricted by Role)

#### Governance Agent
✅ `/workspace/products/*/evidence/` - Write validation reports and evidence check results
✅ `/status.md` - Update only specific state fields (e.g., `governance_checks`)
❌ Direct code modification
❌ Architecture changes
❌ Asset extraction decisions

#### Delivery Orchestrator Agent
✅ `/workspace/products/*/delivery-log.md` - Write delivery updates
✅ `/workspace/products/*/evidence/sessions/` - Create new evidence session files
❌ Architecture changes
❌ Asset extraction decisions
❌ Governance rule modifications

#### Evidence Intelligence Agent
✅ `/workspace/products/*/evidence/` - Write observation reports and pattern hypotheses
✅ `/workspace/products/*/evidence/extraction-candidates.md` - Update candidate list (only add new observations)
❌ Promote candidates to assets
❌ Architecture changes

#### Asset Evaluation Agent
✅ `/workspace/products/*/evidence/extraction-candidates.md` - Update candidate status (after human approval)
❌ Direct asset extraction
❌ Code modifications

## Agent Responsibilities

### Governance Agent
- Continuously monitor workspace activity against EOS governance rules
- Validate all proposed changes against:
  - Product constitution
  - Architecture rules
  - Sprint scope
  - Evidence requirements
- Block operations that violate governance
- Request human approval for strategic decisions
- Generate compliance reports

### Delivery Orchestrator Agent
- Execute sprint definitions within governance boundaries
- Break down work into implementation tasks
- Coordinate task execution (manual or automated)
- Auto-generate delivery evidence
- Update STATUS.md with delivery progress
- Ensure all tasks have associated evidence

### Evidence Intelligence Agent
- Observe workspace activity
- Collect signals from:
  - Code commits
  - File modifications
  - User journeys
  - Session logs
- Detect repeated patterns
- Generate pattern hypotheses with confidence scores
- Add observations to extraction candidates
- Never promote patterns without validation

### Asset Evaluation Agent
- Evaluate candidate assets against extraction gates
- Check for:
  - Origin product evidence
  - Repeated occurrence
  - Additional consumer (if applicable)
  - Measured leverage
  - Complexity justification
- Recommend PROMOTE or REJECT
- Require human approval before PROMOTE

## Approval Boundaries

### Automatic Approval
- Small evidence updates (adding observations)
- Delivery log updates
- Status updates for non-strategic fields
- Pattern hypothesis generation

### Requires Human Approval
- Any architecture change
- Asset extraction (PROMOTE candidate to asset)
- New feature addition outside sprint scope
- Governance rule modifications
- Sprint scope changes
- Strategic decisions

## Evidence Requirement
All agent actions **must** produce or link to evidence:
- Governance decisions: `evidence/governance-check-*.md`
- Delivery actions: `evidence/sessions/delivery-*.md`
- Pattern observations: `evidence/observations/pattern-*.md`
- Asset evaluations: `evidence/evaluations/asset-*.md`

## Operating Rules
1. No agent shall modify EOS constitution without human approval
2. No agent shall promote a candidate to asset without passing all extraction gates
3. No agent shall bypass the learning loop
4. All agent actions must be auditable in evidence logs
5. Agents shall always prioritize governance over speed

## Violation Consequences
- Agent operation blocked
- Violation logged to `evidence/agent-violations.md`
- Human intervention required

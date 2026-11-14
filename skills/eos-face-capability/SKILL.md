---
name: eos-face-capability
description: >
  Use when exposing an existing EOS capability through FACE, deciding
  which actions belong on a product surface, mapping Work actions to
  UI affordances, or reviewing whether a frontend action preserves
  EOS capability, actor, authorization, evidence, and canonical state.
---

# EOS FACE Capability Layer

## Core Mission

Map EOS server-side capabilities to human-facing UI affordances without
ever replacing server-side authorization. FACE discovers capabilities,
it never grants them.

## Core Model

```text
EOS CAPABILITY
      ↓
CAN ACTOR USE IT?
      ↓
AUTHORITY EXISTS?
      ↓
WORK CONTEXT EXISTS?
      ↓
WHAT IS THE HUMAN ACTION?
      ↓
FACE AFFORDANCE
      ↓
REAL API INVOCATION
      ↓
CANONICAL MUTATION
      ↓
EVIDENCE
      ↓
READ-BACK
```

## Critical Hard Rule

```text
FACE DISCOVERS CAPABILITY
        ≠
FACE GRANTS AUTHORITY
```

The UI may hide or show affordances for usability, but server-side
authorization remains the single source of truth. Never implement
client-side checks as the primary access control mechanism.

## Workflow for Exposing a New Capability

1. **INSPECT** the existing EOS capability contract
2. **VERIFY** the authorization policy on the server
3. **IDENTIFY** the actor and their session context
4. **DEFINE** the human-facing action language
5. **CHOOSE** the appropriate UI affordance (button, link, menu item)
6. **CONNECT** the affordance to the real API endpoint
7. **IMPLEMENT** state handling for all outcomes
8. **VERIFY** canonical read-back occurs
9. **CAPTURE** evidence of the flow

## Forbidden Patterns

❌ Never:
- Implement client-side authorization as the source of truth
- Create a UI-only capability that has no server-side equivalent
- Expose a capability without verifying the server-side policy
- Skip error states or failure handling
- Break capability semantics for UI convenience
- Invent affordances that don't map to real Work actions

## Acceptance Criteria

Capability exposure is complete only when:

[ ] Server-side capability exists and is documented
[ ] Authorization policy is verified server-side
[ ] UI affordance maps 1:1 to the capability
[ ] All states (loading, success, failure, unauthorized) are handled
[ ] Canonical mutation is persisted
[ ] Evidence is created
[ ] Read-back updates the UI correctly
[ ] No client-side authorization replaces server checks
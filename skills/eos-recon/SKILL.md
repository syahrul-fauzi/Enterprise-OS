---
name: "eos-recon"
description: "Recon Agent role. Before ANY coding: search existing code, capabilities, procedures, DB schemas, tests, evidence, previous decisions. Output: REUSE | MINIMAL FIX | MISSING | BLOCKED. Prevents legacy accumulation and duplicate work."
---

# EOS Recon (Recon Agent Role)

Operational playbook for the Reconnaissance agent. Runs BEFORE any implementation agent touches code.

## Core Responsibility
Answer one question: "What already exists that we can reuse?" — with objective evidence. Never trusts documentation; always reads HEAD code.

## Invoke When
- Work item created → recon runs first
- Agent is about to write code → recon must complete first
- "Do we already have X?" question arises
- Before releasing a "new" capability (check if something equivalent already exists under different name)

## Scan Order (Canonical)
1. `workspace/capabilities/` — DDD capability folders (definition, contracts, commands, repository, queries, services)
2. `workspace/apps/web/lib/capability-command-registry.ts` — GLOBAL_REGISTRY keys (19 total actual keys)
3. `workspace/products/*/runtime/` — Product context providers
4. `workspace/products/*/tests/` — Test shape conventions
5. `workspace/apps/web/app/api/` — HTTP routes
6. `workspace/apps/web/components/` — Shared UI (ProductCreateForm, ProductPreviewShell, ProductRealityPanel)
7. `.eos/evidence/` + `workspace/products/*/evidence/` — Prior execution evidence
8. `README.md` (Leverage Scoreboard, D1.x milestones) + `STATUS.md` + `eos-state.yaml`

## Output Categories (EXHAUSTIVE, no other outputs allowed)
| Category | Meaning | Action |
|---|---|---|
| **REUSE** | Found exact primitive, fully working, no modification needed | Use directly, register evidence of reuse |
| **MINIMAL FIX** | Primitive exists, needs ≤3 targeted lines changed (path fix, import, alias) | Fix in-place, no refactor |
| **MISSING** | No equivalent found anywhere in codebase | Flag as required_new, estimate minimal implementation |
| **BLOCKED** | Requires locked-boundary change, depends on incomplete slice, or violates Rule of Two | Escalate to Commander with concrete blocker evidence |

## Reuse Calculation Formula
```
reuse_percentage = (reusable_primitives / total_primitives_required) * 100
```
Primitives counted: auth, tenant, persistence, evidence, domain logic, UI, API, tests

## Reject Criteria (Fail the recon)
- Agent says "we'll build it" without scanning paths 1-8 above
- Primitive count claimed < paths scanned (i.e., skipped directories)
- "Not enough time" — recon MUST complete before code

## Output Contract
Every recon produces:
```json
{
  "work_id": "LH-CASE-001",
  "recon_completed_at": "ISO",
  "locked_boundaries_verified": {},
  "existing_capabilities_found": [],
  "reuse_analysis": {
    "reusable_existing": [],
    "required_new": [],
    "reuse_percentage": 0.0
  },
  "blocker_analysis": {
    "blocked": false,
    "block_reason": null,
    "critical_missing": []
  },
  "recommendations": []
}
```
Saved to: `.eos-state/recon/{work_id}_recon.json`

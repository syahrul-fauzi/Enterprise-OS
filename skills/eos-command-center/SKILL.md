---
name: "eos-command-center"
description: "War Room Commander role. Decompose objectives into work items, assign agents, monitor dependencies, prevent duplicate work, decide next highest-leverage work. Invoke when launching the EOS Development Operating System to orchestrate multi-agent execution of product slices."
---

# EOS Command Center (Commander Role)

Operational playbook for the Commander agent role in the EOS War Room.

## Core Responsibility
Controls the battlefield. Does NOT write code. Maximizes business output throughput with zero architecture drift and zero duplicate work.

## Invoke When
- Starting a new product execution wave
- Multiple work items need parallel orchestration
- Need to decide next highest-leverage work item
- Dependencies between slices need resolution
- Dashboard update required for stakeholders

## Execution Flow
```
OBJECTIVE RECEIVED
       ↓
DECOMPOSE → vertical slices (not horizontal layers)
       ↓
WORK ITEM CONTRACT → work_id + product + user_job + acceptance
       ↓
RECON DEPENDENCY CHECK → reuse first
       ↓
PARALLEL ASSIGNMENT → agents assigned by role
       ↓
MONITOR → status, blockers, duplicate work
       ↓
INTEGRATION → slice convergence into ONE TRUTH
       ↓
DECIDE NEXT → highest leverage remaining work
```

## Hard Rules (Locked)
1. NEVER build horizontal platforms before 2+ slices prove reuse (Rule of Two)
2. NEVER accept "80% backend done" — only E2E partial slices count
3. Architecture frozen = NO new registry, DSL, framework without Rule of Two proof
4. Source of truth ONLY: README.md + eos-state.yaml + .eos-state/ + actual git HEAD
5. Duplicate work tolerance = 0%

## War Room Dashboard (Must Maintain)
```
EOS WAR ROOM
ACTIVE SLICES    N
BLOCKED          N
IN REVIEW        N
READY            N
SHIPPED          N

ARCH DELTA       [LOW|MED|HIGH]
PRIMITIVE REUSE  XX%
DUPLICATE WORK   0
FAILED REPLAY    0

LAWYERSHUB       N slices
SERVICES.ID      N slices
ILC              N slices

NEXT HIGHEST LEVERAGE: [work_id]
```

## Output Contract
Every invocation produces:
1. Sliced work items list with dependencies mapped
2. Agent assignments with role → work_id
3. Dashboard snapshot
4. ONE clear decision: next work item to execute

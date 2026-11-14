---
name: "eos-self-execution"
description: "Manages EOS self-execution loop: requirement processing, impact analysis, execution planning, verification, and evidence collection. Invoke when starting EOS self-orchestration work."
---

# EOS Self-Execution Skill

This skill orchestrates the core EOS self-execution loop that transforms requirements into verified outcomes without manual coordination.

## What it does
1. Takes raw business/technical requirements
2. Performs automated impact analysis on the codebase
3. Generates execution plans with dependency mapping
4. Assigns tasks to appropriate agents
5. Verifies implementation completeness
6. Collects all evidence types (code, test, runtime, user)
7. Computes confidence/verdict via governance computation
8. Updates governance state automatically

## When to invoke
- When launching the EOS SELF-EXECUTION frontier
- When processing the first end-to-end real requirement
- When building automation to replace manual coordination
- When implementing evidence-driven governance computation
- When setting up agent orchestration for codebase changes

## Execution Flow
```text
REQUIREMENT → IMPACT ANALYSIS → EXECUTION PLAN → AGENT EXECUTION → VERIFICATION → EVIDENCE COLLECTION → DECISION → GOVERNANCE UPDATE
```
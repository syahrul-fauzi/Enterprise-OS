---
name: "eos-dependency-engine"
description: "Analyzes codebase dependencies and computes impact for changes. Invoke when running impact analysis or identifying high-leverage next tasks."
---

# EOS Dependency Engine Skill

Builds and maintains a dependency graph of the entire EOS stack, enabling automated impact analysis and high-leverage task identification.

## What it does
1. Maps all codebase dependencies between packages, apps, and services
2. Computes impact chains for any proposed change
3. Identifies bottlenecks and constraint points
4. Ranks next tasks by leverage potential
5. Prevents cross-module breaking changes

## When to invoke
- When performing impact analysis for a new requirement
- When identifying the highest-leverage next task
- When preventing breaking changes across modules
- When building the dependency graph for EOS governance
- When calculating execution boundaries for changes
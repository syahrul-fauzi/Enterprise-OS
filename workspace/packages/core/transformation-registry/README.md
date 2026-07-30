# @repo/core-transformation-registry

Canonical EOS Transformation Registry.

**Gate**: B  
**Layer**: 4 (Canonical Foundation)  
**Status**: DRAFT

## Purpose

Declarative registry of ALL EOS transformations (T001–T005). This registry is
the **ONLY** source of truth for transformation metadata including lifecycle
status, contract references, predicate references, and precedence dependencies.

## Critical Engine Constraint (AXIOM-IMP-001)

Engine packages MUST NOT hardcode transformation IDs as literal `case "T001"`
branches. Engine MUST resolve transformations EXCLUSIVELY via lookup on this
registry. No knowledge is born in the engine. Engine is consumer only.

## Frozen Content Classes (ALLOWED only)

- Transformation metadata declarations (T001–T005 entries)
- Lifecycle status tracking per transformation
- Contract and predicate cross-references
- Types, interfaces, and Zod schemas for registry documents
- Conformance tests

## Forbidden Content Classes

- Transformation implementation code
- Engine orchestration logic
- UI code or React imports
- Hardcoded pipeline ordering logic (ordering is resolved via DAG at runtime)

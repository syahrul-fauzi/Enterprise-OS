# @repo/core-predicate-registry

Canonical EOS Predicate Registry.

**Gate**: B  
**Layer**: 4 (Canonical Foundation)  
**Status**: DRAFT

## Purpose

Declarative registry of all predicates evaluated BEFORE transformation execution,
AFTER transformation execution, and DURING proof verification. Predicates are
purely declarative metadata; predicate evaluators live in the engine layer.

## Frozen Content Classes (ALLOWED only)

- Predicate declarations (id, phase, purpose, schema)
- TypeScript types for predicate evaluation results
- Zod schemas for predicate documents
- Conformance tests

## Forbidden Content Classes

- Runtime predicate evaluator implementation
- Hardcoded transformation-specific branching logic
- UI code or React imports

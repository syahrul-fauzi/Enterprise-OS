# Predicate Registry Package Specification v1.0

## Identity

- Package: `@repo/core-predicate-registry`
- Layer: Canonical Foundation (Layer 4)
- Gate required: B
- Change policy: ELS conformance required
- Source of truth: Governed predicate declarations in YAML + TS

## Export Boundary

```
@repo/core-predicate-registry/types       → PredicateStatus, PredicatePhase, etc.
@repo/core-predicate-registry/interfaces  → PredicateDeclaration, PredicateResult
@repo/core-predicate-registry/schema      → Zod schemas for registry documents
@repo/core-predicate-registry             → aggregate exports + predicates array
```

## Lifecycle Contract

Status linear promotion: DRAFT → REVIEWED → VERIFIED → FROZEN → DEPRECATED.

## T001 Minimum 3 Predicates

This registry MUST define at minimum:
1. PRED-T001-INPUT-SCHEMA        (phase PRE_EXECUTION)
2. PRED-T001-OUTPUT-DETERMINISTIC (phase POST_EXECUTION_VERIFICATION)
3. PRED-T001-CONFORM-EIR          (phase POST_EXECUTION)

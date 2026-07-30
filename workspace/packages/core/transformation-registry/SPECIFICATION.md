# Transformation Registry Package Specification v1.0

## Identity

- Package: `@repo/core-transformation-registry`
- Layer: Canonical Foundation (Layer 4)
- Gate required: B
- Change policy: ELS conformance required
- Source of truth: enterprise/execution/transformation-catalog.yaml canonical YAML

## Export Boundary

```
@repo/core-transformation-registry/types       → TransformationId, PrecedenceRule, etc.
@repo/core-transformation-registry/interfaces  → TransformationDeclaration, TransformationRegistryDocument
@repo/core-transformation-registry/schema      → Zod schemas
@repo/core-transformation-registry             → TRANSFORMATIONS array (T001..T005) + helpers
```

## Lifecycle Contract

Per-transformation linear promotion: DRAFT → REVIEWED → VERIFIED → FROZEN → DEPRECATED.
T002–T005 have `blocked_until_predecessor_verified = true` dependency enforcement.

## T001 = Root of Trust

T001 is declared with `root_of_trust: true` and requires standalone verification
BEFORE any generic orchestration loads. Engine MAY NOT load T002–T005 into
evaluator until T001 lifecycle >= VERIFIED.

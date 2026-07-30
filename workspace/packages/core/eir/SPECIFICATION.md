# EIR Package Specification v1.0

## Identity

- Package: `@repo/core-eir`
- Layer: Canonical Foundation (Layer 4)
- Gate required: B
- Change policy: ELS conformance required
- Source of truth: Governed ELS definition

## Export Boundary

```
@repo/core-eir/types       → pure TypeScript types only (no values)
@repo/core-eir/interfaces  → pure TypeScript interfaces only (no runtime)
@repo/core-eir/schema      → Zod schemas for runtime validation
@repo/core-eir             → aggregate exports
```

## Lifecycle Contract

Status linear promotion only: DRAFT → REVIEWED → VERIFIED → FROZEN → DEPRECATED.
No skip. No rollback without ADR.

## Consumers

- T001 (ELS → EIR): **writes** EIR records
- T002 (EIR → CAG): **reads** verified EIR records
- predicate-registry: validates PRED-T001-CONFORM-EIR
- proof-ledger: stores EIR output hash as part of TRF-PROOF-T001

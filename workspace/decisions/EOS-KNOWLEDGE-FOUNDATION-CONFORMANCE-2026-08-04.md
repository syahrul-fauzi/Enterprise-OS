# EOS Knowledge Foundation Conformance

Status: Closed
Date: 2026-08-04
Scope: One leakage / session

## Problem

Foundation consumed `learning.materialized.knowledgeRegistry` indirectly via the
foundation producer registry fallback.

Previous path:

```text
learning
   ↓
learning.materialized.knowledgeRegistry
   ↓
foundation
```

This kept `Foundation` coupled to `Learning` materialization instead of
consuming `KnowledgeProjection` explicitly.

## Change

Foundation now consumes `KnowledgeProjection` explicitly.

Current path:

```text
learning
   ↓ official facts/events
knowledge
   ↓
KnowledgeProjection
   ↓
foundation
```

Applied changes:

- extracted official `LearningRecordedEvent` materialization seam from
  `learning/runtime/intelligence-runtime.ts`
- removed implicit fallback from
  `foundation/registry/foundation-producer-registry.ts`
- materialized `KnowledgeProjection` directly in
  `foundation/commands/verify-foundation.ts`
- passed `knowledgeRegistryEntries` explicitly into the decision/foundation flow
- wrote foundation `knowledge-registry` evidence from `knowledgeProjection.registry`

## Files

- `workspace/packages/tooling/eos-cli/src/learning/runtime/intelligence-runtime.ts`
- `workspace/packages/tooling/eos-cli/src/foundation/registry/foundation-producer-registry.ts`
- `workspace/packages/tooling/eos-cli/src/foundation/commands/verify-foundation.ts`

## Verification

- `pnpm lint` -> `PASS`
- `pnpm check-types` -> `PASS`
- `pnpm test` -> `PASS (75/75)`

## Remaining

- no additional leakage addressed in this session
- `Gate` leakage was not changed in this session
- this does **not** claim the whole `Foundation/Gate -> Knowledge` boundary is globally finished

## Decision

STOP.

Do not expand scope from this checkpoint.

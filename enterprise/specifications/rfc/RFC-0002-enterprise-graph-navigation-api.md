# RFC-0002: Enterprise Graph Navigation API

## Status
Conformant

## Type
Specification

## Owner
Lead Enterprise Architect

## Purpose
Define the canonical navigation operations over ECG so that query, evaluator,
decision, and explainability flows share one traversal model instead of
duplicating graph semantics in multiple runtimes.

## Specification Metadata
```yaml
depends_on:
  - ADR-0009
  - ADR-0010
  - ADR-0011
  - ADR-0012
  - RFC-0001
required_by:
  - RFC-0003
  - RFC-0004
implemented_by:
  - workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/control-graph-reader.ts
verified_by:
  - workspace/packages/tooling/eos-cli/tests/enterprise-query-runtime.test.ts
```

## Constitutional Traceability
```yaml
Constitution:
  ADR-0009:
    - ECG is the SSOT for facts and relations
  ADR-0010:
    - Facts drive downstream evaluation and decision flows
  ADR-0011:
    - Enterprise Control Runtime is the traversal boundary
  ADR-0012:
    - Runtime communication depends on SPI, not runtime imports
```

## Scope
- In scope:
  - navigation operations
  - source and target resolution
  - traversal semantics
  - subgraph extraction semantics
- Out of scope:
  - evaluator registration
  - decision synthesis

## Problem Statement
The platform needs a minimal graph capability surface that every higher layer
can compose. Without a canonical navigation API, query language, evaluators,
decision explainability, and impact analysis will drift into separate graph
implementations.

## Normative Requirements
1. Graph navigation MUST operate on canonical references, not filesystem paths.
2. The navigation surface MUST remain storage-agnostic.
3. All higher-level graph queries MUST be expressible as combinations of
   canonical navigation operations.
4. Navigation MUST support both local neighborhood traversal and bounded
   subgraph extraction.
5. Navigation results MUST preserve reference identity and digest linkage.

## Conformance Requirements
1. Graph navigation contracts MUST expose the minimal canonical operations
   needed for traversal and impact analysis.
2. Query and evaluator implementations MUST NOT redefine graph traversal
   semantics independently.
3. Verification MUST confirm traversal results remain deterministic for the
   same snapshot and request.

## Contracts
- Input models:
  - `NodeReference`
  - `EdgeReference`
  - `SnapshotReference`
- Output models:
  - `ResolvedNode`
  - `ResolvedEdge`
  - `TraversalPath`
  - `Subgraph`
- SPI interfaces:
  - `GraphNavigator`

## Lifecycle
- States:
  - `addressed`
  - `resolved`
  - `traversed`
  - `projected`
- Transitions:
  - `addressed -> resolved`
  - `resolved -> traversed`
  - `traversed -> projected`
- Preconditions:
  - reference resolves in a known snapshot

## Validation
- Contract validation:
  - navigation request and response conformance
- Replay / determinism validation:
  - same snapshot + same navigation request => same traversal result
- Boundary validation:
  - navigation API does not leak storage layout

## Acceptance Criteria
- Canonical navigation operation set is frozen.
- Navigation inputs and outputs are reference-based and storage-agnostic.
- Downstream RFCs can depend on one traversal model without redefining it.

## Implementation Evidence
- Current status: Planned
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/control-graph-reader.ts`

## Verification Evidence
- Current status: Partial
- Evidence paths:
  - `workspace/packages/tooling/eos-cli/tests/enterprise-query-runtime.test.ts`

## Reference Tests
- `workspace/packages/tooling/eos-cli/tests/enterprise-query-runtime.test.ts`

## Migration Notes
- Existing enterprise query traversal should converge toward canonical graph
  navigation operations before parser expansion.

## Traceability
```text
ADR-0009/0010/0011/0012
        ↓
RFC-0002
        ↓
runtime-contracts/models/graph.ts
        ↓
runtime-contracts/spi/control-graph-reader.ts
        ↓
future `GraphNavigator` SPI
```

## Implementation Notes
- Reference package paths:
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/models/graph.ts`
  - `workspace/packages/tooling/eos-cli/src/runtime-contracts/spi/control-graph-reader.ts`
- Migration notes:
  - current query behavior should collapse onto the canonical navigation
    operation set

## Open Questions
- Should `trace()` be directional-only or allow bidirectional lineage mode?
- Should `impact()` be a primitive or syntactic sugar over repeated traversal?

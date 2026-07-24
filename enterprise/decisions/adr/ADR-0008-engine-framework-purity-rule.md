
# ADR-0008: Enterprise Engine Framework & Framework Purity Rule

## Status
✅ Accepted

## Date
2026-07-23

## Context
With the introduction of `implementation/shared/engine/` as a shared layer for engine infrastructure, we need to formalize its purpose and prevent it from becoming a dumping ground for domain-specific logic that belongs to individual engines (EKE, EIS, EAEO, CEOS, MOS).

## Decision
1. **Formalize `implementation/shared/engine/` as the Enterprise Engine Framework**: A pure, infrastructure-only layer providing abstractions for:
   - Engine lifecycle (initialize → validate → execute → emit evidence → produce artifact)
   - Execution context and correlation
   - Diagnostics and provenance
   - Evidence capture and replay
   - Metrics and tracing
   - Base manifest and result types
2. **Establish EOS-ARCH-004: Framework Purity Rule**: `shared/engine/` must not contain any domain-specific concepts or dependencies on engine-specific artifacts (KnowledgePackage, Finding, MissionContract, AuthorizationDecision, ExecutionLedger, etc.).

## Rationale
- **Preserves Bounded Contexts**: Each engine remains self-contained and only depends on its own contracts and the pure Engine Framework
- **Enforces Single Responsibility**: The Engine Framework only provides mechanisms, not domain behavior
- **Enables Independent Evolution**: Engines can evolve their internal logic without affecting the framework or other engines
- **Supports Symmetry**: All engines follow the same lifecycle pattern while maintaining their unique domain responsibilities

## Consequences
- **Positive**:
  - Clear separation of concerns between framework infrastructure and engine domain logic
  - Easier to test and maintain the Engine Framework independently
  - Prevents accidental coupling between engines
- **Negative**:
  - Requires careful review of any code added to `shared/engine/`
- **Architectural Fitness Function**:
  - EOS-ARCH-004: Verify that `shared/engine/` has no imports from engine-specific contracts or domain models

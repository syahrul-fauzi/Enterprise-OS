# Proof Ledger Package Specification v1.0

## Identity

- Package: `@repo/core-proof-ledger`
- Layer: Canonical Foundation (Layer 4)
- Gate required: B
- Change policy: ELS conformance required
- Source of truth: Append-only proof semantics per ADR-000 + ADR-001

## Export Boundary

```
@repo/core-proof-ledger/types       → ProofVerdict, ProofLevel, HashChainLink, etc.
@repo/core-proof-ledger/interfaces  → TransformationProofEntry, LedgerDocument
@repo/core-proof-ledger/schema      → Zod schemas for all proof entries
@repo/core-proof-ledger             → aggregate exports + append-semantics helpers
```

## Lifecycle Contract

- Proof entries are **emitted once**; no state transitions after append.
- Ledger document status is monotonic: entries only grow; NEVER shrink or mutate.
- Repository Proof output location: `build/evidence/repository-proof/` (NOT inline in GOVERNANCE_STATE.yaml)

## T001 First Proof

T001 proof (TRF-PROOF-T001) = **FIRST proof emitted by the entire EOS system.**
Before this proof exists the ledger is logically empty. The ledger must record
all 3 predicates result + both determinism run hashes.

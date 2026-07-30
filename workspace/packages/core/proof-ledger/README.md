# @repo/core-proof-ledger

Canonical EOS Proof Ledger (append-only).

**Gate**: B  
**Layer**: 4 (Canonical Foundation)  
**Status**: DRAFT

## Purpose

Append-only ledger metadata, types, and schemas for all EOS proof objects:
Transformation Proofs (TRF-PROOF-T<NNN>), Execution Proofs
(EXEC-PROOF-REQ<NNNN>), and Repository Proofs (REP-PROOF-<seq>).

**Ledger is append-only.** Entries, once emitted, MUST NOT be mutated or
deleted. New proofs append at the end. Hash chain integrity is enforced via
schema validation.

## 3-Level Proof Hierarchy (AXIOM-IMP-001 ADR-001)

1. **Transformation Proof** (level 1) — Satu transformasi memenuhi kontraknya
2. **Execution Proof** (level 2) — Satu pipeline berjalan deterministik
3. **Repository Proof** (level 3) — Seluruh repository mematuhi baseline

Dependency chain: Transformation Proof → Execution Proof → Repository Proof.
No higher-level proof may be emitted with FAIL or INCONCLUSIVE on lower-level.

## Frozen Content Classes (ALLOWED only)

- Proof entry type declarations (TransformationProofEntry, RepositoryProofEntry)
- Ledger document schemas (append-only contract)
- Types for proof verdicts, hash chains, signatures
- Conformance tests verifying append-only schema constraints

## Forbidden Content Classes

- Runtime ledger write implementation (resides in engine layer via ACL)
- Proof evaluator implementation (predicate layer provides verdict)
- UI code or React imports

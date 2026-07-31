# EOS Authority Model — Formal Specification (Normative Draft v1.0.0)

> **Constitutional Basis**
> - *Law:* Law I — Authority ("Mengapa artefak ini sah?")
> - *Axiom:* Axiom A (Authority: Semua legitimasi berasal dari rantai otoritas konstitusional yang dapat ditelusuri.)
> - *Invariants:* IA-15 Dual Primary Graphs (Authority Graph portion), IA-17 Authority Preservation
> - *Constitutional Proof integration:* IA-18 Sub-Proof 1 (Authority Preservation) = walk of this graph from Verdict back to root, verifying monotonicity.
> - *ARCH enforcement:* ARCH-36 (AUTHORITY_GAIN_TYPE_ERROR FATAL), ARCH-37 (AUTHORITY_GRAPH_CYCLE FATAL @ Gate-E)

---

## 1. Core Definition

**Authority** in EOS is **NOT an artifact**. Authority is a **legitimacy relation** between artifacts:

> Artifact A *has authority over* Artifact B iff B's validity is provable from A's validity via a walk along Authority Graph edges.

The Authority Graph G_auth = ⟨V, E_auth⟩, where:
- **V (nodes):** All EOS artifacts that carry authority (Constitution, ASP, IA, Specifications, Contracts, Protocols, Implementations, Evidence, Verdict, Lexicon Entries, Governance Decisions).
- **E_auth (edges):** Exactly 8 normative edge kinds defined in [/root/Enterprise OS/enterprise/graph/edge-taxonomy.md](file:///root/Enterprise%20OS/enterprise/graph/edge-taxonomy.md) §1, each with graph_class = authority_graph.

**Property:** Authority is **monotonic** along every path. If `X → ... → Y` is a path in G_auth, then `authority_level(X) ≥ authority_level(Y)` holds componentwise. No transformation, planner, LLM, optimizer, scheduler, or human may produce a node with higher authority_level than its upstream canonical derivation.

---

## 2. Node Types — Authority Stage Classification

Each artifact node v ∈ V MUST declare exactly one authority_stage ∈ AUTHORITY_STAGES below. This is the level used by monotonicity check.

| Authority Stage Index | Stage Name | Typical Artifacts | authority_level vector (Σ) |
|------:|------------|-------------------|----------------------------|
| 0 | ROOT | Three Laws Declaration + Four Axioms Frozen Core | (∞, ∞, ∞) |
| 1 | VISION | CONSTITUTIONAL-VISION.yaml | (10, 10, 10) |
| 2 | CONSTITUTION | CONSTITUTION.md (L0) | (9, 10, 10) |
| 3 | ASP_IA | ASP.yaml + INVARIANT-ARCHITECTURE.yaml (IA-01..IA-19) | (8, 9, 9) |
| 4 | SPECIFICATION | Semantic Kernel, Knowledge Compiler Pipeline, Pass Frameworks, all enterprise/specifications/* | (7, 8, 8) |
| 5 | CONTRACT_PROTOCOL | workspace/contracts/*.yaml, all Protocol definitions | (6, 7, 7) |
| 6 | IMPLEMENTATION | workspace/packages/* source code, alternative implementations | (4, 5, 5) |
| 7 | EXECUTION_PLAN | X-FORM Canonical Form emitted by planner/compiler | (3, 4, 4) |
| 8 | EVIDENCE | V-FORM Evidence Node, Assessment, Justification | (2, 3, 3) |
| 9 | VERDICT | Certification Gate Verdict, Ledger Final Verdict | (1, 1, 1) |

**Monotonicity Invariant (IA-17 + IA-15 combined):**
For every Authority Graph edge (u, v) ∈ E_auth:
```
authority_stage_index(u) ≤ authority_stage_index(v)
   ⇏ is NOT valid — we require:
authority_stage_index(u) ≤ authority_stage_index(v) → ALLOWED only if specific edge_kind ∈ {derives_authority_from, authorizes}:
   CORRECT invariant: authority_stage_index(u) ≤ authority_stage_index(v) → violates ↓ authority flow.
ACTUAL invariant: authority_stage_index(u) ≥ authority_stage_index(v), because authority flows DOWNWARD.
   Edge (from_stage u, to_stage v) is VALID only if authority_stage_index(u) ≥ authority_stage_index(v).
```

**Violation:** IA-17 (Authority Gain) = FATAL. ARCH-36 AUTHORITY_GAIN_TYPE_ERROR.

## 3. Edge Taxonomy Reference (from edge-taxonomy.md)

Formal inclusion by reference: edges `approves, supersedes, delegates, authorizes, derives_authority_from, ratifies, amends, epoch_binds` as defined in §1 of edge-taxonomy.md are the **ONLY** edge kinds permitted in G_auth with `graph_class=authority_graph`.

Additional Authority-Graph-specific constraints per edge:

| edge | source stage ≤ target stage (required) | cardinality |
|------|-----------------------------------------|-------------|
| derives_authority_from | u.index > v.index (strictly HIGHER authority → LOWER) | Each non-root v: exactly ONE edge with flag canonical=true. Optional auxiliary edges OK. |
| approves | u.index ≥ v.index, u voting_scope ⊇ v scope | Many-to-one |
| supersedes | same stage index (versioning occurs within stage; a @v2 supersedes @v1 of same artifact type) | One-to-one: each v has ≤ 1 successor |
| delegates | u.index ≥ v.index, v new delegated authority strictly SUBscope of u | u → v with explicit scope[] enumeration, v has ≤ 1 parent delegation per scope atom |
| authorizes | u.index ≥ v.index, u approves v AND delegated scope matches | compound (approves ∧ scope_equivalent) — edge MAY be materialized, MAY be computed by join |
| ratifies | u = STAGE 0..3 only, v = any change event at stage ≤ u | u.index ≥ v.index |
| amends | u ∈ ADR/DEC node (stage ≤ 2 for CONSTITUTION amendments), v = target artifact stage ≤ u + 1 (Evolution Domain A/B only) | Requires evolution domain mapping |
| epoch_binds | u = Lexicon/Governance Epoch Marker, v = any node, stages ≤ u + 2 | interval half-closed; disjoint intervals required |

---

## 4. Strict DAG Invariant + Cycle Detection

G_auth is a **Strict DAG**. For every connected component C in G_auth:
1. There exists EXACTLY ONE root node r such that no edge e has target = r (except itself, self-loops FORBIDDEN).
2. Every non-root node n has at least one path to the root, traversing edges in the reverse direction (target → source).
3. The shortest reverse-path length from every VERDICT node (stage 9) to the root SHALL be ≤ 8 steps (one step per stage maximum — this forces full stage traversal for verdict validity).

**Cycle Detection Procedure:**
Topological sort of G_auth using Kahn's algorithm. If any nodes remain after queue exhaustion → those nodes participate in a cycle → ARCH-37 violation AUTHORITY_GRAPH_CYCLE, FATAL at Gate-E.

---

## 5. IA-17 Authority Preservation Mechanical Check (Constitutional Proof Sub-1)

Given a transformation `T: Input_Canonical_Form → Output_Canonical_Form`, the **Authority Preservation Sub-Proof** emits exactly:
```
authority_proof_record:
  transformation_id: Txxx
  sub_proof_id:      AP-<timestamp>-<hash>
  walks:
    - from: output.derives_authority_from.canonical
      to:   input.derives_authority_from.canonical
      path_stages: [list of authority_stage_index along path]
      monotonicity_ok: true
    - authority_level_before: Σ of input stage vector
      authority_level_after:  Σ of output stage vector
      gain: Σ_after - Σ_before  (MUST be ≤ 0 vector; strict componentwise)
  verdict: PASS / FAIL / INCONCLUSIVE
```

**PASS condition:** gain_i ≤ 0 ∀ i ∈ {scope, normative, governance}. If any component > 0 → FAIL at sub-proof 1 → Constitutional Proof composite FAIL → verdict CANNOT PASS (Axiom D).

---

## 6. Authority Node Schema (Canonical)

Every authority-bearing artifact MUST include in its header an `authority:` block with the following REQUIRED fields:

```yaml
authority:
  # Stage classification (§2) — enum: VISION | CONSTITUTION | ASP_IA | SPECIFICATION | CONTRACT_PROTOCOL |
  #                                            IMPLEMENTATION | EXECUTION_PLAN | EVIDENCE | VERDICT
  authority_stage: CONTRACT_PROTOCOL      # required

  # Canonical derivation edge: EXACTLY one entry in this array with canonical=true
  derives_from_chain:                     # list of Authority Graph derivation edges
    - source_id: <upstream canonical artifact ID>
      edge_kind: derives_authority_from    # MUST be authority_graph edge_kind
      canonical: true                      # EXACTLY one with canonical=true
      epoch_binding: "[Sprint0, ∞)"
    - source_id: <alternative source for audit>
      edge_kind: approves
      canonical: false

  # Numeric authority vector for monotonicity check (3-tuple)
  level_vector: [6, 7, 7]                  # per §2 table; for CONFORMANCE stage 5

  # Cross-graph reference: semantic identity of THIS node in Knowledge Graph
  knowledge_graph_node_ref: <knowledge-node-id-of-same-artifact>  # artifact appears in BOTH graphs
```

---

## 7. Approved Sources by Stage

For each stage, the ONLY upstream canonical derivation targets permitted (to avoid spurious derivations):

| Stage | Permitted `derives_authority_from` canonical sources |
|-------|------------------------------------------------------|
| VISION (1) | Only ROOT (Three Laws + Four Axioms Frozen Core Decl) |
| CONSTITUTION (2) | VISION statement, or Foundation Charter Revision |
| ASP_IA (3) | CONSTITUTION + VISION, via unanimous / 2/3 Board vote |
| SPECIFICATION (4) | IA level, via Specification Review + optional ADR |
| CONTRACT_PROTOCOL (5) | SPECIFICATION, via versioned release + Contract Schema |
| IMPLEMENTATION (6) | PROTOCOL conformance PASS verdict; optional ADR for alternative impls |
| EXECUTION_PLAN (7) | Planner + Compiler derivation chain back to Snapshot, Snapshot → SPECIFICATION |
| EVIDENCE (8) | EXECUTION_PLAN hash-bound + Constitutional Proof composite 3-sub PASS |
| VERDICT (9) | EVIDENCE (Assessment → Justification chain); Gate Framework mapping → Certification Gate Decision |

---

## 8. Verification Checks Summary

| # | Check ID | Invariant | ARCH Violation Class | Severity @ Gate |
|---|----------|-----------|----------------------|-----------------|
| 1 | AUTH-01 | Every node has canonical derives_authority_from edge | MISSING_SUB_PROOF | ERROR @ D |
| 2 | AUTH-02 | authority_stage index monotonic strictly decreasing along canonical derivation | AUTHORITY_GAIN_TYPE_ERROR | FATAL @ all gates |
| 3 | AUTH-03 | All edge_kinds in authority_graph ∈ {8 approved kinds} | EDGE_SET_INTERSECTION_NONEMPTY | ERROR @ D |
| 4 | AUTH-04 | No cycles in G_auth | AUTHORITY_GRAPH_CYCLE | FATAL @ E |
| 5 | AUTH-05 | Each component exactly one root | INCONCLUSIVE (component orphaned) | ERROR @ D |
| 6 | AUTH-06 | VERDICT → root shortest reverse path length ≤ 8 | TRACE_TOO_LONG (missing authority stages) | ERROR @ D |
| 7 | AUTH-07 | Sub-proof 1 of Constitutional Proof has Σ level gain ≤ 0 vector | AUTHORITY_PRESERVATION_VIOLATION | FATAL @ all gates |


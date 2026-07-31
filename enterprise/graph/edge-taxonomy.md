# EOS Edge Taxonomy — DUAL PRIMARY GRAPHS (Normative Draft v1.0.0)

> **Constitutional Basis**
> *Invariant:* IA-15 Dual Primary Graphs (INVARIANT-ARCHITECTURE.yaml)
> *Axioms:* Law I / Axiom A (Authority Graph), Law II / Axiom B (Knowledge Graph)
> *Invariant:* `edge_kinds ∩ authority_edge_kinds = ∅` (strictly disjoint sets)
> *ARCH Rule:* ARCH-37-IA15-DUAL-GRAPHS — violation = GRAPH_CLASS_MIXTURE at Gate-D ERROR

Every edge declaration in EOS MUST explicitly declare a `graph_class` field. The two primary graph classes are strictly separated and may never intermix edge kinds.

---

## 1. Authority Graph — `graph_class: authority_graph`

**Answers:** *Why is this artifact valid?*

**Characteristic:** Strict DAG. Cycles are FORBIDDEN by Axiom A (authority chain must be traceable to a terminal root).
**ARCH enforcement:** ARCH-37 violation class = AUTHORITY_GRAPH_CYCLE → FATAL @ Gate-E.
**Direction:** Authority flows strictly downward (VISION → C → ASP → IA → SPEC → CONTRACT → PROTOCOL → IMPL → EXEC → EVIDENCE).

### Normative Authority Edge Taxonomy (IA-15)

| edge_kind | Formal Semantics | Typical (from → to) node types | Invariant Property |
|-----------|------------------|---------------------------------|--------------------|
| `approves` | Artifact A formally attests that Artifact B's content complies with authority at A's stage. Approval is necessary but not sufficient for `authorizes`. | Governance Vote → Contract; Architecture Board Decision → IA; ADR → Specification | Approver MUST have authority_level strictly ≥ target. authority_level monotonically NON-INCREASING along the edge. |
| `supersedes` | Artifact A replaces Artifact B. Authority originally bound to B now *only* binds to A. Historical references to B still resolve, but B cannot be used as authority source post-epoch of supersession. | Policy@v2 → Policy@v1; Requirement R-77-refined → R-77; Contract MAJOR version upgrade. | supersession DAG: any artifact has at most one `supersedes` successor. No diamond supersession chains FORBIDDEN. |
| `delegates` | Authority holder A transfers *specific, enumerated* authority to B. B MAY act on A's behalf within that scope. B MAY NOT re-delegate unless explicitly permitted. | Constitution → Domain Authority Board; Architecture Board → Working Group; Project Charter → Maintainer | scope MUST be machine-enumerable. Undelegated scope assertion = AUTHORITY_GAIN (IA-17 breach → FATAL). |
| `authorizes` | Artifact A grants Artifact B the status of "authoritative for its declared scope". Typically combines approves + scoped delegation into one edge. | Protocol@v4.2.1 → Implementation X (conformance PASS verdict); Knowledge Snapshot → Planner Input; Constitution → all ASP/IA. | authorizes is ONLY valid if approves chain resolves + scope matches. Composite of: approves ∧ scope_equivalent. |
| `derives_authority_from` | Node B's authority (legitimacy) is computed from node A's authority. Node B CANNOT have authority independently of A. This is the transitive backbone of Authority Graph. | EVERY authority-bearing artifact → its upstream canonical source. Ledger Verdict entry → Constitutional Proof composite. | Required invariant: EVERY artifact (except Constitution root) has EXACTLY ONE canonical derives_authority_from edge. Multiple "extra" derivations allowed, but the canonical one is unique. |
| `ratifies` | Governance body explicitly records acceptance of a change-of-authority event. Typically present only at Constitution / ASP / IA level. | Foundation Charter Revision → Three Laws statement; Architecture Board Unanimous Vote → ASP-01 amendment | ratifies requires concrete governance vote evidence. |
| `amends` | Artifact A (a change proposal/decision) mutates the authoritative content of Artifact B in-place, within Evolution Domain rules. | ADR-042 → Specification MAJOR bump; DEC-017 → Contract schema minor extension | amend is scoped by Evolution Domain. Cross-Domain amendment FORBIDDEN without Foundation Charter. |
| `epoch_binds` | Artifact's authority is bounded by a specific governance epoch. Outside the epoch interval, artifact is NOT authoritative. | Lexicon Term@epoch=Sprint0 -> epoch successor; Policy Q1-2026 → Q2-2026 replacement | epoch interval MUST be half-closed [start_epoch, end_epoch). Overlapping epoch bindings for same scope = AUTHORITY_CONFLICT. |

**FORBIDDEN in Authority Graph:** Any edge_kind that describes *semantic* relationship between artifacts (depends_on, extends, implements, contains, references, equivalent_to, specializes, refines, uses). These edges BELONG in the Knowledge Graph. Mixing them into Authority Graph = `GRAPH_CLASS_MIXTURE` at ARCH-37.

---

## 2. Knowledge Graph — `graph_class: knowledge_graph`

**Answers:** *What does this artifact mean? What is its semantic relationship to other artifacts?*

**Characteristic:** DAG *for non-symmetric edges*; `equivalent_to` is symmetric and allowed to create symmetric 2-cycles ONLY (not larger cycles).
**ARCH enforcement:** ARCH-37 violation class = EDGE_SET_INTERSECTION_NONEMPTY (if edge_kind also in authority set) → ERROR @ Gate-D.
**Direction:** No single authority direction. Edges represent semantic dependency, derivation, extension, containment, reference, or equivalence.

### Normative Knowledge Edge Taxonomy (IA-15)

| edge_kind | Formal Semantics | Typical (from → to) node types | Invariant Property |
|-----------|------------------|---------------------------------|--------------------|
| `depends_on` | Semantics of artifact A cannot be evaluated without consulting semantics of artifact B. Dependency is *static* and must be known at Canonical Form emission time. | Decision Form (D-FORM) → Knowledge Form (K-FORM); Capability Contract → Domain Ontology | DAG — depends_on MUST form DAG. Circular depends_on = CYCLE → ARCH-37 ERROR. |
| `implements` | Artifact A (implementation) claims to realize all semantic requirements declared in Artifact B (specification / semantics / contract). Implements is the formal hook for conformance testing. | Strategy STRAT-T003-LLM → Semantics TS-T003; Capability@implementation → Capability Contract; Runtime Engine → Execution Form protocol | implements is NOT authority. An "implements B" claim does NOT imply "authorizes B". Conformance verdict still required independently. |
| `extends` | Artifact A extends Artifact B with new semantic clauses or scope. A inherits all meaning of B AND adds additional meaning. | Extended Policy → Base Policy; Specialized Capability Contract → Generic Contract; Canonical Form extension version | Extension order: semantics(A) = semantics(B) ∪ delta(A). Diamond extensions permitted PROVIDED union well-defined (no contradictory fields). |
| `contains` | Artifact A is the strict container of Artifact B in terms of semantic scope. Container identity is composed of its parts. | Knowledge Snapshot → individual Requirement object; Contract → Term entries; Evidence Package → Measurement Entry | Part-whole relationship. hashes of A SHOULD include B hashes. |
| `references` | Artifact A *mentions* Artifact B semantically but does NOT require B for evaluation of A's core canonical meaning. Weakest form of semantic coupling. | Justification text → Evidence node; Comment in Protocol → related R- requirement; Cross-linking between ontologies. | references creates no dependency requirement for compilation; purely documentation/semantic-link relation. |
| `equivalent_to` | Artifact A and Artifact B have *identical normative meaning*. Equivalence is symmetric and reflexive. | JSON serialization ↔ YAML serialization of SAME Canonical Form; K-FORM in DB ↔ K-FORM in Graph DB ↔ K-FORM in protobuf (concretizations of Axiom B independence); Migrated artifact → original after identity-preserving migration. | ONLY permitted 2-cycle (A→B AND B→A). Larger equivalence cycles FORBIDDEN → reduced via canonical representative. |
| `specializes` | Artifact A is a strict semantic specialization of Artifact B. ∀ property P true of B, P is true of A, but A may add properties *not* in B. Weaker than extends; no version/scope requirement. | "Contract-for-Insurance-Case" → "Contract-for-Case" (generic); D-FORM for Workspace consumer → generic D-FORM for any consumer | implies depends_on (A specialized B requires B for evaluation). Requires DAG. |
| `refines` | Artifact A semantically refines the (possibly ambiguous) meaning declared in Artifact B. Typically Interpretation-stage output from raw Requirements → Policies. | Interpretation Canonical Form → Raw Requirement; Compiler T003 output → Planner input Form | Refinement MUST be semantics-preserving: truth of B implies truth of A's statements in B's scope. Semantic Preservation Proof (Constitutional Proof Sub-2) uses `refines` edges as axioms. |
| `uses` | Artifact A's transformation uses Artifact B as an input parameter/vocabulary source, but A's own semantic identity does not require B. Narrower than depends_on. | LLM Strategy (STRAT-*) → Term Vocabulary entry; Optimizer → Cost Model; Planner rule → policy threshold lookup | No DAG requirement. Cyclic uses edges permitted PROVIDED no depends_on cycle implied. |

**FORBIDDEN in Knowledge Graph:** Any edge_kind that describes *legitimacy* of an artifact (approves, supersedes, delegates, authorizes, derives_authority_from, ratifies, amends, epoch_binds). These belong in Authority Graph.

---

## 3. Cross-Graph References

**Invariant IA-15 cross_graph_reference_only:**
An artifact node may appear in BOTH graphs (as it must, every artifact has *both* a validity reason AND semantic meaning). However, edges MUST strictly respect class.

Valid pattern (ALLOWED):
```
node: [Term "Canonical Form"]
  ├─ authority_graph edges:
  │     derives_authority_from → Lexicon Registry Governance Decision
  │     epoch_binds            → [Sprint0, ∞)
  │     approves               → Lexicon Registry Vote
  └─ knowledge_graph edges:
        aliased_by (references) → Term "Canonical Representation" (deprecated)
        referenced_by           → Axiom B definition
        referenced_by           → IA-13 Stable Canonical Forms spec
```

Forbidden pattern (MIXTURE):
```
edge between node[Contract@v1] and node[Contract@v2]:
  edge_kind: supersedes
  graph_class: knowledge_graph    ❌ WRONG! supersedes is authority edge_kind.
  → ARCH-37 violation: GRAPH_CLASS_MIXTURE
```

---

## 4. Declarative Validation Rules (generated ARCH-37 sub-rules)

Generated by Constitutional Verifier from this taxonomy:

1. **EDGE-CLASS-DISJOINT**: For every edge declaration, `edge_kind ∉ authority_edge_kinds ∩ knowledge_edge_kinds`.
2. **AUTHORITY-GRAPH-DAG**: Weakly connected components of authority_graph MUST each have exactly one root (DERIVES_AUTHORITY_FROM chain terminal). No cycles.
3. **SINGLE-CANONICAL-DERIVATION**: Every non-root authority node has EXACTLY one `derives_authority_from` edge flagged canonical=true.
4. **KNOWLEDGE-DEPENDS-DAG**: Subgraph of `depends_on` edges MUST be DAG.
5. **EQUIVALENCE-REPRESENTATIVE**: Every equivalence class under `equivalent_to` has exactly one node elected canonical; edges from/to other nodes in class are folded to the representative.

---

## 5. Evolution Domain Registration

| Edge Kind | Evolution Domain | Compatibility on change | Enforcer |
|-----------|------------------|-------------------------|----------|
| All authority edges (8) | A: CONSTITUTION — IA-15 | MAJOR change / EPOCH only | Architecture Board |
| depends_on, implements, extends, contains, equivalent_to | B: SPECIFICATION — Semantic Kernel | MAJOR if semantics of relationship change. MINOR if adding new kind provided disjoint. | Specification Review |
| references, specializes, refines, uses | B: SPECIFICATION — Semantic Kernel | MINOR additions expected. | Specification Review |


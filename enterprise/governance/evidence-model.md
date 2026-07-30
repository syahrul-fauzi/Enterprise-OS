
# Enterprise OS — Evidence Model
## Status
⏳ Normative Draft (Version 0.2.0)
## Purpose
Define the governed evidence model for validating specifications, executions,
and runtime behavior in Enterprise OS.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to specification validation, compiler execution,
implementation verification, and runtime observation artifacts.
## Normative Rules
1. Every Evidence MUST validate exactly one explicit claim, result, or measured
   outcome.
2. Every Evidence MUST be classified as either `Specification Evidence` or
   `Execution Evidence`.
3. Every Evidence MUST carry the stable `semantic_id` of the governed concept.
4. Every Evidence MUST be traceable to its source, producing system, and
   originating specification lineage.
5. Every Evidence MUST carry the shared `lineage_id` for its governed execution
   flow.
6. Evidence MUST preserve the distinction between specification defects and
   execution defects.
7. Every Evidence MUST have a defined lifecycle and verification status.
## Grammar
Markdown prose plus machine-readable evidence records in YAML or JSON.
## Constraints
- No Evidence without an explicit claim or result statement.
- No Evidence without source attribution.
- No accepted Evidence without `semantic_id`.
- No Execution Evidence without a compiler or runtime lineage reference.
- No accepted Evidence without `lineage_id`.
- No Specification Evidence may be used as a substitute for execution
  conformance proof.
## Validation Rules
- Validate that every evidence record declares its class, subject, source, and
  verification status.
- Validate that every evidence record carries the governing `semantic_id`.
- Validate that every evidence record carries the governing `lineage_id`.
- Validate that every evidence record references a governed requirement or
  specification identifier.
- Validate that hashes, checksums, or immutable references are recorded where
  artifact integrity matters.
## Projection Rules
- Evidence may project into audit reports, traceability graphs, certification
  gates, and runtime conformance views.
- Evidence projections must preserve evidence class and lineage metadata.
## Out of Scope
- Implementation-specific storage engines
- Monitoring vendor selection
- UI presentation for evidence dashboards
## Future Evolution
- Add formal machine schemas and lifecycle transitions through governed
  evidence-backed revisions.

---

## 1. Role of Evidence in Specification Execution

Evidence is the audit boundary of EOS, but it is not only an endpoint.

In the specification execution phase, evidence proves:
- the specification is valid enough to execute;
- the compiler executed deterministically;
- the implementation conforms to generated contracts;
- runtime behavior can be traced back to the originating specification.

This keeps EOS measurable rather than claim-based.

---

## 2. Evidence Classes

EOS recognizes two primary evidence classes.

### Specification Evidence

Used to prove that a specification is valid and complete enough to enter the
execution pipeline.

Typical examples:
- Definition of Semantic Completeness passed
- semantic validation passed
- graph validation passed
- canonical YAML normalization completed

Failure meaning:
- the specification itself is incomplete, inconsistent, or not executable.

### Execution Evidence

Used to prove that generated artifacts, implementations, or runtime behavior
conform to the validated specification.

Typical examples:
- compiler checksum
- schema hash
- code generation log
- implementation verification result
- runtime validation result

Failure meaning:
- the specification may be valid, but generation, implementation, or runtime
  conformance has failed.

This separation is mandatory so audits can isolate root cause precisely.

---

## 3. Evidence Identity and Lineage

Every evidence record MUST include at minimum:
- evidence identifier
- semantic_id
- lineage_id
- evidence class
- subject requirement or specification identifier
- claim or measured outcome
- source artifact or source system
- compiler version where applicable
- checksum, hash, or immutable reference where integrity matters
- timestamp
- verification status

Minimum lineage chain:

```text
Requirement ID
    ↓
ELS Specification ID
    ↓
Canonical YAML Digest
    ↓
Generator Version
    ↓
Generated Artifact Hash
    ↓
Implementation or Runtime Observation
    ↓
Evidence Record
```

An evidence record is incomplete if this lineage cannot be reconstructed for its
applicable stage.

---

## 4. Lifecycle

Evidence MUST use an explicit lifecycle.

Recommended baseline lifecycle:
- `captured`
- `verified`
- `accepted`
- `superseded`
- `rejected`

Lifecycle rules:
- Evidence starts as `captured`.
- Evidence may become `verified` only after validation checks pass.
- Evidence may become `accepted` only when attached to a governed lineage and
  accepted by the relevant gate.
- Evidence becomes `superseded` when a newer governed evidence record replaces
  it for the same claim.
- Evidence becomes `rejected` when validation fails or provenance is broken.

---

## 5. Stage-to-Evidence Mapping

EOS uses staged completion semantics.

| Stage | Meaning | Required Evidence Class | Typical Proof |
|------|---------|-------------------------|---------------|
| `DoD-S` | Specification Done | Specification Evidence | DoSC pass, semantic validation pass |
| `DoD-G` | Generation Done | Execution Evidence | compiler checksum, artifact hashes |
| `DoD-I` | Implementation Done | Execution Evidence | conformance test pass, contract verification |
| `DoD-R` | Runtime Done | Execution Evidence | runtime validation, observed production behavior |

This model allows a requirement to be semantically complete while still pending
generation, implementation, or runtime validation.

---

## 6. Evidence Acceptance Rules

An evidence record is acceptable only when:
1. its claim is explicit;
2. its class is declared correctly;
3. its source and lineage are traceable;
4. integrity metadata is recorded where relevant;
5. its verification method is reproducible;
6. it is linked to the affected certification gate or execution stage.

If any acceptance condition fails, the evidence status remains `captured` or
`rejected`, never `accepted`.

---

## 7. Example Machine Representation

```yaml
evidence_id: EVD-REQ-001
semantic_id: REQ-0001
lineage_id: LIN-REQ-001
class: execution_evidence
stage: DoD-G
subject_requirement_id: REQ-001
specification_id: ELS-REQUIREMENT-V1
claim: generator_output_matches_validated_canonical_yaml
source:
  type: generator_run
  generator_version: 1.2.0
  artifact: requirement.schema.json
integrity:
  canonical_yaml_sha256: abc123
  artifact_sha256: def456
verification:
  method: deterministic_regeneration_check
  status: passed
timestamp: 2026-07-29T00:00:00Z
```

The representation may evolve, but class, lineage, and verification semantics
must remain stable.

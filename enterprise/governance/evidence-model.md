
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
2. Every Evidence MUST declare exactly one epistemic class:
   `Calibration Evidence`, `Experimental Evidence`, or `Certification Evidence`.
3. Every Evidence MUST carry the stable `semantic_id` of the governed concept.
4. Every Evidence MUST be traceable to its source, producing system, and
   originating specification lineage.
5. Every Evidence MUST carry the shared `lineage_id` for its governed execution
   flow.
6. Evidence MUST preserve the distinction between calibration defects, theory
   experiment results, and implementation conformance results.
7. Every Evidence MUST have a defined lifecycle and verification status.
## Grammar
Markdown prose plus machine-readable evidence records in YAML or JSON.
## Constraints
- No Evidence without an explicit claim or result statement.
- No Evidence without source attribution.
- No accepted Evidence without `semantic_id`.
- No Experimental or Certification Evidence without a compiler, runtime, or
  replay lineage reference.
- No accepted Evidence without `lineage_id`.
- No Calibration Evidence may be used as a substitute for Experimental
  corroboration or Certification proof.
## Validation Rules
- Validate that every evidence record declares its epistemic class, subject,
  source, and verification status.
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

EOS recognizes three primary epistemic evidence classes.

### Calibration Evidence

Used to prove that the measurement apparatus is valid and complete enough to
enter theory-testing and certification pipelines.

Typical examples:
- oracle calibration report
- witness integrity certificate
- dataset certification report
- manifest and protocol calibration checks

Failure meaning:
- the instrument itself is incomplete, unstable, or not fit to measure the
  theory.

### Experimental Evidence

Used to prove or falsify the theory under test using calibrated instruments.

Typical examples:
- positive and negative falsification runs
- counterfactual experiment results
- metamorphic invariance results
- witness-backed IA-20 evaluations

Failure meaning:
- the theory may be falsified, underdetermined, or insufficiently corroborated
  in the defined experimental space.

### Certification Evidence

Used to prove that implementations and runtimes conform when replaying
certified datasets under a frozen theory and calibrated science kernel.

Typical examples:
- cross-runtime replay results
- conformance certificates
- certification verdict packages
- implementation comparison reports

Failure meaning:
- the theory and apparatus may still be valid, but one or more implementations
  fail to conform consistently.

This separation is mandatory so audits can isolate whether a defect sits in the
apparatus, the theory experiment, or the implementation.

---

## 3. Evidence Identity and Lineage

Every evidence record MUST include at minimum:
- evidence identifier
- semantic_id
- lineage_id
- epistemic evidence class
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

EOS uses staged completion semantics. Evidence class and completion stage are
orthogonal and MUST both be declared.

| Stage | Meaning | Required Evidence Class | Typical Proof |
|------|---------|-------------------------|---------------|
| `DoD-S` | Specification Done | Calibration Evidence | oracle and witness calibration pass |
| `DoD-G` | Generation Done | Experimental Evidence | falsification run, counterfactual result |
| `DoD-I` | Implementation Done | Certification Evidence | cross-runtime conformance pass |
| `DoD-R` | Runtime Done | Certification Evidence | runtime validation, observed replay consistency |

This model allows a requirement to be semantically complete while still pending
generation, implementation, or runtime validation.

---

## 6. Evidence Acceptance Rules

An evidence record is acceptable only when:
1. its claim is explicit;
2. its epistemic class is declared correctly;
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
class: certification_evidence
stage: DoD-I
subject_requirement_id: REQ-001
specification_id: ELS-REQUIREMENT-V1
claim: cross_runtime_replay_matches_calibrated_reference_dataset
source:
  type: certification_run
  generator_version: 1.2.0
  artifact: run-manifest.yaml
integrity:
  canonical_yaml_sha256: abc123
  artifact_sha256: def456
verification:
  method: reproducible_cross_runtime_replay
  status: passed
timestamp: 2026-07-29T00:00:00Z
```

The representation may evolve, but class, lineage, and verification semantics
must remain stable. The older `Specification` versus `Execution` distinction
remains useful as an origin plane, but the governing evidence class is now
Calibration, Experimental, or Certification.

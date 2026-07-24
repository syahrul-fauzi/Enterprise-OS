# EOS Scientific Research Protocol

This document defines the research protocol for all EOS experiments to ensure rigor and prevent confirmation bias.

---

## Experiment Model
```yaml
experiment_model:
  objective:
    validate:
      - capability_reuse
      - engineering_leverage
      - delivery_improvement
  principle:
    production_first: true
    extraction_second: true
    evidence_required_before_decision: true
  evidence_required:
    delivery:
      - bootstrap_time
      - lead_time
      - defects
      - deployment_frequency
      - change_failure_rate
      - recovery_time
    architecture:
      - duplicated_logic
      - capability_reuse
    platform:
      - extraction_effort
      - adoption_rate
  invalidation_conditions:
    - no measurable reuse improvement
    - extraction cost exceeds benefit
    - capability adoption fails
    - evidence coverage < 70%
```

---

## Experiment Lifecycle (Rigorous Scientific Method)
```text
Question
    ↓
Hypothesis (Falsifiable!)
    ↓
Method (Reproducible!)
    ↓
Baseline Measurement
    ↓
Experiment Execution (LawyersHub → Services-ID)
    ↓
Evidence Collection
    ↓
Analysis
    ↓
Conclusion (Either supports or contradicts!)
```

---

## Extraction Guardrails (Prevent Premature Extraction!)
Capability extraction **only allowed** after passing ALL of these steps:
1. Observation: Pattern is seen in at least one product
2. Repeated Usage: Pattern is used in at least two separate places
3. Validated Pattern: Pattern is validated as stable
4. Economic Evidence: Preliminary estimate of leverage ≥ 2x
5. Extraction Decision: Decision is documented with complete evidence

---

## Experiment Directory Structure
```text
experiments/
  README.md (this file)
  EXP-XXX/
    hypothesis.md
    method.md
    baseline.json
    evidence/
    analysis.md
    conclusion.md
```

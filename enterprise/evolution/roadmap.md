
# Enterprise OS — Evolution Roadmap
## Status
⏳ Normative Draft (v0.1.0)
## Purpose
Long-term evolution plan for Enterprise OS (separate from EKM build order).
## Authority
Lead Enterprise Architect
## Scope
All phases.

---

## Future Evolution Proposals

### Proposal 1: Separate Constitution and EKL Directories
**Status**: Proposed, not to be implemented until benefits clearly outweigh migration cost  
**Rationale**: Constitution answers "why" (governance, principles), while EKL answers "how" (language, semantics). Separating them will make future language evolution cleaner and independent of constitutional governance.
**Proposed Structure**:
```
enterprise/
    constitution/
        enterprise-principles.md
        design-philosophy.md
        modeling-principles.md
    ekl/
        language-specification.md
        vocabulary.md
        ontology.md
        meta-model.md
        relationship-grammar.md
        capability-grammar.md
        naming-conventions.md
        enterprise-specification-template.md
        capability-quality-rules.md
```
**Constraints**: Cannot be implemented until explicitly approved, due to EP-009 (permanent filesystem freeze).

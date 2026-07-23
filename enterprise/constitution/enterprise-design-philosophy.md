
# Enterprise OS — Enterprise Design Philosophy
## Status
✅ Normative (Version 1.0.0)
## Purpose
The DNA of Enterprise OS: core design philosophies that guide all modeling, architecture, and implementation decisions.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every decision
## Normative Rules
1. Every design decision must align with at least one philosophy.
2. Philosophies are immutable unless explicitly changed by authority.
## Grammar
YAML list of philosophies, plus markdown explanations
## Constraints
- No decision may contradict any philosophy
## Validation Rules
- All design decisions trace to a philosophy
## Projection Rules
- Philosophies inform all projection rules
## Examples
(see below)
## Out of Scope
- Implementation-specific philosophies
## Future Evolution
- Add philosophies as needed
---

## Core Design Philosophies
```yaml
philosophies:
  - Evidence First
  - Capability First
  - Enterprise Before Technology
  - Knowledge Before Implementation
  - Projection Not Duplication
  - Constitution Before Execution
  - Traceability Before Convenience
```

---

## Philosophy Explanations
1. **Evidence First** — Decisions and actions require verifiable evidence
2. **Capability First** — Everything begins and ends with capabilities
3. **Enterprise Before Technology** — Enterprise needs drive technology choices
4. **Knowledge Before Implementation** — Model first, code second
5. **Projection Not Duplication** — Repository and runtime are projections of knowledge
6. **Constitution Before Execution** — Governance and authorization come before any execution
7. **Traceability Before Convenience** — Maintain full traceability even if less convenient

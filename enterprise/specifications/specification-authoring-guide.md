# Enterprise OS — Specification Authoring Guide
## Status
✅ Implementation Baseline v1.0 (Frozen)
## Purpose
Define a uniform authoring discipline for EOS Language Specifications so every
ELS concept is written with the same structure, vocabulary, and formal quality.
## Authority
Lead Enterprise Architect
## Scope
All ELS concept specifications, starting with `Requirement`, `Evidence`,
`RTM`, and `Blueprint`.
## Normative Rules
1. SAG is an authoring guide, not a new architectural level, and it MUST NOT
   be interpreted as part of the L0-L8 stack.
2. Every ELS concept MUST follow the mandatory section structure defined here.
3. Every ELS concept MUST produce both human-readable and machine-readable
   forms from the same semantic source.
4. Every normative statement in an ELS concept MUST use approved EOS
   vocabulary and relation grammar.
5. A concept is not considered implemented until it satisfies the Definition of
   Done in this guide.
6. Compiler inputs MUST read canonical YAML or JSON, not free-form markdown.
## Grammar
Markdown for human-readable specifications plus YAML or JSON for
machine-readable representation.
## Constraints
- SAG standardizes authoring quality; it does not redefine Constitution, EMA,
  ERA, or ELS semantics.
- SAG must reduce variation in style, identifier shape, and section ordering.
- SAG must support deterministic compiler input.
## Validation Rules
- Validate that all required sections exist in every ELS concept.
- Validate that identifiers, lifecycle states, and relation names conform to
  approved grammars.
- Validate that examples are explicitly marked non-authoritative.
## Projection Rules
- SAG constrains ELS authoring templates, compiler inputs, review checklists,
  and documentation linting.
## Out of Scope
- Domain-specific semantics
- Runtime deployment design
- UI documentation style
## Future Evolution
- Evolve only through governed evidence from actual specification authoring and
  compiler implementation outcomes.

---

## 1. Role of SAG

SAG exists to prevent authoring drift between ELS concepts.

```text
Architecture Closure
        ↓
SAG
        ↓
ELS
        ↓
EDM
        ↓
Compiler
        ↓
Domain Packages
```

SAG guarantees that `Requirement`, `Evidence`, `RTM`, `Blueprint`, and later
concepts are written with the same semantic discipline before code generation
begins.

---

## 2. Mandatory ELS Concept Structure

Every ELS concept document MUST contain these sections in this order:

1. `Title`
2. `Status`
3. `Purpose`
4. `Authority`
5. `Scope`
6. `Concept Definition`
7. `Identity`
8. `Lifecycle`
9. `Attributes`
10. `Relations`
11. `Invariants`
12. `Policies`
13. `Events`
14. `Validation Rules`
15. `Machine Representation`
16. `Examples`
17. `Out of Scope`
18. `Future Evolution`

The matching machine-readable form MUST expose the same semantic fields without
introducing undocumented structure.

---

## 3. Authoring Vocabulary

Allowed normative verbs:
- `MUST`
- `MUST NOT`
- `SHALL`
- `SHALL NOT`
- `MAY`

Allowed relation vocabulary:
- Normative: `constrains`, `permits`, `prohibits`
- Transformational: `defines`, `generates`, `materializes`, `realizes`,
  `instantiates`
- Observational: `observes`, `projects`, `verifies`

Authoring rules:
- Use one term for one concept consistently.
- Avoid synonyms for normative concept names inside a single specification.
- Distinguish semantic relation from runtime state explicitly.
- Mark narrative explanation as explanatory text, not normative rule.

---

## 4. Naming and Identifier Rules

Every concept MUST define:
- canonical concept name
- singular instance name
- plural collection name
- identifier prefix
- machine key casing convention

Identifier rules:
- Human-readable names use stable domain terminology.
- Machine identifiers MUST be deterministic and parseable.
- Identifier grammar MUST be declared explicitly in the concept specification.
- A concept MUST NOT rely on prose-only identity rules.

---

## 5. Lifecycle Authoring Rules

Every concept MUST define:
- lifecycle states
- allowed transitions
- transition preconditions
- terminal states if any

Lifecycle rules:
- Lifecycle is explicit, never implied by examples.
- State names must be finite and enumerable.
- Transitions must be directional and verifiable.
- Runtime transitions in ERS must not redefine semantic lifecycle meaning from
  ELS.

---

## 6. Invariants, Policies, Relations, Events, and Examples

### Invariants
- Write invariants as always-true statements over concept instances.
- Invariants must be machine-testable or explicitly marked as pending formal
  verification.
- Prefer one invariant per rule instead of long compound prose.

### Policies
- Policies constrain behavior; they do not redefine identity.
- Policies must identify scope, trigger, and enforcement expectation.

### Relations
- Relations must name source, target, relation type, and cardinality if
  relevant.
- Relations must use approved EOS vocabulary or an explicitly governed
  extension.

### Events
- Events describe meaningful state or semantic transitions.
- Events must identify producer, payload contract, and ordering assumptions if
  those assumptions matter.

### Examples
- Examples are illustrative only and MUST be labeled non-authoritative.
- Examples must conform to the concept grammar they illustrate.
- Examples must not introduce hidden semantics absent from the formal sections.

---

## 7. Machine Representation Requirements

Every ELS concept MUST provide a machine-readable representation in YAML or
JSON that includes at minimum:
- concept metadata
- identity grammar
- attributes
- lifecycle
- relations
- invariants
- policy declarations
- event declarations

The machine-readable form is the generator input contract and MUST remain
semantically aligned with the human-readable specification.

Canonical flow:

```text
Markdown (human authoring)
        ↓
Canonical YAML or JSON (machine SSOT)
        ↓
Generator
```

Interpretation:
- Markdown is the human authoring surface.
- Canonical YAML or JSON is the machine source of truth.
- Generators and validators should read the canonical machine form instead of
  parsing narrative prose.

---

## 8. Definition of Ready for an ELS Concept

A concept MUST NOT enter ELS authoring unless all of the following are true:

1. It has explicit grounding in Constitution.
2. It has a clear position in EMA.
3. It has a clear transformation role in ERA.
4. It does not duplicate an existing governed concept.
5. It has a Requirement ID.

If any requirement above is missing, the concept is not ready for ELS work.

---

## 9. Definition of Semantic Completeness (DoSC)

A concept is semantically complete only when all mandatory semantic aspects are
explicitly defined:

1. Identity
2. Lifecycle
3. Relations
4. Invariants
5. Policies
6. Evidence contract
7. Graph semantics
8. Projection rules
9. Validation rules
10. Examples

If any semantic aspect is absent:
- concept status remains `incomplete`
- compiler execution is blocked
- implementation work is not allowed to start

---

## 10. Definition of Done for an ELS Concept

A concept is considered implemented only when all of the following exist:

1. Human-readable ELS specification
2. Machine-readable representation (`.yaml` or `.json`)
3. TypeScript types
4. Zod schema
5. JSON Schema
6. Graph metadata
7. Validation stub
8. Documentation reference

If any item above is missing, the concept remains `specified` or `partial`,
not `implemented`.

---

## 11. Concept Maturity Model

Each ELS concept should be tracked with an explicit maturity level:

| Level | Name | Meaning |
|------|------|---------|
| 0 | Draft | Concept exists but is not yet semantically stable |
| 1 | Semantically Complete | DoSC is satisfied |
| 2 | Machine Readable | Canonical YAML or JSON exists and validates |
| 3 | Generated | Governed compiler outputs are reproducible |
| 4 | Implemented | Runtime-facing implementation exists over generated contracts |
| 5 | Runtime Validated | Runtime behavior is verified against specification |
| 6 | Production Proven | Production evidence confirms stable behavior |

The roadmap should measure concept progress using these levels rather than
document count alone.

---

## 12. Initial Execution Priority

The first four concepts to be authored under SAG are:

1. `Requirement`
   - Root Aggregate of EOS
   - Identity anchor for traceability
2. `Evidence`
   - Basis of auditability and runtime observation
3. `RTM`
   - Traceability graph projection
4. `Blueprint`
   - Executable specification for downstream realization

These four concepts form the minimum semantic backbone for governance,
acceptance, release, and execution artifacts.

---

## 13. Compiler Alignment

Compiler work must not start as ad hoc scripts.

Target packaging direction:

```text
workspace/packages/tooling/specification-compiler/
```

Minimum expected outputs:
- TypeScript types
- Zod schemas
- JSON Schema
- OpenAPI fragments where applicable
- Validation rules or stubs
- Graph metadata
- Documentation stubs

The compiler is a first-class implementation artifact because it is the bridge
between language and runtime realization.

Recommended compiler stages:
- parser
- validator
- semantic checker
- contract emitter
- schema emitter
- documentation emitter
- graph emitter
- code emitter

This staged design allows independent verification at each transformation step.

---

## 14. Operational Guardrail

> No implementation may define meaning. Meaning may arise only from validated
> and frozen Language Specification artifacts.

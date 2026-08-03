
# Enterprise OS — URN Binding Profile For EKL Models
## Status
Reference profile (v1.0.0)
## Purpose
Bind model-layer URN examples to the canonical vocabulary already governed by
`enterprise/constitution/lexicon.yaml` and `RFC-0001`. This document is a
consumer profile and MUST NOT be treated as an independent source of language
truth.
## Authority
Lead Enterprise Architect
## Scope
Model-layer examples for EKL entities, packages, and artifacts.
## Normative Rules
All URN examples in this profile MUST remain aligned with the constitutional
language anchors above.
## Grammar
URN format as specified below.
## Constraints
No arbitrary identifiers allowed; all identifiers MUST follow the grammar.
## Validation Rules
All canonical identifiers MUST validate against the regex patterns defined below.
## Projection Rules
Identifiers are used as primary keys in the Enterprise Knowledge Graph.
## Examples
See below.
## Out of Scope
(coming soon)
## Future Evolution
(coming soon)
---

## 1. URN Profile
All EKL entities use URN-based identifiers for global uniqueness and stability,
as defined by the constitutional vocabulary and the specification meta-model.

### 1.1 Generic URN Pattern
```
urn:ekl:<namespace>:<type>:<name>
```

### 1.2 Library Type URN Pattern
```
urn:ekl:library:<type>
```
Example:
- `urn:ekl:library:business-capability`
- `urn:ekl:library:actor`

### 1.3 Knowledge Package URN Pattern
```
urn:ekl:package:<package-name>:<version>
```
Example:
- `urn:ekl:package:customer-management:v1`

### 1.4 Canonical Object URN Pattern
```
urn:ekl:<object-type>:<object-name>
```
Example:
- `urn:ekl:business-capability:customer-management`
- `urn:ekl:actor:lead-enterprise-architect`

### 1.5 Regex Validation Patterns
- **Library type**: `^urn:ekl:library:[a-z0-9-]+$`
- **Knowledge package**: `^urn:ekl:package:[a-z0-9-]+:v\d+$`
- **Canonical object**: `^urn:ekl:[a-z0-9-]+:[a-z0-9-]+$`

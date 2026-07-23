
# Enterprise OS — Canonical Identity Grammar
## Status
✅ Normative (v1.0.0)
## Purpose
Define the canonical grammar for unique, stable identifiers for all EKL entities, packages, and artifacts.
## Authority
Lead Enterprise Architect
## Scope
All phases; applies to every canonical object, package, and EKL artifact.
## Normative Rules
All canonical identifiers MUST conform to the grammar defined below.
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

## 1. Canonical Identifier Grammar
All EKL entities use URN-based identifiers for global uniqueness and stability.

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

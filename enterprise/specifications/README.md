# Enterprise Specification System

## Purpose
Stabilize the EOS specification system as a governed artifact graph rather than
an unstructured document collection.

## Layering
The specification system separates seven concerns:

1. `ADR` defines constitutional platform invariants.
2. `RFC` defines normative specifications and design rationale.
3. `SPEC` defines machine-readable contract objects and formal payload shapes.
4. `CONF` defines executable conformance baselines for those specifications.
5. `PROJ` defines machine-readable evaluation views derived from governed
   runtime execution.
6. `EVIDENCE` freezes projections as auditable artifacts with identity and
   digest.
7. Contract surfaces in `workspace/packages/tooling/eos-cli/src/runtime-contracts`
   implement the active `SPEC-*` family.

## Registry
`specification-registry.yaml` is the machine-readable registry for the
specification system.

It now behaves as an artifact dependency graph:

- `artifact_entries` enumerate governed artifacts
- `artifact_edges` declare explicit semantic relations
- runtime projections derive `RFC` and `CONF` views from the graph instead of
  treating the registry as a static list

This keeps the chain auditable:

`ADR -> RFC -> SPEC -> CONF -> projection -> evidence artifact`

`contract surface` and `test surface` remain explicit implementing and
verification nodes inside the registry graph between `CONF` and the final
projection/evidence surfaces.

## Vocabulary Boundary
EOS language and vocabulary MUST remain anchored in:

- constitutional vocabulary under `enterprise/constitution/`
- normative language in [RFC-0001](file:///root/Enterprise-OS/enterprise/specifications/rfc/RFC-0001-specification-meta-model.md)

`knowledge/`, `schema/`, and runtime implementations MAY instantiate that
language, but they MUST NOT redefine it locally.

## SPEC Family
Machine-readable contract specifications now live under
[spec/](file:///root/Enterprise-OS/enterprise/specifications/spec).

RFC remains normative and concise; `SPEC-*` carries payload-level contract
detail that can grow without overwhelming RFC text.

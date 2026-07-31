`expected/` contains only immutable expected evaluation contracts.

Allowed here:

- expected predicate vectors
- expected evaluation contracts

Forbidden here:

- witness bundles
- observed logs
- execution reports
- mutable run outputs

Witnesses are observational outputs and therefore belong exclusively under
`execution/runs/run-<NNN>/actual/witness/`.

Governance verdicts are also not part of `expected/`. They are downstream artifacts that may be
derived from Oracle evaluations under governance authority.

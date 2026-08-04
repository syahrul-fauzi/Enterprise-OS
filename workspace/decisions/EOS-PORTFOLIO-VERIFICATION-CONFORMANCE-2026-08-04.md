# EOS Portfolio Verification Conformance

Status: Closed
Date: 2026-08-04
Scope: One leakage / session

## Problem

`verify-portfolio` owned portfolio verification status derivation and
summary/report assembly directly inside the command handler.

Previous shape:

```text
verify-portfolio command
   ├── read portfolio evidence
   ├── derive portfolio status
   ├── assemble verification report
   ├── assemble summary markdown
   └── persist artifacts
```

This kept part of portfolio verification reasoning inside the CLI command
surface instead of a reusable verification runtime.

## Change

Portfolio verification status derivation and summary/report assembly now live in
`portfolio-verification-runtime.ts`.

Current shape:

```text
verify-portfolio command
   ├── read portfolio evidence
   ├── invoke portfolio verification runtime
   └── persist artifacts
```

Applied changes:

- added `portfolio-verification-runtime.ts`
- moved `resolvePortfolioProducts` into the runtime
- moved portfolio status derivation into the runtime
- moved portfolio report assembly into the runtime
- moved portfolio summary markdown assembly into the runtime
- kept product evidence file I/O and artifact persistence in the command

## Files

- `workspace/packages/tooling/eos-cli/src/portfolio-verification-runtime.ts`
- `workspace/packages/tooling/eos-cli/src/commands/verify-portfolio.ts`
- `workspace/packages/tooling/eos-cli/tests/portfolio-verification-runtime.test.ts`

## Verification

- `pnpm lint` -> `PASS`
- `pnpm check-types` -> `PASS`
- `pnpm test` -> `PASS (77/77)`

## Remaining

- no other verification commands were changed in this session
- `verify-product` and `verify-constitution` were not modified
- this does **not** claim the whole verification boundary is globally finished

## Decision

STOP.

Do not expand scope from this checkpoint.

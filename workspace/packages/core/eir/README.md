# @repo/core-eir

Canonical EOS Instruction Record (EIR) package.

**Gate**: B  
**Layer**: 4 (Canonical Foundation)  
**Status**: DRAFT

## Purpose

Defines the canonical types, schemas, and interfaces for the EOS Instruction
Record (EIR) — the intermediate representation emitted by T001 (ELS → EIR) and
consumed by T002 (EIR → CAG).

## Frozen Content Classes (ALLOWED only)

- TypeScript type declarations (`src/types.ts`)
- TypeScript interface declarations (`src/interfaces.ts`)
- Zod validation schemas (`src/schema.ts`)
- Canonical YAML/JSON contract references (`contracts/`)
- Conformance tests (`tests/`)

## Forbidden Content Classes

- Runtime execution entrypoints (`run` / `execute` / `compile`)
- Product UI logic or React imports
- Hardcoded transformation IDs or pipeline logic

# EOS Projects — Project Intelligence Layer

## Overview

`projects/` is the Project Intelligence Layer of EOS — a governed, evolutionary, agent-readable project context organization.

## Core Principles

1. **Project-as-Code**: Every project has explicit identity, mission, scope, and ownership
2. **Governed Project Context**: `PROJECT.md` is the canonical entry point for every project
3. **Non-mutating**: Projects do not take over Work Core, do not create duplicate orchestrators
4. **Evolutionary**: Structure grows only when real needs emerge — no empty folders
5. **Agent-readable**: AI Agents can understand project context without reading the entire repository

## Structure

```
projects/
├── README.md                    # This file — Projects governance
├── main/
│   └── PROJECT.md               # EOS Main Project — umbrella platform project
└── templates/
    └── PROJECT.template.md      # Standard template for new projects
```

## Project Context Contract

Every project MUST have a `PROJECT.md` file with:
- YAML front matter with stable metadata
- Human-readable project mission and context
- Agent-readable governance boundaries
- References to canonical EOS Work, specifications, and evidence

## Relationship with EOS Core

| Component | Authority |
|-----------|-----------|
| `PROJECT.md` | Project context and scope |
| Work Core | Work identity, continuity, and execution |
| Evidence Registry | Verification and business acceptance |
| Connector Ecosystem | External provider integration |

## Governance

- **Change policy**: evidence-backed
- **Core mutation**: explicit-authorization only
- **Duplicate primitives**: prohibited
- **Duplicate orchestrators**: prohibited
- **Project lifecycle**: PROPOSED → DISCOVERY → APPROVED → ACTIVE → IN REVIEW → COMPLETED → ARCHIVED

## Adding New Projects

1. Copy `templates/PROJECT.template.md` to `projects/{project_key}/PROJECT.md`
2. Fill in all required metadata and context
3. Obtain explicit authorization from Business Owner
4. Register project reference in `projects/main/PROJECT.md`

## Key Design Decisions

- Projects are context organizers, not execution engines
- Work identity remains authoritative in Work Core
- Project status is derived from Work evidence, not stored in Markdown
- Structure evolves incrementally — no mass migration required

Everything Can Change. Work Remains.
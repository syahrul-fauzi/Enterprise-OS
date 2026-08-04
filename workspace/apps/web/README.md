## Professional Workspace Surface

`apps/web` is the canonical Professional Workspace surface for EOS proof slices.

Current proof routes:

- `GET /`
- `GET /requirements`
- `GET /api/session`
- `GET/POST /api/requirements`
- `GET/PATCH /api/requirements/:id`

Proof boundary:

- Reuses the existing `requirement-management` capability
- Reuses the existing `RequirementView` experience
- Bootstraps a workspace session for actor, tenant, and workspace context
- Hosts the minimum Requirement runtime needed by `RequirementWorkspace`
- Does not encode product-specific binding or product identity inside `apps/web`
- Keeps the experience surface pure and product-agnostic

## Staging Acceptance

When staging access is available, run:

```bash
node /root/Enterprise-OS/workspace/scripts/apps-web-staging-acceptance.mjs <staging-url>
```

The acceptance runbook is documented in:

- `decisions/EOS-APPS-WEB-STAGING-ACCEPTANCE-2026-08-04.md`

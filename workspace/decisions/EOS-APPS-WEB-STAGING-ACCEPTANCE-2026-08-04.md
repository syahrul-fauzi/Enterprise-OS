# EOS Apps/Web Staging Acceptance

## Purpose

Move the canonical `apps/web -> Requirement` slice from local proof to a real
staging environment without reopening architecture work.

This stage is explicitly for:

- deployability proof
- real browser journey proof
- staging-only issue discovery
- evidence capture from actual usage

This stage is explicitly not for:

- redesigning `apps/*`
- migrating `apps/lawyershub`
- introducing a binding framework
- introducing an auth abstraction
- broad platform hardening before real staging feedback

## Current Truth

Local verification is already green for the canonical Requirement slice:

- `pnpm --filter web check-types`
- `pnpm --filter web lint`
- `pnpm --filter web build`
- session bootstrap test
- Requirement API test
- local production smoke

The slice is deployable, but not yet public-production-ready because the current
workspace session still uses bootstrap context instead of real authentication
and tenant isolation.

## Staging Acceptance Scope

The staging acceptance slice covers:

1. Open workspace
2. Open Requirement
3. Create Requirement
4. Read Requirement
5. Update Requirement state
6. Controlled error path
7. Refresh / re-entry consistency
8. ExecutionContext header propagation
9. Runtime invocation evidence capture when enabled in staging

## Deploy Runbook

When Vercel access is available, use this order:

1. Ensure `apps/web` local gates are green:

```bash
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web build
```

2. Deploy to staging preview:

```bash
pnpm dlx vercel deploy --cwd /root/Enterprise-OS/workspace/apps/web
```

If the target project is already linked:

```bash
pnpm dlx vercel deploy --cwd /root/Enterprise-OS/workspace/apps/web --yes
```

If environment binding is required:

```bash
pnpm dlx vercel link --cwd /root/Enterprise-OS/workspace/apps/web
```

3. Run staging acceptance:

```bash
node /root/Enterprise-OS/workspace/scripts/apps-web-staging-acceptance.mjs <staging-url>
```

## Evidence To Capture

The staging report must show:

- workspace root returns `200`
- Requirement page returns `200`
- session context is emitted
- Requirement create returns persisted id
- Requirement read resolves the same entity
- Requirement update changes workflow state
- invalid payload returns controlled `400`
- refresh / search still returns the same requirement

If staging enables runtime invocation capture through
`EOS_RUNTIME_INVOCATION_EVIDENCE_PATH`, that path becomes the canonical audit
artifact for the slice.

## Current Blocker

Staging deploy was not executed in this session because remote access is not yet
available in the environment:

- MCP `deploy_to_remote` failed with an integration-side schema error
- `pnpm dlx vercel whoami` reported missing credentials
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` were not set

This is an access blocker, not an application blocker.

## Decision

Do not reopen architecture work.

The next step is to obtain staging deployment access and execute the acceptance
slice exactly as defined above. Only staging failures should drive the next
round of strengthening work.

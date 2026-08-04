# EOS Legacy to EOS Learning Map

## Purpose

Use legacy as a targeted learning source for the active EOS product slice:

```text
products/* -> apps/web -> Requirement -> acceptance -> launch
```

This is not a legacy migration program.

This map only captures lessons that can reduce the cost of launching the
current `apps/web -> Requirement` slice.

## Method

Decision rule for every legacy asset:

> Does this save work for the EOS product we are launching now?

If yes, classify it as:

- `REUSE`: keep the pattern as-is or nearly as-is
- `EXTRACT`: take the lesson, not the topology
- `AVOID`: proven complexity we should not reintroduce now
- `DEFER`: useful later, but not needed before staging/launch

## 1. Experience / UI-UX

### Evidence read

- `workspace-legacy/apps/web/src/app/page.tsx`
- `workspace-legacy/apps/web/src/app/error.tsx`
- `workspace-legacy/apps/web/src/app/global-error.tsx`
- `workspace-legacy/apps/web/test/e2e/workspace-shell.smoke.spec.ts`

### REUSE

- Product-grade error surface is better than raw technical fallback.
- Workspace shell proof checks visible navigation, heading, and session context,
  not just HTTP success.

### EXTRACT

- Extract the lesson that entry flow should feel intentional:
  route entry -> workspace shell -> user context -> core action.
- Extract the lesson that error UI should reassure the user, explain recovery,
  and provide a stable retry action.
- Extract the lesson that human-facing review should include layout, navigation,
  and visible context, not only API behavior.

### AVOID

- Avoid copying locale/subdomain/tenant routing complexity from legacy before
  staging proves it is needed.
- Avoid importing legacy product-coupled shell vocabulary into `apps/web`.

### DEFER

- Full tenant-branded shell and rich navigation contract can wait until
  Requirement is accepted as a client-facing slice.

## 2. Production / Deployment

### Evidence read

- `workspace-legacy/apps/web/Dockerfile`
- `workspace-legacy/apps/web/.dockerignore`
- `workspace-legacy/scripts/deploy/staging-smoke-proof.ts`

### REUSE

- A deploy target should have a post-deploy smoke proof, not just a build.
- Docker can be a useful packaging proof when it stays app-specific and minimal.

### EXTRACT

- Extract the pattern of `build -> start -> smoke`.
- Extract the idea that health/smoke verification should be a separate runtime
  step after deployment.
- Extract only the minimal Docker lesson: a production image should run the
  built app, not the whole monorepo toolchain.

### AVOID

- Avoid reusing the full legacy multi-stage Docker pipeline as-is. It carries
  baggage for Prisma, telemetry, and larger app concerns that the current
  Requirement slice does not need yet.
- Avoid reviving multi-service compose stacks before a real deployment need
  appears.

### DEFER

- Docker becomes worth doing when we need packaging parity or non-Vercel runtime
  proof. It is not a prerequisite for the current slice.

## 3. Acceptance / Testing

### Evidence read

- `workspace-legacy/apps/web/test/e2e/production-smoke.spec.ts`
- `workspace-legacy/apps/web/test/e2e/workspace-shell.smoke.spec.ts`
- `workspace-legacy/apps/web/test/e2e/SMOKE_TEST_DOCS.md`

### REUSE

- Smoke tests should validate real routes and real endpoints in a production-like
  runtime.
- Acceptance artifacts are more useful when they describe exact routes, exact
  expectations, and exact recovery paths.

### EXTRACT

- Extract the pattern of checking both product page availability and health/API
  availability.
- Extract the distinction between `mock-friendly test mode` and `real runtime
  smoke mode`.
- Extract the idea that smoke coverage should stay small and high-signal.

### AVOID

- Avoid importing the whole legacy Playwright matrix before the first remote
  acceptance run.
- Avoid expanding the acceptance gate into a broad QA program before the current
  slice reaches staging.

### DEFER

- Accessibility, performance, and broad end-to-end suites should wait until
  staging reveals which of them is actually blocking launch confidence.

## 4. Security / Session / Tenant

### Evidence read

- `workspace-legacy/apps/web/src/middleware.ts`
- `workspace-legacy/apps/web/src/api/ApiAuthMiddleware.ts`

### REUSE

- Session and routing boundaries belong at middleware/API boundaries, not inside
  feature UI components.
- Separate `app session` from `API gateway auth`; they solve different problems.

### EXTRACT

- Extract the lesson that request context normalization matters:
  origin, locale, redirect, and session context should be explicit.
- Extract the lesson that tenant/session complexity grows fast and should be
  introduced only when a real external environment requires it.

### AVOID

- Avoid legacy Clerk bypass modes, domain mapping, subdomain routing, and public
  route matrices for the current slice.
- Avoid turning staging bootstrap session into a permanent production auth
  decision.

### DEFER

- Real authentication, tenant isolation, and workspace provisioning should wait
  until staging or client review proves they are a launch blocker.

## 5. Observability / Evidence

### Evidence read

- `workspace-legacy/apps/web/src/instrumentation.ts`
- `workspace-legacy/apps/web/ops/SENTRY_ALERTS.md`
- `workspace-legacy/scripts/deploy/staging-smoke-proof.ts`

### REUSE

- Runtime instrumentation should be attached to real execution, not bolted on as
  documentation only.
- Alerting and audit language are more useful when they describe concrete
  failure classes.

### EXTRACT

- Extract the lesson that a launchable slice needs at least:
  runtime evidence, failure visibility, and a post-deploy verification artifact.
- Extract the lesson that error capture should produce operator-facing recovery
  signals, not silent failures.

### AVOID

- Avoid introducing full Sentry, PagerDuty, Slack alerting, or large telemetry
  infrastructure before staging proves the need.

### DEFER

- Full observability platform work should wait until real staging incidents show
  which signals are missing.

## Immediate EOS Impact

Based on the targeted legacy read, the highest-leverage next improvements for
`apps/web -> Requirement` are:

1. `EXTRACT`: polish the experience so it looks like a product entry, not a
   proof surface.
2. `EXTRACT`: add a minimal health endpoint and include it in runtime smoke.
3. `EXTRACT`: add product-grade error handling and visible recovery behavior.
4. `DEFER`: do not build Docker yet unless packaging parity becomes an actual
   blocker.
5. `DEFER`: do not import real auth/tenant complexity until staging proves it is
   required.

## Conclusion

Legacy is useful here as a cost-saving knowledge base, not as a runtime source
of truth.

The right move is:

```text
EOS Requirement
  -> targeted legacy extraction
  -> apply only launch-saving lessons
  -> deploy
  -> reality
  -> fix proven constraint
```

That keeps EOS moving toward launchable products without paying legacy
complexity twice.

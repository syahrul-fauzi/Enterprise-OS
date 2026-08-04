# EOS Staging Launch Rail Implementation

## Problem

EOS already proved semantic product binding for:

- `services-id`
- `lawyershub`
- `ilc`

But the repository still lacked a shared staging deployment rail that could run
one `apps/web` runtime behind one reverse proxy and expose three product
domains through the same operational path.

## Decision

Implement the minimum shared staging rail inside `workspace/`:

- `apps/web/Dockerfile`
- `infra/staging/compose.yaml`
- `infra/staging/Caddyfile`
- `infra/staging/.env.example`
- `scripts/staging-up.sh`
- `scripts/staging-down.sh`
- `scripts/staging-check.sh`
- root scripts:
  - `pnpm staging:up`
  - `pnpm staging:down`
  - `pnpm staging:check`

Also add minimal runtime support required by the rail:

- `apps/web/app/api/health/route.ts`
- product context propagation via request/response headers for host-routed
  product semantics
- product-aware acceptance support in `scripts/apps-web-staging-acceptance.mjs`

## Architectural Shape

```text
domain
  -> caddy
  -> apps/web
  -> requirement-management
  -> shared packages/capabilities
```

See also:

- `decisions/EOS-EXPERIENCE-PRODUCT-CAPABILITY-POSITIONING-2026-08-04.md`
  for the canonical boundary between thin apps, product context, capability,
  and experience composition.

Not used:

- per-product app duplication
- legacy multi-service topology
- separate deployment rails per product

## Verification

### Static and App-Level Verification

Passed:

```bash
pnpm --filter web exec node --import tsx --test \
  tests/session-api.test.ts \
  tests/requirement-api.test.ts \
  tests/health-api.test.ts \
  tests/professional-workspace-proof.test.tsx
```

Result:

- `10/10 PASS`

Passed:

```bash
pnpm --filter web build
```

Result:

- production build `PASS`

### Infra Configuration Verification

Passed:

```bash
docker compose --env-file infra/staging/.env.example -f infra/staging/compose.yaml config
docker run --rm \
  -e CADDY_EMAIL=admin@example.com \
  -e SERVICES_ID_DOMAIN=staging.services-id.com \
  -e LAWYERSHUB_DOMAIN=staging.lawyershub.id \
  -e ILC_DOMAIN=staging.indonesialawyersclub.id \
  -v /root/Enterprise-OS/workspace/infra/staging/Caddyfile:/etc/caddy/Caddyfile:ro \
  caddy:2.10.2-alpine \
  caddy validate --config /etc/caddy/Caddyfile
```

Result:

- compose config `VALID`
- Caddy config `VALID`

### Local Rail Verification

Passed on alternate local ports:

```bash
STAGING_HTTP_PORT=8088 STAGING_HTTPS_PORT=8448 pnpm staging:up
STAGING_HTTP_PORT=8088 STAGING_HTTPS_PORT=8448 \
STAGING_CHECK_BASE_URL=http://127.0.0.1:8088 \
pnpm staging:check
STAGING_HTTP_PORT=8088 STAGING_HTTPS_PORT=8448 pnpm staging:down
```

Observed result:

- docker image built successfully
- `web` container became healthy
- Caddy routed:
  - `staging.services-id.com`
  - `staging.lawyershub.id`
  - `staging.indonesialawyersclub.id`
- `staging:check` passed host-based health and session verification for all
  three domains
- `staging:check` also passed:
  - HTTP -> HTTPS redirect verification
  - local/internal TLS verification
  - security header verification on HTTPS responses
  - product resolution verification via routed headers on HTTPS
  - full local Requirement acceptance through Caddy for `lawyershub`

## Boundary

This implementation proves:

- one shared deployment rail can boot `apps/web`
- one reverse proxy can map three product domains into one runtime
- runtime can expose product semantics through routing headers without making
  `apps/web` product-aware in source structure
- the same rail can support:
  - local/internal TLS proof before public DNS exists
  - public DNS/TLS proof later on the same topology
- Requirement acceptance can run through the shared rail with product context,
  not only through direct local app execution

This implementation does **not** yet prove:

- public DNS is configured
- public TLS certificate issuance succeeds
- full browser acceptance via public staging host
- client-ready presentation per product

## Next Step

Move from local rail proof to VPS-backed staging proof:

1. provide public DNS for the first proof host set:
   - `services-id.com`
   - `lawyershub.id`
   - `staging.indonesialawyersclub.id`
2. replace placeholder email in `infra/staging/.env`
3. run `pnpm staging:up` on VPS
4. run `pnpm staging:check`
5. run full acceptance against reachable public staging host
6. perform human/client review

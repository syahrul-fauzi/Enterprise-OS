# EOS Staging Launch Map

## Objective

Define the minimum staging launch rail that can bring the first three EOS
products onto one VPS with one runtime model, one deployment pattern, and one
acceptance path.

This map answers only:

1. What products are in scope?
2. What domain does each product own?
3. What app entry does each product use?
4. What package/capability path does each product use?
5. What runtime/deployment commands are required?
6. What health and acceptance checks prove the launch rail works?

## Facts

### Current EOS Reality

- `products/services-id/product.binding.yaml` binds to `apps/web -> /requirements`
- `products/lawyershub/product.binding.yaml` binds to `apps/web -> /requirements`
- `products/ilc/product.binding.yaml` binds to `apps/web -> /requirements`
- `apps/web/workspace.manifest.ts` currently exposes only
  `requirement-management`
- local production build and acceptance for `apps/web -> Requirement` already
  passed
- current workspace has no explicit VPS launch rail yet:
  - no Dockerfile in `workspace/`
  - no compose file in `workspace/`
  - no reverse proxy config in `workspace/`

### Targeted Legacy Evidence Read

Reusable launch evidence found in `workspace-legacy`:

- `infra/compose/staging/docker-compose.yml`
  - proven compose-based staging pattern
  - includes health checks and restart policy
- `infra/nginx/staging.conf`
  - proven multi-domain reverse proxy pattern
  - includes security headers, TLS, and `/health` exposure
- `infra/compose/intake-mvp/Caddyfile`
  - proven lightweight reverse proxy pattern with automatic HTTPS
- `scripts/deploy/staging-env-readiness.ts`
  - useful pattern for env completeness validation
- `scripts/deploy/staging-smoke-proof.ts`
  - useful pattern for post-deploy smoke verification
- `release/*/manifest.json` and `release/*/identity.json`
  - product/domain inventory evidence
- `packages/adapters/src/health.ts`
  - useful health aggregation pattern
- `packages/adapters/src/middleware/security-headers.ts`
  - useful security header baseline

Not reusable as-is for EOS launch rail:

- multi-service legacy app topology (`web + api + ai gateway + worker + db + redis`)
- product-specific legacy app routing assumptions
- release proof artifacts that depend on legacy app inventory
- staging scripts that assume files such as
  `RELEASE_CANDIDATE_MANIFEST.json` already exist

## Decision

Use a **single EOS runtime rail** for the first VPS staging launch:

```text
DNS
  -> reverse proxy
  -> apps/web runtime
  -> shared capability path
  -> product binding semantics
```

Recommended first implementation shape:

- **Docker Compose** to manage staging runtime on VPS
- **Caddy** as first reverse proxy for the initial EOS staging rail
- keep **Nginx legacy config as reference**, not as the first default

Why Caddy first:

- EOS currently serves one shared web runtime, not the old multi-upstream stack
- automatic HTTPS reduces initial ops cost
- host-based routing for three domains is simple
- this keeps the first rail small enough to prove launch leverage quickly

Why Compose still matters:

- gives one repeatable VPS launch command
- aligns with proven legacy ops pattern
- leaves room to add sidecars later only if staging proves the need

## Launch Map

| Product | Primary Domain | Recommended Staging Host | Entry App | Entry Route | Capability Path | Current Launch Status |
| --- | --- | --- | --- | --- | --- | --- |
| `services-id` | `services-id.com` | `staging.services-id.com` | `apps/web` | `/requirements` | `apps/web -> capabilities/requirement-management -> packages/*` | semantic binding proven, client-ready launch not yet proven |
| `lawyershub` | `lawyershub.id` | `staging.lawyershub.id` | `apps/web` | `/requirements` | `apps/web -> capabilities/requirement-management -> packages/*` | semantic binding proven, client-ready launch not yet proven |
| `ilc` | `indonesialawyersclub.id` | `staging.indonesialawyersclub.id` | `apps/web` | `/requirements` | `apps/web -> capabilities/requirement-management -> packages/*` | semantic binding proven, client-ready launch not yet proven |

Notes:

- `lawyershub` and `ilc` staging hostname patterns are evidenced in legacy
  reverse proxy configuration
- `staging.services-id.com` is the recommended EOS staging convention so the
  three-product rail stays symmetrical; it still needs explicit DNS/proxy setup

## Runtime and Deployment Commands

### Commands Proven Today

Install:

```bash
pnpm install
```

Build:

```bash
pnpm --dir /root/Enterprise-OS/workspace --filter web build
```

Run production locally:

```bash
pnpm --dir /root/Enterprise-OS/workspace --filter web start --port 3001
```

Acceptance:

```bash
node /root/Enterprise-OS/workspace/scripts/apps-web-staging-acceptance.mjs http://127.0.0.1:3001
```

### Commands Missing Today But Required For VPS Rail

Target contract for first EOS staging rail:

```bash
pnpm install
pnpm build
pnpm staging:up
```

Where `pnpm staging:up` should eventually wrap:

- compose up for `apps/web`
- reverse proxy boot
- host/domain mapping
- environment file load

This command does **not** exist yet. It is the next infrastructure slice to
build.

## Health and Acceptance Checks

### Current Checks Already Available

Executable acceptance exists at:

- `workspace/scripts/apps-web-staging-acceptance.mjs`

Current proof path:

1. `GET /`
2. `GET /api/session`
3. `GET /requirements`
4. `POST /api/requirements`
5. `GET /api/requirements/:id`
6. `PATCH /api/requirements/:id`
7. search/re-entry
8. controlled error path

### Launch Rail Checks Required On VPS

Minimum required staging checks:

1. DNS resolves to VPS for each staging host
2. HTTPS terminates successfully at reverse proxy
3. reverse proxy routes all three hosts to the same EOS runtime
4. `GET /` returns `200`
5. `GET /requirements` returns `200`
6. `GET /api/session` returns authenticated workspace bootstrap
7. `node scripts/apps-web-staging-acceptance.mjs <base-url>` passes

### Health Endpoint Status

Current EOS reality:

- no dedicated `/health` endpoint exists yet in `apps/web`

Implication:

- initial VPS proof can use `GET /` and `GET /requirements` as runtime reachability checks
- a dedicated lightweight health endpoint is a good next extraction from legacy,
  but is **not yet required to finish this map**

## Reuse / Extract / Avoid

### REUSE

- compose-based staging boot pattern
- reverse proxy host routing
- TLS/security header baseline
- env readiness check concept
- post-deploy smoke proof concept
- product/domain inventory from legacy release artifacts

### EXTRACT

- one minimal Compose file for EOS staging
- one Caddyfile for three hostnames to one runtime
- one env template for VPS staging
- one lightweight readiness script
- one smoke wrapper around `apps-web-staging-acceptance.mjs`

### AVOID

- reviving legacy multi-container topology
- per-product app duplication
- forcing API/worker/redis into the first staging rail without proof
- copying legacy release pipeline whole

### DEFER

- full observability stack
- production-grade auth/IAM
- database/queue sidecars unless staging proves they are required
- Nginx hardening parity if Caddy staging is sufficient for first launch

## Architectural Boundary

This map does **not** claim:

- the three products are already client-ready
- product-specific presentation is already differentiated in `apps/web`
- staging deployability is already complete

This map only proves that EOS now has enough evidence to build one shared VPS
launch rail instead of cloning three separate apps.

## Recommended Next Execution Slice

Build the smallest shared staging rail:

1. add one `apps/web` Dockerfile in `workspace/`
2. add one staging compose file in `workspace/`
3. add one Caddy reverse proxy config for three hostnames
4. add one staging env template
5. add one `pnpm staging:up` command
6. run acceptance against one reachable staging host first

If that works, EOS earns real leverage evidence:

```text
product binding
  -> shared runtime
  -> shared deploy rail
  -> shared acceptance
  -> multiple launchable products
```

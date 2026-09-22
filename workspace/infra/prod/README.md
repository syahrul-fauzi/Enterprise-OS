# EOS Staging Rail

This directory contains the shared staging launch rail for the first EOS public
proof.

Current topology:

```text
DNS
  -> Caddy
  -> apps/web
  -> product context
  -> shared capabilities/packages
```

Current product hosts:

- `services-id.com`
- `lawyershub.id`
- `indonesialawyersclub.id`

## Purpose

Prove that one shared staging rail can expose multiple product contexts safely
through the same runtime without creating three separate deployment stacks.

## Files

- `compose.yaml`
  - boots `apps/web` and `caddy`
- `Caddyfile`
  - handles HTTP, HTTPS, redirect, security headers, and host-based product
    context
- `.env.example`
  - baseline environment contract for local proof and VPS proof

## Modes

### 1. Local Rail Proof

Used before public DNS exists.

Recommended:

```bash
STAGING_HTTP_PORT=8088 STAGING_HTTPS_PORT=8448 pnpm staging:up
STAGING_HTTP_PORT=8088 STAGING_HTTPS_PORT=8448 \
STAGING_CHECK_BASE_URL=http://127.0.0.1:8088 \
STAGING_TLS_INSECURE=1 \
pnpm staging:check
STAGING_HTTP_PORT=8088 STAGING_HTTPS_PORT=8448 pnpm staging:down
```

What this proves:

- Caddy boots
- shared runtime boots
- HTTP works
- HTTP redirects to HTTPS
- HTTPS works with internal TLS
- security headers exist
- host-based product context resolves
- Requirement acceptance runs through the shared rail

### 2. Public VPS Proof

Used after public DNS is ready.

## VPS Preconditions

Before running public proof:

1. VPS is reachable from the public internet
2. ports `80` and `443` are open
3. each staging domain resolves to the VPS public IP
4. repository is present on the VPS
5. Docker and Docker Compose are available on the VPS

## DNS Preconditions

Each hostname must resolve to the VPS public IP:

- `services-id.com`
- `lawyershub.id`
- `indonesialawyersclub.id`

Simple check:

```bash
getent hosts services-id.com
getent hosts lawyershub.id
getent hosts indonesialawyersclub.id
```

## Public Staging Setup

From workspace root:

```bash
cp infra/staging/.env.example infra/staging/.env
```

Then update at least:

- `CADDY_TLS`
  - use a real operator email on VPS, for example `ops@your-domain.tld`
- `SERVICES_ID_DOMAIN`
- `LAWYERSHUB_DOMAIN`
- `ILC_DOMAIN`
- `STAGING_REQUIRE_PUBLIC_TLS=1`
- `STAGING_TLS_INSECURE=0`
- `STAGING_ACCEPTANCE_PRODUCT_ID`
  - choose the product you want to use for full acceptance proof first
- `STAGING_ACCEPTANCE_BASE_URL`
  - must match the public HTTPS host for that product

Recommended first public proof:

```dotenv
CADDY_TLS=ops@your-domain.tld
SERVICES_ID_DOMAIN=services-id.com
LAWYERSHUB_DOMAIN=lawyershub.id
ILC_DOMAIN=staging.indonesialawyersclub.id
ILC_DOMAIN=indonesialawyersclub.id
STAGING_REQUIRE_PUBLIC_TLS=1
STAGING_TLS_INSECURE=0
STAGING_ACCEPTANCE_PRODUCT_ID=lawyershub
STAGING_ACCEPTANCE_BASE_URL=https://lawyershub.id
```

## Public Proof Commands

```bash
pnpm staging:convergence
pnpm staging:up
pnpm staging:check
```

If needed:

```bash
pnpm staging:down
```

## What `pnpm staging:check` Verifies

### Local or public rail

1. HTTP is reachable
2. HTTP redirects to HTTPS
3. HTTPS is reachable
4. Caddy routes the correct host
5. product context resolves correctly
6. `/api/health` responds
7. `/api/session` returns workspace context
8. security headers exist

### Public proof only

9. public DNS resolves
10. public TLS works
11. Requirement acceptance succeeds for the selected product

### Convergence probe

Before public proof, use:

```bash
pnpm staging:convergence
```

This distinguishes:

- `canonical_current_build`
- `eos_runtime_old_surface`
- `unreachable`

and writes:

- `portfolios/evidence/verification/enterprise/public-convergence-report.json`

## Expected Public Proof Outcome

For the selected acceptance product, the rail should prove:

```text
DNS
  -> HTTPS
  -> Caddy
  -> apps/web
  -> product context
  -> Requirement flow
  -> create/read/update/re-entry/error
```

## Notes

- `CADDY_TLS=internal` is for local proof only
- the rail is intentionally shared today; do not split runtimes unless product
  reality proves the need
- product identity belongs in `products/*`, not in the runtime topology
- `staging.indonesialawyersclub.id` is now a deprecated legacy reference; use
  `indonesialawyersclub.id` as the canonical public ILC surface

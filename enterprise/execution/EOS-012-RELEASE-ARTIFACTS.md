# EOS-012 Release Artifacts

Release: `EOS RC v1`

Capability scope:
- `EOS-005` API Platform
- `EOS-006` Enterprise UI
- `EOS-007` Agent Orchestration
- `EOS-008` Observability
- `EOS-009` Security Hardening
- `EOS-010` Connector Ecosystem
- `EOS-011` Knowledge Graph

Runtime surfaces:
- `workspace/apps/lawyershub`
- `workspace/apps/docs`

API surfaces:
- `GET /api/platform`
- `POST /api/platform/query`
- `GET /api/orchestration`
- `GET /api/orchestration/[id]`
- `POST /api/orchestration/[id]/dispatch`
- `GET /api/observability/logs`
- `GET /api/observability/metrics`
- `GET /api/observability/traces`
- `GET /api/connectors`
- `GET /api/connectors/[id]`
- `POST /api/connectors/[id]/sync`
- `GET /api/graph`
- `GET /api/graph/[id]`
- `GET /api/evidence`
- `GET /api/evidence/[id]`
- `GET /api/requirements`
- `GET /api/requirements/[id]`
- `GET /api/rtm`
- `GET /api/rtm/[id]`
- `GET /api/workflows`
- `GET /api/workflows/[id]`
- `POST /api/workflows/[id]/execute`
- `GET /api/cases`
- `GET /api/cases/[id]`

Security baseline:
- centralized authorization enforced for platform, orchestration, observability, connector, and graph routes
- dev API key path validated by automated tests
- scoped permissions added for `connectors.read`, `connectors.sync`, and `graph.read`

Verification evidence:
- `pnpm --dir ./workspace lint`
- `pnpm --dir ./workspace check-types`
- `pnpm --dir ./workspace build`
- `pnpm --dir ./workspace exec node --import tsx --test apps/lawyershub/tests/*.test.ts apps/lawyershub/tests/*.test.tsx capabilities/*/tests/*.test.ts`

Verification result:
- lint: PASS
- check-types: PASS
- build: PASS
- tests: PASS (`35/35`)

Known non-blocking notes:
- Next.js Turbopack root warning removed by explicit workspace root config
- evidence registry filesystem scan narrowed to repository-local static roots for production build tracing

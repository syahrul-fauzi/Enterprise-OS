## LawyersHub Experience Surface

`apps/lawyershub` is a legacy product-coupled host retained while non-Requirement
surfaces and APIs are inventoried and migrated.

Current capabilities:

- `legal-case`
- `legal-document`
- `requirements-traceability-matrix` (API delivery surface)
- `evidence-registry` (API delivery surface)
- `workflow-engine` (API delivery surface)
- `api-platform` (authenticated gateway surface)
- `agent-orchestration` (dispatch runtime surface)
- `observability` (logs, metrics, traces surface)
- `security-hardening` (authz and secret enforcement)
- `connector-ecosystem` (export and sync runtime surface)
- `knowledge-graph` (graph query surface)

Current API routes:

- `GET/POST /api/cases`
- `GET/PATCH/DELETE /api/cases/:id`
- `GET /api/rtm`
- `GET /api/rtm/:id`
- `GET /api/evidence`
- `GET /api/evidence/:id`
- `GET /api/connectors`
- `GET /api/connectors/:id`
- `POST /api/connectors/:id/sync`
- `GET /api/graph`
- `GET /api/graph/:id`
- `GET /api/workflows`
- `GET /api/workflows/:id`
- `POST /api/workflows/:id/execute`
- `GET /api/orchestration`
- `GET /api/orchestration/:id`
- `POST /api/orchestration/:id/dispatch`
- `GET /api/observability/logs`
- `GET /api/observability/metrics`
- `GET /api/observability/traces`
- `GET /api/platform`
- `POST /api/platform/query`

Current UI routes:

- `GET /`
- `GET /platform`
- `GET /cases`
- `GET /documents`

Migrated to canonical surface:

- Requirement UI/runtime now lives in `apps/web`
- Product binding proof resolves `services-id` and `ilc` to `apps/web`

Authenticated API Platform header:

- `x-eos-api-key: eos-dev-key`

Security environment variables:

- `EOS_API_KEY`
- `EOS_API_KEY_SCOPES`
- `EOS_STRICT_AUTH`

## Getting Started

Run the development server:

```bash
yarn dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to use the current workspace runtime.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

The workspace manifest lives in `workspace.manifest.ts` and is the canonical app-level registry adapter for mounted capabilities.

# EOS-012 Rollout Checklist

Status: `READY`

- [x] Workspace lint green
- [x] Workspace typecheck green
- [x] Workspace build green
- [x] LawyersHub API and capability regression suite green
- [x] Core runtime routes protected by centralized authorization
- [x] Connector and graph routes protected by scoped authorization
- [x] Release artifact inventory captured
- [x] RC verification commands recorded
- [x] Production UI surfaces build successfully
- [x] Docs app builds successfully
- [x] Evidence registry build tracing narrowed to static scan roots
- [x] Turbopack workspace root set explicitly for app builds

Smoke sequence:
1. Open `/platform` and verify capability sections render.
2. Query `GET /api/platform` with valid API key.
3. Query `GET /api/connectors` with valid API key.
4. Execute `POST /api/connectors/[id]/sync` with valid API key.
5. Query `GET /api/graph` with valid API key.
6. Query `GET /api/observability/metrics` with valid API key.
7. Query `GET /api/evidence` and verify records resolve.

Rollback trigger:
- any failing regression in `lint`, `check-types`, `build`, or automated test suite
- authorization regression on protected routes
- route build failure in `lawyershub` or `docs`

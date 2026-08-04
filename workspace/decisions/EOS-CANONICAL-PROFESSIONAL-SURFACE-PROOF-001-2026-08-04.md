Problem
-------
EOS needs a canonical Experience Layer slice on `apps/web` that proves a pure
professional surface can expose shared requirement capability without embedding
product identity or product-binding logic inside `apps/*`.

Decision
--------
Create a thin, product-agnostic `apps/web` Professional Workspace surface that:

- exposes `/` as the generic professional experience entry
- exposes `/requirements` as the shared requirement route
- reuses the existing `RequirementView`
- keeps all business logic inside the existing requirement capability

Implementation
--------------
- Added a minimal `apps/web` Next.js surface
- Added:
  - `/`
  - `/requirements`

Architecture Conformance
------------------------
- `LAW-EXP-001`: app stays presentation-only
- `LAW-EXP-002`: no domain logic added to `apps/web`
- `LAW-EXP-003`: `apps/web` consumes existing requirement capability
- `LAW-EXP-004`: no new execution path introduced
- `LAW-EXP-005`: no governance bypass introduced

Verification
------------
- `pnpm --filter web check-types`
- `pnpm --filter web lint`
- `pnpm --filter web exec node --import tsx --test ./tests/professional-workspace-proof.test.tsx`

Claim Boundary
--------------
This is a local first implementation for the canonical Professional Workspace
surface. It proves that `apps/web` can remain a pure experience surface while
consuming the shared requirement capability. It does not claim a product binding
engine and does not treat `apps/web` as a product-aware runtime.

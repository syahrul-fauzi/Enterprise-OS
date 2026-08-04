Problem
-------
LawyersHub already declared navigation intent for `/cases`, `/documents`, and `/requirements`, and the underlying capabilities already had implementation and experience views. However, the product only exposed `/` and `/platform`, so those launch-adjacent surfaces were not directly reachable as explicit product routes.

Existing State
--------------
- Existing capability owners:
  - `legal-case` -> `workspace/capabilities/legal-case/*`
  - `legal-document` -> `workspace/capabilities/legal-document/*`
  - `requirement-management` -> `workspace/capabilities/requirement-management/*`
- Existing experience surfaces:
  - `CaseView`
  - `DocumentView`
  - `RequirementView`
- Existing product navigation intent:
  - `apps/lawyershub/composition.descriptor.ts` already pointed to `/cases`, `/documents`, and `/requirements`
- Existing product routes before change:
  - `/`
  - `/platform`

Decision
--------
COMPOSE existing capability experience surfaces into explicit LawyersHub product routes.

Implementation
--------------
- Added `apps/lawyershub/app/cases/page.tsx`
- Added `apps/lawyershub/app/documents/page.tsx`
- Added `apps/lawyershub/app/requirements/page.tsx`
- Reused existing capability views; no new package, runtime, or capability boundary was created
- Updated `apps/lawyershub/tests/enterprise-ui.test.tsx`
- Updated `apps/lawyershub/README.md`

Verification
------------
- `pnpm lint` in `workspace/apps/lawyershub` -> PASS
- `pnpm check-types` in `workspace` -> PASS
- `pnpm --filter lawyershub exec node --import tsx --test "/root/Enterprise-OS/workspace/apps/lawyershub/tests/enterprise-ui.test.tsx"` -> PASS

Product Behavior
----------------
- LawyersHub now exposes direct product routes for:
  - `/cases`
  - `/documents`
  - `/requirements`
- Each route reuses an existing canonical experience surface instead of introducing custom product logic.

Three-Product Leverage
----------------------
- Behavior: explicit launch-ready routes now exist for case, document, and requirement workflows
- Reuse: uses existing capability implementation and experience surfaces with no new boundary
- Surface: the product route pattern is reusable by additional products
- Boundary: no new package or platform boundary was required
- Next Cost: future products can compose the same experience surfaces more cheaply

Remaining Limitation
--------------------
- This slice exposes direct product routes in LawyersHub only; reuse into Product 2 and Product 3 still requires selecting their next launch surfaces.

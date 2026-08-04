Problem
-------
EOS needs a visible launch proof that three product identities can be introduced and
can reach a real shared experience without creating a new app, runtime, package, or
duplicated requirement core implementation.

Interpretation Boundary
-----------------------
For this proof:

- Canonical Product Model != local proof binding != Experience Surface
- `apps/lawyershub` is treated as an existing Experience Runtime Host, not as the
  canonical product model itself
- `lawyershub`, `services-id`, and `indonesialawyersclub` remain product identities
  already recognized elsewhere in workspace SSOT and portfolio evidence
- `product-launch-bindings.ts` is only a local proof-binding mechanism for this app host
  and does not claim platform-wide authority

Decision
--------
Use the existing `apps/lawyershub` Experience Runtime Host as the single proof substrate
and add local product-bound Experience Surfaces for:

- `lawyershub`
- `services-id`
- `indonesialawyersclub`

The proof keeps:

- requirement capability implementation = shared
- requirement service/contracts = shared
- requirement workspace/view = shared
- requirement API behavior = shared

Only product-local values vary:

- product identity
- introduction copy
- purpose/description
- starter experience labels
- route binding

Implementation
--------------
- Added `apps/lawyershub/product-launch-bindings.ts` as the local proof-binding source.
- Added product-bound Experience Surface routes:
  - `/products`
  - `/products/[productId]`
  - `/products/[productId]/requirements`
- Reused `RequirementView` directly from
  `capabilities/requirement-management/experience/views/RequirementView.tsx`.

Architecture Conformance
------------------------
- `LAW-EXP-001` Apps are thin: the proof only adds presentation, routing, and local
  descriptive binding values inside `apps/lawyershub`.
- `LAW-EXP-002` No domain logic inside apps: no requirement business rules were moved
  or reimplemented in app routes or components.
- `LAW-EXP-003` Apps consume capabilities: the proof reuses the existing
  `RequirementView` and requirement capability implementation.
- `LAW-EXP-004` ExecutionContext is mandatory: this proof does not alter the existing
  action execution path or governance-aware API/runtime chain.
- `LAW-EXP-005` Governance cannot be bypassed: the proof adds no direct state mutation
  path outside the existing requirement API behavior.

Verification
------------
- `pnpm --filter lawyershub check-types` -> PASS
- `pnpm --filter lawyershub lint` -> PASS
- `pnpm --filter lawyershub exec node --import tsx --test ./tests/three-product-launch-proof.test.tsx` -> PASS

Evidence
--------
The repo now contains visible product-bound Experience Surfaces on one existing
Experience Runtime Host, with local proof binding isolated in `apps/lawyershub` and
no new package/runtime/capability introduced for the proof.

Remaining Limitation
--------------------
This proof is currently hosted inside `apps/lawyershub` and does not claim:

- a new canonical Product Model
- a platform-wide Product Binding mechanism
- independent runtime hosts for `services-id` or `indonesialawyersclub`

It proves only that an existing Experience Layer runtime host can expose multiple
product-bound Experience Surfaces and replay a shared Requirement experience on the
same EOS core without core duplication.

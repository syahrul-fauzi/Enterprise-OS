Problem
-------
EOS needs evidence that one existing experience can serve multiple product identities
without duplicating capability logic, experience implementation, runtime, or package
boundaries. The current local workspace is the only execution source of truth.

Scope
-----
Replay Proof #001 targets the existing `Requirement` experience chain:

- `requirement-management` capability
- `RequirementView`
- `RequirementWorkspace`
- existing requirement API routes
- existing app host binding path in `apps/lawyershub`

Facts
-----
- `defineWorkspace` is a backward-compatible alias for `defineCapabilityBinding`.
- `apps/lawyershub/workspace.binding.ts` currently binds a capability aggregate, not a mature
  product-binding model.
- `apps/lawyershub/workspace.manifest.ts` mounts the requirement capability by wiring:
  - capability descriptor
  - experience view
  - implementation commands/queries/services
- `apps/lawyershub/composition.descriptor.ts` is still product-coupled and carries:
  - product/workspace id
  - product/workspace name
  - shell layout id/name
  - navigation id/name
  - route hrefs
  - slot defaults
  - required capabilities
- `RequirementView` is a thin wrapper around `RequirementWorkspace`.
- `RequirementWorkspace` talks only to `/api/requirements` and `/api/requirements/:id`
  and does not contain product identity references.
- Requirement capability contracts and service are generic and do not mention
  `lawyershub`, `services-id`, or `ilc`.
- `packages/compositions/legal-workspace/metadata.yaml` declares reuse targets:
  `lawyershub`, `services-id`, `ilc`.

Observed Product Coupling
-------------------------
The current coupling is not in requirement core logic. It is concentrated in the
product host binding layer:

- `lawyershub` identity in `workspace.binding.ts`
- `lawyershub.workspace.default`
- `LawyersHub Workspace`
- `layout::lawyershub-shell`
- `LawyersHub Shell`
- `nav::lawyershub-primary`

This means the likely replay pressure is in binding/configuration vocabulary, not in
capability or experience implementation.

Core Experience Boundary
------------------------
The following assets are replay candidates and should remain product-agnostic:

- `capabilities/requirement-management/experience/views/RequirementView.tsx`
- `capabilities/requirement-management/experience/workspaces/RequirementWorkspace.tsx`
- `capabilities/requirement-management/experience/components/RequirementCard.tsx`
- `capabilities/requirement-management/implementation/service.ts`
- `capabilities/requirement-management/implementation/contracts/requirement.contracts.ts`
- `apps/lawyershub/app/api/requirements/route.ts`
- `apps/lawyershub/app/api/requirements/[id]/route.ts`

Binding Variables To Isolate
----------------------------
Replay across product identities appears to require only declarative variation in:

- product/workspace id
- display name
- shell layout id/name
- navigation id/name
- route membership
- default mounted experience
- branding copy
- possibly permission defaults if products diverge later

Replay Claim Boundary
---------------------
This proof does NOT claim that `services-id` or `ilc` are executable product shells today.
It claims only that the local workspace provides evidence that the Requirement experience
core is already product-agnostic enough to be replayed if the existing binding mechanism
can represent product-specific variables without copying core implementation.

Decision
--------
For Replay Proof #001:

- REUSE existing requirement capability
- REUSE existing requirement experience
- REUSE existing requirement API shape
- ADAPT existing binding/composition vocabulary
- DO NOT create a new package
- DO NOT create a new runtime
- DO NOT create a new capability
- DO NOT treat GitHub draft specifications as local execution truth

Extraction Pressure
-------------------
Current evidence does NOT justify:

- `packages/experience-runtime`
- `packages/platform-sdk`
- `packages/requirement-sdk`
- `packages/experience-contracts`

The strongest current pressure is instead:

- isolate product-specific binding variables from `lawyershub`-coupled descriptor values
- prove declarative replay for `services-id` and `ilc`

Next Verification Target
------------------------
The next smallest proof is to show that `Requirement` can be represented as:

same capability
same experience
same runtime/API
different product binding variables

for:

- `lawyershub`
- `services-id`
- `ilc`

without core-code duplication.

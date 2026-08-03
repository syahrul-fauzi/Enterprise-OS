# EOS Layered Domain Architecture

Status: ACTIVE
Version: 2.0

## Principle

EOS is governed through a layered domain model:

1. Governance Domain
2. Capability Domain
3. Experience Domain
4. Product Domain

These domains must remain distinct. Each domain has its own composition artifact, output contract, and runtime responsibility.

EOS is no longer only a capability platform. At architectural maturity, EOS operates as an `Enterprise Composition Platform` composed of governance, deployment, product, experience, and capability platforms. With governed catalogs and reusable portfolio assets, this evolves further into an `Enterprise Composition Ecosystem`.

Non-domain identities:
- `Enterprise Composition Platform` is the architectural identity of EOS, not an additional domain.
- `Enterprise Composition Ecosystem` is the long-term vision and portfolio framing, not an additional runtime layer.
- `Enterprise Control Plane` is a cross-domain orchestrator, not a sixth domain.

Factory rule:
- EOS is a composition factory for products.
- EOS is not the product itself.
- Products such as `services-id.com`, `lawyershub.id`, and `indonesialawyersclub.id` consume EOS; they are not EOS.

## Cross-Domain Orchestration

EOS v2 introduces an `Enterprise Control Plane` as a cross-domain orchestrator.

It is not a sixth domain.

It operates across the existing layered domains by:
- reading each domain SSOT
- coordinating planners before composition
- executing composers in dependency order
- validating constitutional rules
- enforcing qualification and promotion
- coordinating lifecycle and observability across domains

Responsibility split:
- Governance defines rules
- Enterprise Control Plane executes rules
- Deployment distributes validated outputs

Kernel modules:
- `SSOT Registry`
- `Dependency Graph Engine`
- `Policy and Constitution Engine`
- `Composition Engine`
- `Qualification Engine`
- `Promotion and Release Engine`
- `Observability and Audit Engine`

## Planned Extension

After Product Platform stabilizes, EOS may be extended with a fifth domain:

5. Deployment Domain

This future domain owns how a product is packaged and executed on target environments without changing Product, Experience, or Capability logic.

Canonical artifact:
- `deployment.yaml`

Runtime model:
- `Deployment Planner`
- `Deployment Composer`
- `Deployment Runtime`

## Domain Execution Pattern

Every domain follows the same execution pattern:

```text
SSOT
    ->
Planner
    ->
Composer
    ->
Runtime
    ->
Deployment
```

Planner responsibilities:
- dependency selection
- optimization
- compatibility checking
- conflict resolution
- cost estimation
- topology planning

## Atomicity Rule

Leverage must come from atomic reusable building blocks before larger experiences or products are introduced.

Preferred composition order:

```text
UI Primitive
    ->
Business Primitive
    ->
Capability
    ->
Experience Module
    ->
Experience Surface
    ->
Product Definition
    ->
Product Instance
    ->
Deployment
```

Examples of UI primitives:
- sidebar
- topbar
- breadcrumb
- navigation
- notification
- widget
- search
- command
- panel
- inspector

Examples of business primitives:
- identifier
- money
- address
- person
- organization
- time-range
- approval-status
- lifecycle
- attachment
- comment

Examples of experience modules:
- approval-inbox
- search
- detail-view
- timeline
- wizard
- monitoring
- knowledge-explorer
- ai-chat

Module rule:
- Experience Module is an experience pattern, not a package boundary and not a unique surface.
- One experience pattern may render through multiple surfaces such as table, kanban, timeline, inbox, graph, or calendar.

Composition asset rule:
- Composition must be treated as a reusable artifact, not only as a runtime process.
- Reusable compositions may be inherited, extended, or overridden by higher layers while preserving domain boundaries.

Anti-pattern:
- building large product-specific workspaces before stabilizing reusable experience atoms
- turning Experience Domain into a giant UI framework
- embedding reusable business logic back into product code

## Complexity Admission Rule

Every new artifact must prove that it reduces implementation complexity, not only that it increases conceptual expressiveness.

Admission test:
1. does it reduce code duplication?
2. does it increase reuse?
3. does it simplify composition?
4. does it reduce maintenance burden?

If the answer is `no` to all four, the concept must not be introduced as a new domain, runtime, or public specification.

## Leverage Metric

EOS should measure leverage through composition reuse.

Primary metric:
- `Composition Leverage Ratio (CLR) = reused capabilities / new capabilities`

Supporting targets:
- capability reuse ratio >= 80% for mature products
- experience module reuse ratio >= 70%
- surface reuse ratio >= 60%

## Dependency Direction

All dependencies must flow downward:

```text
Governance
    ->
Product
    ->
Experience
    ->
Capability
```

Extended future dependency direction:

```text
Governance
    ->
Deployment
    ->
Product
    ->
Experience
    ->
Capability
```

Fundamental rule:

> Each domain may depend only on the domain below it.

Consequences:
- Capability Domain must not know Experience, Product, or Deployment concerns.
- Experience Domain may know Capability, but must not know Product or Deployment concerns.
- Product Domain may know Experience, but must not bind raw Capability internals directly.
- Deployment Domain may know Product, Experience, and Capability outputs only for delivery concerns.
- Governance Domain defines policies, qualification rules, promotion criteria, and constitutional controls for all lower domains.

## Domain Model

### 1. Governance Domain

Purpose:
- define constitutional rules
- define policy and compliance constraints
- define qualification and promotion gates
- define lifecycle and approval rules
- define certification, versioning, and release governance

Output:
- `Governance Contract`

Canonical artifacts:
- `governance.yaml`
- policy
- compliance
- approval
- lifecycle
- certification
- versioning
- promotion
- qualification gates

Runtime model:
- `Governance Planner`
- `Governance Composer`
- `Governance Runtime`

### 2. Capability Domain

Purpose:
- define what EOS can do
- own business logic
- own policies
- own workflow
- own knowledge and evidence semantics
- own security and observability behavior

Output:
- `Capability Contract`

Canonical artifacts:
- `capability.yaml`
- dependency graph
- contracts
- workflows

Runtime model:
- `Capability Planner`
- `Capability Composer`
- `Capability Runtime`

### 3. Experience Domain

Purpose:
- define how capabilities are consumed through interaction channels
- compose capability bindings into reusable surfaces
- own layout, navigation, permissions, routing, and interaction model

Output:
- `Experience Contract`

Canonical artifacts:
- `experience.yaml`
- navigation model
- layout model
- permissions model
- interaction model
- surface contracts

Runtime model:
- `Experience Planner`
- `Experience Composer`
- `Experience Runtime`

### 4. Product Domain

Purpose:
- define what is packaged, deployed, licensed, and marketed
- compose experiences into deployable products
- own branding, packaging, deployment profile, and enabled experiences

Output:
- `Deployable Product`

Canonical artifacts:
- `product.yaml`
- branding
- licensing
- packaging
- deployment profile
- enabled experiences

Runtime model:
- `Product Planner`
- `Product Composer`
- `Product Runtime`

## Composition Flow

```text
Capabilities
    ->
Capability Composition
    ->
Experience Composition
    ->
Experience Surfaces
    ->
Product Composition
    ->
Deployable Product
```

Future extended flow:

```text
Governance Rules
    ->
Capabilities
    ->
Capability Composition
    ->
Experience Composition
    ->
Experience Surfaces
    ->
Product Composition
    ->
Deployable Product
    ->
Deployment Composition
    ->
Target Environment
```

## Architectural Rules

1. Governance Domain governs all lower domains through contracts, gates, and constitutional rules.
2. Capability Domain must not depend on Product or Deployment concerns.
3. Experience Domain must not duplicate capability business logic.
4. Product Domain must compose experiences, not reimplement capability bindings.
5. Experience Surface is a deployment target, not merely a UI.
6. One capability may be exposed through multiple surfaces without changing core business logic.
7. Domain dependency direction must remain `Governance -> Product -> Experience -> Capability`, with future extension `Governance -> Deployment -> Product -> Experience -> Capability`.
8. Enterprise Control Plane is an orchestrator across domains, not a replacement for Governance Domain and not an additional business domain.
9. Enterprise Control Plane must be implemented as an extensible kernel of engines, not as one monolithic orchestrator service.
10. Each domain should normalize on `SSOT -> Planner -> Composer -> Runtime`.
11. Enterprise Composition Platform and Enterprise Composition Ecosystem are architectural identities, not new public layers.
12. Atomic reusable components must be preferred over large product-specific surfaces.
13. No new artifact may be introduced unless it reduces implementation complexity or maintenance burden.
14. Primitive layer must remain split between UI primitives and business primitives.
15. Experience Modules must be modeled as reusable experience patterns.
16. Product Domain must distinguish between Product Definition and Product Instance.
17. Reusable composition artifacts and leverage metrics must be tracked as first-class governance concerns.

## Anti-Patterns

- product directly binding raw capability internals
- surface-specific business logic copied out of capability domain
- capability depending on branding, packaging, or licensing concerns
- product-specific policies embedded into reusable experience composition

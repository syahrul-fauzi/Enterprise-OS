# EOS Experience, Product, and Capability Positioning

## Problem

As EOS moves from internal proof to reusable launch rail, the repository needs
one clear positioning rule for:

- `foundation/*`
- `capabilities/*`
- `products/*`
- `apps/*`
- UI/UX and journey composition

Without this, future work can easily collapse back into:

- product-specific apps
- business logic inside thin surfaces
- duplicated UX and capability logic
- confusion between product identity and runtime topology

## Decision

EOS will follow this hierarchy:

```text
FOUNDATION
  -> CAPABILITY
  -> PRODUCT
  -> JOURNEY
  -> EXPERIENCE
  -> SURFACE
  -> USER / AGENT / EXTERNAL SYSTEM
```

Operational meaning:

- `foundation/*`
  - platform guarantees and primitives
- `capabilities/*`
  - reusable business capabilities
- `products/*`
  - product context, composition, configuration, and identity
- `experience`
  - contract and composition that maps product + journey into a usable surface
- `apps/*`
  - thin runtime surfaces that host experience delivery

## Positioning Rules

### 1. `apps/*` Are Thin Experience Surfaces

`apps/*` are not products.

They are runtime/surface manifestations of experience delivery, such as:

```text
apps/
  web/
  app/
  mobile/
  api/
  agent/
  docs/
```

An app may serve:

- a human browser
- a mobile client
- an API consumer
- an external system
- an agent workflow

But it does not own business capability by itself.

Example:

```text
apps/web
  -> experience surface
  -> application contract / API
  -> capability
```

### 2. `products/*` Are Product Context, Not Apps

`products/*` define:

- product identity
- capability composition
- terminology
- policy
- presentation context
- journey relevance
- experience mapping
- exposure rules

Products are not required to own their own runtime.

Example:

```text
products/
  services-id/
  lawyershub/
  ilc/
```

These can all compose the same capability:

```text
Requirement Management
  -> Services ID context
  -> LawyersHub context
  -> ILC context
```

without creating:

```text
apps/services-id
apps/lawyershub
apps/ilc
```

unless product reality later proves that isolation is necessary.

### 3. Experience Is a Layer, Not Just a Folder

Experience is not merely the `apps/` directory.

EOS experience consists of:

- experience contracts
- journey definitions
- product-aware composition
- surface adapters
- thin runtime surfaces

So the physical runtime may live in `apps/*`, but the experience layer is the
behavioral and compositional boundary between product context and surface
delivery.

EOS does **not** need a new top-level `experience/` folder just to claim this
layer exists.

The proof should come from behavior and contracts, not folder theater.

### 4. UI/UX Lives at Product x Journey x Experience

UI/UX should not be treated as something that belongs only to `apps/web`.

Instead:

```text
Product
  + Capability
  + Journey
  + Experience Contract
    -> Experience Surface
    -> UI/UX
    -> Presentation
```

This keeps UX reusable without forcing all products to look or behave the same.

### 5. Shared Runtime Does Not Mean Forced Sameness

One surface may serve many products through dynamic context:

```text
domain
  -> apps/web
  -> product context
  -> capability exposure
```

This does **not** mean:

- all products must have identical journeys
- all products must have identical navigation
- all products must expose the same capabilities
- all products must stay on one runtime forever

It only means EOS should prefer shared runtime and shared launch rail until
reality proves a need to split.

### 6. Topology Must Stay Dynamic

EOS should support all of these shapes without redesigning the core model:

```text
one runtime
  -> many product contexts
```

```text
separate runtime per product
  -> if proven necessary
```

```text
different surface per product
  -> web / mobile / api / agent
```

The rule is:

> Complexity follows product reality. It is not installed before reality
> demands it.

## Reference Model

```text
                    EOS
                     │
          ┌──────────┴──────────┐
          │                     │
      Foundation           Capabilities
                                │
                ┌───────────────┼───────────────┐
                │               │               │
          Requirement       Identity       Workflow
          Management        / Tenant        / ...
                │
                ▼
        Product Composition
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
   Services   Lawyers    ILC
      ID        Hub
       │         │         │
       └─────────┼─────────┘
                 ▼
         Experience Layer
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
     Web       Mobile       API
      │          │          │
      └────── external ─────┘
```

## Preview Implication

EOS should eventually be able to preview by:

### Product

```text
preview services-id
preview lawyershub
preview ilc
```

### Surface

```text
preview ilc --surface mobile
preview lawyershub --surface web
preview services-id --surface api
```

This is possible because preview is a property of:

```text
product context + journey + experience surface
```

not merely a property of app duplication.

## Industry Implication

If EOS later introduces `industries/*`, that layer provides specialization and
context, not a replacement for reusable capability.

Example:

```text
Requirement Management
  -> Legal specialization
  -> LawyersHub
  -> Legal journey
  -> Web / Mobile
```

```text
Requirement Management
  -> Services specialization
  -> Services ID
  -> Business journey
  -> Web / API
```

Capability remains reusable. Industry and product shape how it is composed and
presented.

## Architectural Consequences

### Keep

- shared capability implementation
- thin `apps/*`
- dynamic product context
- shared launch rail while it remains sufficient
- journey and UX composition driven by product context
- runtime separation only when a real consumer proves it is necessary

### Avoid

- permanent `apps/services-id`, `apps/lawyershub`, `apps/ilc` by default
- business logic drift into surfaces
- treating runtime topology as product identity
- creating platform folders before proof of repeated need

### Allow Later, If Reality Proves It

- isolated runtime per product
- dedicated API or mobile surface
- product-specific compliance or scaling split
- product-specific experience runtime when shared rail stops being sufficient

## Runtime Separation Rule

EOS adopts this operating rule:

> Runtime separation is a consequence of proven consumer reality, not an
> architecture decision made in advance.

Examples:

- If `ILC` proves it needs a dedicated mobile runtime:
  - evaluate `product -> journey -> capability -> experience contract -> mobile`
  - then introduce `apps/mobile` only if that surface is genuinely required
- If `apps/api` becomes necessary:
  - treat it as a machine-facing experience surface
  - not as a backend owned permanently by one product

This keeps EOS aligned with its leverage goal:

- reuse capability first
- separate runtimes only when justified by product reality
- avoid paying for symmetry that has no active consumer

## Current Proof Alignment

The current EOS proof already demonstrates the first valid pattern:

```text
Requirement capability
  -> Services ID context
  -> LawyersHub context
  -> ILC context
  -> shared apps/web surface
  -> shared staging rail
```

This is the first executable proof of:

> capability-first platform -> product context -> experience surface

## Next Proof Direction

Do not redesign the model now.

Keep proving it through execution:

1. public staging proof on shared rail
2. client review by product context
3. future slice:
   - same capability on another surface
   - or same capability consumed by an external system

Once the same pattern repeats across more than one surface or consumer, the
experience layer will be proven as a real platform boundary, not just an
architectural claim.

## Current Operating Sequence

EOS now treats the following as the active execution order:

```text
Public VPS Staging Proof
  -> 3 Product Context Review
  -> Human / Client Review
  -> STAGING or FIX MINIMUM
  -> Launchable Product
  -> Capability Vertical Slice #2
  -> Experience Surface Proof
```

This means the immediate work is no longer:

```text
design experience platform first
```

It is:

```text
prove that the same capability can be consumed by different product contexts
and later by different surfaces with progressively lower incremental cost
```

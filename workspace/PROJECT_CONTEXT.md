# PROJECT_CONTEXT.md

# EOS — Enterprise Operating System
## Canonical Project Context

> **Status:** Active  
> **Current milestone:** R9 LOCKED — My Reality E2E Golden Path PASS  
> **Next phase:** PHASE D — Realtime Update Flow  
> **Purpose:** Working context for humans and AI agents contributing to EOS.

---

# 1. PROJECT IDENTITY

EOS is an Enterprise Operating System built around one central product reality:

> **Work Reality is the center of gravity.**

EOS is not a collection of disconnected dashboards, widgets, chat interfaces, or domain-specific applications.

EOS exists to help a person enter a system, understand what work is real, understand what is happening now, identify what must happen next, take action, observe the resulting state change, preserve evidence, and continue work without losing context.

Canonical product loop:

```text
PERSON
  ↓
ENTER EOS
  ↓
EXPERIENCE
  ↓
WORK
  ↓
CONTEXT / ACTORS / COMMUNICATION
  ↓
NEXT ACTION
  ↓
EXECUTION
  ↓
INSPECTION
  ↓
OUTCOME
  ↓
EVIDENCE
```

---

# 2. PRODUCT NORTH STAR

The central principle of EOS is:

> **A user should experience one persistent, coherent reality of work.**

EOS must not feel like:

- a generic dashboard
- a task manager
- a collection of widgets
- an AI chatbot with productivity features
- multiple disconnected applications

EOS must feel like:

> **A living operating environment where Work is the durable center of continuity.**

Canonical model:

```text
WORK
  ↓
GOAL / CONTEXT / STATE
  ↓
ACTORS
  ↓
NEXT ACTION
  ↓
COMMUNICATION
  ↓
EXECUTION
  ↓
ARTIFACTS
  ↓
EVIDENCE
  ↓
OUTCOME
```

---

# 3. MULTI-DOMAIN PRODUCT MODEL

EOS is a shared product/runtime system supporting multiple domains:

1. LawyersHub
2. ILC
3. Services.ID

These are not intended to become three disconnected applications.

They share the same Work Reality DNA while using different domain vocabulary and domain capabilities.

```text
EOS CORE
   ↓
CANONICAL WORK REALITY
   ↓
DOMAIN EXPERIENCE
   ├── LawyersHub
   ├── ILC
   └── Services.ID
```

EOS Core must remain domain-agnostic.

Domain-specific logic must not leak into constitutional/core layers.

---

# 4. CANONICAL EXPERIENCE MODEL

The Work Reality is the canonical center of the experience.

Canonical core surface:

```text
/work/[id]
```

All other surfaces primarily exist to help users:

1. enter EOS
2. find Work
3. create/form Work
4. understand Work
5. take action
6. return to Work

Canonical public navigation:

```text
Home
My Work
People
Institutions
Search
Notifications
Settings
```

Experience architecture:

```text
S0 — Entry
S1 — Workspace / My Reality
S2 — Start Work
S3 — Work Reality
S4 — Work Communication
S5 — Work Actions
S6 — Work Evidence
S7 — Work People
S8 — Search / Notifications
```

---

# 5. MY REALITY — CANONICAL PRIORITY EXPERIENCE

My Reality is not a dashboard.

It is the user's persistent operational view of the Work Reality.

Central hierarchy:

```text
NOW
  ↓
NEXT
  ↓
WATCHING
```

This hierarchy must be derived from runtime/read-model reality, not static UI fixtures.

Visual priority must make urgency perceptible without requiring users to read system logs.

```text
NOW        → immediate attention
NEXT       → upcoming meaningful work
WATCHING   → context requiring awareness
```

Platform/source information remains contextual rather than becoming the visual center.

> **Work is primary. Platform is context.**

---

# 6. EOS COMPANION

EOS Companion is not a generic chatbot.

It is a contextual work companion that:

- inspects Work
- understands current context
- identifies relevant issues
- surfaces bottlenecks
- suggests meaningful next actions
- supports inspection and decision-making

Model:

```text
WORK REALITY
      ↓
EOS INSPECTION
      ↓
CONTEXTUAL INSIGHT
      ↓
SUGGESTION / DECISION SUPPORT
      ↓
AUTHORIZED ACTION
      ↓
STATE CHANGE
      ↓
EVIDENCE
```

---

# 7. DESIGN AND VISUAL EXPERIENCE CONSTITUTION

EOS visual quality is not cosmetic.

The visual experience determines whether real work and real runtime capabilities are understandable to humans.

The frontend must express:

- hierarchy
- continuity
- current reality
- next action
- state
- context
- ownership
- evidence
- outcome

Primary visual question:

> **Does the interface help a human understand and continue the Work Reality?**

Evaluate every major screen with:

1. What is the Work?
2. What is happening now?
3. Who is involved?
4. What happens next?
5. What can I do?
6. Is the primary action obvious?
7. Is irrelevant information competing with Work?
8. Does this feel like a generic dashboard?
9. Is state understandable without reading activity history?
10. Is the screen coherent on mobile?

---

# 8. DESIGN SYSTEM RULES

Canonical shared visual component layer:

```text
packages/presentation/ui-system
```

The intended implementation chain is:

```text
Design Constitution
        ↓
Experience Contract
        ↓
Canonical Component
        ↓
Presentation Package
        ↓
App Route
```

Prefer:

- semantic color tokens
- semantic surface tokens
- semantic typography tokens
- semantic spacing tokens
- canonical shadow/elevation tokens
- canonical radius tokens
- shared UI components
- centralized icon systems

Avoid:

- arbitrary raw gray/blue palettes
- copied inline component styles
- duplicated status-color maps
- repeated SVG implementations
- page-specific visual systems
- design-system bypasses without architectural reason

Goal:

> **Visual and interaction consistency across the EOS product reality.**

---

# 9. ACCESSIBILITY REQUIREMENTS

EOS targets WCAG 2.1 Level AA.

Minimum requirements:

- keyboard-accessible critical paths
- visible focus states
- semantic HTML
- appropriate ARIA attributes
- accessible labels
- sufficient color contrast
- logical focus order
- reduced-motion consideration
- accessible error states
- no reliance on color alone for meaning

Accessibility is part of design and implementation, not a final audit step.

---

# 10. RESPONSIVE EXPERIENCE

EOS must work coherently across:

- mobile
- tablet
- desktop

Responsive design must preserve priority rather than merely shrinking desktop layouts.

```text
WORK REALITY
    ↓
NOW
    ↓
NEXT ACTION
    ↓
CRITICAL CONTEXT
    ↓
SECONDARY INFORMATION
```

Mobile must not become a reduced-quality afterthought.

---

# 11. ARCHITECTURAL BOUNDARIES

EOS follows a capability-first architecture.

Only domain-agnostic, constitutional, foundational capabilities belong in EOS Core.

```text
CORE
  ├── domain-agnostic
  ├── constitutional
  ├── foundational
  └── dangerous to duplicate

PRODUCT / DOMAIN
  ├── domain vocabulary
  ├── domain workflows
  ├── domain capabilities
  └── product-specific behavior
```

High-severity domain leakage into Core is prohibited.

Presentation must not become a second runtime.

---

# 12. RUNTIME TRUTH

The runtime owns reality.

The presentation observes and expresses reality.

Correct direction:

```text
RUNTIME
   ↓
CANONICAL STATE
   ↓
READ MODEL / PROJECTION
   ↓
PRESENTATION
   ↓
HUMAN PERCEPTION
```

Incorrect direction:

```text
CLIENT-SIDE UI
   ↓
LOCAL INVENTED STATE
   ↓
VISUAL SUCCESS
   ↓
RUNTIME TRUTH UNKNOWN
```

Principle:

> **UI state must remain consistent with real system state.**

---

# 13. EVIDENCE MODEL

Actions that matter must be capable of producing evidence.

```text
ACTION
  ↓
STATE CHANGE
  ↓
ACTIVITY
  ↓
EVIDENCE
  ↓
VERIFIABLE OUTCOME
```

Evidence should answer:

- who acted
- what happened
- when it happened
- which Work was affected
- why the action mattered
- whether state changed

---

# 14. LOCKED MILESTONE — R9

## R9: Persistent Work Reality

R9 is complete based on the verified E2E Golden Path.

```text
PERSON
  ↓
ENTER EOS
  ↓
CREATE / FORM WORK
  ↓
WORK EXISTS
  ↓
WORK APPEARS IN MY REALITY
  ↓
EOS IDENTIFIES PRIORITY
  ↓
USER SEES NEXT ACTION
  ↓
USER TAKES ACTION
  ↓
REAL STATE CHANGES
  ↓
MY REALITY UPDATES
  ↓
ACTIVITY RECORD APPEARS
  ↓
USER CAN VERIFY WHAT HAPPENED
```

Verified acceptance gates:

```text
G1  — User enters without dead end
G2  — User finds the start-work action
G3  — Work is created from runtime with stable identity
G4  — Work appears in My Reality
G5  — NOW/NEXT/WATCHING derive from runtime priority
G6  — Visual priority reflects runtime state
G7  — User can take the next action
G8  — Action mutates real state
G9  — UI reflects the resulting state
G10 — Activity records the change
G11 — Refresh preserves continuity
G12 — Keyboard critical path works
G13 — Mobile critical path works
G14 — No fake UI success
G15 — Human understands what happened without system logs
```

R9 must not be casually reopened without evidence of a real requirement.

---

# 15. CURRENT STATE OF MY REALITY

The current My Reality implementation is considered production-ready based on repository verification and E2E evidence.

The experience is built around:

- NOW
- NEXT
- WATCHING
- contextual Work items
- Next Action
- Activity
- EOS Companion

Required hierarchy:

```text
NOW > NEXT > WATCHING
```

Work must remain more visually important than summary widgets or secondary analytics.

EOS Companion remains a contextual layer, not the center of the product.

---

# 16. CURRENT PHASE — PHASE D

## PHASE D: Realtime Update Flow

The next capability is to prove that Work Reality can remain live without manual refresh.

Target:

```text
EXTERNAL UPDATE / ANOTHER ACTOR
          ↓
STATE CHANGE
          ↓
EOS RUNTIME
          ↓
CANONICAL WORK STATE
          ↓
READ MODEL UPDATE
          ↓
REALTIME CHANGE SIGNAL
          ↓
PRESENTATION RECEIVES UPDATE
          ↓
MY REALITY RE-EVALUATES
          ↓
NOW / NEXT / WATCHING UPDATE
          ↓
ACTIVITY APPEARS
          ↓
USER SEES CHANGE
WITHOUT MANUAL REFRESH
```

Do not begin Phase D by assuming WebSocket, SSE, polling, or another transport.

First determine the actual EOS runtime update architecture.

---

# 17. PHASE D EXECUTION ORDER

## D1 — Realtime Architecture Truth Audit

Determine:

1. Where canonical state mutation occurs.
2. How state changes are represented.
3. Whether domain events already exist.
4. Whether an event bus already exists.
5. How read models are updated.
6. How My Reality currently obtains its model.
7. How invalidation/rebuilding currently works.
8. Where a canonical change signal should originate.
9. What boundary exists between runtime and presentation.

Output must be evidence-based.

Do not invent architecture.

## D2 — Canonical Realtime Contract

Principle:

```text
RUNTIME OWNS REALITY
PRESENTATION OBSERVES REALITY
PRESENTATION NEVER BECOMES
A SECOND SOURCE OF TRUTH
```

Realtime transport must observe runtime truth, not create a separate client-owned state machine.

## D3 — Golden Realtime Proof

Prove one real scenario:

```text
BROWSER A
   ↓
Displays Work A as NOW

ANOTHER ACTOR / EXTERNAL UPDATE
   ↓
Changes Work A

WITHOUT REFRESH
   ↓
BROWSER A UPDATES

NOW / NEXT / WATCHING CHANGE
   ↓
ACTIVITY RECORD APPEARS
   ↓
USER UNDERSTANDS WHAT CHANGED
```

Only after this golden spine works should realtime capability expand.

---

# 18. PROPOSED R10 — LIVE PERSISTENT WORK REALITY

```text
R10.1  External or another actor causes a state change
R10.2  Canonical runtime state changes
R10.3  Read model/projection updates
R10.4  Canonical change signal is published
R10.5  Presentation receives or observes the change
R10.6  No manual refresh is required
R10.7  My Reality updates correctly
R10.8  NOW/NEXT/WATCHING are recalculated
R10.9  Activity records the change
R10.10 EOS Companion updates when relevant
R10.11 Refresh after realtime update remains consistent
R10.12 No client-side fake state becomes a second source of truth
```

---

# 19. FRONTEND UI/UX AGENT OPERATING RULES

Any AI agent working on EOS frontend must:

1. Understand product intent before changing UI.
2. Treat Work Reality as the primary visual center.
3. Inspect existing design-system components before creating new ones.
4. Prefer semantic tokens over hardcoded visual values.
5. Preserve canonical component ownership.
6. Avoid duplicate implementations.
7. Validate responsive behavior.
8. Validate keyboard navigation.
9. Validate focus states.
10. Validate loading, empty, error, and success states.
11. Avoid fake UI success.
12. Ensure visual changes correspond to real runtime behavior.
13. Keep routes thin when presentation logic belongs in presentation packages.
14. Avoid leaking domain-specific logic into EOS Core.
15. Provide evidence for important implementation claims.

The agent must not:

- redesign EOS into a generic SaaS dashboard
- make chat the center of the product
- replace Work Reality with analytics widgets
- introduce arbitrary styling outside the design system
- duplicate canonical components
- invent runtime state in presentation
- claim production readiness without verification
- choose infrastructure before understanding repository architecture

---

# 20. FRONTEND QUALITY GATES

Before a frontend slice is complete:

## Visual

- hierarchy is clear
- Work is primary
- NOW is perceptibly dominant when applicable
- primary action is obvious
- secondary information does not compete
- spacing and typography are coherent
- light/dark modes use semantic tokens

## Interaction

- primary actions work
- loading states are clear
- errors are recoverable
- success corresponds to real state
- refresh preserves continuity when required

## Accessibility

- keyboard path works
- focus is visible
- semantic HTML is used
- ARIA is correct
- contrast is sufficient
- mobile interaction is usable

## Runtime

- UI reads canonical state
- mutations affect real state
- resulting state is reflected honestly
- activity/evidence remain attached to Work

## Code

- no unnecessary duplication
- no arbitrary design-system bypass
- types pass
- build passes
- relevant tests pass

---

# 21. RELEASE PHILOSOPHY

A visually polished page is not automatically a product capability.

A functioning API is not automatically a human experience.

A complete EOS slice requires:

```text
REAL HUMAN
   ↓
REAL ENTRY
   ↓
REAL WORK
   ↓
REAL CONTEXT
   ↓
REAL ACTION
   ↓
REAL STATE CHANGE
   ↓
REAL VISUAL UPDATE
   ↓
REAL EVIDENCE
   ↓
REAL OUTCOME
```

Ultimate release gate:

> **A real human can complete meaningful Work and understand what happened without needing system logs or implementation knowledge.**

---

# 22. IMMEDIATE NEXT ACTION

Highest-leverage action:

> **Execute D1 — Realtime Architecture Truth Audit.**

Do not immediately implement WebSocket, SSE, polling, or another realtime transport.

First establish:

```text
STATE MUTATION
   ↓
CANONICAL RUNTIME
   ↓
EVENT / CHANGE REPRESENTATION
   ↓
READ MODEL
   ↓
MY REALITY MODEL
   ↓
PRESENTATION
```

Then define the smallest canonical realtime contract and prove one Golden Realtime Spine.

---

# 23. CORE NON-NEGOTIABLE PRINCIPLES

```text
WORK IS THE CENTER OF GRAVITY

RUNTIME OWNS REALITY

PRESENTATION EXPRESSES REALITY

CONTEXT MUST SURVIVE

ACTION MUST BE REAL

STATE CHANGE MUST BE HONEST

EVIDENCE MUST BE PRESERVED

WORK MUST REMAIN CONTINUABLE

VISUAL PRIORITY MUST FOLLOW REAL PRIORITY

REALTIME MUST OBSERVE TRUTH,
NOT CREATE A SECOND TRUTH
```

---

# CURRENT PROJECT POSITION

```text
EOS FOUNDATION
        ↓
WORK REALITY
        ↓
MY REALITY
        ↓
R9 — E2E GOLDEN PATH
        ↓
LOCKED / VERIFIED
        ↓
PHASE D
        ↓
D1 — REALTIME ARCHITECTURE TRUTH AUDIT
        ↓
D2 — CANONICAL REALTIME CONTRACT
        ↓
D3 — GOLDEN REALTIME PROOF
        ↓
R10 — LIVE PERSISTENT WORK REALITY
```

**Current instruction to all contributors and AI agents:**

> Preserve R9 truth. Do not regress Work Reality. Start Phase D from Runtime Truth.

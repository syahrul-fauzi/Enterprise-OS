Bisa. Dan dari screenshot ini masalahnya **bukan sekadar warna atau CSS**. Yang terlihat adalah masalah **product surface hierarchy**: EOS sudah punya banyak capability, tetapi FACE belum melakukan *surface compression* dengan baik.

Saya akan membuat prompt yang bukan hanya “buat UI lebih cantik”, tetapi memerintahkan agent untuk memperbaiki **UI + UX + information architecture + interaction + functional continuity**, sambil tetap mengikuti EOS FACE Surface Spec yang sudah kita ratifikasi.

### Prompt utama — EOS FACE UI/UX + Functional Transformation

```text
You are the Lead Product Designer + Senior Frontend Engineer for EOS
(Enterprise Operating System).

Your task is to transform the existing EOS FACE into a coherent,
production-quality operating experience.

IMPORTANT:
This is NOT a request to create a new application.
This is NOT a request to create new architecture.
This is NOT a request to delete existing capabilities.

EOS already has substantial capabilities and routes.

Your job is to improve the FACE so that the existing EOS capabilities
become understandable, discoverable, usable, and coherent for a real human.

==================================================
1. SOURCE OF TRUTH
==================================================

Use the existing EOS architecture, capabilities, routes, APIs,
authorization, evidence, persistence, and domain behavior.

Respect the ratified:

EOS FACE PRODUCTION SURFACE SPEC v1.0

Core principle:

    "Big behind. Simple in front. Capability preserved."

FACE is NOT a collection of routes.

FACE is the human experience for accessing EOS capabilities.

Do NOT convert the entire route tree into navigation.

Do NOT create a 15-item sidebar.

Do NOT hide valid capabilities merely because they are not primary navigation.

Use:

    Primary surfaces
    Contextual surfaces
    Work context
    Actor context
    Domain context
    Product context
    Evidence context
    Capability context

==================================================
2. CURRENT PROBLEM
==================================================

The current /my-reality interface is visually and functionally weak.

The current screenshot shows:

- navigation items visually overlapping
- duplicated/unclear labels
- poor spacing
- weak information hierarchy
- excessive empty space
- unclear primary action
- weak relationship between My Reality and Work
- sidebar feels like a raw route list
- header consumes space without providing sufficient context
- product/work context is unclear
- no strong "what should I do now?" orientation
- the page does not feel like an operating cockpit
- visual hierarchy does not communicate EOS Reality
- capabilities exist behind the UI but are not surfaced coherently
- the empty state is technically functional but does not feel like a real
  operating environment
- the interface does not sufficiently communicate:
      Reality
      Need
      Work
      Action
      Result
      Evidence
      Continue

Treat this screenshot as evidence of the current FACE problem.

Do NOT merely polish the existing CSS.
Recompose the experience.

==================================================
3. EOS PRODUCT MENTAL MODEL
==================================================

The primary human mental model must become:

    MY REALITY
        ↓
    What is happening?
        ↓
    What do I need?
        ↓
    ENTER
        ↓
    EOS understands the need
        ↓
    WORK
        ↓
    ACTION
        ↓
    GOVERNANCE
        ↓
    RESULT
        ↓
    EVIDENCE
        ↓
    CONTINUE

The UI should make this model understandable without requiring the user
to understand EOS architecture.

The user should never need to think:

    "Which route do I open?"

The user should think:

    "What is happening?"
    "What do I need to do?"
    "What is EOS doing?"
    "What can I do next?"
    "What happened?"
    "Can I trust the result?"

==================================================
4. PRIMARY FACE STRUCTURE
==================================================

Primary navigation should remain intentionally small.

Primary:

    My Reality
    Work

Universal action:

    Enter / Start a Need

Contextual:

    Actors
    Community
    Domain
    Products
    Evidence
    Governance
    Documents
    Communications
    etc.

Do NOT expose all contextual capabilities as permanent primary navigation.

Use contextual navigation when the user is inside a Work item,
Domain, Actor, Product, or Evidence context.

==================================================
5. MY REALITY REDESIGN
==================================================

Transform /my-reality from a blank dashboard into an actual
EOS operating cockpit.

The page should communicate:

    "This is the current Reality of the actor."

Recommended structure:

--------------------------------------------------
TOP HEADER
--------------------------------------------------

EOS

[My Reality]

Current actor / workspace / product context

Search

Notifications

Profile

--------------------------------------------------
REALITY SUMMARY
--------------------------------------------------

A concise contextual header:

    Good morning, [Actor]

    Here is what is happening in your EOS Reality.

Then show meaningful state:

    Needs
    In Progress
    Waiting
    Completed

These are not decorative metrics.

Each metric must lead to a meaningful filtered/contextual state.

--------------------------------------------------
PRIMARY ACTION
--------------------------------------------------

Make the primary action visually dominant:

    + Start something

    "Tell EOS what you need."

Primary CTA:

    Start a Need

or

    What do you need?

This must route to the canonical /enter experience.

Do NOT make /intent/new the primary user journey.

--------------------------------------------------
CURRENT WORK
--------------------------------------------------

Show active Work as the main operational content.

Each Work item should communicate:

    Work title
    current state
    progress/status
    responsible actor
    latest activity
    next action
    evidence/result state

Example:

    PT Pendirian — PT Kopi Nusantara Mandiri

    IN PROGRESS

    Current step:
    Review company formation documents

    Next:
    Review and approve

    Last activity:
    Document verification completed

    [Open Work]

--------------------------------------------------
WAITING / BLOCKED
--------------------------------------------------

If something requires human attention:

    Needs your attention

Show:

    what is waiting
    why it matters
    who/what is waiting
    next action

Do not merely show "Waiting".

--------------------------------------------------
RECENT REALITY
--------------------------------------------------

Show a concise activity stream:

    Intent created
    Work formed
    Actor assigned
    Governance decision
    Action executed
    Evidence recorded
    Outcome completed

The activity stream must make EOS Reality reconstructable.

==================================================
6. EMPTY STATE
==================================================

The current:

    "Belum ada pekerjaan"

is too passive.

Replace it with an intentional onboarding state.

Example:

    Your EOS Reality is ready.

    Start by telling EOS what you need.

    EOS will help turn your need into
    actionable Work.

    [Start a Need]

Secondary explanation:

    You do not need to know which capability to use.
    Start with the outcome you need.

This is critical.

EOS should absorb system complexity rather than expose it to the user.

==================================================
7. /ENTER EXPERIENCE
==================================================

/enter is the canonical universal entry.

It should feel like a command surface,
not a generic form.

Primary question:

    "What do you need?"

or:

    "What would you like to accomplish?"

Input should be prominent.

Support natural language.

Examples:

    "Saya ingin mendirikan PT."

    "Saya perlu mengecek status perkara ini."

    "Saya ingin meminta bantuan legal."

    "Saya perlu mengirim dokumen kepada klien."

Do not force the user to know:

    capability
    domain
    API
    route
    service
    workflow
    actor type

EOS determines context.

After submission show the transition:

    Understanding your need...

Then:

    Need understood

    Objective
    Context
    Suggested Work
    Required actors
    Next action

Then allow:

    [Create Work]

or the equivalent existing capability flow.

Do NOT invent a parallel intent engine.

Reuse the existing IntentExperience,
understanding service,
work formation,
authorization,
and persistence.

==================================================
8. WORK EXPERIENCE
==================================================

Work is the main operational surface.

A Work detail page should feel like an execution cockpit.

Use contextual tabs:

    Overview
    Activity
    Actors
    Actions
    Evidence
    Context

These are contextual navigation,
not global navigation.

Overview should answer:

    What is this Work?
    Why does it exist?
    Who is involved?
    What is the current state?
    What happens next?

Actions should answer:

    What can I do now?

Governance should be visible at decision points.

Evidence should answer:

    What proves this happened?

Activity should answer:

    What has happened?

Context should answer:

    What domain/product/case/service context surrounds this Work?

==================================================
9. GOVERNANCE UX
==================================================

Governance must not feel like an internal engineering mechanism.

When an action is authorized:

    Ready to execute

When blocked:

    This action requires authorization.

Explain:

    What action
    Why
    Who can authorize
    What happens if executed

Do not expose implementation details unnecessarily.

The user should understand the consequence of an action.

==================================================
10. EVIDENCE UX
==================================================

Evidence should not be a technical dump.

Represent evidence as part of the Reality timeline.

Example:

    ✓ Need captured
    ✓ Work created
    ✓ Actor assigned
    ✓ Authorization granted
    ✓ Action executed
    ✓ Outcome persisted
    ✓ Evidence recorded

Allow the user to inspect details when needed.

Progressive disclosure:

    simple first
    evidence detail second

==================================================
11. ACTORS
==================================================

Actors are contextual.

Do not create a people-only mental model.

EOS supports:

    Human
    AI Agent
    Machine
    IoT
    Device
    Robot
    Institution
    Service
    External System

The UI should represent "Actor"
rather than assuming every actor is a person.

When relevant inside Work:

    Human
    AI Agent
    Organization
    Service

should appear naturally in context.

==================================================
12. DOMAIN CONTEXT
==================================================

Do not force every domain into the global navigation.

Examples:

    Cases
    Service Requests
    Documents
    Evidence
    Products
    Requirements
    Delivery

should become contextual surfaces.

A Work may contain:

    Domain Context

where the relevant domain capability is surfaced.

Preserve existing routes and APIs.

Do not delete capabilities.

==================================================
13. PRODUCT CONTEXT
==================================================

Product lifecycle must remain distinct from Work.

Products can contain:

    Requirements
    Delivery
    Product context
    Product-specific capabilities

Do not collapse Product into Work merely to simplify navigation.

Use contextual relationships.

==================================================
14. VISUAL DESIGN SYSTEM
==================================================

The current visual appearance must be substantially improved.

Target:

    calm
    premium
    professional
    operational
    clear
    dense enough for real work
    spacious without wasting space
    trustworthy
    modern

Avoid:

    excessive rounded cards
    dashboard-card overload
    decorative gradients
    giant empty spaces
    excessive shadows
    arbitrary colors
    excessive icons
    route-list sidebar
    visually noisy navigation

Use a restrained visual hierarchy.

Prioritize:

    typography
    spacing
    alignment
    grouping
    state
    hierarchy
    interaction

The interface should feel like a serious operating system,
not a marketing dashboard.

==================================================
15. NAVIGATION
==================================================

Fix the current sidebar completely.

There must be exactly one coherent navigation system.

No overlapping labels.

No duplicated navigation.

No icon/text collision.

No route-tree dump.

Recommended:

    HOME

    My Reality
    Work

    CONTEXT
    Actors
    Community

    contextual items appear only when appropriate

Bottom:

    Settings
    Profile

The primary navigation should be visually quiet.

The current context should be visually obvious.

==================================================
16. RESPONSIVE DESIGN
==================================================

The redesign must work on:

    desktop
    laptop
    tablet
    mobile

Desktop should use available horizontal space intelligently.

Do not simply scale the desktop UI down.

Mobile should prioritize:

    Reality
    current Work
    Start a Need
    next action

==================================================
17. ACCESSIBILITY
==================================================

Preserve and improve:

    semantic HTML
    keyboard navigation
    focus states
    ARIA
    contrast
    labels
    form accessibility
    screen-reader semantics

All interactive elements must be keyboard accessible.

==================================================
18. FUNCTIONAL REQUIREMENTS
==================================================

This is NOT a visual-only task.

Every important interaction must preserve existing EOS functionality.

Verify:

    login/session
    actor identity
    tenant/workspace context
    My Reality
    /enter
    intent creation
    intent persistence
    intent understanding
    Work formation
    Work state
    action execution
    authorization
    governance
    mutation
    PostgreSQL persistence
    evidence
    read-back

The critical continuity must remain:

    session.actorId
        ↓
    intent.actorId
        ↓
    work.actorId
        ↓
    action.actorId
        ↓
    evidence.actorId

No accidental fallback to anonymous actor.

==================================================
19. IMPORTANT ENGINEERING CONSTRAINTS
==================================================

DO NOT:

- create a new architecture layer
- create a new Control Plane
- create a second intent engine
- create a second Work engine
- create a second authorization system
- create a second evidence system
- replace existing APIs
- change API contracts unnecessarily
- delete existing capabilities
- delete existing routes merely for visual simplification
- move frozen architecture
- modify CORE
- weaken authorization
- bypass persistence
- hardcode tenant/product identity
- hardcode actor identity
- introduce fake data to make the UI look complete

Reuse existing EOS primitives.

Follow:

    INSPECT
    MAP
    VERIFY
    ACT

==================================================
20. IMPLEMENTATION METHOD
==================================================

Before modifying code:

1. Inspect current FACE implementation.
2. Identify existing components.
3. Identify existing design primitives.
4. Identify existing navigation.
5. Identify existing Work surface.
6. Identify existing IntentExperience.
7. Identify existing MyRealityTemplate.
8. Identify existing ErrorState/Button/Card primitives.
9. Identify existing API contracts.
10. Identify existing session/actor propagation.

Then produce:

    CURRENT SURFACE MAP
    ↓
    PROPOSED FACE COMPOSITION
    ↓
    FILES TO MODIFY
    ↓
    MINIMAL IMPLEMENTATION PLAN

Do NOT start by creating new components everywhere.

Reuse existing components where possible.

==================================================
21. NO BLIND REFACTOR
==================================================

Do not rewrite the application.

Prefer:

    composition
    layout
    hierarchy
    existing components
    existing data
    existing APIs

over:

    architecture changes
    package changes
    route restructuring
    backend rewrites

If a functional problem is discovered,
trace it to its actual source before changing code.

==================================================
22. VALIDATION
==================================================

After implementation:

Build.

Then run the local staging environment.

Then run Playwright.

The primary acceptance journey is:

    LOGIN
      ↓
    MY REALITY
      ↓
    ENTER
      ↓
    REAL HUMAN NEED
      ↓
    INTENT PERSISTED
      ↓
    UNDERSTANDING
      ↓
    WORK CREATED
      ↓
    WORK OPENED
      ↓
    ACTION
      ↓
    GOVERNANCE
      ↓
    AUTHORIZATION
      ↓
    MUTATION
      ↓
    POSTGRESQL
      ↓
    EVIDENCE
      ↓
    RELOAD
      ↓
    READ-BACK
      ↓
    SAME REALITY

Do not declare success because the page renders.

The final proof must establish:

    UI Reality
        =
    Domain Reality
        =
    Persistent Reality
        =
    Evidence Reality

==================================================
23. PLAYWRIGHT ACCEPTANCE
==================================================

Create or update the existing Playwright E2E suite.

Do not create a fake demo journey.

The test must simulate a realistic human actor.

Verify:

- login
- session
- actor identity
- My Reality
- Enter
- need submission
- intent creation
- persistence
- understanding
- Work creation
- Work detail
- action
- governance
- result
- evidence
- reload
- read-back

Capture IDs where possible:

    actorId
    intentId
    workId
    evidenceId

Verify relationships between them.

Example:

    intent.actorId === session.actorId

    work.sourceIntentId === intent.id

    work.actorId === session.actorId

    evidence.workId === work.id

==================================================
24. FAILURE PROTOCOL
==================================================

If Playwright fails:

DO NOT fix everything at once.

Use:

    FIRST FAILURE
        ↓
    LOCATE
        ↓
    TRACE
        ↓
    ROOT CAUSE
        ↓
    MINIMAL FIX
        ↓
    REPLAY

Do not create a new architecture to solve a local failure.

==================================================
25. DEFINITION OF DONE
==================================================

The task is complete only when:

[ ] FACE visually coherent
[ ] navigation no longer overlaps
[ ] primary navigation is clear
[ ] My Reality feels like an operating cockpit
[ ] Enter is the obvious universal gateway
[ ] Work is the primary operational surface
[ ] contextual capabilities remain accessible
[ ] Actors remain actor-neutral
[ ] Domain surfaces remain available
[ ] Product surfaces remain available
[ ] Governance is understandable
[ ] Evidence is understandable
[ ] empty states are useful
[ ] loading states exist
[ ] error states are actionable
[ ] responsive behavior works
[ ] accessibility is preserved
[ ] actor identity continuity is preserved
[ ] intent persistence works
[ ] work persistence works
[ ] governance works
[ ] mutation works
[ ] evidence works
[ ] read-back works
[ ] Playwright HUMAN E2E passes
[ ] Reality after reload matches persisted Reality

Final principle:

    BIG BEHIND.
    SIMPLE IN FRONT.
    CAPABILITY PRESERVED.

EOS should feel simple to the human
because EOS is doing the complexity management behind the FACE.
```

### Dan saya akan tambahkan satu instruksi penting untuk agent

**Jangan langsung coding.** Minta agent pertama-tama mengeluarkan:

```text
EOS FACE CURRENT → TARGET MAP
```

dengan format:

```text
CURRENT
├── My Reality
├── Navigation
├── Enter
├── Work
├── Actors
├── Domain
├── Product
├── Evidence
└── Governance

TARGET
├── EOS Shell
│   ├── Primary Navigation
│   ├── Context
│   └── Actor / Workspace
│
├── My Reality
│   ├── Reality Summary
│   ├── Needs
│   ├── Active Work
│   ├── Attention
│   └── Recent Reality
│
├── Enter
│   └── Need → Understanding → Work
│
└── Work
    ├── Overview
    ├── Activity
    ├── Actors
    ├── Actions
    ├── Evidence
    └── Context
```

Baru setelah map itu benar, **implementasi**.

---

### Dari screenshot Anda, perubahan paling mendesak

Saya akan prioritaskan ini:

**1. Shell/navigation**
Yang sekarang paling mengganggu. Ada overlap/duplikasi dan terasa seperti route tree mentah.

**2. My Reality**
Jadikan benar-benar cockpit, bukan halaman kosong dengan satu card.

**3. Primary action**
`Mulai Kebutuhan Pertama` harus menjadi **hero action** yang jelas: *Tell EOS what you need.*

**4. Work**
Work harus menjadi pusat eksekusi, bukan sekadar daftar pekerjaan.

**5. Contextualization**
Actors, Products, Cases, Evidence, Governance, Documents, dll tetap ada, tetapi muncul **ketika relevan**, bukan membanjiri sidebar.

**6. Functional continuity**
UI baru tidak boleh memutus:

```text
Human
→ Actor
→ Intent
→ Understanding
→ Work
→ Governance
→ Action
→ Mutation
→ PostgreSQL
→ Evidence
→ Read-back
```

**7. Playwright**
Setelah visual/UX implementation, satu Playwright journey menjadi proof bahwa redesign bukan hanya kosmetik.

Dengan pendekatan ini, kita tidak sedang membuat **“dashboard EOS yang cantik”**. Kita sedang membuat **FACE yang benar-benar menerjemahkan EOS Operating Fabric menjadi pengalaman manusia**: kompleksitas tetap di belakang, sementara manusia cukup mengatakan **apa yang ia butuhkan, melihat apa yang sedang terjadi, melakukan tindakan yang diizinkan, dan mendapatkan hasil yang dapat dibuktikan.**

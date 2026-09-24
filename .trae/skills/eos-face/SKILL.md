# EOS FACE

## Mission

Build and verify the human-facing EOS experience without changing EOS
core architecture, Work semantics, authority model, persistence model,
or evidence semantics.

FACE exists to let a human:

1. enter EOS,
2. understand their Reality,
3. discover or create Work,
4. perform governed actions,
5. observe results,
6. inspect evidence,
7. continue Reality.

FACE is the experience layer.
EOS owns the reality of Work.

---

# 1. Non-Negotiable EOS Laws

Never confuse:

Route ≠ Product Surface
Product Surface ≠ Navigation Item
Navigation Item ≠ Capability
Capability ≠ Authorization
Actor ≠ Authorization
Intent ≠ Work
Intent ≠ Authorization
AI reasoning ≠ Authorization
UI visibility ≠ Authorization

Never implement authorization in the UI as the source of truth.

Never create a parallel Work model in the frontend.

Never create a frontend-only canonical state.

Never duplicate an API capability merely to make UI development easier.

Never invent product state that is not backed by EOS state.

---

# 2. Canonical FACE Model

The primary authenticated experience is:

MY REALITY
    ↓
DISCOVERY / ENTER
    ↓
WORK
    ↓
CONTEXT
    ↓
ACTIONS
    ↓
RESULT
    ↓
EVIDENCE
    ↓
CONTINUE

Primary surfaces:

- /my-reality
- /enter
- /work
- /work/new
- /work/[id]

Secondary surfaces must remain contextual unless explicitly
adjudicated as product surfaces.

---

# 3. Before Coding

Inspect first:

1. EOS FACE specification
2. affected route
3. neighboring surfaces
4. existing components
5. design tokens
6. existing API contract
7. actor/session behavior
8. Work state model
9. evidence model
10. existing E2E tests
11. repository validation commands

Do not start by inventing UI.

Determine:

- Who is the actor?
- What Reality are they looking at?
- What is the primary user job?
- What Work object is involved?
- What capability is being exposed?
- What authority actually permits the action?
- What state should change?
- What evidence should exist?
- How does the user know the action succeeded?
- How can the user continue?

---

# 4. Surface Compression

Prefer:

many routes
    ↓
few coherent product surfaces
    ↓
contextual capabilities

Do not preserve route structure as the primary UX model.

Do not hide valid capabilities merely because the UI is simplified.

UI simplification must preserve:

- capability
- authorization semantics
- actor semantics
- Work identity
- evidence
- state
- API contract

---

# 5. Every Action Must Have a State Story

For every user action define:

IDLE
→ READY
→ SUBMITTING
→ SUCCESS
→ FAILURE

Where applicable also:

UNAUTHORIZED
EMPTY
NOT_FOUND
CONFLICT
RETRY
OFFLINE
STALE
LOADING

Never build only the happy path.

Every mutation must answer:

"What changed?"

"Where is the canonical state?"

"How does the UI read it back?"

"How does the user know?"

---

# 6. Reality Continuity

A FACE flow is not complete when a button works.

Minimum continuity:

human
 ↓
intent/action
 ↓
Work
 ↓
mutation
 ↓
persistence
 ↓
read-back
 ↓
FACE reflects state

A page that visually shows a mutation without canonical read-back
is not considered proven.

---

# 7. Design System

Reuse existing EOS primitives before creating new ones.

Inspect:

- typography
- spacing
- color tokens
- buttons
- inputs
- dialogs
- navigation
- cards
- status indicators
- icons
- loading states

Do not create a new design language.

Do not add dependencies merely for visual novelty.

Avoid generic AI-generated patterns:

- unnecessary cards
- excessive pills
- decorative gradients
- dashboard grids without semantic purpose
- nested cards
- duplicated navigation
- decorative metrics
- modal-heavy workflows

Every visual element must serve:

hierarchy,
orientation,
action,
state,
evidence,
or continuity.

---

# 8. Accessibility

Every changed interaction must preserve:

- semantic HTML
- keyboard operation
- visible focus
- accessible names
- sufficient contrast
- form labels
- error association
- usable target sizes
- reduced motion behavior

Accessibility is part of FACE correctness, not optional polish.

---

# 9. Responsive Behavior

Do not design separate desktop/mobile products.

Design content constraints.

Verify:

- narrow viewport
- normal desktop
- wide desktop

Check:

- overflow
- clipping
- wrapping
- navigation collapse
- action reachability
- readable hierarchy
- state visibility

---

# 10. Verification

Source inspection is not visual proof.

When browser tooling exists:

1. start clean runtime
2. authenticate
3. execute real journey
4. inspect rendered state
5. reload
6. verify canonical read-back
7. inspect failure state
8. inspect unauthorized state where relevant

Capture evidence for:

- URL
- actor
- Work ID
- action
- API result
- canonical state
- rendered state
- persistence/read-back
- failure behavior

---

# 11. Completion Gate

FACE work is COMPLETE only when:

[ ] existing architecture preserved
[ ] existing capability preserved
[ ] authorization remains server-side
[ ] canonical Work identity preserved
[ ] canonical state read-back verified
[ ] relevant UI states implemented
[ ] responsive behavior verified
[ ] accessibility verified
[ ] build passes
[ ] relevant tests pass
[ ] rendered UI inspected
[ ] no duplicate surface introduced

For critical journeys:

[ ] real invocation
[ ] real runtime
[ ] real authority
[ ] real mutation
[ ] real persistence
[ ] real evidence
[ ] real read-back
[ ] FACE reflects Reality
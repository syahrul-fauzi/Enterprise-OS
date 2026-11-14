---
name: eos-face-verification
description: >
  Use when verifying EOS frontend behavior, authenticated product journeys,
  Work continuity, persistence read-back, evidence visibility, authorization
  boundaries, navigation continuity, rendered state, or human-facing E2E
  behavior. Never accept source-code inspection alone as proof of rendered
  FACE behavior when runtime/browser verification is available.
---

# EOS FACE Verification Layer

## Core Mission

Verify that what the human sees in FACE accurately reflects the underlying
EOS reality. Never trust source code claims alone - rendered state must be
verified in a real runtime.

## Core Proof Model

```text
USER
 ↓
FACE
 ↓
API
 ↓
AUTHORITY
 ↓
MUTATION
 ↓
POSTGRES
 ↓
EVIDENCE
 ↓
API READ
 ↓
FACE
```

Verification confirms that this loop completes correctly and that the
rendered state matches canonical state.

## Evidence Schema

Every verification must capture this complete evidence chain:

```yaml
face_proof:
  actor:                    # Actor ID performing the verification
  surface:                  # Product surface URL/path
  action:                   # Exact action taken
  work_id:                  # Associated Work ID (if applicable)
  api_status:               # HTTP status code from API
  authorization:            # Whether server authorized the action
  mutation:                 # Whether canonical state changed
  persistence:              # Whether mutation was persisted to DB
  evidence:                 # Whether evidence entry was created
  read_back:                # Whether API returned the updated state
  rendered_state:           # Whether UI showed the updated state
  reload_state:             # Whether state persists after page reload
  result:                   # PASS/FAIL/BLOCKED
```

## Verification Status Classification

- **SHAPE**: The UI code compiles and basic structure exists
- **FUNCTIONAL**: Interactions trigger API calls
- **CONNECTED**: Full loop works in development
- **PROVEN**: Verified in a real runtime with evidence
- **RELEASE-READY**: Passes all accessibility, responsive, and security checks

## Verification Checklist

For every FACE change, verify:

### 1. Reality Continuity
[ ] Action mutates canonical state server-side
[ ] Persistence confirmed in database
[ ] Evidence chain created
[ ] API reads back the updated state
[ ] UI renders the new state immediately
[ ] State persists after page reload

### 2. Authorization Boundaries
[ ] Unauthorized actors cannot trigger the action
[ ] Server denies unauthorized requests
[ ] UI shows appropriate unauthorized state
[ ] No client-side checks are relied upon for security

### 3. Navigation Continuity
[ ] Back/forward buttons work correctly
[ ] Deep linking works
[ ] No duplicated navigation elements
[ ] Sidebar/navigation state is consistent across surfaces

### 4. State Coverage
[ ] All happy-path states are implemented
[ ] Error states are handled
[ ] Loading states are shown
[ ] Empty states are designed
[ ] Offline/stale states are handled

### 5. Responsive Behavior
[ ] Works on narrow viewport (<= 640px)
[ ] Works on normal desktop (>= 1024px)
[ ] Works on wide desktop (>= 1440px)
[ ] No overflow, clipping, or text wrapping issues
[ ] All actions remain reachable

### 6. Accessibility
[ ] Semantic HTML preserved
[ ] Keyboard navigation works
[ ] Focus states are visible
[ ] Accessible names exist for all controls
[ ] Color contrast meets WCAG standards
[ ] Reduced motion is respected

## Adjudication Rules

- **PASS**: All checks pass, evidence captured completely
- **FAIL**: Any check fails - fix and re-verify
- **BLOCKED**: Authorization or dependency issue prevents verification
- **OUT-OF-SCOPE**: Verification not applicable to this change
- **UNVERIFIED**: Not yet tested in a real runtime
- **UNKNOWN**: Insufficient data to adjudicate

Never promote any status to PASS unless all verifications are complete.
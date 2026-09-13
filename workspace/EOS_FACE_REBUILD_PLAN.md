# EOS FACE REBUILD PLAN (PHASE 1 IMPLEMENTATION)
Implementation plan for EOS FACE production readiness, based on route decisions and product surface map.

---

## EXECUTIVE SUMMARY
- **Timeline**: 5 business days
- **Total work items**: 12
- **P0 (Blockers)**: 2
- **P1 (Production Critical)**: 7
- **P2 (Polish)**: 3
- **Goal**: Launch EOS FACE v1.0 to production with unified product surface, compliant with all audit requirements

---

## PHASE 1 - IMPLEMENTATION TIMELINE

### DAY 1: FIX CORE GOLDEN PATH SURFACES (P0)
#### Task 1: Fix `/work` (work list page) - P0
- **Issue**: Lowest surface score (75/100), duplicate navigation, no priority sorting, missing states
- **Requirements**:
  - Integrate with `MyRealityLayout` to use unified GlobalNavigation
  - Add NOW/NEXT/WATCHING priority sorting matching `/my-reality`
  - Add loading and empty states
  - Reuse all MyReality work card components for visual consistency
- **Owner**: EOS Core Team
- **Definition of Done**:
  - `/work` loads in <600ms
  - Surface score >90/100
  - Passes all existing tests
  - Verified in browser
- **Code changes**: `/root/Enterprise-OS/workspace/apps/web/app/(eos)/work/page.tsx`

#### Task 2: Add capability filter to `/settings` in global navigation - P0
- **Issue**: `/settings` appears in global navigation for all users, but should be operator-only
- **Requirements**:
  - Add `capabilityId: "operations:admin"` to `/settings` in `GLOBAL_NAV_ITEMS`
  - Verify `createWorkspaceNavigation` correctly filters it for non-operators
  - Test with operator and non-operator user accounts
- **Owner**: EOS Core Team
- **Definition of Done**:
  - Non-operators never see Settings in navigation
  - Operators continue to see Settings
  - No TypeScript errors
- **Code changes**: `/root/Enterprise-OS/workspace/packages/composition/src/navigation/unified-navigation.ts` (line 63)

### DAY 2: IMPLEMENT REDIRECTS FOR OBSOLETE ROUTES (P1)
#### Task 3: Add redirects for all `/intent/*` routes - P1
- **Issue**: `/intent/new` and `/intent/[id]` are obsolete, merged into work routes
- **Requirements**:
  - Add `permanent: false` redirect from `/intent/new` → `/work/new`
  - Add redirect from `/intent/[id]` → `/work/[id]`
  - Log deprecation warning for analytics
- **Owner**: EOS Core Team
- **Definition of Done**:
  - All old intent routes redirect correctly
  - No broken links
- **Code changes**: `next.config.js` (or middleware.ts)

#### Task 4: Add redirects for legacy work management routes - P1
- **Redirects to implement**:
  - `/people` → `/actors`
  - `/documents` → `/work` (with document filter)
  - `/evidence` → `/work` (with evidence filter)
  - `/service-requests` → `/work` (with service request filter)
  - `/cases` → `/work` (with legal case filter)
- **Owner**: Domain Teams
- **Definition of Done**:
  - All legacy routes redirect correctly
  - Filters maintain context for users

### DAY 3: POLISH REMAINING CORE SURFACES (P1)
#### Task 5: Add form loading state to `/work/new` - P1
- **Issue**: Work creation form has no loading state during submission
- **Requirements**:
  - Add loading spinner to submit button
  - Disable form during submission
  - Add error handling for failed creation
- **Owner**: EOS Core Team
- **Code changes**: `/root/Enterprise-OS/workspace/apps/web/app/(eos)/work/new/page.tsx`

#### Task 6: Add "What needs your attention" header to `/my-reality` - P1
- **Issue**: Missing explicit header as per UX requirements
- **Requirements**:
  - Add header component matching design spec
  - Maintain responsive layout
- **Owner**: EOS Core Team
- **Code changes**: `/root/Enterprise-OS/workspace/apps/web/app/(eos)/my-reality/page.tsx`

#### Task 7: Hide experimental routes from all navigation - P1
- **Routes to hide**: `/ai-tasks`
- **Requirements**:
  - Remove from any navigation entries
  - Keep route functional for internal testing
  - Add 404 for non-research users
- **Owner**: Research Team

### DAY 4: RECOMPOSE DOMAIN-SPECIFIC ROUTES (P1)
#### Task 8: Recompose legal case routes to use universal work model - P1
- **Issue**: `/cases/[caseId]` and `/cases/new` are separate from work model
- **Requirements**:
  - Merge case creation logic into `/work/new` with case type selector
  - Add redirect from `/cases/[caseId]` → `/work/[caseId]`
  - Ensure all legal case features remain functional
- **Owner**: LawyersHub Team
- **Code changes**:
  - `/root/Enterprise-OS/workspace/apps/web/app/(work)/cases/[caseId]/page.tsx`
  - `/root/Enterprise-OS/workspace/apps/web/app/(work)/cases/new/page.tsx`

#### Task 9: Recompose service request routes - P1
- **Issue**: `/service-requests/[requestId]` is separate from work model
- **Requirements**:
  - Merge service request logic into universal work model
  - Add redirect from old route to `/work/[requestId]`
- **Owner**: Services.ID Team

### DAY 5: VERIFICATION & PRE-PRODUCTION CHECKS (P2)
#### Task 10: Full end-to-end golden path test - P2
- **Test flow**:
  1. User enters at `/enter`
  2. Authenticates successfully
  3. Redirects to `/my-reality`
  4. Clicks on work item → `/work/[id]`
  5. Executes work action, state updates
  6. Returns to `/my-reality`, sees updated work
  7. Navigates to `/work`, sees work in list
  8. Creates new work at `/work/new`
- **Owner**: Verification Team
- **Definition of Done**: All steps pass, no broken flows

#### Task 11: Navigation permission test across all actor types - P2
- **Test all actor types**:
  - Customer: sees only public/authenticated surfaces
  - Professional: sees domain-specific surfaces
  - Operator: sees all surfaces including `/settings`
  - Anonymous: only sees public marketing/auth surfaces
- **Owner**: Verification Team

#### Task 12: Performance benchmark - P2
- **Requirements**:
  - All core surfaces load in <600ms
  - Lighthouse score >90 for performance, accessibility, best practices
  - No JavaScript errors in console
  - All assets optimized
- **Owner**: Platform Team

---

## DEPENDENCY GRAPH
```
Task 1 (/work fix) ← Task 10 (E2E test)
Task 2 (settings capability) ← Task 11 (permission test)
Task 3 (intent redirects) ← Task 10
Task 4 (legacy redirects) ← Task 10
Task 5 (/work/new loading) ← Task 10
Task 6 (/my-reality header) ← Task 10
Task 7 (hide experimental) ← Task 11
Task 8 (legal case recompose) ← Task 10
Task 9 (service requests recompose) ← Task 10
Task 10 (E2E) ← Task 12 (performance)
Task 11 (permissions) ← Task 12
```

---

## RISK REGISTER
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `/work` page fixes introduce regressions | Medium | High | Comprehensive unit tests for work list sorting, full E2E test of work flows |
| Redirects break existing bookmarks | Low | Medium | Add client-side logging to track 404s from old routes, monitor for first 30 days post-launch |
| Capability filtering bugs | Medium | High | Test all actor types in staging before production, add logging for permission denials |
| Performance regression after changes | Low | Medium | Run Lighthouse audit before and after changes, set performance budgets |

---

## SUCCESS METRICS FOR PHASE 1
1. **Average surface score**: Improve from 89/100 → 95/100
2. **Routes in primary navigation**: Reduce from 7 → 5 (hide /settings from non-operators)
3. **Legacy routes eliminated**: 10 obsolete routes redirected/merged
4. **Golden path reliability**: 100% of users can complete core flow without errors
5. **Navigation consistency**: 100% of surfaces use unified `createWorkspaceNavigation`
6. **No broken links**: 0 internal 404s in production

---

## POST-PHASE 1 - PRODUCTION LAUNCH CHECKLIST
✅ All P0/P1 tasks completed
✅ All E2E tests pass
✅ Permission matrix verified for all actor types
✅ Performance benchmarks met
✅ Logging/monitoring in place for new routes
✅ Backup plan for rollback if issues found
✅ Staging deployment successful
✅ Launch communication to stakeholders

---

## ADJUDICATION SIGN-OFF (REQUIRED BEFORE IMPLEMENTATION)
| Role | Name | Date | Sign-off |
|------|------|------|----------|
| Product Lead | | | |
| Technical Lead | | | |
| Verification Lead | | | |
| Domain Lead (LawyersHub) | | | |
| Domain Lead (ILC) | | | |
| Domain Lead (Services.ID) | | | |
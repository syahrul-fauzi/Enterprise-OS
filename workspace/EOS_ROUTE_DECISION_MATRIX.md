# EOS ROUTE DECISION MATRIX (2026-09-11)
Baseline audit of all routes before EOS FACE production release.

---

## LEGEND
| Decision | Definition |
|----------|------------|
| **KEEP** | Source exists, runtime works, user can use, product should expose (core golden path) |
| **POLISH** | Source exists, runtime works, needs minor UX/visual fixes before production |
| **RECOMPOSE** | Source exists, needs structural changes to align with product surface model |
| **CONNECT** | Source exists, needs integration with unified navigation/context system |
| **MERGE** | Source exists, will be merged into another route (duplicate/obsolete) |
| **HIDE** | Source exists, runtime works, but hidden from primary navigation (operator-only/experimental) |
| **REDIRECT** | Source deprecated, redirect to new canonical route |
| **LEGACY** | Source exists, no longer used, kept for backward compatibility |
| **BLOCKED** | Source missing/broken, cannot be used until fixed |

| Status Check | Definition |
|--------------|------------|
| ✅ SOURCE | Source code exists in repository |
| ✅ RUNTIME | Route loads in dev server without errors |
| ✅ USABLE | End user can complete workflow from start to finish |
| ✅ EXPOSED | Route is exposed in product surface and navigation |

---

## CORE EOS ROUTES (Golden Path)
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Owner |
|-------|--------|---------|--------|---------|----------|-----------|-------|
| `/my-reality` | ✅ | ✅ | ✅ | ✅ | **KEEP** | Core golden path entry point, only needs minor "What needs your attention" header | EOS Core |
| `/work/[id]` | ✅ | ✅ | ✅ | ✅ | **KEEP** | Benchmark surface, 100% production-ready, follows all UX standards | EOS Core |
| `/work/new` | ✅ | ✅ | ✅ | ✅ | **POLISH** | Needs form loading state, otherwise production-ready | EOS Core |
| `/work` (list) | ✅ | ✅ | ✅ | ❌ | **POLISH + CONNECT** | Fix duplicate navigation, add priority sorting, integrate with MyRealityLayout | EOS Core |
| `/enter` | ✅ | ✅ | ✅ | ✅ | **KEEP** | Authentication entry point, 95% score, production-ready | Auth |
| `/login` | ✅ | ✅ | ✅ | ✅ | **KEEP** | Login page, part of auth flow | Auth |
| `/signup` | ✅ | ✅ | ✅ | ✅ | **KEEP** | Signup page, part of auth flow | Auth |

---

## OBSOLETE ROUTES (To Be Merged/Redirected)
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Owner |
|-------|--------|---------|--------|---------|----------|-----------|-------|
| `/intent/new` | ✅ | ✅ | ❌ | ❌ | **MERGE + REDIRECT** | Merged into `/work/new` - intent is property of work, not standalone | EOS Core |
| `/intent/[id]` | ✅ | ✅ | ❌ | ❌ | **MERGE + REDIRECT** | Merged into `/work/[id]` | EOS Core |
| `/work/[id]/trace` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Only accessible from work detail page, not in primary nav | EOS Core |

---

## EXPERIMENTAL/INTERNAL ROUTES (To Be Hidden)
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Owner |
|-------|--------|---------|--------|---------|----------|-----------|-------|
| `/ai-tasks` | ✅ | ✅ | ✅ | ❌ | **HIDE** | Experimental feature, not part of production golden path | Research |
| `/settings` | ✅ | ✅ | ✅ | ❌ | **HIDE (OPERATOR ONLY)** | Internal admin only, not for end users (still in GLOBAL_NAV_ITEMS but needs capability filter) | Operations |
| `/workspace` | ✅ | ✅ | ✅ | ❌ | **HIDE (OPERATOR ONLY)** | Operations workspace management | Operations |
| `/readiness` | ✅ | ✅ | ✅ | ❌ | **HIDE (OPERATOR ONLY)** | Platform readiness dashboard | Operations |

---

## DOMAIN-SPECIFIC ROUTES (LawyersHub/ILC/Services.ID)
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Domain |
|-------|--------|---------|--------|---------|----------|-----------|--------|
| `/products/lawyershub/cases` | ✅ | ✅ | ✅ | ✅ (vertical) | **KEEP** | LawyersHub-specific navigation, appears only for legal domain users | LawyersHub |
| `/products/ilc/research` | ✅ | ✅ | ✅ | ✅ (vertical) | **KEEP** | ILC-specific research navigation | ILC |
| `/products/services-id/intake` | ✅ | ✅ | ✅ | ✅ (vertical) | **KEEP** | Services.ID service intake flow | Services.ID |
| `/cases/[caseId]` | ✅ | ✅ | ✅ | ❌ | **RECOMPOSE** | Legal case routes should be consolidated under `/work/[id]` - work model unifies all case types | LawyersHub |
| `/cases/new` | ✅ | ✅ | ✅ | ❌ | **MERGE** | Merge into `/work/new` with legal case type selection | LawyersHub |
| `/cases` | ✅ | ✅ | ✅ | ❌ | **REDIRECT** | Redirect to unified `/work` list with legal case filter | LawyersHub |

---

## WORK MANAGEMENT ROUTES
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Owner |
|-------|--------|---------|--------|---------|----------|-----------|-------|
| `/people/[personId]` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Actor profile, accessible from work context only | Actors |
| `/people/create` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Create actor, only accessible from admin/operator context | Actors |
| `/people` | ✅ | ✅ | ✅ | ✅ (global: /actors) | **REDIRECT** | Redirect `/people` → `/actors` to align with global navigation | Actors |
| `/documents/[documentId]` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Document view, accessible from work detail only | Work |
| `/documents/create` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Document creation within work context | Work |
| `/documents` | ✅ | ✅ | ✅ | ❌ | **REDIRECT** | Redirect to `/work` with document filter | Work |
| `/evidence/[evidenceId]` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Evidence detail, traceable from work | Evidence |
| `/evidence` | ✅ | ✅ | ✅ | ❌ | **REDIRECT** | Redirect to `/work/[id]/trace` for work-specific evidence chain | Evidence |
| `/service-requests/[requestId]` | ✅ | ✅ | ✅ | ❌ | **RECOMPOSE** | Service requests are work items, merge into `/work/[id]` | Services.ID |
| `/service-requests` | ✅ | ✅ | ✅ | ❌ | **REDIRECT** | Redirect to `/work` with service request filter | Services.ID |

---

## PRODUCT MANAGEMENT ROUTES
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Owner |
|-------|--------|---------|--------|---------|----------|-----------|-------|
| `/products/[productId]` | ✅ | ✅ | ✅ | ✅ | **KEEP** | Product landing page, appears in global navigation | Product |
| `/products/[productId]/requirements` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Requirements management within product context | Product |
| `/products/[productId]/requirements/[requirementId]` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Individual requirement detail | Product |
| `/products/[productId]/requirements/[requirementId]/trace` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Requirement traceability view | Product |
| `/products/[productId]/delivery` | ✅ | ✅ | ✅ | ❌ | **KEEP (CONTEXTUAL)** | Product delivery tracking | Product |

---

## MARKETING/COMMUNITY ROUTES (Public Surfaces)
| Route | SOURCE | RUNTIME | USABLE | EXPOSED | Decision | Rationale | Owner |
|-------|--------|---------|--------|---------|----------|-----------|-------|
| `/lawyershub` (marketing) | ✅ | ✅ | ✅ | ✅ (public) | **KEEP** | Public marketing landing page for LawyersHub, separate from authenticated surfaces | Marketing |
| `/community` | ✅ | ✅ | ✅ | ✅ (public) | **KEEP** | Community portal, public surface | Community |
| `/` (root) | ✅ | ✅ | ✅ | ✅ | **KEEP** | Root redirects to appropriate public/authenticated entry point | Core |

---

## SUMMARY STATISTICS
| Decision | Count | % of total routes |
|----------|-------|-------------------|
| KEEP (core) | 7 | 18.9% |
| KEEP (contextual) | 9 | 24.3% |
| POLISH | 2 | 5.4% |
| CONNECT | 1 | 2.7% |
| RECOMPOSE | 3 | 8.1% |
| MERGE | 3 | 8.1% |
| REDIRECT | 7 | 18.9% |
| HIDE | 4 | 10.8% |
| BLOCKED | 0 | 0% |
| **TOTAL** | **37** | **100%** |

---

## NEXT STEPS FOR DECISIONS
1. Immediate fixes (POLISH/CONNECT): `/work`, `/work/new`
2. Capability filters for hidden routes: `/settings`, `/workspace`, `/readiness`
3. Redirect implementation for merged routes: all `/intent/*`, `/people`, `/documents`, `/evidence`, `/service-requests`, `/cases`
4. Recomposition work: domain-specific routes that need to align with universal work model
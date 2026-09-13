# EOS PRODUCT SURFACE MAP (2026-09-11)
Canonical mapping of all EOS product surfaces to their audience, access level, and placement.

---

## 1. SURFACE HIERARCHY (EOS PRODUCT → FABRIC → PERSISTENCE)
```
EOS PRODUCT
├─ AUTH (public/auth surfaces)
├─ EOS CORE (authenticated core surfaces)
├─ ACTORS (actor management surfaces)
├─ WORK (universal work management)
├─ PRODUCT (product lifecycle surfaces)
├─ COMMUNITY (public community surfaces)
├─ MARKETING (public marketing surfaces)
├─ OPERATIONS (internal operator surfaces)
└─ API / SYSTEM (backend/internal only)
        │
        ▼
   EOS FABRIC (Locked & Production-Ready)
        │
        ▼
   Persistence + Evidence Chain
```

---

## 2. SURFACE DEFINITIONS BY DOMAIN

### AUTH DOMAIN (Public + Authenticated)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/enter` | All unauthenticated users | Public | N/A (entry point) | Primary authentication entry point, session creation |
| `/login` | Unregistered users | Public | N/A | Login page for existing accounts |
| `/signup` | New users | Public | N/A | Signup page for new account creation |
| `/profile` | All authenticated users | Authenticated | Global nav (order: 850) | User profile settings, only accessible from user menu |

### EOS CORE DOMAIN (Authenticated Core - Golden Path)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/my-reality` | All authenticated users | Authenticated | Global nav (order: 10) | **Primary home dashboard** - shows user's priority work (NOW/NEXT/WATCHING) |
| `/work` | All authenticated users | Authenticated | Global nav (order: 20) | Unified work list - all work items accessible to user |
| `/work/new` | All authenticated users | Authenticated | Contextual (from /work) | Create new work item - universal creation form |
| `/work/[id]` | All authenticated users with access | Authenticated | Contextual (from /work) | **Benchmark surface** - work detail, execution, actions |
| `/work/[id]/trace` | All authenticated users with access | Authenticated | Contextual (from /work/[id]) | Evidence chain trace for specific work item |

### ACTORS DOMAIN (Actor Management)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/actors` | All authenticated users | Authenticated | Global nav (order: 30) | Actor directory - browse all actors in workspace |
| `/actors/institution/[id]` | Authenticated (org access) | Authenticated | Contextual (from /actors) | Institution/organization detail page |
| `/actors/profile/[id]` | Authenticated (actor access) | Authenticated | Contextual (from /actors) | Individual actor profile page |
| `/people` (legacy) | - | - | REDIRECT → `/actors` | Legacy route, redirects to canonical actors directory |
| `/people/create` | Operators only | Operator-only | Contextual (operator only) | Create new actor (person/institution) |

### PRODUCT DOMAIN (Product Lifecycle)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/products` | All authenticated users | Authenticated | Global nav (order: 40) | Product directory - all products in workspace |
| `/products/[productId]` | Authenticated (product access) | Authenticated | Contextual (from /products) | Product landing page - overview, status, metrics |
| `/products/[productId]/delivery` | Product managers | Authenticated | Vertical nav (product-specific) | Product delivery tracking |
| `/products/[productId]/requirements` | Product managers | Authenticated | Contextual (product detail) | Requirements list for product |
| `/products/[productId]/requirements/[requirementId]` | Product managers | Authenticated | Contextual (requirements list) | Individual requirement detail |
| `/products/[productId]/requirements/[requirementId]/trace` | Product managers | Authenticated | Contextual (requirement detail) | Requirement traceability view |

### VERTICAL DOMAIN SURFACES (LawyersHub/ILC/Services.ID)
All vertical surfaces are **capability-gated** - only appear for users with the required domain capability.

#### LawyersHub (Legal Domain)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/products/lawyershub/cases` | Lawyers, legal staff | Capability-gated (`legal-case-management:view`) | Vertical nav (order: 25) | Legal cases list - filtered view of all work items that are legal cases |
| `/cases/[caseId]` (legacy) | - | - | REDIRECT → `/work/[id]` | Legacy legal case route, redirects to universal work detail |
| `/cases/new` (legacy) | - | - | REDIRECT → `/work/new` | Legacy case creation, redirects to universal work creation |

#### ILC (International Law Commission)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/products/ilc/research` | Researchers, legal staff | Capability-gated (`research-management:view`) | Vertical nav (order: 25) | Research projects list - filtered view of research work items |

#### Services.ID (Digital Identity Services)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|-------------|----------|--------------|----------------------|-------------|
| `/products/services-id/intake` | Service agents | Capability-gated (`requirement-management:create`) | Vertical nav (order: 25) | Service intake queue - new service requests |
| `/service-requests/[requestId]` (legacy) | - | - | REDIRECT → `/work/[id]` | Legacy service request route, redirects to universal work detail |

### OPERATIONS DOMAIN (Internal Operator-Only)
All operator surfaces are **capability-gated** - only visible to users with `operations:admin` capability.
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/settings` | Operators only | Operator-only | Global nav (order: 900, capability-gated) | Workspace settings, configuration |
| `/workspace` | Operators only | Operator-only | Hidden (no primary nav) | Workspace management dashboard |
| `/readiness` | Operators only | Operator-only | Hidden (no primary nav) | Platform health & readiness dashboard |
| `/ai-tasks` | Research team only | Hidden (experimental) | Hidden | Experimental AI task management |

### MARKETING DOMAIN (Public Surfaces)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/` (root) | All visitors | Public | N/A | Root router - redirects unauthenticated to marketing, authenticated to `/my-reality` |
| `/lawyershub` (marketing) | General public | Public | N/A (public site) | Public LawyersHub marketing landing page |

### COMMUNITY DOMAIN (Public Community)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| `/community` | Community members | Public (authenticated optional) | N/A (public site) | Community portal, forums, discussions |

### API/SYSTEM DOMAIN (Backend Only)
| Surface Path | Audience | Access Level | Navigation Placement | Description |
|--------------|----------|--------------|----------------------|-------------|
| All `/api/*` | Internal services | API-only | N/A | Backend API routes, not accessible via browser |
| All `/_next/*` | Next.js system | System-only | N/A | Next.js internal routes |

---

## 3. NAVIGATION MAP (GLOBAL + VERTICAL)
### Global Navigation (All Users, Sorted by Order)
| Order | Label | Href | Capability Required |
|-------|-------|------|--------------------|
| 10 | Reality | `/my-reality` | None (always visible) |
| 20 | Work | `/work` | None (always visible) |
| 25 | Separator | - | - |
| 30 | Actors | `/actors` | None (always visible) |
| 40 | Products | `/products` | None (always visible) |
| 800 | Separator | - | - |
| 850 | Profile | `/profile` | None (always visible) |
| 900 | Settings | `/settings` | `operations:admin` (operator-only) |

### Vertical Navigation Additions (By Product)
#### lawyershub
| Order | Label | Href | Capability Required |
|-------|-------|------|--------------------|
| 25 | Legal Cases | `/products/lawyershub/cases` | `legal-case-management:view` |

#### ilc
| Order | Label | Href | Capability Required |
|-------|-------|------|--------------------|
| 25 | Research | `/products/ilc/research` | `research-management:view` |

#### services-id
| Order | Label | Href | Capability Required |
|-------|-------|------|--------------------|
| 25 | Service Intake | `/products/services-id/intake` | `requirement-management:create` |

#### dataops
| Order | Label | Href | Capability Required |
|-------|-------|------|--------------------|
| 25 | Data Tasks | `/products/dataops/tasks` | `data-ops:execute` |

---

## 4. CONTEXTUAL ROUTES (Never in Primary Navigation)
These routes are only accessible via deep links or contextual navigation from parent surfaces:
- `/work/[id]/trace`
- `/actors/institution/[id]`
- `/actors/profile/[id]`
- `/people/create`
- `/documents/[documentId]`
- `/documents/create`
- `/evidence/[evidenceId]`
- `/products/[productId]/delivery`
- `/products/[productId]/requirements`
- `/products/[productId]/requirements/[requirementId]`
- `/products/[productId]/requirements/[requirementId]/trace`

---

## 5. ACCESS LEVELS MATRIX
| Access Level | Definition |
|--------------|------------|
| **Public** | Accessible to all users, no authentication required |
| **Authenticated** | Requires valid session, accessible to all logged-in users |
| **Capability-gated** | Requires specific capability to access (appears in nav only if user has capability) |
| **Operator-only** | Requires `operations:admin` capability, restricted to workspace admins |
| **Contextual** | Only accessible via parent surface, never in primary navigation |
| **API-only** | Backend route only, not accessible via browser |
| **Redirected** | Legacy route that redirects to canonical surface |

---

## 6. COMPLIANCE CHECKLIST
✅ **Single source of truth**: All navigation uses `createWorkspaceNavigation` from unified-navigation.ts (UX-SHELL-001 compliant)
✅ **Route ≠ Product Surface**: Only 11 routes appear in primary global navigation (of 37 total routes)
✅ **Actor-specific visibility**: Capability filtering ensures users only see surfaces they can access
✅ **Context preservation**: All contextual routes maintain parent work/actor/product context
✅ **Golden path integrity**: Core `/my-reality` → `/work` → `/work/[id]` flow remains unobstructed
✅ **No duplicate work**: All legacy routes redirect to universal work model surfaces
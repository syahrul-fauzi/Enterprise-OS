# EOS Route Decision Matrix

This document is the master list of all routes in the EOS FACE application. It serves as the primary artifact for the **Product Surface Reconciliation** phase. Each route must be assigned a clear decision that will inform the **EOS FACE PRODUCTION SURFACE SPEC v1.0**.

## Decision Categories

- **KEEP**: The route is essential, well-defined, and should remain as is.
- **POLISH**: The route is functionally correct but requires UI/UX improvements.
- **RECOMPOSE**: The route's functionality should be broken down and distributed to other surfaces.
- **CONNECT**: The route is isolated and needs to be integrated into a larger user flow (e.g., from a Work item).
- **MERGE**: The route's functionality should be combined with another existing route.
- **HIDE**: The route is a necessary component but should not be directly navigable (e.g., only accessible contextually).
- **REDIRECT**: The route is obsolete and should permanently redirect to a new canonical route.
- **LEGACY**: The route is kept for backward compatibility but is deprecated and will be removed in the future.
- **BLOCKED**: The route cannot be fully evaluated due to missing dependencies or unresolved architectural questions.

---

## Page Routes

### (auth)
| Route | Decision | Notes |
|---|---|---|
| `/login` | | |
| `/signup` | | |

### (eos)
| Route | Decision | Notes |
|---|---|---|
| `/` | | (from `page.tsx` at the root) |
| `/ai-tasks` | | |
| `/enter` | | |
| `/intent/new` | | |
| `/intent/[intentId]` | | |
| `/my-reality` | | |
| `/settings` | | |
| `/work` | | |
| `/work/new` | | |
| `/work/[id]` | | |
| `/work/[id]/trace` | | |

### (actors)
| Route | Decision | Notes |
|---|---|---|
| `/institution/[id]` | | |
| `/profile/[id]` | | |

### (community)
| Route | Decision | Notes |
|---|---|---|
| `/community` | | |

### (marketing)
| Route | Decision | Notes |
|---|---|---|
| `/lawyershub` | | |

### (operations)
| Route | Decision | Notes |
|---|---|---|
| `/readiness` | | |
| `/workspace` | | |

### (product)
| Route | Decision | Notes |
|---|---|---|
| `/products/[productId]` | | |
| `/products/[productId]/delivery` | | |
| `/products/[productId]/requirements` | | |
| `/products/[productId]/requirements/[requirementId]` | | |
| `/products/[productId]/requirements/[requirementId]/trace` | | |

### (work) - *Note: This is a separate group from `(eos)/work`*
| Route | Decision | Notes |
|---|---|---|
| `/cases` | | |
| `/cases/new` | | |
| `/cases/[caseId]` | | |
| `/documents` | | |
| `/documents/create` | | |
| `/documents/[documentId]` | | |
| `/evidence` | | |
| `/evidence/[evidenceId]` | | |
| `/people` | | |
| `/people/create` | | |
| `/people/[personId]` | | |
| `/quotes` | | |
| `/service-requests` | | |
| `/service-requests/[requestId]` | | |

---

## API Routes (`/api`)

### /api/ai-tasks
| Route | Decision | Notes |
|---|---|---|
| `/api/ai-tasks/restart` | | |

### /api/auth
| Route | Decision | Notes |
|---|---|---|
| `/api/auth/callback` | KEEP | FACE-bound OAuth callback route for browser authentication, sets encrypted workspace session cookies. |
| `/api/auth/login` | KEEP | FACE-bound credential login route for browser users, creates authenticated workspace session. |
| `/api/auth/logout` | KEEP | FACE-bound logout route, invalidates session cookie and clears user context. |
| `/api/auth/oidc-login` | KEEP | FACE-bound OIDC login initiation route for SSO authentication flows in browser. |
| `/api/auth/signup` | KEEP | FACE-bound account creation route for new users registering via browser. |

### /api/capabilities
| Route | Decision | Notes |
|---|---|---|
| `/api/capabilities/[cap]/[commandName]` | | |

### /api/cases
| Route | Decision | Notes |
|---|---|---|
| `/api/cases/create` | | |
| `/api/cases/list` | | |
| `/api/cases/transition` | | |
| `/api/cases/evidence` | | |
| `/api/cases/[id]` | | |
| `/api/cases/case-014` | | |

### /api/chat
| Route | Decision | Notes |
|---|---|---|
| `/api/chat/prepare-release` | | |

### /api/communication
| Route | Decision | Notes |
|---|---|---|
| `/api/communication/list` | | |
| `/api/communication/send` | | |

### /api/communications
| Route | Decision | Notes |
|---|---|---|
| `/api/communications/add` | KEEP | FACE-bound route for browser/UI consumers, uses cookie session authentication to support anonymous workspace users. Required for collaboration features on the Work Reality Surface. |
| `/api/communications/by-work-id` | KEEP | FACE-bound route for browser/UI consumers, uses cookie session to retrieve work-related communications. |

### /api/community
| Route | Decision | Notes |
|---|---|---|
| `/api/community/articles/create` | | |
| `/api/community/articles/list` | | |
| `/api/community/discussions/create` | | |
| `/api/community/discussions/list` | | |

### /api/delivery
| Route | Decision | Notes |
|---|---|---|
| `/api/delivery` | | |

### /api/documents
| Route | Decision | Notes |
|---|---|---|
| `/api/documents/list` | | |

### /api/domain
| Route | Decision | Notes |
|---|---|---|
| `/api/domain/[aggregateId]` | | |

### /api/external
| Route | Decision | Notes |
|---|---|---|
| `/api/external/services-id/intake` | MIGRATE | Moved to canonical System Surface: `apps/api/app/api/(integration)/integrations/external/services-id/intake/route.ts`. Current `apps/web` route is legacy - disable after migration. This is a programmatic external intake endpoint, belongs to SYSTEM SURFACE, not FACE.

### /api/external-webhooks
| Route | Decision | Notes |
|---|---|---|
| `/api/external-webhooks/commsme/government` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |
| `/api/external-webhooks/email` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |
| `/api/external-webhooks/forms` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |
| `/api/external-webhooks/ilc` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |
| `/api/external-webhooks/midtrans` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |
| `/api/external-webhooks/servicesid` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |
| `/api/external-webhooks/slack` | MIGRATE | (disabled) All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. |
| `/api/external-webhooks/webchat` | MIGRATE | (disabled) All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. |
| `/api/external-webhooks/whatsapp` | MIGRATE | All webhooks are programmatic external integration points - belong to SYSTEM SURFACE `apps/api`. Current `apps/web` routes are legacy. |

### /api/governance
| Route | Decision | Notes |
|---|---|---|
| `/api/governance/decisions` | | |

### /api/health
| Route | Decision | Notes |
|---|---|---|
| `/api/health` | | |
| `/api/health/db` | | |

### /api/identity
| Route | Decision | Notes |
|---|---|---|
| `/api/identity/session/revoke` | | |
| `/api/identity/user/update` | | |

### /api/institution
| Route | Decision | Notes |
|---|---|---|
| `/api/institution/[id]` | | |

### /api/intent
| Route | Decision | Notes |
|---|---|---|
| `/api/intent/create` | | |
| `/api/intent/[intentId]` | | |

### /api/my-reality
| Route | Decision | Notes |
|---|---|---|
| `/api/my-reality/refresh` | | |

### /api/procedure
| Route | Decision | Notes |
|---|---|---|
| `/api/procedure/prepare-release` | | |

### /api/profile
| Route | Decision | Notes |
|---|---|---|
| `/api/profile/[id]` | | |

### /api/queue
| Route | Decision | Notes |
|---|---|---|
| `/api/queue/email` | | |

### /api/quotes
| Route | Decision | Notes |
|---|---|---|
| `/api/quotes/create` | | |

### /api/ready
| Route | Decision | Notes |
|---|---|---|
| `/api/ready` | | |

### /api/requirements
| Route | Decision | Notes |
|---|---|---|
| `/api/requirements/create` | | (disabled) |
| `/api/requirements/transition` | | |

### /api/research
| Route | Decision | Notes |
|---|---|---|
| `/api/research` | | |

### /api/reset-session
| Route | Decision | Notes |
|---|---|---|
| `/api/reset-session` | | |

### /api/service-requests
| Route | Decision | Notes |
|---|---|---|
| `/api/service-requests/create` | | |
| `/api/service-requests/batch-create` | | |
| `/api/service-requests/list` | | |
| `/api/service-requests/transition` | | |
| `/api/service-requests/[id]` | | |
| `/api/service-requests/[id]/customer-accept-price` | | |
| `/api/service-requests/[id]/provider-decision` | | |

### /api/servicesid
| Route | Decision | Notes |
|---|---|---|
| `/api/servicesid` | | |

### /api/session
| Route | Decision | Notes |
|---|---|---|
| `/api/session` | KEEP | FACE-bound session initialization route for browser users, creates anonymous or authenticated workspace session. Critical for first-light mode support. |

### /api/status
| Route | Decision | Notes |
|---|---|---|
| `/api/status/[executionId]` | | |
| `/api/status/sse/[executionId]` | | |

### /api/tenant
| Route | Decision | Notes |
|---|---|---|
| `/api/tenant` | | (disabled) |

### /api/work
| Route | Decision | Notes |
|---|---|---|
| `/api/work/create` | | |
| `/api/work/compose` | | |
| `/api/work/[id]` | | |
| `/api/work/updates/[workspaceId]` | | |

### /api/workspace
| Route | Decision | Notes |
|---|---|---|
| `/api/workspace` | | (disabled) |

### /api/workspaces
| Route | Decision | Notes |
|---|---|---|
| `/api/workspaces` | | |
# EOS Product Surface Map

This document provides a conceptual map of the EOS FACE application's product surface. It groups the routes identified in the `EOS_ROUTE_DECISION_MATRIX.md` into the official product hierarchy. This visualization helps in understanding the application's structure, identifying overlaps, and making strategic decisions during the **Product Surface Adjudication** phase.

The core principle is: **Route ≠ Product Surface ≠ Navigation Item ≠ Capability.**

---

## 1. AUTH

*Handles user authentication, session management, and onboarding.*

- **Page Routes:**
  - `/login`
  - `/signup`
- **API Routes:**
  - `/api/auth/callback`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/oidc-login`
  - `/api/auth/signup`
  - `/api/identity/session/revoke`
  - `/api/reset-session`
  - `/api/session`

---

## 2. EOS CORE

*The central user experience for interacting with the EOS system. This is the "FACE" of EOS.*

- **Page Routes:**
  - `/` (Root/Dashboard)
  - `/enter` (Entry point for new work/intent)
  - `/my-reality` (User's personalized view)
  - `/settings`
  - `/work` (List view of work items)
  - `/work/new`
  - `/work/[id]` (The benchmark "Work" view)
  - `/work/[id]/trace`
- **API Routes:**
  - `/api/my-reality/refresh`
  - `/api/work/create`
  - `/api/work/compose`
  - `/api/work/[id]`
  - `/api/work/updates/[workspaceId]`
  - `/api/workspaces`
  - `/api/status/[executionId]`
  - `/api/status/sse/[executionId]`

---

## 3. ACTORS

*Surfaces related to specific user roles and profiles within the system.*

- **Page Routes:**
  - `/institution/[id]`
  - `/profile/[id]`
- **API Routes:**
  - `/api/identity/user/update`
  - `/api/institution/[id]`
  - `/api/profile/[id]`

---

## 4. WORK (Domain-Specific)

*Specialized work surfaces that are distinct from the core EOS work view. These often represent domain-specific contexts like legal cases or service requests.*

- **Page Routes:**
  - `/cases`
  - `/cases/new`
  - `/cases/[caseId]`
  - `/documents`
  - `/documents/create`
  - `/documents/[documentId]`
  - `/evidence`
  - `/evidence/[evidenceId]`
  - `/people`
  - `/people/create`
  - `/people/[personId]`
  - `/quotes`
  - `/service-requests`
  - `/service-requests/[requestId]`
- **API Routes:**
  - `/api/cases/create`
  - `/api/cases/list`
  - `/api/cases/transition`
  - `/api/cases/evidence`
  - `/api/cases/[id]`
  - `/api/documents/list`
  - `/api/quotes/create`
  - `/api/service-requests/create`
  - `/api/service-requests/batch-create`
  - `/api/service-requests/list`
  - `/api/service-requests/transition`
  - `/api/service-requests/[id]`
  - `/api/service-requests/[id]/customer-accept-price`
  - `/api/service-requests/[id]/provider-decision`

---

## 5. PRODUCT

*Surfaces for managing products within EOS itself (meta-product management).*

- **Page Routes:**
  - `/products/[productId]`
  - `/products/[productId]/delivery`
  - `/products/[productId]/requirements`
  - `/products/[productId]/requirements/[requirementId]`
  - `/products/[productId]/requirements/[requirementId]/trace`
- **API Routes:**
  - `/api/requirements/create` (disabled)
  - `/api/requirements/transition`

---

## 6. COMMUNITY

*Features related to community interaction, articles, and discussions.*

- **Page Routes:**
  - `/community`
- **API Routes:**
  - `/api/community/articles/create`
  - `/api/community/articles/list`
  - `/api/community/discussions/create`
  - `/api/community/discussions/list`

---

## 7. MARKETING

*Public-facing marketing and informational pages.*

- **Page Routes:**
  - `/lawyershub`

---

## 8. OPERATIONS

*Internal-facing surfaces for system monitoring and administration.*

- **Page Routes:**
  - `/readiness`
  - `/workspace`
- **API Routes:**
  - `/api/health`
  - `/api/health/db`
  - `/api/ready`
  - `/api/governance/decisions`

---

## 9. API / SYSTEM (Fabric & Integrations)

*Low-level system APIs, generic handlers, and external integration points. These are the connection points to the EOS Fabric.*

- **API Routes:**
  - `/api/ai-tasks/restart`
  - `/api/capabilities/[cap]/[commandName]` (Generic capability executor)
  - `/api/chat/prepare-release`
  - `/api/communication/list`
  - `/api/communication/send`
  - `/api/communications/add`
  - `/api/communications/by-work-id`
  - `/api/delivery`
  - `/api/domain/[aggregateId]` (Generic domain object access)
  - `/api/external/services-id/intake`
  - `/api/external-webhooks/*` (All webhooks)
  - `/api/intent/create`
  - `/api/intent/[intentId]`
  - `/api/procedure/prepare-release`
  - `/api/queue/email`
  - `/api/research`
  - `/api/servicesid`
  - `/api/tenant` (disabled)
  - `/api/workspace` (disabled)
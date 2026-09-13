# EOS FACE Rebuild Plan

This document outlines the strategic plan for the Phase 1 UI/UX Rebuild of EOS FACE. It synthesizes the findings from the `EOS_ROUTE_DECISION_MATRIX.md` and `EOS_PRODUCT_SURFACE_MAP.md` to propose a coherent, phased approach for development. This plan is the final artifact of the **Full Application Reconciliation** and the primary input for the **Product Surface Adjudication** process.

## 1. Guiding Principles

- **Fabric is Locked**: All rebuild efforts will occur on top of the existing, stable EOS Fabric. No changes to the underlying capabilities, persistence, or evidence layers are in scope for this phase.
- **Work-Centric Experience**: The `/work/[id]` view is the established benchmark for user experience. All other surfaces should either lead to, support, or derive context from a piece of Work.
- **Surface, Not Silo**: Functionality should be presented as a cohesive surface, not as a collection of siloed applications. The distinction between `Route`, `Product Surface`, `Navigation Item`, and `Capability` is paramount.
- **Adjudication First**: No implementation will begin until this plan and its preceding artifacts are adjudicated, and the **EOS FACE PRODUCTION SURFACE SPEC v1.0** is ratified.

---

## 2. Proposed Rebuild Strategy

The rebuild will be conducted in three main waves, focusing on establishing a strong core, integrating domain-specific contexts, and then polishing auxiliary functions.

### **Wave 1: Solidify the Core (The Golden Path)**

This wave focuses on perfecting the primary user journey, from entering the system to interacting with a piece of Work.

1.  **Target Surfaces**: `AUTH`, `EOS CORE`.
2.  **Key Objectives**:
    - **`POLISH` `/login` and `/signup`**: Create a seamless and secure entry point.
    - **`RECOMPOSE` `/` (Root)**: Transform the root from a simple page into a true "My Reality" dashboard that provides a meaningful, personalized overview of the user's work and tasks.
    - **`CONNECT` `/enter`**: Solidify this as the primary, intelligent entry point for creating any new `Work` or `Intent`, guiding the user to the correct context.
    - **`KEEP` and `POLISH` `/work/[id]`**: Fortify the benchmark experience. Ensure all contextual actions (e.g., communication, evidence, transitions) are initiated from this view.
    - **`MERGE` `/work` (list view)**: The list view should be a powerful, filterable tool that is an integral part of the `EOS CORE` surface, not a separate destination.
3.  **Outcome**: A user can log in, view their reality, create a new piece of work, and interact with it through a polished, cohesive, and work-centric interface.

### **Wave 2: Integrate the Domains**

This wave focuses on connecting the domain-specific `WORK` contexts to the `EOS CORE`.

1.  **Target Surfaces**: `WORK (Domain-Specific)`, `ACTORS`.
2.  **Key Objectives**:
    - **`CONNECT` all Domain-Specific Work**: Routes like `/cases`, `/service-requests`, and `/documents` should not be standalone applications. They are contextual views of `Work`. The plan is to make them accessible *through* the core `Work` item, perhaps as specialized "renderers" or "lenses" based on the `Work` type.
    - **`HIDE` Primary Navigation**: Direct navigation to `/cases` or `/documents` should be removed. The entry point is always `Work`.
    - **`RECOMPOSE` `/people` and `/profile`**: Actor and profile information should be presented contextually within a `Work` item, not as a top-level directory. The `/profile/[id]` page should be a rich, detailed view, but linked from where the actor is relevant.
3.  **Outcome**: The distinction between "core work" and "domain work" disappears from the user's perspective. There is only `Work`, presented with the appropriate context and tools for the job.

### **Wave 3: Polish & Externalize**

This wave addresses the remaining surfaces, focusing on operational tools, community features, and public-facing pages.

1.  **Target Surfaces**: `PRODUCT`, `COMMUNITY`, `MARKETING`, `OPERATIONS`.
2.  **Key Objectives**:
    - **`POLISH` and `CONNECT`**: Review and refine all remaining surfaces. Ensure they align with the new core design system.
    - **`EVALUATE` `MARKETING` surfaces**: Decide on the long-term strategy for pages like `/lawyershub`. Are they integrated or separate sites?
    - **`SECURE` `OPERATIONS` surfaces**: Ensure that internal tools like `/readiness` are properly permissioned and only accessible to operators.

---

## 3. API & System Strategy

- **`KEEP` Generic Endpoints**: The generic API endpoints (e.g., `/api/capabilities/[cap]/[commandName]`, `/api/domain/[aggregateId]`) are critical for the Fabric-Face separation. They will be maintained and used by the rebuilt frontend.
- **`LEGACY` / `REDIRECT` Specific Endpoints**: As the frontend is rebuilt, many specific API endpoints (e.g., `/api/cases/create`) may become redundant if the new UI uses the generic capability endpoints directly. Each will be evaluated for deprecation.
- **`EVALUATE` Webhooks**: A full audit of all webhook integrations is required to ensure they are robust, secure, and necessary.

---

## 4. Next Steps

1.  **Adjudication**: This plan, along with the Matrix and Map, must be reviewed by all stakeholders.
2.  **Decision Logging**: All decisions made during adjudication must be logged in the `EOS_ROUTE_DECISION_MATRIX.md`.
3.  **Spec Creation**: Once decisions are final, create the **EOS FACE PRODUCTION SURFACE SPEC v1.0**.
4.  **Begin Wave 1**: Commence implementation based on the ratified spec.
# PRODUCT SURFACE ADJUDICATION

## EOS FACE — Decision Gate

### Verdict

**PHASE 0: ACCEPTED WITH ADJUDICATION CORRECTIONS**

**PHASE 1: NOT YET AUTHORIZED**

Alasannya bukan blocker arsitektur. Justru sebaliknya: struktur sudah cukup jelas, tetapi beberapa keputusan produk harus dikunci terlebih dahulu agar rebuild tidak menghasilkan simplifikasi yang menghilangkan capability.

---

# 1. Keputusan fundamental

Kita tetapkan:

> **EOS FACE bukan kumpulan route. FACE adalah pengalaman untuk mengakses capability EOS.**

Maka:

```text
Route
  ≠ Product Surface
  ≠ Navigation Item
  ≠ Capability
  ≠ Actor
```

Dan model produk yang kita gunakan:

```text
                    EOS
                     │
             ┌───────┴───────┐
             │               │
        MY REALITY        DISCOVERY
             │               │
             └───────┬───────┘
                     │
                    WORK
                     │
        ┌────────────┼────────────┐
        │            │            │
      ACTORS       CONTEXT      ACTIONS
        │            │            │
        └────────────┼────────────┘
                     │
                  RESULT
                     │
                  EVIDENCE
                     │
                 CONTINUE
```

Ini menjadi **FACE mental model v1.0**.

---

# 2. PRIMARY FACE

Saya menetapkan hanya **tiga primary surfaces** untuk authenticated EOS:

### P1 — MY REALITY

Canonical home setelah authentication.

```text
/my-reality
```

Fungsinya:

* apa yang sedang terjadi
* apa yang membutuhkan perhatian
* pekerjaan prioritas
* pekerjaan yang sedang berjalan
* continuation
* recent/result context

`/` tidak perlu menjadi dashboard kedua.

### Keputusan `/`

**REDIRECT → `/my-reality`**

Bukan `RECOMPOSE`.

Alasannya sederhana: kita tidak membutuhkan dua konsep home.

---

# 3. PRIMARY WORK SURFACE

### P2 — WORK

Canonical work surface:

```text
/work
/work/new
/work/[id]
```

Keputusan:

| Route              | Adjudication          |
| ------------------ | --------------------- |
| `/work`            | **POLISH**            |
| `/work/new`        | **POLISH**            |
| `/work/[id]`       | **KEEP + POLISH**     |
| `/work/[id]/trace` | **HIDE / CONTEXTUAL** |

`/work/[id]` tetap menjadi **benchmark UI**.

Bukan karena semua hal harus dipaksa masuk ke sana, tetapi karena:

> Work adalah unit continuity EOS.

---

# 4. `/enter`

Ini perlu koreksi terhadap rebuild plan.

`/enter` **bukan sekadar halaman untuk membuat Work/Intent**.

Ia adalah:

> **EOS universal entry / intent-to-work gateway**

Keputusan:

### `/enter` → **KEEP + POLISH**

Flow:

```text
Actor
  ↓
/enter
  ↓
express intention / need
  ↓
EOS determines appropriate context
  ↓
Work / capability / domain
  ↓
execution
```

Jadi `/enter` boleh tetap menjadi surface tersendiri.

---

# 5. INTENT

### `/intent/new`

**MERGE CONCEPTUALLY INTO `/enter`**

Tetapi **jangan langsung menghapus route**.

Keputusan:

```text
/intent/new
    → HIDE / REDIRECT
    → canonical entry = /enter
```

### `/intent/[intentId]`

**HIDE / CONTEXTUAL**

Intent adalah context/state dari Work atau interaction, bukan primary destination.

Namun API intent jangan dideprecate hanya karena UI route disembunyikan.

Ini penting:

> **UI simplification ≠ API deletion.**

---

# 6. `/ai-tasks`

### `/ai-tasks` → HIDE

Bukan otomatis LEGACY.

AI task adalah salah satu actor/capability execution context.

FACE seharusnya tidak membuat:

```text
Human Work
AI Tasks
Machine Tasks
Robot Tasks
IoT Tasks
```

sebagai aplikasi terpisah.

Model yang lebih benar:

```text
WORK
 ├── actor
 ├── capability
 ├── execution
 ├── result
 └── evidence
```

Jadi AI adalah **actor/capability dimension**, bukan top-level product silo.

`/api/ai-tasks/restart` tetap system capability sampai terbukti redundant.

---

# 7. ACTORS

Ini bagian yang perlu dikoreksi cukup besar.

Artifact mengatakan:

> actor/profile adalah role/user directory.

Untuk EOS yang sudah kita sepakati, itu terlalu human-centric.

Actor harus mendukung:

```text
Human
AI Agent
Machine
IoT
Device
Robot
Mechanical Actor
Institution
Service
External System
```

Karena itu:

### `/profile/[id]`

**KEEP — CONTEXTUAL ACTOR SURFACE**

### `/institution/[id]`

**KEEP — CONTEXTUAL ACTOR SURFACE**

Tetapi bukan primary navigation.

Actor muncul ketika relevant:

```text
Work
 ├── Owner
 ├── Participants
 ├── Responsible Actor
 ├── Executing Actor
 ├── Approver
 └── External Actor
```

Jadi keputusan:

> **ACTORS = contextual surface, not directory-first navigation.**

---

# 8. DOMAIN WORK: CASES / SERVICE REQUESTS / DOCUMENTS

Di sinilah saya **tidak sepenuhnya menerima Wave 2**.

Rebuild plan mengatakan:

> semua domain work harus menjadi renderer/lens dari Work.

Konsep ini menarik, tetapi **belum cukup dibuktikan oleh audit** untuk dijadikan implementation mandate.

Maka keputusan saya:

### `/cases`

**DOMAIN SURFACE — CONNECT**

### `/service-requests`

**DOMAIN SURFACE — CONNECT**

### `/documents`

**DOMAIN SURFACE — CONNECT**

### `/evidence`

**DOMAIN SURFACE — CONNECT**

Artinya:

```text
tidak primary navigation
tetapi capability tetap first-class
```

Contoh:

```text
/work/123
   │
   ├── Overview
   ├── Activity
   ├── Actors
   ├── Documents
   ├── Evidence
   ├── Communications
   └── Domain Context
```

Tetapi kita **tidak boleh mengimplementasikan ulang semua domain menjadi Work renderer** sebelum hubungan runtime/data/action-nya terbukti.

Ini menjadi **P1 architecture-of-experience investigation**, bukan P0 rebuild requirement.

---

# 9. DOMAIN CREATION ROUTES

Keputusan:

| Route                           | Decision          |
| ------------------------------- | ----------------- |
| `/cases/new`                    | HIDE / CONTEXTUAL |
| `/documents/create`             | HIDE / CONTEXTUAL |
| `/people/create`                | HIDE / CONTEXTUAL |
| `/cases/[caseId]`               | CONNECT           |
| `/documents/[documentId]`       | CONNECT           |
| `/people/[personId]`            | CONNECT           |
| `/evidence/[evidenceId]`        | CONNECT           |
| `/service-requests/[requestId]` | CONNECT           |

Creation capability tetap ada.

Yang dihilangkan hanyalah **fragmented top-level navigation**.

---

# 10. PEOPLE

`/people` perlu kehati-hatian.

Saya tidak setuju dengan keputusan otomatis:

> `/people` → RECOMPOSE menjadi contextual only.

Karena actor discovery bisa merupakan capability produk yang sah.

Maka:

### `/people`

**DOMAIN / CONTEXTUAL — POLISH**

Primary navigation: **NO**.

Direct access/contextual access: **YES**.

Ini menjaga kemungkinan FACE menjadi marketplace/actor discovery surface di masa depan tanpa memaksanya masuk ke golden path sekarang.

---

# 11. PRODUCT

Product tidak boleh dianggap sekadar domain work.

Strukturnya:

```text
PRODUCT
 ├── product
 ├── requirements
 ├── delivery
 └── trace
```

Ini adalah **product lifecycle surface**.

Keputusan:

| Route                                                      | Decision                |
| ---------------------------------------------------------- | ----------------------- |
| `/products/[productId]`                                    | **KEEP**                |
| `/products/[productId]/delivery`                           | **CONTEXTUAL**          |
| `/products/[productId]/requirements`                       | **CONTEXTUAL**          |
| `/products/[productId]/requirements/[requirementId]`       | **CONTEXTUAL**          |
| `/products/[productId]/requirements/[requirementId]/trace` | **HIDE / CONTEXTUAL**   |
| `/requirements/[requirementId]`                            | **CONNECT / RECONCILE** |

Tidak boleh ada dua canonical requirement detail surfaces tanpa alasan.

Ini menjadi salah satu item yang harus diselesaikan sebelum final spec.

---

# 12. COMMUNITY

### `/community`

**KEEP — PUBLIC/ECOSYSTEM SURFACE**

Tetapi:

```text
FACE primary navigation
        ≠
EOS entire public ecosystem
```

Community boleh hidup sebagai surface terpisah.

Jangan dipaksa masuk golden spine.

---

# 13. MARKETING

### `/lawyershub`

**PUBLIC / MARKETING**

Keep separate.

Tidak boleh mencemari authenticated EOS navigation.

Jika nanti LawyersHub menjadi product vertical, itu adjudikasi berbeda.

---

# 14. OPERATIONS

### `/readiness`

**OPERATOR**

### `/workspace`

**OPERATOR**

Keduanya:

```text
NOT PRIMARY FACE
NOT NORMAL USER NAVIGATION
```

Tetapi jangan redirect/hapus.

Access harus permission-gated.

---

# 15. SETTINGS

Ada beberapa `/settings` karena route groups berbeda.

Ini harus diperlakukan sebagai **contextual settings**, bukan tiga product settings yang terpisah secara mental.

Canonical model:

```text
Settings
 ├── Account
 ├── Actor
 ├── Workspace
 └── System/Operator
```

Namun implementasi route boleh berbeda untuk sekarang.

**Jangan melakukan route deletion hanya untuk menyatukannya.**

---

# 16. API ADJUDICATION

Ini bagian paling penting yang perlu dikoreksi dari `EOS_FACE_REBUILD_PLAN`.

Saya **menolak keputusan prematur**:

> “specific APIs may become redundant karena generic capability endpoint.”

Belum cukup bukti.

API:

```text
/api/cases/create
/api/service-requests/create
/api/documents/...
```

tidak boleh dihapus hanya karena:

```text
/api/capabilities/[cap]/[commandName]
```

exist.

Generic capability executor dan domain API bisa mempunyai:

* authorization semantics berbeda
* validation berbeda
* evidence semantics berbeda
* compatibility requirements
* external consumers
* transaction boundaries
* domain-specific contracts

Maka:

### API rule v1.0

> **No API deprecation based solely on UI recomposition.**

Setiap endpoint harus dibuktikan:

```text
consumer
→ action
→ authorization
→ mutation
→ persistence
→ evidence
→ replacement
→ compatibility
```

baru boleh `LEGACY` atau `REDIRECT`.

---

# 17. WEBHOOKS

Semua:

```text
/api/external-webhooks/*
```

ditetapkan:

### SYSTEM / INTEGRATION

Tidak masuk FACE navigation.

Tetapi:

* security
* authentication/signature
* persistence
* evidence
* retry
* idempotency

harus tetap diaudit sebagai system surface.

---

# 18. PRIMARY NAVIGATION FINAL

Saya mengusulkan **FACE Primary Navigation v1.0**:

```text
MY REALITY
WORK
ACTORS / DISCOVERY        (conditional/contextual)
COMMUNITY                 (optional/public context)
```

Namun bahkan `ACTORS` dan `COMMUNITY` tidak harus muncul untuk semua actor/workspace.

Core navigation yang paling aman:

```text
MY REALITY
WORK
```

Kemudian contextual navigation muncul berdasarkan context.

Ini jauh lebih kuat daripada membuat 8–12 item navbar.

---

# 19. Contextual Navigation

Di Work:

```text
WORK
 ├── Overview
 ├── Activity
 ├── Actors
 ├── Actions
 ├── Evidence
 ├── Documents
 ├── Communications
 └── Domain Context
```

Tidak semua tab selalu muncul.

EOS menentukan berdasarkan capability/context.

---

# 20. Final Surface Architecture

Maka FACE v1.0 menjadi:

```text
                         EOS FACE
                            │
             ┌──────────────┴──────────────┐
             │                             │
        PRIMARY FACE                  SECONDARY
             │                             │
       ┌─────┴─────┐              ┌────────┼─────────┐
       │           │              │        │         │
   MY REALITY    WORK           ACTORS   COMMUNITY  PUBLIC
                    │
              ┌─────┴──────┐
              │            │
           WORK ITEM     CONTEXT
              │            │
       ┌──────┼────────────┼──────────┐
       │      │            │          │
     Actor  Domain      Evidence   Capability
       │      │            │          │
       └──────┴────────────┴──────────┘
                    │
                  ACTION
                    │
                  RESULT
                    │
                 EVIDENCE
                    │
                CONTINUE
```

---

# 21. Route Decision Summary

Secara konseptual, matrix sekarang harus bergerak ke arah berikut:

| Surface              | Decision                                   |
| -------------------- | ------------------------------------------ |
| `/`                  | **REDIRECT**                               |
| `/login`             | **POLISH**                                 |
| `/signup`            | **POLISH**                                 |
| `/enter`             | **KEEP + POLISH**                          |
| `/my-reality`        | **KEEP + POLISH**                          |
| `/work`              | **POLISH**                                 |
| `/work/new`          | **POLISH**                                 |
| `/work/[id]`         | **KEEP + POLISH**                          |
| `/work/[id]/trace`   | **HIDE / CONTEXTUAL**                      |
| `/intent/new`        | **HIDE / REDIRECT → /enter**               |
| `/intent/[intentId]` | **HIDE / CONTEXTUAL**                      |
| `/ai-tasks`          | **HIDE**                                   |
| `/profile/[id]`      | **KEEP / CONTEXTUAL**                      |
| `/institution/[id]`  | **KEEP / CONTEXTUAL**                      |
| `/cases*`            | **CONNECT / DOMAIN**                       |
| `/documents*`        | **CONNECT / DOMAIN**                       |
| `/evidence*`         | **CONNECT / DOMAIN**                       |
| `/service-requests*` | **CONNECT / DOMAIN**                       |
| `/people*`           | **CONTEXTUAL / DOMAIN**                    |
| `/quotes*`           | **CONTEXTUAL / DOMAIN**                    |
| `/products*`         | **KEEP / CONTEXTUAL**                      |
| `/community`         | **KEEP / PUBLIC/ECOSYSTEM**                |
| `/lawyershub`        | **KEEP / PUBLIC/MARKETING**                |
| `/readiness`         | **OPERATOR**                               |
| `/workspace`         | **OPERATOR**                               |
| `/api/*`             | **SYSTEM/API — independently adjudicated** |

---

# 22. P0 / P1 / P2

### P0 — Must resolve before rebuild

**P0-01 — Canonical Home**

```text
/ → /my-reality
```

No competing dashboard.

**P0-02 — Canonical Work**

`/work/[id]` remains benchmark.

**P0-03 — Primary navigation**

Only expose actual primary product surfaces.

**P0-04 — Domain/API preservation**

Do not remove domain capabilities simply because navigation disappears.

**P0-05 — Actor neutrality**

FACE must not encode human-only assumptions.

---

### P1 — Resolve during surface-spec stage

* `/intent` consolidation
* `/ai-tasks` contextualization
* domain surface ↔ Work relationship
* `/people` discovery semantics
* product/requirements duplication
* contextual navigation model
* settings reconciliation
* API consumer/deprecation matrix

---

### P2 — Phase 1 rebuild

* visual hierarchy
* responsive behavior
* loading/empty/error
* navigation extraction
* Work list priority
* forms
* duplicate-submit protection
* accessibility
* typography/density
* visual consistency

---

# 23. Critical Correction to the Existing Rebuild Plan

The existing plan says:

> “All other surfaces should either lead to, support, or derive context from a piece of Work.”

I would **replace that principle**.

The better principle is:

> **All authenticated operating surfaces should preserve continuity with EOS Reality and Work, while domain, actor, capability, product, and ecosystem surfaces remain first-class where their independent capability warrants it.**

That distinction matters.

Because otherwise we risk turning:

```text
EOS
```

into:

```text
Work CRUD UI
```

And that is **smaller**, but not necessarily **better EOS**.

---

# 24. Ratification Gate

At this point I would mark:

```text
PHASE 0
FULL APPLICATION RECONCILIATION
        ✓ ACCEPTED

PRODUCT SURFACE ADJUDICATION
        ✓ ADJUDICATED

ARCHITECTURAL CONTRADICTIONS
        ✓ IDENTIFIED

FACE PRIMARY MODEL
        ✓ DEFINED

P0 SURFACE DECISIONS
        ✓ DEFINED

        ↓

EOS FACE PRODUCTION SURFACE SPEC v1.0
        ← NEXT ARTIFACT

        ↓

PHASE 1 UI/UX REBUILD
        LOCKED UNTIL SPEC
```

## Final adjudication verdict

**PRODUCT SURFACE ADJUDICATION: PASS**

**EOS FACE PRODUCTION SURFACE SPEC v1.0: AUTHORIZED FOR CREATION**

**PHASE 1 UI/UX REBUILD: NOT YET AUTHORIZED**

Dan yang paling penting:

> **Tidak ada kebutuhan untuk membuat architecture baru. Tidak ada kebutuhan membuat Control Plane baru. Tidak ada kebutuhan membuat Fabric kedua.**

Kita hanya sedang melakukan **surface compression**:

```text
banyak route
     ↓
lebih sedikit product surfaces
     ↓
contextual capability access
     ↓
satu coherent EOS experience
```

dengan prinsip:

> **Big behind. Simple in front. Capability preserved.**

---

# 25. Phase 1 Authorization Criteria

Phase 1 (UI/UX Rebuild) is formally authorized for execution upon the successful ratification of this document, `EOS FACE PRODUCTION SURFACE SPEC v1.0.md`.

Ratification of this spec confirms that:
1.  The decisions and models contained herein are the single source of truth for the Phase 1 rebuild.
2.  The P0, P1, and P2 items are correctly prioritized.
3.  The engineering team is authorized to commence work on P2 items as defined in this spec.

Upon ratification, the official project gate status will transition to:

```text
EOS FACE PRODUCTION SURFACE SPEC v1.0
        ✓ RATIFIED
        ↓
PHASE 1 UI/UX REBUILD
        🔓 AUTHORIZED
```
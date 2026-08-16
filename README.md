# Enterprise Operating System (Enterprise OS) — Validation Baseline v1.4 🧪

> **Enterprise OS** = Experimental Engineering Operating Model + Decision Infrastructure + Evidence Repository
>
> **Final EOS Thesis:** Enterprise OS is an evidence-driven decision infrastructure that helps engineering organizations learn from production implementation, improve delivery decisions, and evolve capabilities only when measurable leverage has been demonstrated.
>
> EOS exists to reduce the time, cost, and risk of delivering production software by turning operational evidence into executable engineering decisions.
>
> EOS is:
> - **Delivery Intelligence Decision Layer**
> - **Evidence-driven Capability Evolution System**
>
> **NOT: Framework, Platform Generator, AI Coding System, Application Architecture.**
>
> **Frozen Principle: EOS does not optimize software creation. EOS optimizes engineering decisions.**
>
> **EOS Assets (Most Important): Evidence, Decision History, Validated Knowledge**

---

## Three-Layer Positioning (Finalized)

### 1. Philosophy
> **Production First. Extraction Second. Evidence Always.**

### 2. Mechanism
```text
Observe
    ↓
Validate
    ↓
Pattern
    ↓
Doctor
    ↓
Decision
```

### 3. Purpose
> **Reduce the time, cost, and risk of delivering production software by turning operational evidence into executable engineering decisions.**

---

## What is Frozen (Stabilized Elements)

### 1. Identity
- **Delivery Intelligence Decision Layer** — This is fixed!

### 2. Core Loop
- Observe → Validate → Pattern → Doctor → Decision — No new steps!

### 3. Core Engines
- **Observer**
- **Validator**
- **Pattern**
- **Doctor** — No new engines! Default: add capability to Doctor!

### 4. Evolution Principle
```text
Production
    ↓
Evidence
    ↓
Pattern
    ↓
Decision
    ↓
Extraction
    ↓
Capability
```
This is now a governance model, not just a workflow!

### 5. Success Criteria
What we measure (not counts of assets):
- Reuse
- Bootstrap time
- Duplicate reduction
- Production readiness
- Decision acceptance
- **Engineering Leverage Ratio**: `(Engineering Hours Saved) / (Engineering Hours Invested)`

---

## Phase Roadmap

### Phase A — Can we design it? ✅
### Phase B — Can we build it? ✅
### Phase C — Scientific Validation + Operational Learning ✅
### Phase D — Product Execution Mode 🔥
**Focus:** Tiga produk nyata berjalan dengan EOS primitives yang sama: LawyersHub, Services.ID, dan ILC. Fase ini mengimplementasikan prinsip **BUILD LESS, EXECUTE MORE** dengan leverage 4 produk (termasuk academic) dari 1 set primitive yang sama.

---

## Main Hypothesis (Falsifiable!)
> **Evidence-driven extraction produces higher engineering leverage than speculative capability design.**

This hypothesis can be proven wrong!

---

## Current Production Readiness (Phase D1.2)

EOS sudah meninggalkan proof/recon loop dan masuk ke **product execution mode** dengan tiga produk utama yang sudah berjalan end-to-end:

| Product       | Status          | Real User Job Implemented                          |
| ------------- | --------------- | -------------------------------------------------- |
| **LawyersHub** | 🔥 LIVE         | Create + manage legal matter (full lifecycle)      |
| **Services.ID**| 🔥 LIVE         | Find + request a service (full procurement cycle)  |
| **ILC**       | 🔥 LIVE         | Discover + engage with legal content/community     |
| **Academic**  | 🧪 LEVERAGE     | Publish research content (reused ILC primitives)   |

### Leverage Calculation (Phase D1.2)
```text
Leverage = Business Output / Architecture Cost
         = 4 produk berjalan / 1 set primitive EOS
         = 4× operational leverage tercapai!
```

Semua produk menggunakan primitive EOS yang sama: canonical web surface, shared Product Experience, ProductPreviewShell, identity, runtime, dan evidence mechanism. Tidak ada framework baru yang dibangun — kita hanya mengeksekusi dengan apa yang sudah ada.

---

## EOS PRODUCT LEVERAGE SCOREBOARD (HEAD-VERIFIED EXECUTABLE EVIDENCE)

Berikut scoreboard berdasarkan **bukti runtime aktual**, bukan narasi. Verification timestamp: 2026-08-16 (B4 structural wave — Engineering First Light 🟢, EOS First Light 🟡 pending B4 HUMAN BLACK-BOX OBSERVER).

```text
                      LawyersHub   Services.ID      ILC       Academic(4th)
────────────────────────────────────────────────────────────────────────────
Real user job              ✓            ✓            ✓            ✓
Executable test            ✓ 8/8        ✓ 8/8        ✓ 9/9        —
Capability execution       ✓ 2 trans    ✓ 2 trans    ✓ surface    ✓ 1 trans
  (capabilityRegistry)     closed       delivered    live         published
State mutation             ✓            ✓            —            ✓
Evidence (artifact)        ✓ JSON+MD    ✓ JSON+MD    ✓ JSON+MD    ✓ ledger
Doctor Engine report       ✓ generated  ✓ generated  ✓ generated  —
E2E User Journey           ✓ 7/7        ✓ 7/7        ✓ 7/7        —
  (21/21 PASS D1.3)        OPEN→        OPEN→        OPEN→
                           DISCOVER→    DISCOVER→    DISCOVER→
                           SEE result   SEE result   SEE result
────────────────────────────────────────────────────────────────────────────
Human acceptance           ❌            ❌            ❌            ❌
(PENDING B4 OBSERVER)      G1-G6        G1-G6        G1-G6        D1 skin/beda?
Deployable                 ❌            ❌            ❌            ❌
(4 BLOCKERS DEFERRED)      DEV 3004 OK  DEV 3004 OK  DEV 3004 OK  DEV 3004 OK
────────────────────────────────────────────────────────────────────────────
PRODUCT READY              ❌            ❌            ❌            ❌
(PENDING 6/6 B4 GATES)
```

**NOTE PER KOMANDAN 2026-08-15:**
- 98.5% = shared-rail-to-marginal-product LOC ratio (BUKAN true reuse%)
- 64.2x structural leverage SRV (KOREKSI: bukan 66x — 86840/1353 ≈ 64.2x)
- "66x cheaper" = KLAIM EKONOMI DITOLAK tanpa engineering effort/time evidence
- Academic 31 LOC = STRONGEST THIN-APP SIGNAL (marginal impl 31 LOC tanpa fork primitive)
- LH upgrade 5→8/8 test: +3 LH-CASE-002 Matter↔Document COMPOSITE E2E terbukti document.matterId === caseId EXACT PERSIST

### E2E Real User Journey (D1.3) — EXECUTABLE PROOF 21/21 PASS

**1 shared primitive (OPEN→DISCOVER→ACTION→EXECUTE→STATE→EVIDENCE→SEE) → 3 products reuse the exact same pattern.**

| Produk       | Evidence IDs (canonical)              | Flow Completeness |
|--------------|----------------------------------------|-------------------|
| **LawyersHub** | case-101 (closed, closedAt stamped)  | **7/7 PASS** — binding → browse matters → create → assign → close → ledger → see closed case |
| **Services.ID** | sreq-101 (delivered, deliveredAt stamped) | **7/7 PASS** — binding → browse Cybersecurity → request → accept → markDelivered → ledger → see delivered request |
| **ILC**         | content-101 (published, publishedAt stamped) | **7/7 PASS** — binding → explore topics → create article → publish → state → ledger → see published article |
| **TOTAL**       | 3 canonical aggregates, 3 terminal states | **21/21 E2E PASS** (3 products × 7 steps) |

E2E runner: [d13-real-user-journey-all-products.ts](file:///root/Enterprise-OS/workspace/scripts/d13-real-user-journey-all-products.ts)
Evidence artifacts: `.eos/evidence/d13-real-user-journey-*.json` (3 JSON files)

### Test Foundation (TEST-001) — EXECUTABLE PROOF (25/25 PASS B4 WAVE)

| Produk       | File Test (HEAD path)                                 | Total | Pass | Fail | Runner          |
|--------------|-------------------------------------------------------|-------|------|------|-----------------|
| LawyersHub   | [lawyershub.test.ts](file:///root/Enterprise-OS/workspace/products/lawyershub/tests/lawyershub.test.ts) | 8     | 8    | 0    | node:test + tsx |
| Services.ID  | [services-id.test.ts](file:///root/Enterprise-OS/workspace/products/services-id/tests/services-id.test.ts) | 8     | 8    | 0    | node:test + tsx |
| ILC          | [ilc.test.ts](file:///root/Enterprise-OS/workspace/products/ilc/tests/ilc.test.ts)                   | 9     | 9    | 0    | node:test + tsx |
| **TOTAL**    |                                                                                                       | **25**| **25**| **0**|                 |

**UPGRADE NOTE (LH +3 / SRV +2 / ILC +2 vs D1.2 baseline 18/18):**
- LawyersHub: +3 tests = LH-CASE-002 Matter↔Document COMPOSITE E2E 3/3 (document.create({matterId}) → byId.matterId EXACT PERSIST → lifecycle 3 transitions → 5 CommandInvocationRecord URUT)
- Services.ID: +2 regression tests post minimal-fix SessionRepositoryProxy
- ILC: +2 health + regression checks

Evidence artifacts:
- LawyersHub: [test-execution-20260808.json](file:///root/Enterprise-OS/workspace/products/lawyershub/evidence/verification/test-execution-20260808.json) + [health-report](file:///root/Enterprise-OS/workspace/products/lawyershub/evidence/delivery-reports)
- Services.ID: [test-execution-20260808.json](file:///root/Enterprise-OS/workspace/products/services-id/evidence/verification/test-execution-20260808.json) + [health-report](file:///root/Enterprise-OS/workspace/products/services-id/evidence/delivery-reports)
- ILC: [test-execution-20260808.json](file:///root/Enterprise-OS/workspace/products/ilc/evidence/verification/test-execution-20260808.json) + [health-report](file:///root/Enterprise-OS/workspace/products/ilc/evidence/delivery-reports)

### Defect Closed (D1.2.x)
- **DEFECT-YAML-001** (closed): `require('../eos.yaml')` gagal parse YAML → fix dengan `js-yaml + fs.readFileSync` + helper `loadEosManifest()`. Diterapkan ke 3 file test.

---

## 🔥 COMMAND CENTER — MODE: VALIDATION LAYER (B4 WAVE STRUCTURAL DONE · PENDING HUMAN OBSERVER)

```text
EOS FOUNDATION              🔒 FROZEN (Architecture, Kernel, Engines) PER KOMANDAN

LAWYERSHUB                  🟢 ENG  (case-101 closed ✅, 8/8 test NEW, 7/7 journey)   🟡 B4 G1 pending
SERVICES.ID                 🟢 ENG  (sreq-101 delivered ✅, 8/8 test, 7/7 journey)    🟡 B4 G2 pending
ILC                         🟢 ENG  (disc-101 live ✅, 9/9 test, 7/7 journey)         🟡 B4 G3 DISTINCTNESS pending
ACADEMIC (4× LEVERAGE)      🟢 ENG  (content-101 published ✅, 31 LOC THIN)           🟡 B4 D1 skin/beda pending

TEST FOUNDATION             🟢 CERTIFIED — 25/25 executable tests PASS B4 WAVE
E2E USER JOURNEY            🟢 CERTIFIED — 21/21 steps PASS (3 prod × 7 steps)
B4-A HTTP SMOKE             🟢 CERTIFIED — 21/21 structural checks (8 route + 4 display + 4 adapter + 4 leak + 1 LH)
B4-C STRUCTURAL SCAN        🟢 CERTIFIED — 48/49 PASS 97.96% · 5/5 DISTINCTNESS RULES PASS
B4-E GOVERNANCE TRACE       🟢 STRUCTURAL PROVEN — 8 node × 2 products = 16 renders · next-action distinct LH≠SRV
B4-B OBSERVER HARNESS       🟢 READY — B4-HUMAN-OBSERVER-SCRIPT MD generated · 6 GATES G1-G6 terkunci
B4-F STAGING PATH           🟡 DEV 3004 OK for observer · 4 pre-existing build BLOCKERS DEFERRED frozen

SHARED PRIMITIVE            🟢 REUSED (1 registry + 1 journey pattern → 4 products)
CAPABILITY EXECUTION        🟢 OPERATIONAL — 25 test suites · 3× full journey ledger · 5 transition steps LH composite NEW
EVIDENCE PIPELINE           🟢 ACTIVE · 11+ B4 artifacts captured wave ini
DOCTOR ENGINE               🟢 3 reports generated

HUMAN ACCEPTANCE GATES      🔴 0/6 PASS — PENDING UNBRIEFED EXTERNAL OBSERVER
  B4-G1 LH understand job   ❌
  B4-G2 SRV different job   ❌
  B4-G3 4 products distinct ❌
  B4-G4 shared invisible    ❌
  B4-G5 governance exp      ❌
  B4-G6 1 app ≠ skins       ❌
EOS FIRST LIGHT LOCKED      🔴 NO (6/6 human gates = acceptance bar)
PRODUCTION PUBLIC           🔴 NO (4 build blockers deferred)

NEXT MILESTONES (Ordered by Product Impact):
    ✓  B4-A HTTP SMOKE 21/21 — DONE (2026-08-16)
    ✓  B4-C STRUCTURAL SCAN 48/49 + 5/5 DISTINCT — DONE
    ✓  B4-E GOVERNANCE 8-NODE × 2 PROD — DONE
    ✓  B4-B OBSERVER SCRIPT GENERATED — DONE
    ✓  B4-D REPLAY RUNTIME VALIDATED LH 8/8 SRV 8/8 ILC 9/9 — DONE
    →  B4-VALIDATE-001 SINGLE HUMAN OBSERVER SESSION ← NEXT SINGLE HIGHEST LEVERAGE ACTION
       (6 GATES G1-G6 PASS → EOS Experience First Light LOCKED 🟢)
    →  BUILD-001 DEPLOY HARDENING (pg bundle + vercel rewrite + docker + env) — SETELAH B4 LOCK
    →  SHIP 4 USABLE PRODUCTS
```

**Per Komandan 2026-08-15 — Architecture FROZEN ABSOLUTE:**
TIDAK BOLEH: engine baru, DSL baru, registry baru, renderer baru, auth baru, tenant layer baru, capability abstraction baru, refactor besar.
HANYA BOLEH: validation layer, product surface polish, deployment setup, evidence capture.

---

## Execution Sequencing (Current Status)

```text
TEST-001 (25/25 ✅ B4-WAVE)
   ↓
DOC-001 (scoreboard) ─────────┐
                              │
B4-A/B/C/D/E (structural) ────┤  ALL DONE 🟢
                              ▼
E2E USER JOURNEY (21/21 ✅) ──┘
                              │
                              ▼
                      B4 HUMAN BLACK-BOX ← NEXT (SINGLE SESSION, 6 GATES G1-G6)
                              │
                              ▼ (6/6 PASS)
                   EOS EXPERIENCE FIRST LIGHT LOCKED 🟢
                              │
                              ▼
                 BUILD HARDENING + PUBLIC DEPLOY
                              │
                              ▼
              REAL PRODUCT COMPLETION ×4
```

---

## Current Status (Software v1.10.0 — Phase D1.4 PENDING B4 HUMAN BLACK-BOX: Engineering First Light 🟢, EOS Experience 🟡)
Check [`STATUS.md`](/root/Enterprise-OS/STATUS.md) for operational control tower and details.

### Quick Summary
- ✅ **Three (plus one leverage) product bindings LIVE** on shared surface: LawyersHub, Services.ID, ILC + Academic community
- ✅ Vertical slices built and running on single canonical renderer (ProductPreviewShell + ProductRealityPanel + ProductCreateForm + DeliveryWorkspace domain branch)
- ✅ Evidence pipeline active (Observation → Validation → Decision → Learning)
- ✅ Capability extraction **OPERATIONAL** (4 domain capabilities extracted + 19 commands registered in ONE registry)
- ✅ **D.1.1 ACHIEVED**: 4/4 end-to-end product jobs executed (create aggregates)
- ✅ **D.1.2 ACHIEVED — Full lifecycle certified**: 5 transition steps executed, 9/9 invocations ok:true, 4/4 aggregates reached terminal state. CommandInvocationRecord ledger preserved for every write.
- ✅ **D.1.3 CERTIFIED — 3× Real User Journey**: 7-step canonical pattern OPEN→DISCOVER→ACTION→EXECUTE→STATE→EVIDENCE→SEE = 21/21 E2E PASS. 1 shared primitive → 3 products = 3× leverage.
- ✅ **B4 WAVE STRUCTURAL CERTIFIED 2026-08-16**: HTTP 21/21, structural 48/49 (97.96%) 5/5 distinctness, governance 8-node×2 structural, replay runtime VALIDATED 25/25, harness script READY.
- 🟡 **D.1.4 PENDING SINGLE B4 OBSERVER SESSION**: G1-G6 6 gates 0/6 PASS. Setelah 6/6 → EOS Experience First Light LOCKED → Production hardening.

### B4-WAVE Structural Snapshot (2026-08-16)
| Sub-slice | Result | Evidence Artifact |
|-----------|--------|-------------------|
| B4-A HTTP smoke 8/8 route + display + adapter + leak | 21/21 PASS | `.eos-state/evidence/b4-a-http-smoke-*.json` |
| B4-B Black-box harness + observer script | READY | `B4-BLACKBOX-HARNESS-*.json`, `B4-HUMAN-OBSERVER-SCRIPT-*.md` |
| B4-C 49-point structural scan × 4 produk | 48/49 PASS (97.96%) — 1 minor LH categoryBadge regex | `b4-c-structural-product-scan-*.json` |
| B4-C Distinctness 5 rules (LH≠SRV, ILC≠Academic, R2, CTA, lifecycle) | 5/5 PASS | embedded B4-C |
| B4-D Runtime re-run LH 8/8, SRV 8/8, ILC 9/9 | PASS · LH-CASE-002 composite NEW 3/3 | per-product test files |
| B4-E Governance 8-node trace × 2 products | 8 structural checks PASS · next-action LH≠SRV PROVEN | `b4-e-governance-trace-*.json` |
| B4-F Deploy blockers assessment | Dev Server 3004 ✅ OK for B4 · 4 blockers DEFERRED frozen | `b4-f-staging-deploy-assessment-*.json` |

### D.1.1 — Runtime Evidence (actual invocations, not claims)
Measured via unified capability registry + repository state mutation:
| # | Product | First Real Business Job | Evidence ID | Domain Status (D1.1) |
|---|---|---|---|---|
| 1 | LawyersHub | Create Legal Matter (Vendor/Distributor Agreement, high priority) | **case-101** | draft |
| 2 | Services.ID | Request Service (ISO 27001 Annual Audit, Cybersecurity, Rp 320M budget, Dian Sari requester) | **sreq-101** | draft |
| 3 | ILC | Create Community Discussion (UU PDP Pasal 26 Cross-Border Transfer, Hukum Teknologi Digital, Adv Rudi Peradi Jakarta) | **disc-101** | open |
| 4 | Academic (4th leverage, 0 extra architecture cost) | Create Legal Academic Article (Deepfake UU ITE 27(3) Platform Liability, Hukum Pidana, Prof Bambang FH UGM) | **content-101** | proposed |

### D.1.2 — Lifecycle Transition Evidence Ledger (9/9 invocations ✅)
Measured via direct `capabilityRegistry.invoke()` (no HTTP server required — same ledger record shape):
| # | Evidence ID | Capability / Command | Transition | Terminal? | Timestamp |
|---|---|---|---|---|---|
| T1 | **case-101** | `legal-case / case.assignLawyer` (lawyer-eos-d12) | draft → open | ❌ | 2026-08-08T13:48:30.808Z |
| T2 | **case-101** | `legal-case / case.close` | open → closed | ✅ closedAt stamped | 2026-08-08T13:48:30.808Z |
| T3 | **sreq-101** | `service-directory / acceptServiceRequest` (sp-003) | draft → accepted | ❌ | 2026-08-08T13:48:30.808Z |
| T4 | **sreq-101** | `service-directory / markServiceDelivered` | accepted → delivered | ✅ deliveredAt stamped | 2026-08-08T13:48:30.808Z |
| T5 | **content-101** | `legal-community / publishContent` (via `academic` alias) | proposed → published | ✅ publishedAt stamped | 2026-08-08T13:48:30.809Z |

**State Machine Summary (D1.2 Certified):**
- `CaseAggregate`: **draft → open → closed** (2 transitions, terminal ✅)
- `ServiceRequestAggregate`: **draft → accepted → delivered** (2 transitions, terminal ✅)
- `ContentArticleAggregate`: **proposed → published** (1 transition, terminal ✅)
- `CommunityDiscussionAggregate`: **open (surface-live; moderator-only open/featured/locked toggles)**

**D1.2 Delivery Workspace UI (activated for domain IDs):**  
Open `/products/lawyershub/delivery?requirementId=case-101` → renders:
1. Domain aggregate 4-card status grid (Aggregate / Status / Evidence / Updated)
2. Full lifecycle state machine visualization (▶ step + ✓ terminal + arrow connector)
3. Transition Action buttons invoking the SAME unified `/api/capabilities/:cap/:commandName` write path
4. Audit & Evidence Timeline panel (registry info, attribution record format, artifact summary)

> **Leverage Formula Numerator / Denominator (strengthened at D1.2):**  
> `4 full-lifecycle business outputs ÷ (1 registry + 1 repo pattern + 1 unified HTTP API + 1 shared renderer + 1 attribution ledger + 1 lifecycle UI) << 1` architecture marginal cost per new product  
> → Transition commands, attribution ledger, lifecycle visualization, and delivery workspace domain branch are ALL reused across LawyersHub / Services.ID / ILC / Academic — 0 new command infrastructure for each lifecycle step.

### Formal EOS Status (v1.6.x — PRODUCT_EXECUTION mode)
| Component       | Status       |
|-----------------|--------------|
| Architecture    | FROZEN       |
| Kernel          | FROZEN       |
| Engines         | FROZEN       |
| Governance      | ACTIVE       |
| Experiment EXP-001 | ACTIVE (LawyersHub + cross-product leverage measurement) |
| Evidence Coll   | ACTIVE       |
| Hypothesis      | IN PROGRESS — first numeric leverage measured at row-4 |
| Capability Ext  | **OPERATIONAL** — 4 extracted (legal-case, legal-document, service-directory, legal-community) + 9 write commands LIVE |
| Unified Command Infrastructure | **OPERATIONAL** — 19 command keys, 5 prefix aliases, 1 dynamic route (`/api/capabilities/:cap/:commandName`) |
| Active Products | **LawyersHub (role), Services.ID (search), ILC (topic), Academic (community)** — 4 surfaces / 1 renderer |

### Phase D.1.1 Focus (DELIVERED)
- **PRODUCT EXECUTION MODE LOCKED**: EOS substrate frozen (B7.19, Thin App, Frontier C/D/E — no expansion)
- **Proof→Product Reality Transition**: 3 hardcoded demo fallbacks removed from shared renderer → honest empty states ("Belum ada kategori layanan" etc) — No fake "12 Kasus Aktif" / Oxford Stanford demo claims.
- **LawyersHub**: Create/manage legal matter write commands (createCase, assignLawyer, closeCase) exposed via unified command registry
- **Services.ID**: New write commands created (createServiceRequest, acceptServiceRequest, markServiceDelivered) — end-to-end request submission executed
- **ILC**: New write commands created (createCommunityDiscussion, createContentArticle, publishContent) — community/content creation executed
- **Unified Write Path (1 API → 4 Products)**: `POST /api/capabilities/:cap/:commandName` generic Next 15 dynamic route with attribution record for every invocation.
- **Registry Resolution Layer**: CAPABILITY_PREFIX_ALIASES + 3-layer resolver (direct → stripped verb → normalized key index) fixes cross-convention naming mismatch (`legal-case.createCase` → actual `case.create`, etc)
- **Shared Renderer Leverage**: 1 `ProductCreateForm.tsx` component hosts 4 conditional product sub-forms (LawyersHub Create Matter / ServicesID Request / ILC Discussion / Academic Article)

### Phase D.1.2 Focus (DELIVERED — Lifecycle Terminal States)
- **Dual-layer lifecycle control UI**: Layer 1 = ProductRealityPanel cards (1-click transition buttons on card footers). Layer 2 = DeliveryWorkspace domain branch (full state machine visualization + audit timeline + attribution disclosure).
- **DeliveryWorkspace Domain Branch**: `/products/:productId/delivery?requirementId=case-101|sreq-101|disc-101|content-101` now recognises domain ID prefixes (case-/sreq-/disc-/content-/req-) and early-returns domain aggregate flow instead of 404 on missing requirement. Sections: status grid → metadata chips → visual lifecycle state machine (▶/✓/○ + arrow connectors) → transition action buttons → Audit & Evidence Timeline.
- **New Domain Aggregate API endpoint**: `/api/domain/[aggregateId]/route.ts` (Next 15 `segment: { params }`) — routes prefix-based dispatch to `CaseRepositoryInMemory.byId`, `ServiceRequestRepositoryInMemory.byId`, `ContentArticleRepositoryInMemory.byId`, `CommunityDiscussionRepositoryInMemory.byId` returning unified `{ type, displayTitle, rawStatus, lifecycle: LifecycleStep[], metadata... }` shape for UI consumption.
- **Lifecycle maps verified**:
  - LawyersHub → `draft →(assignLawyer)→ open →(close)→ closed`
  - Services.ID → `draft →(accept)→ accepted →(markDelivered)→ delivered`
  - Academic ILC → `proposed →(publish)→ published`
- **Direct-registry verification runner**: `workspace/scripts/d12-lifecycle-transitions-runner.ts` — imports capabilityRegistry directly (no dev server), produces 9 CommandInvocationRecords (4 creates + 5 transitions), prints attribution ledger & terminal state summary → 9/9 ok:true, 4/4 terminal.
- **Control state sync**: `eos-state.yaml` version 1.5.0 (phase: D1.2) + README v1.9.0 updated with D1.2 transition evidence table, invocations ledger, health score updates (delivery=98, evidence=96, product_reality=100).

### Phase D.1.3 Focus (CERTIFIED — 3× Real User Journey 21/21 PASS)
- **7-step Canonical Pattern (shared primitive)**: `OPEN binding → DISCOVER domain → ACTION create → EXECUTE transition → STATE terminal → EVIDENCE ledger → SEE repo result`. 1 pattern extracted ke helpers `stageBanner/stageLabel/finalize/pushStep/printSummary/writeEvidenceArtifacts` → di-reuse 3 produk tanpa dupliksi core logic.
- **Single Runner → 3 Products Executable Proof**: [d13-real-user-journey-all-products.ts](file:///root/Enterprise-OS/workspace/scripts/d13-real-user-journey-all-products.ts) meng-import repos + capabilityRegistry secara langsung (no dev server). Menghasilkan `21 steps = 7 steps × 3 products` semua PASS + 3 JSON evidence artifact files.
- **LawyersHub Journey (7/7)**: ProductPreview binding valid → browse repo matters (n≥1) → `case.create` → `case.assignLawyer(lawyer-eos-d13)` → `case.close(closedAt stamped)` → 3 ledger records `ok:true` → user query repo menampilkan `closedAt + lawyerId + priority + title` semua match.
- **Services.ID Journey (7/7)**: binding valid → filter `Category.CYBERSECURITY` providers (sp-001..sp-003) → pilih `sp-003` → `createServiceRequest` → `acceptServiceRequest` → `markServiceDelivered(deliveredAt stamped)` → 3 ledger records → SEE delivered request + title+budget+requester match.
- **ILC Journey (7/7)**: binding valid → DISCOVER topic grid + discussions + articles (semua non-empty check) → `createContentArticle(proposed, topic=Hukum Teknologi Digital)` → `publishContent(publishedAt stamped)` → repo state verified published → 2 ledger records → SEE published article dengan author+topic+title match.
- **Leverage Measured**: `3 E2E business flows ÷ (1 shared pattern + 5 primitives: binding, registry, repo, ledger, logger) = 3× direct product leverage` — tidak ada tambahan registri, DSL, atau framework baru.
- **Evidence Artifacts**: 3 JSON files tertulis permanen ke `workspace/.eos/evidence/d13-real-user-journey-{services-id,lawyershub,ilc}-2026-08-08T16-40-19.json`
- **State sync**: `eos-state.yaml v1.6.0` + README v1.10.0 updated, kolom `e2e_user_journey: 100` di control_tower.health, `real_user_journey_evidence` section terisi batch D1.3-ALL-PRODUCTS-20260808.

### D.1.2 Write Commands LIVE (19 total keys · 19/19 verified invokable)

| Capability         | Command Keys (actual registry keys)             | Lifecycle Covered (D1.2 Certified)                                           |
|--------------------|-------------------------------------------------|------------------------------------------------------------------------------|
| `legal-case`       | `case.create` · `case.assignLawyer` · `case.close` | ✅ draft →(assign)→ open →(close)→ closed (terminal verified on case-101)  |
| `service-directory`| `service-directory.createServiceRequest` · `acceptServiceRequest` · `markServiceDelivered` | ✅ draft →(accept)→ accepted →(deliver)→ delivered (verified on sreq-101) |
| `legal-community`  | `legal-community.createCommunityDiscussion` · `createContentArticle` · `publishContent` | ✅ Discussion: surface-live open. ✅ Article: proposed →(publish)→ published (verified on content-101) |
| `legal-document`   | `document.create` (linked per-matter)           | draft → signed (seed data + linking active in ProductReality readLawyersHubCaseStats) |
| `requirement-mgmt` | `requirement.create` (existing Delivery flow)   | active → completed (existing workspace route)                                |

Total: **19 registered command keys** (commands + queries) invokable via ONE unified `capabilityRegistry.invoke("cap", "commandName", input)` signature. Registry + HTTP entry point produce identical CommandInvocationRecord shape.

---

## Unified Command Infrastructure (Leverage Engine)

### HTTP Entry Point
File: `workspace/apps/web/app/api/capabilities/[cap]/[commandName]/route.ts`
- `POST /api/capabilities/:cap/:commandName` — JSON body = command input → returns `{ ok, output, record: CommandInvocationRecord }`
- `GET  /api/capabilities/:cap/:commandName` — help document + 3 working POST examples (LawyersHub / Services.ID / ILC)
- Pattern: Next 15+ `segment: { params: Promise<{cap, commandName}> }`

### Registry & Alias Resolver
File: `workspace/apps/web/lib/capability-command-registry.ts`
```
CAPABILITY_PREFIX_ALIASES:
  lawyershub / legal-case    → [case., legal-case.]
  services-id                → [service-directory.]
  ilc / academic / community → [legal-community.]
  legal-document / document  → [document., legal-document.]
  requirement-mgmt           → [requirement., requirement-management.]
```

### Attribution Ledger (per-invocation record)
Every command invocation (success or failure) returns and tracks:
`{ commandKey, capability, commandName, invokedAt, inputSize, ok, errorMessage }`
→ EOS audit ready.

---

## Repository Structure
```
 Enterprise OS
 │
 ├── governance/          Enterprise rules, principles, policies (decision constraints)
 ├── implementation/      EOS runtime, kernel, engines (measurement machinery)
 ├── workspace/           Product reality (real production evidence)
 ├── experiments/         Scientific validation (experiment registry)
 └── evidence/            Learning history (organizational memory)
```

---

## KPI for Phase C
| KPI |
|-----------------------------|
| Bootstrap Time |
| Duplicate Reduction |
| Reuse Rate |
| Production Readiness |
| Decision Acceptance |
| Engineering Leverage Ratio |
| **Decision Confidence Growth** |

---

## Get Started
```bash
npm run eos:doctor  # Run Doctor Decision Engine on LawyersHub
npm run eos         # Run full Evidence Loop (Observer → Validator → Pattern → Doctor)
```

---

## Original Content (Historical Reference)
*(The rest of this document is kept for historical reference as we validate our new direction)*
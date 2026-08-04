# EOS CLI Architecture Gap Report

Status: Draft
Owner: Enterprise Architecture / Tooling
Depends on: `EOS-CLI-ARCHITECTURE-CONFORMANCE-ASSESSMENT.md`
Scope: `workspace/packages/tooling/eos-cli`

## 1. Purpose

Dokumen ini merangkum gap arsitektur yang ditemukan dari Architecture Conformance Assessment.

Setiap gap dirumuskan sebagai matriks ownership:

- capability / area
- expected owner
- current owner
- leaked responsibility
- target owner
- constitutional reason
- evidence
- severity

Dokumen ini masih **bukan roadmap** dan **bukan strategi transformasi**.

Interpretasi gap pada dokumen ini berbasis **responsibility leakage terhadap
charter**, bukan berbasis ukuran file, banyaknya helper, atau banyaknya I/O.
Indikator teknis hanya dipakai bila membantu menunjukkan ownership yang bocor.

## 2. Gap Register

### Gap 1 — Knowledge Ownership and Readout

| Field | Value |
| --- | --- |
| Area | `Knowledge Readout` |
| Expected Owner | bounded context `knowledge` sebagai SSOT projection owner; downstream hanya consume/readout |
| Current Owner | ownership knowledge downstream masih transitif melalui `learning` pada sebagian alur |
| Leaked Responsibility | ownership knowledge projection belum sepenuhnya berada pada `knowledge`; downstream masih mengambil knowledge via `learning` fallback |
| Target Owner | `src/knowledge/*` sebagai source of truth projection yang dikonsumsi langsung oleh `foundation`, `gate`, lalu `eos-cli` |
| Status | `NON-CONFORM` |
| Constitutional Reason | Melanggar Responsibility Map karena `eos-cli` dan downstream belum sepenuhnya mengonsumsi `knowledge` sebagai bounded context yang mandiri |
| Evidence | `src/foundation/registry/foundation-producer-registry.ts` masih memakai `context.decision.knowledgeRegistryEntries ?? learning.materialized.knowledgeRegistry.entries`; `src/learning/runtime/intelligence-runtime.ts`; `src/knowledge/*` |
| Severity | `P0 architecture gap` |
| Affected Files | `src/learning/runtime/intelligence-runtime.ts`, `src/knowledge/*`, `src/foundation/registry/foundation-producer-registry.ts` |

### Gap 2 — Gate Operation Responsibility Leakage

| Field | Value |
| --- | --- |
| Area | `Gate Operation` |
| Expected Owner | `gate` runtime/projection/evidence/repository boundary; `gate-c` hanya operator console |
| Current Owner | `src/gate/commands/gate-c.ts` masih memegang ownership operasional yang seharusnya hidup di boundary `gate` |
| Leaked Responsibility | source resolution, artifact inventory/hash, subject loading, projection assembly |
| Target Owner | `src/gate/runtime/*`, `src/gate/projections/*`, `src/gate/evidence/*`, `src/gate/repositories/*`, `src/gate/bundles/*` sesuai jenis responsibility |
| Status | `PARTIAL` |
| Constitutional Reason | Capability ini sah, tetapi command masih mengambil ownership yang seharusnya hidup di repository, evidence, dan projection boundary `gate` |
| Evidence | `src/gate/commands/gate-c.ts` masih mendefinisikan `readText`, `readYamlRecord`, `writeYaml`, `computeArtifactInventory`, `loadSubjectDefinition`, `buildAcceptanceAuditRuntimeDeps`, `buildAcceptanceReportDeps`, `buildRunComparisonDeps`, `buildRunMaterializationDeps`, `buildInputFixtureDeps`, dan `buildGateCStatusProjection` |
| Severity | `P1 architecture gap` |
| Affected Files | `src/gate/commands/gate-c.ts`, `src/gate/projections/*`, `src/gate/evidence/*`, `src/gate/repositories/*` |

### Gap 3 — Foundation Verification Responsibility Leakage

| Field | Value |
| --- | --- |
| Area | `Verify Foundation` |
| Expected Owner | `foundation` runtime/registry/materializer boundary; command verification foundation hanya mengorkestrasi |
| Current Owner | `src/foundation/commands/verify-foundation.ts` masih memegang ownership verifikasi lintas domain |
| Leaked Responsibility | cross-domain composition, report building, artifact writing |
| Target Owner | `src/foundation/runtime/*` dan `src/foundation/registry/*` sebagai owner verifikasi foundation |
| Status | `PARTIAL` |
| Constitutional Reason | Capability valid, tetapi command masih mengambil ownership verifikasi lintas domain yang seharusnya berada pada runtime/materializer resmi |
| Evidence | `src/foundation/commands/verify-foundation.ts` memanggil `readYamlArtifact`, `buildArtifactRegistryModel`, `buildArtifactGraph`, `buildArtifactGraphHealth`, `materializeGuardrailReport`, `buildSpecExecutionAudit`, dan banyak `writeJsonArtifact` |
| Severity | `P1 architecture gap` |
| Affected Files | `src/foundation/commands/verify-foundation.ts`, `src/foundation/runtime/*`, `src/foundation/registry/*` |

### Gap 4 — Execution and Capability Planning Ownership Leakage

| Field | Value |
| --- | --- |
| Area | `Execution Flow`, `Capability Discovery / Planning` |
| Expected Owner | execution/capability runtime-model-materializer boundary; command hanya mengoperasikan flow resmi |
| Current Owner | `src/commands/execution.ts` dan `src/commands/capability-registry.ts` masih memegang ownership operasional inti |
| Leaked Responsibility | `execution.ts`: schema, state machine, status derivation, persistence; `capability-registry.ts`: governance budget, summary builder, fallback selection, artifact writing |
| Target Owner | execution runtime/model boundary dan capability runtime/model/materializer boundary |
| Status | `PARTIAL` |
| Constitutional Reason | Capability ini sah menurut charter, tetapi command masih menjadi owner untuk logic operasional inti yang seharusnya hidup di runtime/model/materializer |
| Evidence | `src/commands/execution.ts` mendefinisikan `CapabilityPrioritySchema`, `CapabilityRegistrySchema`, `buildExecutionStatusReadModel`, `writeExecutionStatusReadModel`, `persistRegistryAndRefreshStatus`; `src/commands/capability-registry.ts` mendefinisikan `buildCapabilityGovernanceDebtBudget`, `buildRegistrySummaryMarkdown`, `loadExecutionGraphSnapshot`, `writeJson`, dan menulis evidence artifacts |
| Severity | `P2 architecture gap` |
| Affected Files | `src/commands/execution.ts`, `src/commands/capability-registry.ts` |

### Gap 5 — Verification Ownership Leakage Outside Foundation

| Field | Value |
| --- | --- |
| Area | `Verify Constitution`, `Verify Product`, `Verify Portfolio` |
| Expected Owner | verification runtime/materializer boundary per capability; command hanya memicu verification resmi |
| Current Owner | `src/commands/verify-constitution.ts`, `src/commands/verify-product.ts`, `src/commands/verify-portfolio.ts` |
| Leaked Responsibility | `verify-constitution`: source resolution, artifact writing, verification artifact assembly; `verify-product`: process orchestration, source resolution, artifact writing, verification summary; `verify-portfolio`: aggregation, status derivation, summary building |
| Target Owner | verification runtime/materializer/repository boundary per capability di bawah bounded context terkait |
| Status | `PARTIAL` |
| Constitutional Reason | Capability verification sah menurut charter, tetapi command masih mengambil ownership yang lebih luas dari sekadar memicu verification flow resmi |
| Evidence | `src/commands/verify-constitution.ts` memakai `resolveProjectionStorageLocation`, `existsSync`, banyak `writeJsonArtifact`; `src/commands/verify-product.ts` memakai `existsSync`, `readWorkspaceCapabilities`, `readProductCompositionManifest`, beberapa `runCommand`, `writeJsonArtifact`, `writeTextArtifact`, `materializeVerificationSummaryMarkdown`; `src/commands/verify-portfolio.ts` mendefinisikan `readYamlFile`, `buildProductEvidence`, `resolvePortfolioProducts`, `buildPortfolioStatus`, `buildSummaryMarkdown`, dan penulisan artefak hasil |
| Severity | `P2 architecture gap` |
| Affected Files | `src/commands/verify-constitution.ts`, `src/commands/verify-product.ts`, `src/commands/verify-portfolio.ts` |

### Gap 6 — Materialization Ownership Boundary Leakage

| Field | Value |
| --- | --- |
| Area | `Materialization` |
| Expected Owner | materializer/evidence boundary resmi per bounded context; command hanya trigger/readout |
| Current Owner | ownership materialization masih tersebar antara runtime/evidence boundary dan beberapa command |
| Leaked Responsibility | artifact writing dan report building masih sebagian berada di command |
| Target Owner | materializer/evidence boundary resmi per bounded context |
| Status | `PARTIAL` |
| Constitutional Reason | `eos-cli` boleh materialize sebagai operational console, tetapi tidak boleh menjadi owner artifact family atau framework generik |
| Evidence | pola `writeJsonArtifact`/`writeTextArtifact` masih muncul pada command verification dan operation; materialization resmi juga hidup di `src/foundation/runtime/*`, `src/gate/evidence/*`, `src/projection/runtime/index.ts` |
| Severity | `P2 architecture gap` |
| Affected Files | `src/foundation/runtime/*`, `src/gate/evidence/*`, `src/projection/runtime/index.ts`, beberapa command |

### Gap 7 — Transitional Shim Surface

| Field | Value |
| --- | --- |
| Area | compatibility shim / top-level export surface |
| Expected Owner | bounded-context export surface resmi |
| Current Owner | top-level shim re-export masih menjadi permukaan konsumsi transisional |
| Leaked Responsibility | ownership surface impor masih ambigu, walau bukan leakage domain logic langsung |
| Target Owner | import path bounded-context resmi sebagai satu-satunya surface stabil |
| Status | `PARTIAL` |
| Constitutional Reason | Tidak melanggar positioning langsung, tetapi mempertahankan ambiguity permukaan konsumsi |
| Evidence | top-level `src/*.ts` shim files |
| Severity | `P3 architecture gap` |
| Affected Files | top-level `src/*.ts` shim files |

## 3. Interpretation Rule

Severity pada dokumen ini **bukan urutan roadmap final**.

Severity hanya menyatakan:

- seberapa besar gap terhadap charter
- seberapa jauh kondisi saat ini dari responsibility/capability target

Dokumen ini berhenti pada registrasi gap ownership yang tervalidasi terhadap
charter dan implementasi nyata.

# EOS CLI Architecture Conformance Assessment

Status: Draft
Owner: Enterprise Architecture / Tooling
Depends on:
- `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md`
- `EOS-CLI-RESPONSIBILITY-MAP.md`
- `EOS-CLI-CAPABILITY-MAP.md`
Scope: `workspace/packages/tooling/eos-cli`

## 1. Purpose

Dokumen ini mengaudit kondisi aktual `packages/tooling/eos-cli` terhadap standar
konstitusional yang telah ditetapkan di:

- Positioning Charter
- Responsibility Map
- Capability Map

Dokumen ini **bukan roadmap** dan **bukan backlog**.

Tujuan dokumen ini:

1. menilai apakah implementasi saat ini sudah sesuai dengan mandat `eos-cli`
2. mengidentifikasi capability yang:
   - `CONFORM`
   - `PARTIAL`
   - `NON-CONFORM`
3. membentuk matriks ownership capability yang tervalidasi terhadap implementasi nyata

## 2. Assessment Method

Assessment ini **tidak** didasarkan pada ukuran file, jumlah helper, atau jumlah
operasi I/O semata. Indikator-indikator tersebut hanya dipakai bila membantu
menemukan evidence, tetapi **bukan** dasar judgment.

Assessment ini didasarkan pada pertanyaan charter berikut:

- apakah command `eos-cli` bertindak sebagai orchestration surface
- atau command mengambil ownership domain yang seharusnya hidup di runtime,
  repository, projection, evaluator, atau materializer

Setiap capability dinilai dengan format:

```text
Capability
    ->
Charter Reference
    ->
Responsibility Rule
    ->
Capability Rule
    ->
Expected Owner according to Charter
    ->
Current Owner in implementation
    ->
Leaked Responsibility
    ->
Target Owner according to EOS bounded context
    ->
Evidence
    ->
Conform?
```

Status yang digunakan:

- `CONFORM`
- `PARTIAL`
- `NON-CONFORM`

### 2.1 Responsibility leakage checklist

Sebuah capability dianggap mengalami leakage bila command `eos-cli` masih
menjadi owner atas salah satu kategori berikut padahal menurut charter command
seharusnya hanya mengorkestrasi:

- schema ownership
- state-machine ownership
- evaluation ownership
- report-builder ownership
- artifact-writer ownership
- persistence ownership
- source-resolution ownership
- fallback-selection ownership
- cross-domain composition ownership
- summary/status derivation ownership

## 3. Capability Assessment

### 3.1 Status / Readout

| Field | Assessment |
| --- | --- |
| Capability | `Status` / enterprise readout |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §9.1-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Governance`, `Enterprise Control Plane outputs`), §4.1; `EOS-CLI-CAPABILITY-MAP.md` §2 (`Readout`), §3.1, §7 (`Status -> Consume, Readout`) |
| Responsibility Rule | `Consume`, `Readout` |
| Capability Rule | `Readout` |
| Expected Owner | state/read model resmi yang dikonsumsi oleh command readout |
| Current Owner | `src/state.ts` untuk state sourcing, `src/commands/status.ts` untuk render/readout |
| Leaked Responsibility | Tidak ada leakage yang tervalidasi |
| Target Owner | tetap pada state/read model resmi; command tetap sebagai readout surface |
| Expected | CLI membaca SSOT resmi dan merender readout tanpa mengambil ownership reasoning |
| Status | `CONFORM` |
| Reason | Command bertindak sebagai consumer/readout surface. Ownership domain tetap berada pada state resmi yang dibaca, bukan dibentuk ulang di CLI. Tidak terlihat schema ownership, evaluation ownership, atau status-derivation ownership yang bocor ke command. |
| Evidence | `src/commands/status.ts`, `src/state.ts` |

### 3.2 Query

| Field | Assessment |
| --- | --- |
| Capability | `Enterprise Query` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §7.1, §9.1-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §2, §3 (`Governance`, `Enterprise Control Plane outputs`), §4.5; `EOS-CLI-CAPABILITY-MAP.md` §2 (`Query`), §3.4, §7 (`Query -> Query, Consume`) |
| Responsibility Rule | `Query`, `Consume` |
| Capability Rule | `Query` |
| Expected Owner | `enterprise-query-runtime` sebagai query evaluator resmi; command hanya sebagai façade query |
| Current Owner | `src/enterprise-query-runtime.ts` untuk evaluasi query, `src/commands/query.ts` untuk input/output |
| Leaked Responsibility | Tidak ada leakage yang tervalidasi |
| Target Owner | tetap pada `src/enterprise-query-runtime.ts` sebagai evaluator query resmi |
| Expected | CLI menjadi query surface resmi terhadap output control plane, bukan graph truth owner |
| Status | `CONFORM` |
| Reason | Command `query` hanya menerima input, memanggil runtime query resmi, lalu merender hasil. Ownership evaluasi query tetap berada di runtime. Tidak terlihat leakage berupa graph ownership, schema ownership, atau report-builder ownership di command. |
| Evidence | `src/commands/query.ts` |

### 3.3 Verification / Foundation

| Field | Assessment |
| --- | --- |
| Capability | `Verify Foundation` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §6 (`Foundation`), §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Foundation`), §4.3, §5 (`Runtime`, `Evaluator`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Verification`), §3.2, §7 (`Verify -> Verify, Consume`) |
| Responsibility Rule | `Verify`, `Consume` |
| Capability Rule | `Verification` |
| Expected Owner | `foundation` runtime/registry/materializer boundary; command foundation hanya memicu verification flow resmi |
| Current Owner | `src/foundation/commands/verify-foundation.ts` masih memegang bagian ownership verifikasi selain runtime/registry |
| Leaked Responsibility | cross-domain composition, report building, artifact writing |
| Target Owner | `src/foundation/runtime/*` dan `src/foundation/registry/*` sebagai bounded-context owner untuk verifikasi foundation |
| Expected | CLI memicu verification flow resmi dan membaca/mematerialisasi output resmi tanpa menjadi reasoning center baru |
| Status | `PARTIAL` |
| Reason | Capability ini benar sebagai verification surface, tetapi command masih memegang cross-domain composition ownership, report-builder ownership, dan artifact-writer ownership. `verify-foundation` tidak sekadar mengorkestrasi runtime; command juga menyusun registry report, graph health, guardrail report, spec audit, lalu menulis banyak artefak verifikasi. |
| Evidence | `src/foundation/commands/verify-foundation.ts` memanggil `readYamlArtifact` untuk input lintas domain, membangun `buildArtifactRegistryModel`, `buildArtifactGraph`, `buildArtifactGraphHealth`, `materializeGuardrailReport`, `buildSpecExecutionAudit`, lalu melakukan banyak `writeJsonArtifact`; `src/foundation/registry/foundation-producer-registry.ts` |

### 3.4 Verification / Constitution

| Field | Assessment |
| --- | --- |
| Capability | `Verify Constitution` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Governance`, `Specification`), §4.3, §5 (`Runtime`, `Evaluator`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Verification`), §3.2, §7 (`Verify -> Verify, Consume`) |
| Responsibility Rule | `Verify`, `Consume` |
| Capability Rule | `Verification` |
| Expected Owner | constitution verification runtime/materializer boundary; command verification hanya mengorkestrasi |
| Current Owner | `src/commands/verify-constitution.ts` |
| Leaked Responsibility | source resolution, artifact writing, verification artifact assembly |
| Target Owner | constitution verification runtime/materializer boundary di bawah verification surface EOS |
| Expected | CLI memicu verification resmi atas governed architecture artifacts |
| Status | `PARTIAL` |
| Reason | Capability ini sah menurut charter, tetapi command masih memegang source-resolution ownership dan artifact-writer ownership. `verify-constitution` sendiri yang menentukan banyak artifact path, memeriksa prerequisite artifact, merakit laporan konstitusi, dan menulis keluaran verifikasi. Jadi verification surface-nya benar, namun ownership belum cukup dipindahkan ke runtime/materializer resmi. |
| Evidence | `src/commands/verify-constitution.ts` melakukan `resolveProjectionStorageLocation`, banyak `resolve(...)` path artefak, `existsSync(...)` prerequisite check, dan banyak `writeJsonArtifact(...)` untuk artefak konstitusi |

### 3.5 Verification / Product & Portfolio

| Field | Assessment |
| --- | --- |
| Capability | `Verify Product`, `Verify Portfolio` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Specification`, `Foundation`, `Capability`), §4.3, §5 (`Runtime`, `Automation`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Verification`), §3.2, §7 (`Verify -> Verify, Consume`) |
| Responsibility Rule | `Verify`, `Consume` |
| Capability Rule | `Verification` |
| Expected Owner | product/portfolio verification runtime/materializer boundary; command hanya memicu verification resmi dan merender hasil |
| Current Owner | `src/commands/verify-product.ts`, `src/commands/verify-portfolio.ts` |
| Leaked Responsibility | `verify-product`: process orchestration, source resolution, artifact writing, verification summary; `verify-portfolio`: portfolio aggregation, status derivation, summary building |
| Target Owner | verification runtime/materializer boundary untuk product dan portfolio di bawah bounded context terkait |
| Expected | CLI menjalankan verification flow resmi lintas artifact yang sudah ditentukan domain owner |
| Status | `PARTIAL` |
| Reason | Capability ini benar secara mandat, tetapi command masih mengambil ownership yang lebih dari sekadar orkestrasi. `verify-product` memegang process-orchestration ownership, source-resolution ownership, artifact-writer ownership, dan verification-summary ownership. `verify-portfolio` memegang portfolio aggregation ownership, status-derivation ownership, dan summary-builder ownership. Leakage-nya ada pada ownership, bukan pada ukuran file. |
| Evidence | `src/commands/verify-product.ts` memakai `existsSync`, `readWorkspaceCapabilities`, `readProductCompositionManifest`, beberapa `runCommand`, `writeJsonArtifact`, `writeTextArtifact`, dan `materializeVerificationSummaryMarkdown`; `src/commands/verify-portfolio.ts` memiliki `readYamlFile`, `buildProductEvidence`, `resolvePortfolioProducts`, `buildPortfolioStatus`, `buildSummaryMarkdown`, dan penulisan artefak hasil |

### 3.6 Capability Discovery / Planning

| Field | Assessment |
| --- | --- |
| Capability | `Discover Capability`, `Plan Capability`, `Verify Capability Registry` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §6 (`Capability`), §7.1, §7.2, §9.2-§9.5; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Capability`), §4.3, §4.5, §5 (`Runtime`, `Presentation`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Planning`), §3.2, §3.6, §7 (`Verify -> Verify, Consume`) |
| Responsibility Rule | `Verify`, `Consume`, `Query`, `Discover`, `Plan` |
| Capability Rule | `Planning / Discovery` plus `Verification` |
| Expected Owner | capability runtime/model/materializer boundary; command capability hanya memicu discovery/planning/verification flow |
| Current Owner | `src/commands/capability-registry.ts` |
| Leaked Responsibility | governance budget, summary builder, snapshot fallback selection, artifact writing |
| Target Owner | capability runtime/model/materializer boundary dalam bounded context capability |
| Expected | CLI membantu discovery, planning, dan verification capability tanpa menjadi graph truth owner |
| Status | `PARTIAL` |
| Reason | Capability ini sah, tetapi command masih memegang governance-budget ownership, summary-builder ownership, fallback-selection ownership, dan artifact-writer ownership. `capability-registry.ts` tidak hanya memicu evaluasi; command juga membangun governance debt budget, memilih snapshot fallback, dan menulis summary/evidence artifacts. |
| Evidence | `src/commands/capability-registry.ts` mendefinisikan `buildCapabilityGovernanceDebtBudget`, `buildRegistrySummaryMarkdown`, `loadExecutionGraphSnapshot`, `writeJson`, dan `runVerifyCapabilityRegistryCommand` yang menulis banyak evidence artifacts |

### 3.7 Execution Flow

| Field | Assessment |
| --- | --- |
| Capability | `Execution Status`, `Execution Advance`, `Execution Complete DoD` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §2, §4.2, §5 (`SSOT`, `Runtime`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Readout`, `Operation`), §3.1, §3.3 |
| Responsibility Rule | `Execute`, `Consume`, `Readout` |
| Capability Rule | `Operation` plus `Readout` |
| Expected Owner | execution runtime/model boundary; command execution hanya mengoperasikan flow resmi |
| Current Owner | `src/commands/execution.ts` |
| Leaked Responsibility | schema ownership, state-machine ownership, status derivation, persistence |
| Target Owner | execution runtime/model boundary yang menjadi owner status read model dan transition policy |
| Expected | CLI mengoperasikan execution flow resmi tanpa menjadi workflow engine generik |
| Status | `PARTIAL` |
| Reason | Capability ini sah sebagai operational surface, tetapi command masih memegang schema ownership, state-machine ownership, status-derivation ownership, dan persistence ownership. `execution.ts` mendefinisikan schema registry, menghitung effective status dan next transition, lalu sekaligus membaca/menulis artifact SSOT execution. Ini menunjukkan command belum murni menjadi orchestration surface. |
| Evidence | `src/commands/execution.ts` mendefinisikan `CapabilityPrioritySchema`, `CapabilityRegistrySchema`, `buildExecutionStatusReadModel`, `writeExecutionStatusReadModel`, dan `persistRegistryAndRefreshStatus` |

### 3.8 Gate Operation

| Field | Assessment |
| --- | --- |
| Capability | `Gate Status`, `Gate Accept`, `Gate Run Case`, `Gate Coverage`, `Gate Regenerate`, `Gate Genesis Evidence` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §6 (`Gate`, `Evidence`), §7.1, §7.2, §9.2-§9.5; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Gate`, `Evidence`), §4.4, §4.6, §5 (`Runtime`, `Evaluator`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Operation`, `Materialization`, `Readout`), §3.1, §3.3, §3.5, §7 (`Gate -> Operate, Consume`, `Materialize -> Materialize, Operate`) |
| Responsibility Rule | `Operate`, `Consume`, `Readout`, `Materialize` |
| Capability Rule | `Operation` plus `Materialization` plus `Readout` |
| Expected Owner | `gate` runtime/projection/evidence/repository boundary; `gate-c` hanya sebagai operator console |
| Current Owner | `src/gate/commands/gate-c.ts` masih memegang bagian ownership operasional yang seharusnya berada di boundary `gate` |
| Leaked Responsibility | source resolution, artifact inventory/hash, subject loading, projection assembly |
| Target Owner | `src/gate/runtime/*`, `src/gate/projections/*`, `src/gate/evidence/*`, `src/gate/repositories/*`, `src/gate/bundles/*` sesuai jenis responsibility |
| Expected | CLI menjadi operator console resmi Gate, sementara reasoning utama tetap hidup di bounded context `gate` |
| Status | `PARTIAL` |
| Reason | Arah arsitektur sudah membaik, tetapi command masih memegang source-resolution ownership, artifact inventory/hash ownership, subject-loading ownership, dan sebagian projection assembly ownership. Jadi problem utama bukan bahwa `gate-c.ts` besar, melainkan bahwa command masih mengetahui terlalu banyak tentang bagaimana gate input, projection source, dan evidence dirakit. |
| Evidence | `src/gate/commands/gate-c.ts` masih mendefinisikan `readText`, `readYamlRecord`, `writeYaml`, `computeArtifactInventory`, `loadSubjectDefinition`, `buildAcceptanceAuditRuntimeDeps`, `buildAcceptanceReportDeps`, `buildRunComparisonDeps`, `buildRunMaterializationDeps`, `buildInputFixtureDeps`, dan `buildGateCStatusProjection` |

### 3.9 Materialization

| Field | Assessment |
| --- | --- |
| Capability | `Materialize official artifacts` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §4, §6 (`Evidence`), §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Evidence`), §4.6, §5 (`SSOT`, `Runtime`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Materialization`), §3.5, §7 (`Materialize -> Materialize, Operate`) |
| Responsibility Rule | `Materialize`, `Operate` |
| Capability Rule | `Materialization` |
| Expected Owner | materializer/evidence boundary resmi per bounded context; command hanya trigger/readout |
| Current Owner | ownership materialization masih tersebar antara runtime/evidence boundary dan beberapa command |
| Leaked Responsibility | artifact writing dan report building masih sebagian berada di command |
| Target Owner | materializer/evidence boundary resmi pada masing-masing bounded context |
| Expected | CLI hanya memicu materialization yang memang bagian dari operational console, tanpa menjadi owner artifact family atau framework generik |
| Status | `PARTIAL` |
| Reason | Capability ini sah, tetapi ownership materialization masih tersebar. Pada beberapa alur, command masih memegang artifact-writer ownership atau report-builder ownership yang seharusnya hidup di boundary materializer/evidence resmi. Jadi gap-nya bukan sekadar sebaran file, tetapi belum tegasnya ownership materialization. |
| Evidence | `src/foundation/runtime/*`, `src/gate/evidence/*`, `src/projection/runtime/index.ts` |

### 3.10 Knowledge Readout

| Field | Assessment |
| --- | --- |
| Capability | `Knowledge Readout` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.2, §4, §6 (`Knowledge`), §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Knowledge`), §4.1, §5 (`SSOT`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Readout`), §4.1, §7 (`Knowledge Readout -> Consume, Readout`; `Knowledge Ownership -> Tidak`) |
| Responsibility Rule | `Consume`, `Readout` |
| Capability Rule | `Knowledge Readout` |
| Expected Owner | bounded context `knowledge` sebagai SSOT projection owner; `eos-cli` hanya consume/readout |
| Current Owner | ownership knowledge downstream masih transitif lewat `learning/runtime` pada sebagian flow |
| Leaked Responsibility | ownership knowledge projection belum sepenuhnya berada pada `knowledge`; downstream masih mengambil knowledge via `learning` fallback |
| Target Owner | `src/knowledge/*` sebagai source of truth projection yang dikonsumsi langsung oleh foundation/gate dan lalu dibaca CLI |
| Expected | `eos-cli` mengonsumsi projection dari bounded context `knowledge`, bukan mengandalkan lifecycle knowledge yang masih dimiliki `learning` |
| Status | `NON-CONFORM` |
| Reason | Leakage pada capability ini bukan terutama di command, tetapi di ownership lintas bounded context. Downstream masih mengambil aset knowledge melalui `learning` fallback, sehingga `knowledge` belum menjadi SSOT projection yang dikonsumsi langsung oleh foundation/gate. Selama ownership knowledge masih transitif lewat `learning`, `eos-cli` belum dapat menjadi consumer yang konform terhadap charter. |
| Evidence | `src/foundation/registry/foundation-producer-registry.ts` masih memakai `context.decision.knowledgeRegistryEntries ?? learning.materialized.knowledgeRegistry.entries`; `src/learning/runtime/intelligence-runtime.ts`; `src/knowledge/*` |

### 3.11 Decision Readout

| Field | Assessment |
| --- | --- |
| Capability | `Decision Readout` |
| Charter Reference | `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md` §3.1, §3.2, §4, §6 (`Decision`), §7.1, §7.2, §9.2-§9.4; `EOS-CLI-RESPONSIBILITY-MAP.md` §3 (`Decision`), §4.1, §5 (`Decision`, `Presentation`); `EOS-CLI-CAPABILITY-MAP.md` §2 (`Readout`), §4.2, §7 (`Status -> Consume, Readout`) |
| Responsibility Rule | `Consume`, `Readout` |
| Capability Rule | `Decision Readout` |
| Expected Owner | `decision` runtime/projection boundary sebagai decision output owner; CLI hanya readout/consume |
| Current Owner | decision surfaces tersedia di `src/decision/runtime/*`, tetapi ownership consumer surface di CLI belum eksplisit/stabil |
| Leaked Responsibility | bukan leakage dari command ke domain lain, melainkan belum terbentuknya owner surface readout yang eksplisit di CLI |
| Target Owner | `decision` runtime/projection boundary untuk output, dan command readout tipis di CLI sebagai consumer resmi |
| Expected | `eos-cli` mengonsumsi output keputusan secara resmi sebagai readout, bukan hanya sebagai bagian tersirat dari foundation/gate surfaces |
| Status | `PARTIAL` |
| Reason | Domain `decision` sudah tersedia, tetapi capability CLI yang eksplisit sebagai consumer/readout surface belum terbentuk stabil. Jadi gap di sini bukan command overweight, melainkan belum hadirnya ownership boundary yang jelas untuk decision readout sebagai capability resmi `eos-cli`. |
| Evidence | `src/decision/runtime/*`, `src/foundation/registry/foundation-producer-registry.ts` |

## 4. Structural Assessment

### 4.1 Folder alignment

| Area | Assessment |
| --- | --- |
| `gate/` | Semakin konform; bounded context, evidence, bundles, projections, repositories sudah mulai jelas |
| `foundation/` | Konform secara arah, tetapi orchestration masih berat |
| `learning/` | Masih transisional karena knowledge ownership belum sepenuhnya keluar |
| `knowledge/` | Sudah mulai benar sebagai bounded context baru, tetapi belum menjadi SSOT downstream |
| top-level shim files | Bersifat transisional; belum ideal sebagai bentuk jangka panjang |

### 4.2 Command layer

| Command Area | Status |
| --- | --- |
| `status.ts` | `CONFORM` |
| `query.ts` | `CONFORM` |
| `verify-*` kecil | mayoritas `CONFORM` |
| `execution.ts` | `PARTIAL` |
| `capability-registry.ts` | `PARTIAL` |
| `foundation/commands/verify-foundation.ts` | `PARTIAL` |
| `gate/commands/gate-c.ts` | `PARTIAL` |

## 5. Summary

### Conform

- `Status / Readout`
- `Query`

### Partial

- `Verify Constitution`
- `Verify Product / Portfolio`
- `Verify Foundation`
- `Capability Discovery / Planning`
- `Execution Flow`
- `Gate Operation`
- `Materialization`
- `Decision Readout`

### Non-Conform

- `Knowledge Readout`

## 6. Audit Boundary

Dokumen ini berhenti pada:

- identifikasi capability
- expected owner menurut charter
- current owner di implementasi
- leaked responsibility
- target owner menurut bounded context EOS
- evidence di kode

Dokumen ini **tidak** mengusulkan solusi, urutan refactor, atau strategi transformasi.

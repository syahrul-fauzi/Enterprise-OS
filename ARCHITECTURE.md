# Enterprise OS — ARCHITECTURE (Level 1)

Change Frequency Level: **Level 1 (Architecture)**
Expected Change Rate: setiap milestone besar (Alpha.*, Beta.*, Release) — 1–6 bulan per change cycle.
Change Mechanism: Hanya diubah SETELAH PASAL 6 terpenuhi: L1 (Evidence) + L2 (Interpretation confidence) menunjukkan kebutuhan konkrit. Bukan karena desain terlihat lebih elegan.
Cross-Reference: [CONSTITUTION.md](file:///root/Enterprise%20OS/CONSTITUTION.md) · [STATUS.md](file:///root/Enterprise%20OS/STATUS.md) · [EVIDENCE.md](file:///root/Enterprise%20OS/EVIDENCE.md) · [ROADMAP.md](file:///root/Enterprise%20OS/ROADMAP.md) (Rule of Five Dokumen Inti #2)

---

## EOS Validation Baseline Definition
```
Enterprise Operating System
=
Experimental Engineering Operating Model
+
Decision Infrastructure
+
Evidence Repository
```
*NOT: Framework, Platform Generator, AI Coding System, Application Architecture.*

## Final EOS Thesis (Definisi Telaah Konstitusional Kalibrasi Keempat)

> **Enterprise OS adalah sistem yang mengoptimalkan akumulasi leverage melalui eksperimen yang dapat direproduksi, dengan perubahan arsitektur yang selalu mengikuti bukti empiris, bukan preferensi desain.**

Kalimat di atas adalah definisi matang EOS yang merangkum:
- Arsitektur berevolusi berdasarkan evidence (PASAL 1, PASAL 6), bukan intuisi;
- Capability menjadi aset yang diukur melalui reuse nyata (PASAL 5 Independence Gate + ELRv2), bukan klaim;
- Governance berfungsi sebagai pembatas agar evolusi tetap disiplin (PASAL 8 Meta Architecture Budget + Rule of Five), bukan sebagai tujuan itu sendiri;
- Eksperimen boleh menghasilkan PASS, FAIL, maupun INCONCLUSIVE, dan ketiganya menambah pengetahuan sistem (3-State Gate Verdict + Falsification Equivalence Principle).

English reference (for international collaboration):
> Enterprise OS is a system that optimizes leverage accumulation through reproducible experiments, with architectural changes that always follow empirical evidence rather than design preferences.

## Epistemological Contract Change

**Before:**
```text
Architecture
     ↓
Assumption
     ↓
Implementation
```

**Now:**
```text
Production Reality
     ↓
Observation
     ↓
Evidence
     ↓
Validation
     ↓
Decision Record
     ↓
Learning
     ↓
Future Evolution
```

## Frozen Principle
```
EOS does not optimize software creation.
EOS optimizes engineering decisions.
```

---

## Architecture Closure Baseline

EOS dinyatakan cukup tertutup secara arsitektural ketika setiap lapisan
memiliki tempat, hubungan, dan alasan keberadaan yang unik. Tujuan bagian
ini adalah menghentikan ekspansi konsep horizontal dan mengunci batas
transformasi yang akan dipakai pada implementasi berikutnya.

### Structural Stack (What Exists)

```text
L0  EOS Philosophy
L1  EOS Architecture Constitution
L2  EOS Meta-Architecture (EMA)
L3  EOS Reference Architecture (ERA)
L4  EOS Language Specification (ELS)
L5  EOS Domain Model (EDM)
L6  EOS Knowledge Graph (EKG)
L7  EOS Runtime State (ERS)
L8  Applications
```

Aturan interpretasi:
- Stack di atas menjelaskan struktur, bukan urutan kerja harian.
- Tidak boleh ada level arsitektur baru tanpa tanggung jawab unik, sumber
  kebenaran yang jelas, dan aturan transformasi eksplisit ke level tetangga.
- Closure arsitektur berarti setiap level punya peran non-overlap dan setiap
  view dapat ditelusuri kembali ke sumber semantiknya.

### Architectural Evolution Cycle (What Happens)

```text
Specify
    ↓
Model
    ↓
Generate
    ↓
Implement
    ↓
Execute
    ↓
Observe
    ↓
Verify
    ↓
Govern
    ↓
Evolve
```

Disiplin ini memisahkan:
- `struktur`: apa yang ada di EOS;
- `proses`: bagaimana EOS berubah dari waktu ke waktu.

EOS bukan hanya specification-driven. EOS bekerja sebagai:

```text
Specification
    → Operation
    → Learning
    → Evolution
```

### Controlled Evolution (Axiom 13)

> **No architectural layer SHALL evolve except through governed evidence derived from runtime observations.**

Implikasi normatif:
- Philosophy tidak berubah karena opini.
- Constitution tidak berubah karena preferensi implementasi.
- ELS tidak berubah hanya untuk menutup bug lokal.
- EDM tidak berubah hanya karena refactor terasa lebih bersih.
- Setiap perubahan arsitektural WAJIB memiliki jejak: runtime observation
  → validated evidence → governance review → explicit decision.

### Canonical Representation Boundary

Definisi boundary yang dikunci:
- `EKG` adalah representasi kanonik hubungan semantik antar-instance domain,
  bukan primary store untuk state operasional.
- `ERS` adalah sumber state runtime saat ini.
- Semua view arsitektural harus diperlakukan sebagai projection dari `EKG`,
  atau projection `EKG` yang diperkaya `ERS` ketika state runtime memang
  dibutuhkan.

---

## Final Frozen Repository Boundary
```text
 Enterprise OS
 │
 ├── governance
 │      Enterprise rules
 │      Principles
 │      Policies
 │      Contracts
 │      Extraction rules
 │      Readiness rules
 │      (Decision constraints)
 │
 ├── implementation
 │      EOS runtime
 │      Kernel
 │      Engines (Observer/Validator/Pattern/Doctor)
 │      Contracts
 │      Schemas
 │      (Measurement machinery)
 │
 ├── workspace
 │      Product reality
 │      (Real production evidence)
 │
 ├── experiments
 │      Scientific validation
 │      (Experiment registry at experiment-registry.yaml)
 │
 └── evidence
        Learning history
        Evidence graph
        Decision history
        (Organizational memory)
```

## Frozen Architecture Boundary
```
                     Enterprise Knowledge
                            |
                            v

                  Capability Grammar
                    (TOGAF CBP)
                            |
                            v

                  governance/
     (Enterprise rules, principles, policies)
                            |
                            v

                       Workspace

               LawyersHub / Services-ID / ...
                            |
                            v

                  Operational Evidence
                            |
                            v

                    EOS Decision Layer
         (implementation/eos/engines & kernel)
            Observer
                 |
            Validator
                 |
            Pattern
                 |
            Doctor
                            |
                            v

                 Capability Evolution
```
EOS is in the **decision layer**, NOT the implementation layer!

---

## Frozen Principles
```
1. Production First. Extraction Second. Evidence Always.
2. EOS does not optimize software creation.
   EOS optimizes engineering decisions.
3. The product is the experiment. Evidence is the teacher. Decisions are the asset.
4. Every change needs evidence:
   > "What evidence makes this change necessary?"
   If no evidence, don't change.
5. Stability Hierarchy (Laju Perubahan per Lapisan — PASAL 4):
   Foundation   ← hampir tidak pernah berubah (change-rate ≤ 0.05 / bulan)
   Capability   ← jarang berubah (change-rate ≤ 0.20 / bulan)
   Composition  ← kadang berubah (change-rate ≤ 0.50 / bulan)
   Experience   ← sering berubah (change-rate ≤ 1.50 / bulan)
   Product      ← paling sering berubah (change-rate ≤ 3.00 / bulan)
   Setiap lapisan HANYA boleh bergantung pada lapisan DI ATASNYA
   (yang lebih stabil). Reverse dependency = pelanggaran konstitusi.
6. Evidence-Driven Reorganization:
   TIDAK ADA reorganisasi struktur yang dilakukan hanya karena
   "terlihat lebih elegan." Reorganisasi diizinkan HANYA ketika:
   (a) ada bukti empiris leverage kumulatif ≥ 2 capability × 2 experience surface
       menggunakan implementation yang sama TANPA perubahan, DAN
   (b) reorganisasi adalah KONSEKUENSI ALAMI dari bukti tersebut,
       bukan proyek refactoring mandiri.
```

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

## Frozen Elements
```
Frozen Elements:
✓ Four Engines (Observer, Validator, Pattern, Doctor)
✓ Kernel Boundary
✓ Workspace Constitution
✓ Decision Object Schema (v1.6.0)
✓ Evidence Lifecycle
✓ All Principles
✓ All KPI definitions (lihat bagian Final KPI Groups)
✓ Scientific Provenance Graph Model v2.0 (Alpha.9)
    ├── 5-Node Graph: ExperimentDefinition → ExperimentExecution → RawObservation → EvidencePackage → CertificationClaim
    ├── Nodes = identity (SHA-256), Edges = semantic relationship (EXPLICIT, not nesting object tree)
    ├── Fakta Primer = RawObservation (NOT EvidencePackage)
    ├── EvidencePackage = structured interpretation of RawObservation(s)
    ├── SemanticOutcome: supports | contradicts | inconclusive | metadata (anti confirmation-bias)
    ├── ExperimentDefinition.version + supersedes + compatibility lineage (versioning lintas-waktu)
    ├── RawObservation reusable ≥1 EvidencePackages via reference (NOT copy, NOT child exclusive)
✓ Certification Snapshot Identity Contract (snp:sha256: canonical envelope = snapshotId)
✓ Evidence Revocation Traceability: revoked-evidence → direct-claim → transitive subtree collapse
✓ 4 Independent Evidence Producer Unanimity Requirement (FS, AST, IMP, RUN ≥ 4-way agreement)
✓ Provenance Registry Dedup-by-Identity (hash-based node registry — observation tidak diduplikasi)
✓ Alpha.10 Five Epistemic Frontiers Type Contract (APPEND-ONLY LOCKED — backward identity-stable):
    ├── Frontier #1 [Identity ≠ Semantic Equivalence]:    Sidecar edge ObservationSemanticEquivalenceEdge (kind: numeric-tolerance | temporal-window | textual-synonym-domain | structural-subset-equal | auditor-human-classified). Identity SHA-256 OBS TIDAK PERNAH diubah oleh equivalence assertion.
    ├── Frontier #2 [Weighted Evidence Quality Model]:   Sidecar index ObservationQualityEntry keyed by RawObservationId. AggregateScore01 canonical weighted (confidence 0.28 + source 0.30 + precision + certainty + sampleSize). Embed dilarang — identity stability dijunjung.
    ├── Frontier #3 [Observation Lifecycle State]:      State machine created → verified → replicated → deprecated | superseded. Transitions[] append-only, TIDAK boleh overwrite.
    ├── Frontier #4 [Replication Group Contract]:       ReplicationGroup mengelompokkan ≥1 EXE atas EXD yang sama. Status = not-replicated | replicated-weak | replicated-strong | replication-failed. distinctExecutorIdentities ≥ 2 SYARAT MUTLAK replicated-strong (jika tidak → status honest not-replicated / replicated-weak; TIDAK BOLEH claim strong melebihi bukti).
    └── Frontier #5 [Consensus Reasoning Over Graph]:   ClaimConsensusClassification = strong | moderate | weak | conflicting | inconclusive. Perhitungan quality-weighted sum × semantic kind; contradictory threshold RELATIVE (≥ 20% max(0.5, supportsQuality)).
✓ Reproducibility Bundle Contract: Auditor cold-start script + README → semua artefak hashable + commit ID + node/pnpm version report. Exit 0 ⇔ seluruh type contract dan invariant runtime lulus.
✓ Stability Hierarchy Contract (PASAL 4): Lapisan hanya boleh depend ke lapisan lebih-stabil di atasnya. Change-rate thresholds: Foundation ≤0.05, Capability ≤0.20, Composition ≤0.50, Experience ≤1.50, Product ≤3.00 per bulan. Reverse dependency → architectural failure.
✓ Capability Independence Contract (PASAL 5): Sebuah Capability TIDAK BOLEH meng-import, mereferensikan, atau meng-encode logika spesifik ke Experience Surface manapun. Daftar "experience.view", "if (workspace)...", "if (api)..." di dalam implementasi capability → automatic Independence Gate FAIL.
✓ Experience Composition Boundary Contract: Experience Composition ADALAH orchestration layer (Capability Exposure, Workflow Composition, Navigation, Authorization Flow, Session Context, Personalization, Feature Visibility, Interaction Pattern). BUKAN UI layer. BUKAN domain logic layer. Experience Composition TIDAK BOLEH mengandung: Business Rules, Business Validation, Business State, Domain Logic.
✓ Evidence-Driven Reorg Guardrail Contract: Reorganisasi struktur folder/package memerlukan bukti kumulatif ELRv2 ≥ 2.0 + minimal 2 capability × 2 experience surface menggunakan implementasi identik TANPA modifikasi. Bukti disimpan di decision object dengan cross-reference ke evidence registry.
```

---

# FINAL KPI GROUPS

## (Terhubung dengan PASAL 7 Objective vs Constraint di CONSTITUTION.md)

PENTING (PASAL 7):
- **OBJECTIVE:** MAXIMIZE ELR_v2_Score
- **CONSTRAINT (TIDAK BOLEH DILANGGAR, BUKAN YANG DIMAXIMIZE):**
  CPI ≥ CPI_threshold (Gate 0: ≥0.50), FPI ≥ FPI_threshold (Gate A: ≥0.95)
  ECI ≤ ECI_threshold (Gate E: ≤0.10), AppPI ≥ AppPI_threshold (Gate D: ≥0.90)
- **DILARANG:** MAXIMIZE CPI, MAXIMIZE FPI, MINIMIZE ECI secara standalone tanpa peningkatan ELRv2.

## A. Delivery Performance
- Lead Time Change
- Deployment Frequency
- Change Failure Rate
- Recovery Time

## B. Capability Economics
- Extraction Cost
- Reuse Ratio
- Adoption Rate
- **Engineering Leverage Ratio v2.0 (ELR v2.0) — Composite Metric**
  - Definisi Konseptual:
    ```
    ELR v2.0 = Capability Stability × Experience Reuse × Product Reuse
    ```
  - Sub-KPI Auditable (bukan perhitungan subjektif — setiap angka berasal dari bukti):
    1. **Multi-Experience Capability Count** (MEC):
       Jumlah capability yang digunakan oleh ≥ 2 Experience Surface berbeda TANPA perubahan implementasi capability.
       Measurement: Scanning dependency graph + fingerprint hash comparison implementasi per consumer.
    2. **Multi-Product Capability Count** (MPC):
       Jumlah capability yang digunakan oleh ≥ 2 Product berbeda TANPA perubahan implementasi capability.
       Measurement: Sama seperti MEC, lintas product boundary.
    3. **Experience-Driven Change Rate (EDCR) — SEMAKIN KECIL SEMAKIN BAIK**:
       Prosentase perubahan capability yang dipicu oleh kebutuhan experience (bukan domain logic / bug / performance).
       Ideal: ≤ 10%. > 30% = Independence Gate FAIL.
       Measurement: Commit message categorization + PR review evidence pada capability folder.
    4. **Capability-Independent Experience Change Count (CIEC) — SEMAKIN BESAR SEMAKIN BAIK**:
       Jumlah perubahan pada Experience Composition layer YANG DAPAT DILAKUKAN tanpa mengubah file apapun di Capability layer.
       Measurement: Count PR yang hanya menyentuh folder experience/app/ tetapi SHA dari capability folder TETAP SAMA.
  - Snapshot Formula Aktual (untuk audit periodik):
    ```
    ELR_v2_Score(periode) = (MEC / TotalCapabilities)
                          × (MPC / TotalCapabilities)
                          × (1 − clamp(EDCR, 0, 1))
                          × clamp(CIEC / MaxExperienceChanges, 0, 1)
    ```
  - Kriteria Hipotesis Terbukti (EOS Thesis):
    ELR_v2_Score ≥ 0.50 pada ≥ 3 products → klaim "EOS memberikan leverage" = EMPIRIS TERBUKTI.
    ELR_v2_Score < 0.20 → klaim leverage = BUKTI KURANG, tetap perbaiki foundation.

## C. Decision Quality
- Decision Acceptance Rate
- Decision Accuracy
- Evidence Coverage
- Decision Reversal Rate
- **Decision Confidence Growth**

## D. Purity Metrics Framework — Architectural Cleanliness
Tujuan: Mengukur KEMURNIAN (purity) batas lapisan arsitektur, BUKAN sekadar leverage.
Leverage (ELRv2) memberitahu "berapa banyak reuse". Purity memberitahu
"apakah batas arsitektur tetap bersih ketika reuse meningkat". Target jangka panjang = 1.0 untuk seluruh purity index.

### D.1 Capability Purity Index (CPI)
Definisi Formal:
```
CPI = (Jumlah capability yang TIDAK MEMILIKI dependency explicit/implicit ke Experience Surface apapun)
      ────────────────────────────────────────────────────────────────────────────────────────────
      (Jumlah seluruh capability terdaftar)
```

Suatu capability dinyatakan "pure" (menambah pembilang) JIKA DAN HANYA JIKA SEMUA benar:
1. Folder `capabilities/<id>/implementation/` = 0 import statement ke: `**/presentation/**`, `**/apps/**`, `**/experience/**`.
2. Dalam executable code di `implementation/`, TIDAK ADA conditional yang cabangnya didasarkan pada nama experience surface (regex rule G0.5).
3. SHA256 fingerprint folder `implementation/` TETAP SAMA ketika capability tersebut dikonsumsi oleh ≥ 2 experience surface berbeda jenis.
4. Capability tidak memiliki file .tsx / .vue / komponen presentasional di dalam sub-folder `implementation/` (boleh ada di luar implementation, tetapi mengurangi purity classification level).

Klasifikasi tingkat purity capability (memungkinkan intermediate level, tidak hitam-putih):
- CPI Level 3 (PURE): semua 4 syarat di atas TRUE → dihitung 1.0 ke pembilang CPI
- CPI Level 2 (COUPLING-LOW): syarat 1-3 TRUE, tapi ada file tsx/vue di folder capability (tetapi di luar implementation/) → dihitung 0.5
- CPI Level 1 (COUPLING-HIGH): minimal 1 syarat 1-2 FALSE → dihitung 0.0
- CPI Level 0 (UNCATEGORIZED): belum dilakukan scan → tidak dihitung, tidak masuk penyebut

Target Gate 0 PASS: CPI ≥ 0.50 (Level 3 minimal setengah dari total).
Target Enterprise Certification Gate F PASS: CPI = 1.0 (Level 3 = 100%).

Measurement Method:
- Static analysis script `arch-purity-scan.mjs` (akan dibangun di Alpha.13)
- SHA fingerprint reproducible audit script di reproducibility bundle v3

### D.2 Foundation Purity Index (FPI)
Definisi Formal:
```
FPI = (Jumlah symbol declaration DALAM Foundation Layer YANG TIDAK MENGGUNAKAN vocabulary Experience Surface)
      ──────────────────────────────────────────────────────────────────────────────────────────────────
      (Jumlah seluruh symbol declaration DALAM Foundation Layer)
```

Lingkup Foundation Layer untuk keperluan FPI:
```
workspace/packages/core/kernel/**/*.ts         (DILUAR package.json)
workspace/packages/core/capability-registry/**/*.ts
workspace/packages/core/runtime/**/*.ts        (Catatan: runtime saat ini ada coupling WorkspaceProps.tsx → evaluasi)
```

Suatu symbol declaration dinyatakan "pure" JIKA:
- Nama identifier (type, interface, class, function, const, enum key) TIDAK MENGANDUNG substring dari daftar: `workspace`, `consumer`, `studio`, `api`, `mobile`, `cli`, `worker`, `voice`, `dashboard`, `portal`, `desktop`, `app`
  KECUALI:
  - identifier `capability` (kata `capability` mengandung substring `api`? Tidak → boleh)
  - Kata yang secara SEMANTIC berarti "unit komposisi generik", BUKAN experience surface khusus.
    Contoh: `WorkspaceDefinitionSchema` = boleh HANYA JIKA dokumentasi menyatakan bahwa ini adalah
    "generic capability composition unit", BUKAN "UI surface Workspace khusus".
  - String literal comment tidak dihitung, hanya declaration symbol executable.
- String literal NON-comment yang merupakan vocabulary dilarang = otomatis symbol tersebut IMPURE.

Target Gate A PASS: FPI ≥ 0.95.
Target Enterprise Certification Final: FPI = 1.0.

### D.3 Application Purity Index (API → Application Purity Index, nama beda dengan HTTP API)
Definisi Formal:
```
Application Purity Index (AppPI) = (Jumlah Application Composition unit TANPA domain logic business rule)
                                   ───────────────────────────────────────────────────────────
                                   (Jumlah Application Composition unit)
```

Application Composition unit dinyatakan PURE JIKA:
- TIDAK ADA validation logic business-specific (misal: "status case harus draft sebelum review") di-fallback ke dalam application layer. Semua validasi harus delegasi ke Capability layer command/query.
- TIDAK ADA pengambilan business decision (misal: "case ditolak otomatis jika > 30 hari") di application layer. Semua business decision harus di Capability layer.
- Application layer TIDAK BOLEH langsung mutate repository/state dari capability, harus melalui public port (commands/queries).

Target Gate D PASS: AppPI ≥ 0.90.

### D.4 Experience Coupling Index (ECI) — SEMAKIN KECIL SEMAKIN BAIK
Definisi Formal:
```
ECI = Σ (Jumlah import statement Experience → Product private code, BUKAN melalui Composition/Capability public API)
      ──────────────────────────────────────────────────────────────────────────────────────────────────────
      (Total import statements pada Experience layer)
```

ECI adalah kebalikan dari purity. ECI tinggi = coupling buruk (experience layer mem-bypass composition layer dan langsung menuju product detail).

Interpretasi ECI:
- ECI = 0.00 → PURE SEMPURNA: semua akses melalui capability public API via composition layer
- ECI ≤ 0.10 → Bagus (Gate E PASS requirement)
- 0.10 < ECI ≤ 0.30 → Perlu perbaikan (masih acceptable tahap awal)
- ECI > 0.30 → Coupling berlebih, Gate E otomatis FAIL

---

## True EOS Assets (Ordered by Priority)
1. Evidence
2. Decision History
3. Validated Knowledge
4. Capability Candidates
5. Platform Assets
6. Code

```
Code
 |
 v
Decision History
 |
 v
Evidence Graph
 |
 v
Validated Pattern
 |
 v
Capability Knowledge
 |
 v
Platform Evolution
```
EOS's true value comes from engineering memory, not code!

---

## Extraction Guardrails
Capability extraction **only allowed after ALL of**:
1. Observation
2. Repeated Evidence
3. Validated Pattern
4. Economic Analysis (≥2x ELR v2.0 estimate)
5. **Capability Independence Gate PRE-PASS**:
   - No `experience.*` field mandatory dalam capability manifest (optional ONLY)
   - No `if (workspace)`, `if (api)`, atau experience-surface-specific conditional dalam capability implementation folder
   - No import statement dari package `presentation`, `app/*`, atau `experience/*` ke dalam folder `capability/*/implementation`
   - Static analysis: Capability descriptor `experience` field = undefined atau pure metadata (tidak mengandung executable component reference)
6. Extraction Decision

**CRITICAL PRE-REQUISITE (PASAL 5)**:
Extraction DECISION TIDAK BOLEH diambil sebelum capability lulus uji:
"Apakah capability yang sama bisa dipakai oleh 2 experience surface berbeda TANPA SATU PUN perubahan implementasi?"
Jika jawaban belum = bukti empiris (bukan claim) → extraction ditunda.

---

# SERTIFIKASI ENTERPRISE EOS — GATE FRAMEWORK TERKUNCI

Urutan ini DILARANG diubah. Setiap Gate HANYA boleh dimulai setelah
Gate SEBELUMNYA lulus dengan bukti empiris terverifikasi (PASAL 1 berlaku).

## CRITICAL GATE: GATE 0 — **CAPABILITY INDEPENDENCE UNDER MULTIPLE EXPERIENCES** (PASAL 5 + PASAL 6)

Nama resmi diperketat. Sebelumnya: "Capability Independence Gate".
Sesudahnya: "Capability Independence Under Multiple Experiences".

Perbedaan krusial:
- Capability yang lulus static analysis (tidak ada import ke experience, tidak ada if-workspace)
  = reusable secara TEORITIS, BELUM empiris.
- Gate 0 dinyatakan PASS HANYA JIKA capability yang sama BENAR-BENAR dipakai oleh
  MINIMAL 2 EXPERIENCE SURFACE BERBEDA dengan implementasi domain yang IDENTIK
  (SHA fingerprint sama persis).

Status: Pemisah Dunia Lama (monorepo starter-kit) vs Dunia Baru (Enterprise Operating Model)

Semua Gate di bawah ini TIDAK BERARTI jika Gate 0 tidak lulus.

### Gate 0 — Objective PASS Criteria (SEMUA diperlukan, TIDAK ADA shortcut):
| # | Kriteria | Bukti Verifikasi KONKRIT (tidak menerima claim) | Method |
|---|----------|--------------------------------------------------|--------|
| G0.1 | **≥ 1 Capability lulus Independence Under Multiple Check EMPIRIS** | Bukti SHA256 fingerprint folder `capabilities/<id>/implementation/` SAMA PERSIS lintas minimal 2 experience surface consumer YANG BERBEDA JENIS (misal: Workspace UI + HTTP API; atau CLI + Webhook Worker). Bukan sekadar 2 halaman UI yang sama jenis. | SHA256 recursive scan + fingerprint diff + consumer jenis verification |
| G0.1a | Consumer TIDAK BOLEH SESAMA JENIS surface (misal: Workspace-A + Workspace-B = TIDAK DIHITUNG) | Buktikan 2 consumer berbeda taxonomy: `workspace-ui` vs `rest-api` vs `cli` vs `worker-queue` vs `voice` vs `mobile-native` | Consumer taxonomy manifest + declaration check |
| G0.2 | EDCR (Experience-Driven Change Rate) ≤ 10% pada capability lulus G0.1 | Analisis minimal 30 commit (atau seluruh history jika < 30) pada folder capability. Hitung % commit yang message-nya menyatakan penyebab "perubahan UI" / "ux request" / "route workspace" vs total commit capability. | Commit categorization audit + labeled commit history |
| G0.3 | CIEC (Capability-Independent Experience Change) ≥ 3 pada consumer yang sama | ≥ 3 commit / PR pada Experience Composition layer YANG HANYA menyentuh folder app/<consumer>/experience tetapi SHA fingerprint capability/implementation TETAP SAMA (tidak ada file diubah di capability). | PR diff + hash comparison (before vs after PR) |
| G0.4 | Zero coupling violation (PASAL 4 reverse) | Tidak ada import statement `from **/presentation/**`, `from **/apps/**`, `from **/experience/**` DALAM folder `capabilities/**/implementation/`. Catatan: import `composition/routes` di luar `implementation/` = allowed for now. | Static analysis (eslint rule eos_arch_indep_001) + grep audit |
| G0.5 | Zero experience-conditionals di capability/implementation/ | Tidak ada match regex `/^if\s*\(\s*.*(workspace|api|consumer|studio|cli|mobile|experience|surface).*\)/` di dalam `capabilities/**/implementation/`. (Catatan: komentar tidak dihitung jika tidak executable.) | Grep audit executable lines + architecture test |
| G0.6 | Field `experience` pada CapabilityDescriptor (kernel types) = OPTIONAL, manifest schema = OPTIONAL, registry validator TIDAK mewajibkan. | Type contract inspection: `CapabilityDescriptor.experience` memiliki modifier `?` (optional). ManifestSchema: `experience: z.object(...).optional()`. Registry `validate()` TIDAK push error jika experience undefined. Jika `experience` TERSEDIA, validator BOLEH memeriksa. | Type contract (TS) + schema (Zod) + registry source code triple-check |
| G0.7 | **Foundation Purity Check PASS — kernel TIDAK mengenal vocabulary Experience Surface** (PASAL 6) | Di dalam file yang dianggap Foundation Layer (`packages/core/kernel/**/*.ts`, `packages/core/capability-registry/**/*.ts`, DILUAR package.json build-tool config), TIDAK ADA identifier name, type, enum, string literal yang MENGANDUNG kata-kata dari daftar vocabulary yang dilarang: `workspace`, `consumer`, `studio`, `api`, `mobile`, `cli`, `worker`, `voice`, `dashboard`, `portal`, `desktop`, `app` (kecuali sebagai bagian dari kata lain seperti `capability` = boleh, `WorkspaceDefinition` = hanya boleh jika artinya unit komposisi generik BUKAN experience surface). | Identifier + literal vocabulary scan, cross-checked against semantic meaning |

Konsekuensi Gate 0 FAIL: Semua reorganisasi folder, refactoring architecture,
pembuatan experience layer BARU, dan klaim "platform leverage" otomatis ditunda.
HANYA perbaikan kontrak (Phase 1 Contract Fix pada Gap Analysis sebelumnya)
yang diizinkan sebelum setidaknya G0.1 + G0.6 + G0.7 lulus.

### Gate 0 — THREE-STATE OUTCOME FRAMEWORK (Kritikal! Bukan hanya PASS/FAIL)

Untuk menghindari menghukum sistem hanya karena eksperimen BELUM dilakukan,
Gate 0 dan setiap Gate di bawahnya MENGGUNAKAN 3 kemungkinan hasil EPISTEMIK,
bukan 2:

| Hasil | Definisi | Kapan Digunakan | Konsekuensi |
|-------|----------|-----------------|-------------|
| **PASS** ✅ | Semua criteria lulus dengan bukti EMPIRIS KONKRIT sesuai tabel G0.1–G0.7. | G0.1 SHA_before == SHA_after + semua 8 criteria == TRUE + 2 consumer berbeda taxonomy BENAR-BENAR berjalan. | Status capability: `independently-composable`. Dapat diekstrak sebagai enterprise reusable asset (lulus Extraction Guardrails). |
| **FAIL** ❌ | Bukti EMPIRIS menunjukkan capability TIDAK independen. | G0.1 SHA_before != SHA_after (bahkan setelah KASUS B divergence), ATAU ada G0.4 coupling violation TERBUKTI (import UI ke implementation), ATAU G0.5 experience-conditional TERBUKTI di executable code, ATAU G0.6 type contract tetap mandatory meskipun sudah step0 fix berulang. | Status capability: `coupled-to-experience`. Tetap di dalam Product layer. Dilarang ekstrak sampai coupling dihilangkan dengan bukti baru. |
| **INCONCLUSIVE** 🟡 | Evidence BELUM CUKUP untuk verdict PASS ATAU FAIL. Tidak ada bukti EMPIRIS bahwa capability coupling, tapi TIDAK ADA JUGA bukti independence lintas 2 surface. | G0.1 belum diuji: baru ada 1 consumer. G0.2 EDCR sample size < 30 commits. G0.3 CIEC belum bisa diukur karena perubahan experience belum terjadi. Kontrak G0.6/G0.7 dalam proses fix (alpha phase). | Status capability: `independence-unknown`. **BUKAN dihukum sebagai FAIL, BUKAN dinyatakan PASS.** Tetap dijaga dalam Product, dilanjutkan experiment (Alpha.13 adalah membuktikan / membantah INCONCLUSIVE → PASS/FAIL). |

Konsekuensi epistemik penting INCONCLUSIVE:
- INCONCLUSIVE ≠ failure of architecture
- INCONCLUSIVE = evidence insufficient (saintifik: kita HONEST tentang ketidaktahuan)
- Menghindari masalah: "belum dicoba 2 experience → gagal" (kesalahan type I error epistemik)
- Menghindari optimisme berlebih: "static analysis bagus → dianggap independent" (kesalahan type II error epistemik)

---

## Gate A — Foundation Stability + Purity (PASAL 4 + PASAL 6)
### Objective PASS Criteria (diperbarui, tambah purity):
- Kernel contract (CapabilityDescriptor, ManifestSchema) lulus backward-compat check 3x consecutive release
- Change-rate Foundation layer ≤ 0.05 / bulan (bukti: commit history audit)
- **Foundation Purity Index (FPI) ≥ 0.95** — lihat definisi FPI di Metrics Purity Framework bagian D.2
- Tidak ada breaking change pada Foundation tanpa deprecation notice ≥ 2 release cycle
- Gate verdict: PASS (semua criteria true) / FAIL (ada criteria false dengan bukti) / INCONCLUSIVE (FPI belum diukur, sample-size commit < 3 bulan)

## Gate B — Capability Governance (PASAL 1 + PASAL 5)
### Objective PASS Criteria:
- Setiap capability memiliki bukti asal (originating product, extraction evidence, expected consumers)
- ≥ 80% capability memiliki test suite pada domain logic (commands, queries, repositories)
- Tidak ada capability yang masuk registry tanpa melewati Extraction Guardrails lengkap (6 steps)
- Gate verdict: PASS/FAIL/INCONCLUSIVE (registry masih kosong / sebagian besar capability pending evidence = INCONCLUSIVE)

## Gate C — Composition Correctness (Clean Architecture)
### Objective PASS Criteria:
- Dependency graph: Composition HANYA depend ke Capability + Foundation (0 coupling ke Experience/Product)
- Semua routes assembly, navigation wiring, dan workflow orchestration terjadi di Composition layer
- Tidak ada domain logic (business rule, state validation) bocor ke Composition layer
- Gate verdict: PASS/FAIL/INCONCLUSIVE (composition graph belum digenerate = INCONCLUSIVE)

## Gate D — Application Independence (Gateway antar Capability)
### Objective PASS Criteria:
- Capability berkomunikasi via event / command interface, BUKAN direct import implementasi detail
- Setiap capability meng-export public API yang stabil (port interface) sebagai satu-satunya titik masuk
- Internal repository/query dari capability A tidak pernah di-import langsung oleh capability B
- **AppPI (Application Purity Index) ≥ 0.90** (lihat D.3)
- Gate verdict: PASS/FAIL/INCONCLUSIVE (AppPI belum diukur actual = INCONCLUSIVE)

## Gate E — Experience Composition Orchestration (Layer Orkestrasi, BUKAN UI)
### Critical Note: Gate E BUKAN proyek refactoring. Gate E ADALAH KONSEKUENSI ALAMI dari Gate 0 PASS.
### Objective PASS Criteria:
- Experience Composition layer menyelesaikan SEMUA 8 tanggung jawab orkestrasi:
  Capability Exposure, Workflow Composition, Navigation, Authorization Flow,
  Session Context, Personalization, Feature Visibility, Interaction Pattern
- 0 file UI component (.tsx/.vue) presentasional murni berada di Experience Composition
- 0 business rule / business validation berada di Experience Composition
- ≥ 1 Experience Surface BARU (misal: API-only, CLI-only) ditambahkan TANPA perubahan pada Capability layer
- **ECI (Experience Coupling Index) ≤ 0.10** (lihat D.4)
- Gate verdict: PASS/FAIL/INCONCLUSIVE (ECI = 0.00 tanpa ada surface BARU yang terbukti = INCONCLUSIVE)

## Gate F — Product is Pure Composition (Final Certification Gate)
### Objective PASS Criteria:
- Seluruh logic bisnis pada Product berada di Capability layer (100% coverage)
- Experience Surface apapun dapat di spin-up dari Composition + Capability yang sudah ada
  TANPA menulis business logic baru
- ELR v2.0 Score ≥ 0.50 lintas ≥ 2 Product berbeda
- Kalimat ini MENJADI BENAR secara empiris:
  > "Product hanyalah komposisi dari capability dan experience yang sudah matang."
- Gate verdict: PASS/FAIL/INCONCLUSIVE

---

# NOTES IMPLEMENTASI ARSITEKTUR (Level 1)

- Tiga-state Gate verdict (PASS/FAIL/INCONCLUSIVE) BERLAKU GLOBAL untuk SEMUA gates di framework ini. (PASAL 2: honesty boundary menghindari false-positive epistemik).
  - **PASS:** Semua criteria measurement OBJECTIF (lihat Measurement Report Section 4) terpenuhi di atas threshold formal. Interpretation (Section 5) juga menyatakan confidence ≥ threshold decision (PASAL 6).
  - **FAIL:** Satu atau lebih criteria measurement melanggar threshold SECARA EKSAK (bukan "kurang yakin"), dan Interpretation menyatakan confidence bahwa violation ini adalah TRUE POSITIVE (bukan false alarm dari measurement noise).
  - **INCONCLUSIVE (Definisi Operasional WAJIB — BUKAN PARKIR PERMANEN):** Jika verdict = INCONCLUSIVE, maka Measurement Report Section 5 WAJIB menyertakan subsection `inconclusive_resolution_plan` dengan KEEMPAT field berikut TIDAK BOLEH KOSONG:
    1. **evidence_missing:** Evidence apa yang kurang sehingga tidak bisa diputus PASS/FAIL.
    2. **next_minimum_experiment:** Eksperimen MINIMUM yang harus dijalankan SELANJUTNYA untuk menambah evidence.
    3. **trigger_to_pass:** Kondisi EKSAK (angka / field measurement mana yang berubah) yang akan mengubah status MENJADI PASS.
    4. **trigger_to_fail:** Kondisi EKSAK (angka / field measurement mana yang berubah) yang akan mengubah status MENJADI FAIL.
  - **Konsekuensi Inconclusive Tanpa Resolution Plan:** Gate Verdict yang bernilai INCONCLUSIVE tetapi field di atas TIDAK ADA atau KOSONG → Gate verdict dianggap **TIDAK VALID** untuk semua tujuan certification (sama sekali tidak memberikan kepastian; seperti tidak ada measurement sama sekali). Ini adalah INVARIAN 3 ROADMAP.md Step 6.1.A yang diterapkan secara global.
- Lihat ROADMAP.md (Level 3) untuk Alpha.13 — langkah konkrit **mengukur** Gate 0 secara empiris capability legal-case (Case Management) dengan alur Hipotesis → Eksperimen → Measurement → Interpretation → Decision (anti-confirmation bias: hasil PASS/FAIL/INCONCLUSIVE = sama-sama valid evidence). Alpha.13 spec Step 6 Section 5 dan INVARIAN 3 menerapkan Definisi Operasional INCONCLUSIVE di atas secara formal.
- Lihat EVIDENCE.md (Level 2) untuk: snapshot Alpha.8-12 certification report, Gap Analysis, FPI Audit aktual, Tabel Claim vs Evidence.

# Enterprise OS — CONSTITUTION (Level 0)

Change Frequency Level: **Level 0 (Paling Stabil)**
Expected Change Rate: 1–2 changes per YEAR.
Change Mechanism: HANYA dapat diubah melalui Keputusan Arsitektural Besar (Strategic Architectural Decision) dengan Evidence SETARA bobot PASAL 1.
Cross-Reference: [STATUS.md](file:///root/Enterprise%20OS/STATUS.md) sebagai Control Surface. · [ARCHITECTURE.md](file:///root/Enterprise%20OS/ARCHITECTURE.md) · [EVIDENCE.md](file:///root/Enterprise%20OS/EVIDENCE.md) · [ROADMAP.md](file:///root/Enterprise%20OS/ROADMAP.md) (Rule of Five Dokumen Inti #1)

---

## PRINSIP DASAR KONSTITUSI

Pasal ini TIDAK DAPAT diubah, ditunda, dikecualikan, atau dihapus
tanpa bukti empiris BARU yang setara bobot epistemiknya dengan
bukti yang digunakan untuk menetapkan pasal ini.

PENTING: Konstitusi ini berbeda dengan Architecture, Evidence, atau Roadmap.
Lihat Level-Matrix berikut untuk lifecycle artefak yang berbeda:

| Level | Artefak / Lapisan | Laju Perubahan | Contoh Perubahan | Kapan Diizinkan Berubah |
|-------|---------|---------------|------------------|--------------------------|
| L0 | **Constitution** (dokumen ini) | 1–2 kali / TAHUN | Menambah PASAL 8, mengubah PASAL 4 | Hanya jika ada bukti empiric SETARA bobot PASAL 1 |
| L1 | Architecture Rules (ARCHITECTURE.md) | setiap milestone besar (Alpha.*) | Gate Framework baru, KPI definition baru | Setelah L2 Evidence + L3 Interpretation membuktikan kebutuhan (PASAL 6) |
| L2 | Evidence (EVIDENCE.md, APPEND-ONLY) | setiap eksperimen selesai | Hasil Alpha.13 SHA comparison, FPI snapshot baru | Append-only, setiap runtime evidence baru dihasilkan |
| L3 | Execution (ROADMAP.md + STATUS.md) | setiap hari / per minggu | Step-by-Step Alpha.13, update cadence kerja, weekly run | Iterasi normal, tidak membutuhkan keputusan arsitektur besar |
| **L4** | **Software (workspace/ apps/ capabilities/***) | **Sering (setiap hari)** | LawyersHub feature baru, API endpoint Case Management | Ini adalah TUJUAN AKHIR. 4 lapisan di atas ada HANYA untuk mempercepat dan memperbaiki lapisan ini. BUKAN sebaliknya. |

---

## IDENTITAS EOS KONSTITUSIONAL (PRESERVASI BASELINE v1.4 + KONSEKWENSI SPIRINT 0)

> **Scientific Identity EOS (Baseline v1.4 — DIPERTAHANKAN):**
> Enterprise OS is an evidence-driven decision infrastructure.

> **Constitutional Identity Enhancement (Sprint 0 — tidak mengubah identitas ilmiah, hanya menjelaskan mekanisme normatifnya):**
> Enterprise OS is a Constitutional Evidence-Driven Decision Infrastructure.
> Its constitutional model governs authority, preserves meaning through canonical forms and transformation semantics,
> and establishes constitutional proofs that connect every production verdict back to its authoritative origin.

Perubahan identitas di atas **BUKAN** perubahan PASAL (tidak membutuhkan bobot PASAL 1), karena:
- Kata kunci **evidence-driven decision infrastructure** (Baseline v1.4) tetap menjadi identitas utama;
- Kata **Constitutional** hanya menjelaskan *mekanisme tata kelola* yang memungkinkan identitas ilmiah tersebut diwujudkan secara konsisten lintas generasi teknologi.

### Teori Konstitusional: Tiga Hukum Fundamental (bukan 6 Lapisan sebagai Teori)

Evolusi Sprint 0 menghasilkan reduksi akhir: **enam lapisan (Constitution→Authority→Knowledge→Transformation→Execution→Evidence)** tetap berlaku sebagai **Reference Architecture** (tata letak engineering), tetapi *teori konstitusional* — fondasi ontologis yang benar-benar bebas teknologi dan dibekukan untuk satu dekade — direduksi menjadi TIGA HUKUM FUNDAMENTAL yang independen secara ontologis:

| Hukum | Pertanyaan yang Dijawab | Cakupan Konsep | Aksioma Realisasi |
|-------|------------------------|----------------|-------------------|
| **Hukum I — Authority** | *"Mengapa artefak ini sah?"* | Constitution, Normative Law, Operational Law, Authority Graph (DAG ketat), Approval, Delegation, Epoch, Lexicon | Axiom A |
| **Hukum II — Meaning** | *"Apa makna normatif artefak ini?"* | Requirements, Intent, Policies, Contracts, Ontology, Canonical Form, Knowledge Graph, Vocabulary | Axiom B |
| **Hukum III — Realization** | *"Bagaimana makna diwujudkan menjadi tindakan yang dapat dibuktikan?"* | Transformation Semantics × Strategy, Planning, Validation, Execution, Constitutional Proof (3 sub-proof), Evidence, Assessment, Verdict | Axiom C, Axiom D |

Order invariant: **Hukum I → Hukum II → Hukum III** (Authority mendahului Meaning, keduanya mendahului Realization).
**Pemisahan Dual Primary Graphs:** Authority Graph (Hukum I) dan Knowledge Graph (Hukum II) adalah dua graph primer TERSEPARAH dengan set edge pairwise disjoint. Edge yang menjawab "mengapa sah" → Authority Graph. Edge yang menjawab "hubungan semantik apa" → Knowledge Graph.

### Empat Aksioma Konstitusional (A/B/C/D) — Inti yang Dibekukan 2026–2036

SELURUH konsep EOS lain (Authority Graph, Knowledge Graph, Canonical Form, Protocol, Transformation Semantics, Planner, Runtime, Evidence, Assessment, Justification, Verdict, Conformance Model, dsb.) DAPAT DITURUNKAN sebagai konsekuensi dari **empat aksioma berikut** yang dibekukan (frozen) untuk cakrawala satu dekade:

| Aksioma | Pernyataan Formal | Invarian yang Diwujudkan |
|---------|-------------------|--------------------------|
| **Axiom A — Authority** | Semua legitimasi harus berasal dari rantai otoritas konstitusional yang dapat ditelusuri. | IA-15 Authority Graph (DAG strict), IA-17 Authority Preservation, Constitutional Proof Sub-Proof 1 |
| **Axiom B — Meaning** | Makna normatif harus dinyatakan dalam Canonical Form yang independen dari representasi dan teknologi. | IA-13 Stable Canonical Forms (8 media concretization = identity sama), IA-15 Knowledge Graph, Constitutional Proof Sub-Proof 2 |
| **Axiom C — Realization** | Semua transformasi harus mempertahankan authority dan meaning, terlepas dari strategi implementasinya. | IA-14 Pure Transformations, IA-16 Semantics × Strategy separation (SQL Standard ↔ Optimizer pattern), Constitutional Proof Sub-Proof 3 |
| **Axiom D — Proof** | Setiap verdict harus dapat dibuktikan melalui Constitutional Proof yang menghubungkan hasil kembali ke sumber otoritasnya. | IA-18 Constitutional Proof = komposisi ∧3 sub-proofs, Ledger atomic append, downstream Evidence→Verdict dependency |

**Pernyataan PASAL 8 Compliance (Penyederhanaan Bukan Pembengkakan):**
Empat aksioma di atas BUKAN penambahan kompleksitas baru. Ini adalah *REDUKSI* dari 15+ konsep yang sebelumnya muncul sebagai fundamental independen (Authority, Knowledge, Transformation, Execution, Evidence, IR, Canonical Rep, Compiler Pass, Runtime, dll.) menjadi 4 aksioma yang menurunkan semuanya. GB >> GC: total onboarding cost engineer baru menurun (memahami 4 aksioma → memahami seluruh EOS), sementara reuse dan konsistensi keputusan implementasi meningkat tajam.

---

## ⚠️ FAILURE MODE WAJIB DIHINDARI: META-ARCHITECTURE DRIFT

(Kalibrasi Keempat — Peringatan Resmi Konstitusional.)

**Failure Mode yang dilarang:**
```
L0-L3 Governance semakin matang, semakin sempurna, semakin tebal
         ↓
L0-L3 mulai menjelaskan DIRINYA SENDIRI (self-referential governance)
         ↓
L4 Software (produk nyata) SEMAKIN SEDIKIT dihasilkan dan berkembang
```

**Peringatan Formal:** Seluruh PASAL 1–8, seluruh Gate Framework, seluruh KPI, seluruh dokumen L0-L3 — keberadaan mereka HANYA DIIZINKAN apabila manfaatnya kepada **kecepatan & kualitas L4 Software** dapat dibuktikan. Jika L0-L3 tumbuh subur tapi L4 Software stagnan → keseluruhan Enterprise OS dinyatakan **Mission Failure** terlepas dari seberapa bagus skor CPI/FPI/Gate.

---

## PASAL 8 (META-ARCHITECTURE BUDGET — ANTI-GOVERNANCE BLOAT)

Ditambahkan pada kalibrasi epistemik Level 0 keempat.
Ini adalah **filter konstitusional WAJIB** dijalankan SEBELUM menambahkan APA PUN ke dalam dokumen Level 0 (Pasal baru), Level 1 (Rule/KPI/Gate/Metric baru), atau membuat dokumen baru apapun.

### Prinsip Dasar PASAL 8:

> **Governance mempunyai biaya. Governance BUKAN semakin banyak = semakin baik.**
>
> Setiap penambahan: Constitution / Rule / KPI / Gate / Metric / Policy
> **WAJIB** dapat menjawab pertanyaan ini secara afirmatif dengan bukti:
>
> ```
> Apakah ini mengurangi biaya pengambilan keputusan pada implementasi L4?
> ```
>
> Jika jawabannya "tidak" atau "belum ada bukti", aturan tersebut TIDAK LAYAK ditambahkan.

---

### Rumus Formal PASAL 8: Governance Benefit (GB) > Governance Cost (GC)

Sebelum rule/kpi/gate/metric/policy BARU dimasukkan ke Constitution L0 / Architecture L1:

**1. Hitung Governance Cost (GC) — biaya aturan tersebut:**
```
GC = Reading Time
   + Implementation Cost (eng hours untuk setup alat ukur / script / CI)
   + Maintenance Cost (eng hours per minggu untuk maintain aturan)
   + Audit Cost (eng hours per bulan untuk audit compliance manual / script)
```
Satuan: dapat menggunakan person-hours atau rough heuristic (Low/Medium/High).

**2. Hitung Governance Benefit (GB) — manfaat terhadap L4 decision speed/quality:**
```
GB = Decision Reduction (berapa jam diskusi dihindari PER BULAN karena adanya aturan)
   + Risk Reduction (berapa jam downtime / rollback / refactor dihindari PER QUARTER)
   + Reuse Increase (berapa jam reduksi pekerjaan CAPABILITY REUSE TERUKUR per bulan)
```
Satuan: sama dengan GC, harus dapat dibandingkan apples-to-apples.

**3. Aturan Entrance Filter PASAL 8:**
```
JIKA GB <= GC → DILARANG masuk Constitution L0 / Architecture L1.
JIKA GB >  GC BOLEH masuk (tetapi tetap via PASAL 1 evidence requirement).
```

**Contoh penerapan:**
- KPI ELaborate 10 sub-metric yang butuh 80 jam setup CI, tapi manfaatnya hanya 5 jam diskusi dihindari → GB < GC → TIDAK DIIZINKAN (ditolak oleh PASAL 8 sebelum sampai PASAL 1).
- SHA Fingerprint Comparison G0.1 (Alpha.13 Step 4): Cost = 2 jam setup script; Benefit = 40 jam diskusi "apakah capability ini benar-benar independent?" per engineering → GB >> GC → LAYAK.

---

### KLAUSE TAMBAHAN PASAL 8.A — PRINSIP PENYUSUTAN ALAMI KONSTITUSI (NATURAL CONSTITUTIONAL SHRINKAGE)

⚠️ **PENTING: INI BUKAN PASAL 9.** Ini adalah anak klausul PASAL 8 (Meta Architecture Budget) yang diaplikasikan KEPADA KONSTITUSI SENDIRI dari waktu ke waktu. Ditambahkan pada Kalibrasi Konstitusional Kelima.

**Latar Belakang Risiko (Anti Meta-Governance Complexity):**
Secara individual, PASAL 1-8, Gate Framework, KPI Groups, Purity Indices (CPI/FPI/AppPI/ECI), GC/GB, Rule of Five, Stability Hierarchy, Three-Layer Evolution — masing-masing masuk akal. Tetapi secara kolektif, muncul risiko **Meta-Governance Complexity**: kompleksitas bergeser dari L4 Software ke L0-L3 Governance. Ini secara ironis BERTENTANGAN dengan PASAL 8 sendiri (jika GB total governance kolektif < GC total untuk engineer yang baru belajar semua konsep ini → PASAL 8 secara implisit sudah dilanggar).

**Prinsip Review Periodik WAJIB Dijalankan:**

Pada SETIAP milestone besar transisi:
- Alpha.x → Beta.0
- Beta.x → RC.0
- RC.x → Release 1.0
- Setiap rilis mayor (v1.x → v2.0)

Tim Arsitek WAJIB mengajukan 1 pertanyaan sederhana terhadap SETIAP entri di Konstitusi (setiap PASAL, setiap aturan tambahan seperti Rule of Five, setiap klausul):

> **"Jika Enterprise OS didesain ulang HARI INI dari NOL dengan pengetahuan saat ini, apakah aturan ini masih diperlukan?"**

**Decision Tree Hasil Review (WAJIB didokumentasikan di Decision Object tipe constitutional-sunset-review):**

| Jawaban Review Question | Tindakan Konstitusional | Alasan |
|---|---|---|
| ✅ **"YA, masih mutlak diperlukan. Tanpa ini EOS akan rusak fundamental."** | **TETAP di L0 CONSTITUTION.md** | Masih memenuhi GC < GB secara kolektif. |
| 🟡 **"Berguna, tapi bukan mutlak. Bisa dijelaskan di level Architecture tanpa merusak fondasi."** | **PINDAHKAN ke L1 ARCHITECTURE.md** | Rule tidak mati, tapi turun level karena change-rate-nya sekarang lebih mirip aturan arsitektur daripada konstitusi. |
| 🔴 **"Tidak. Aturan ini sekarang adalah historical baggage, atau manfaatnya hanya berlaku di fase Alpha yang lalu, atau sudah digantikan oleh aturan lain yang lebih baik."** | **PINDAHKAN ke L2 EVIDENCE.md sebagai Historical Record** (APPEND-ONLY entry dengan catatan deprecated_at + replaced_by jika ada). | Rule di-**sunset**. Identity rule tetap tercatat sebagai bukti sejarah (tidak dihapus permanen sesuai PASAL 3 Immutable Record principle). Tapi RULE TERSEBUT TIDAK LAGI MENGIKAT secara konstitusional. |

**Konsekuensi Tidak Menjalankan Review:**
Jika milestone transition terjadi TANPA Decision Object `constitutional-sunset-review` yang terdokumentasi → milestone tersebut secara resmi dianggap **INCONCLUSIVE** untuk tujuan Gate Certification (bukan FAIL, tapi juga bukan PASS).

---

**Metrik Kolektif PASAL 8 untuk Konstitusi:**
Selain review kualitatif pertanyaan di atas, tim juga dapat menghitung secara heuristik:
```
Total Governance Cost (L0-L3 Kolektif)
  = Σ (Reading Time per engineer baru untuk mempelajari semua dokumen inti)
  + Σ (Onboarding Cost 1 engineer baru menjadi productive)
  + Σ (Maintenance Cost dokumen per release cycle)

Total Governance Benefit (L0-L3 Kolektif)
  = Σ (Decision Reduction terukur per bulan dari semua aturan)
  + Σ (Risk Reduction terukur dari Gate Framework)
  + Σ (Reuse Increase dari Capability Independence)
```

Jika pada saat review periodik: `Kolektif GB ≤ Kolektif GC` → WAJIB ada setidaknya 1 aturan yang di-sunset (diturunkan level dari L0 → L1 → L2 Evidence). Ini adalah self-correcting mechanism PASAL 8 terhadap dirinya sendiri.

---

## RULE OF FIVE — KLAUSE ANTI-FRAGMENTASI DOKUMEN (Tetap di Konstitusi)

Ditambahkan pada kalibrasi keempat bersama PASAL 8.

### Prinsip Rule of Five:

> **Enterprise OS HANYA DIIZINKAN memelihara MAKSIMAL LIMA (5) DOKUMEN INTI.**
>
> Apabila ada kebutuhan informasi BARU, informasi tersebut WAJIB ditempatkan
> ke dalam SALAH SATU dari 5 dokumen di bawah.
>
> **DILARANG KERAS** membuat dokumen tipe BARU selain kelima ini, termasuk tapi tidak terbatas pada:
> Policy.md, Meta Policy.md, Operating Manual.md, Architecture Handbook.md, Architecture Guide.md, Architecture Commentary.md, Architecture Notes.md, Architecture Philosophy.md, dan semua nama variasi lainnya yang secara semantik menambah dokumen governance BARU.

### Lima Dokumen Inti Resmi EOS (Rule of Five):

| No | Nama Dokumen Resmi | Level Artefak | Tempat Semua Kebutuhan Baru Ditempatkan |
|----|-------------------|---------------|----------------------------------------|
| 1 | **CONSTITUTION.md** | L0 (Paling Stabil) | Semua PASAL, Prinsip Dasar Konstitusi, Filter PASAL 8, Rule of Five |
| 2 | **ARCHITECTURE.md** | L1 (Milestone) | Semua Rules, KPI, Gate Framework, Purity Definition, Frozen Boundaries |
| 3 | **EVIDENCE.md** | L2 (Append-Only) | Semua hasil eksperimen, certification report, audit purity, gap analysis, Falsification Equivalence Principle |
| 4 | **ROADMAP.md** | L3 (Execution) | Semua frontier ilmiah, milestone protocol (Step-by-Step Alpha.13), phase roadmap, operating rules, weekly cadence |
| 5 | **STATUS.md** | L3+ (Control Surface) | HANYA Index Navigasi, Snapshot Status Terkini, Tabel Cross-Reference, Quick Links |

**Pengecualian KETAT (tidak dihitung dalam Rule of Five limit):**
- File artefak BUILD/EVIDENCE otomatis (snapshot JSON/YAML di bawah `build/evidence/`) = bukan dokumen manual governance.
- Decision Objects (DEC-*.yaml di bawah `governance/decisions/` dan `experiments/*/decision-log/`) = bukti keputusan (append-only L2 Evidence derivative, bukan governance doc baru).
- File kontrak/skema YAML (misal decision.schema.yaml, extraction-policy.yaml) = executable contracts (part of L1 Architecture when versioned lineage maintained).
- Eksperimen spesifik subfolder artefak (experiment-registry.yaml, EXP-001 sub-files) = evidence / execution context, bukan governance doctrine.
- README.md = dokumentasi onboarding publik untuk outsider, bukan dokumen inti epistemik governance (tidak perlu memuat PASAL/Rules detail, cukup link ke STATUS.md).

---

## PASAL 1 (SUPREME GOVERNANCE RULE)

Status epistemik framework HANYA boleh meningkat APABILA terdapat **bukti empiris BARU yang dapat direproduksi secara independen**.

Secara formal:
```
ΔEvidence(reproducible-independent)
        ↓
ΔStatus epistemik
```

TETAPI:
```
ΔArchitecture           ≠        ΔStatus
ΔImplementation         ≠        ΔConfidence
ΔFeature                ≠        ΔConfidence
ΔScaffoldTypeDeclared   ≠        ΔConfidence
```

Artikel ini menjamin:
- Kompleksitas kode TIDAK PERNAH diterjemahkan menjadi kenaikan klaim.
- Jumlah frontier yang baru TIDAK PERNAH diterjemahkan menjadi keyakinan baru.
- Hanya ΔEvidence independen reproducible → ΔStatus.

---

## PASAL 2 (AUDITOR CAVEAT — PERINGATAN RESMI)

Seluruh laporan eksekusi (termasuk EVIDENCE.md, output invariants PASS,
dan metrik numerik yang tercantum dalam artefak Level 1-3) MERUPAKAN
**EXECUTION REPORT yang diproduksi oleh sistem DIRI SENDIRI**, BUKAN audit
independen.

Auditor eksternal TIDAK BOLEH percaya pada teks STATUS.md / EVIDENCE.md
sebagai fakta terverifikasi. Auditor WAJIB:
1. Clone repository dalam keadaan BERSIH (tanpa `node_modules`, tanpa artifact build).
2. Install dependencies dari NPM lockfile (commit-specific).
3. Jalankan auditor reproducibility bundle tanpa komunikasi dengan pengembang.
4. Bandingkan hash content fingerprint observasi yang diproduksi vs yang dilaporkan.
5. HANYA setelah hash dan metrik sama persis, status epistemik boleh dianggap terkonfirmasi.

Sampai langkah 1-5 dilaksanakan oleh pihak independen:
status epistemik "PASS" apapun secara resmi masih dinyatakan sebagai
"dilaporkan self-certified."
Peningkatan status menjadi independently-reproduced membutuhkan Frontier D selesai.

---

## PASAL 3 (IMMUTABLE SCIENTIFIC RECORD LAYER — TERKUNCI)

```
Immutable Scientific Record    ← TIDAK BOLEH dimutasi, TIDAK BOLEH ada field baru masuk identity chain
   Observation  → identity sha-256 frozen fields:
      provenanceVersion + experimentExecutionId + index0 + content + observedAt + sourceChannel + semanticOutcome
   Evidence     → structured interpretation atas obs (bukan rewrite)
   Experiment   → Definition + Execution (versioned lineage)

         ↓ identity-stable APPEND-ONLY
Epistemic Interpretation Layer (sidecar indexes)
   Equivalence   Quality   Lifecycle   Replication   Consensus
```

Kedua lapisan TIDAK BOLEH digabungkan. Sidecar indexes TIDAK BOLEH
diikutsertakan dalam perhitungan SHA identity observation. Nilai
interpretasi baru boleh muncul berganti tanpa notice,
tetapi identity observation Alpha.8 → Alpha.∞ TETAP SAMA.

---

## PASAL 4 (STABILITY HIERARCHY — KONSTITUSI LAPISAN ARSITEKTURAL)

Lapisan arsitektur EOS diurutkan berdasarkan tingkat stabilitas, BUKAN
berdasarkan posisi teknis "bawah vs atas". Semakin stabil lapisan,
semakin KECIL laju perubahan yang diizinkan per satuan waktu.

Urutan Stabilitas (paling stabil → paling volatil):
```
Constitutional Ontological Foundation
  ├─ Three Fundamental Laws (Authority, Meaning, Realization)
  └─ Four Constitutional Axioms (A, B, C, D — frozen 2026–2036)
    ↑ change-rate ≈ 0 / abad — hanya berubah jika platform identity berubah
Foundation (Kernel, Core Contracts, Schema Registry)
    ↑ change-rate ≤ 0.05 / bulan — hampir tidak pernah berubah
Capability (Domain Logic, Ports, Commands, Queries, Repositories)
    ↑ change-rate ≤ 0.20 / bulan — jarang berubah
Composition (Workflow, Routes Assembly, Capability Wiring, Navigation Graph)
    ↑ change-rate ≤ 0.50 / bulan — kadang berubah
Experience Composition (Exposure, Auth Flow, Session, Personalization, Feature Visibility)
    ↑ change-rate ≤ 1.50 / bulan — sering berubah
Product (LawyersHub, Services-ID, app-specific UI, branding, copy, UX variants)
    ↑ change-rate ≤ 3.00 / bulan — paling sering berubah
```

Aturan Dependency KONSTITUSIONAL (violation = architectural failure):
```
BOLEH: Product → Experience → Composition → Capability → Foundation
BOLEH: layer yang sama saling bergantung (sesama Product, sesama Experience)
DILARANG: Foundation → Capability           [reverse dependency]
DILARANG: Capability → Composition          [reverse dependency]
DILARANG: Composition → Experience          [reverse dependency]
DILARANG: Experience → Product              [reverse dependency]
DILARANG: Capability → Experience / Product  [coupling violation — PASAL 5]
DILARANG: SELURUH lapisan engineering (Foundation–Product) DAPAT MERUJUK TAPI TIDAK BOLEH MUTASI artefak Three Laws atau Four Constitutional Axioms
```

Konsekuensi: Jika ada bukti EDCR (Experience-Driven Change Rate) > 30%
pada Capability layer, maka PASAL 4 dinyatakan dilanggar dan seluruh
Gate Enterprise Certification otomatis roll-back ke status FAIL.

---

## PASAL 5 (CAPABILITY INDEPENDENCE — PEMISAHAN DUNIA LAMA vs DUNIA BARU)

Inilah Gate KRITIS yang memisahkan "monorepo yang terorganisir" dari
"Enterprise Operating Model yang menghasilkan leverage kumulatif".

Pertanyaan Verifikasi PASAL 5 (SATU-SATUNYA yang diizinkan menaikkan status
Capability dari "defined" menjadi "independently-composable"):

> "Apakah capability yang sama bisa dipakai oleh DUA Experience Surface
>  berbeda TANPA SATU PUN perubahan pada implementasi capability?"

Contoh PASS:
```
Capability: Case Management
  ├── Used by: Workspace Experience  → SHA implementation = abc123
  ├── Used by: API Experience        → SHA implementation = abc123
  ├── Used by: CLI Worker Experience → SHA implementation = abc123
  └── Semua SHA SAMA PERSIS → Independence PASS
```

Contoh FAIL (semua di bawah ini = auto-fail PASAL 5):
```
FAIL #1: capability mengandung if (experience === 'workspace') { ... }
FAIL #2: capability import dari package presentation/ui-system
FAIL #3: manifest mewajibkan field experience.view = <ReactComponent>
FAIL #4: saat memindahkan capability ke experience BARU, minimal 1 baris
         kode dalam /implementation/ harus diubah
FAIL #5: ada file .tsx / .vue dalam folder capability/implementation/
```

Bukti Empiris Diperlukan (bukan sekadar desain):
- Minimal 2 consumer berbeda yang secara RIIL menggunakan capability tersebut
- SHA fingerprint dari folder capability/implementation TETAP SAMA lintas consumer
- Setiap consumer mengemas exposure-level, workflow, dan navigation-nya SENDIRI
  di Experience Composition layer, bukan di dalam capability.

PASAL 5 adalah pintu satu arah: capability yang gagal PASAL 5 TIDAK BOLEH
diekstrak sebagai reusable enterprise asset. Biarkan tetap hidup di dalam
Product layer sampai bukti empiris Independence PASS ada.

---

## PASAL 6 (THREE-LAYER EVOLUTION MODEL — MEKANISME EVOLUSI EOS)

Yang sedang dibangun BUKAN struktur software. Yang sedang dibangun adalah
mekanisme evolusi Enterprise OS itu sendiri. Terdiri dari 3 lapisan
dengan aturan perubahan YANG BERBEDA. Setiap lapisan HANYA boleh berubah
APABILA lapisan di BAWAHNYA (lebih fundamental) sudah membuktikan
kebutuhan perubahan.

### Layer 1 — Scientific Record (IMMUTABLE — TIDAK BOLEH BERUBAH)

Berisi FAKTA ilmiah. Identitas SHA-256-nya TIDAK BOLEH berubah,
bahkan ketika interpretation layer berkembang.

Isi Layer 1:
- Raw Observation (fakta primer: apa yang terjadi, TANPA interpretasi)
- Evidence (structured interpretation TIDAK mengubah OBS identity)
- Experiment (Definition + Execution dengan versioned lineage)
- Identity SHA (semua frozen identity fields di PASAL 3)
- Provenance Graph (5-Node Graph edges dengan semantic relationship)

Perubahan di Layer 1 HANYA terjadi melalui:
- Penambahan record BARU (append-only), TIDAK PERNAH mutasi yang mengubah identity SHA.
- Revocation record: bukti dinyatakan tidak berlaku TETAPI IDENTITY-NYA TETAP TERCATAT
  (bukan dihapus).

### Layer 2 — Interpretation (DAPAT BERKEMBANG — Selalu sidecar, tidak mengubah L1)

Berisi INTERPRETASI terhadap fakta. Boleh berkembang seiring
pengetahuan organisasi bertambah. Selalu APPEND-ONLY sebagai sidecar
indexes, TIDAK PERNAH mengubah field identity Layer 1. Sesuai PASAL 3.

Isi Layer 2:
- Quality (Weighted Evidence Quality Model, AggregateScore01)
- Consensus (ClaimConsensusClassification, quality-weighted sum)
- Replication (ReplicationGroup, distinctExecutorIdentities, convergence)
- Lifecycle (State machine created → verified → replicated → deprecated | superseded)
- Equivalence (ObservationSemanticEquivalenceEdge dengan kind taxonomy)

Perubahan di Layer 2 DIIZINKAN apabila:
- Bukti empiris baru menunjukkan classification kualitas atau consensus
  yang lebih akurat.
- Tetapi: setiap perubahan interpretation WAJIB menyimpan version lineage
  sehingga interpretation lama tetap bisa di-audit.
- DILARANG: meng-embed interpretation ke dalam identity fields Layer 1.

### Layer 3 — Architecture (DAPAT DIRESTRUKTURISASI — HANYA setelah L1+L2 membuktikan)

Berisi struktur runtime dan komposisi. Ini adalah lapisan PALING MUDAH
berubah dari ketiga. Akan tetapi, kekhususan yang WAJIB dijaga:

> Architecture TIDAK BOLEH berubah hanya karena "terlihat lebih elegan".
> Architecture HANYA boleh berubah apabila Layer 1 (bukti empiris)
> DAN Layer 2 (interpretasi terhadap bukti) secara KONKRET
> menunjukkan bahwa perubahan architecture diperlukan.

Isi Layer 3:
- Capability Registry + Descriptor Contracts
- Composition (Workflow, Routes Assembly, Navigation Graph)
- Experience Composition Layer (8 tanggung jawab orkestrasi)
- Products (LawyersHub, Services-ID, dan seterusnya)

Aturan Fundamental PASAL 6: CASCADE FLOW CONSTRAINT
```
Observation (L1 Immutable Scientific Record — PASAL 3)
    ↓  Hanya L1 yang sudah diverifikasi byte-by-byte → Evidence (L1)
Evidence (L1 EvidencePackage — via Measurement Report 6 Bagian)
    ↓  Measurement OBJECTIF — angka & boolean SAJA, TANPA judgment
Measurement Report Section 3-4 (Observation + Measurement)
    ↓  Classification SUBYEKTIF tapi evidence-based
Measurement Report Section 5 (Interpretation)
    ↓  Confidence ≥ threshold decision (PASAL 6)
Measurement Report Section 6 (Decision)
    ↓  HANYA JIKA field architecture_change_allowed_yet = TRUE
Architecture (L3 ARCHITECTURE.md / L3 Capability Registry / dsb)
    ↓  Hanya Architecture yang stabil (Gate A-D PASS) → Experience (L3)
Experience (L3)
    ↓  Hanya Experience yang reusable → Product (L3)
```

**Aturan KONSTITUSIONAL TAMBAHAN PASAL 6.A (TRACEABILITY CHAIN — Central Question Kalibrasi Keenam):**
> **Setiap perubahan arsitektur (L3) WAJIB merujuk MINIMAL 1 Measurement Report SHA256 Identifier sebagai akar bukti.**

Auditor independen (PASAL 2 + Frontier D) HARUS BISA menjalankan trace di bawah ini TANPA MEMBUTUHKAN PENJELASAN LISAN dari pembuat keputusan:
```
(1) SHA Commit perubahan arsitektur di git log
      ↓ cari field decision traceability: affected_architectural_commits
(2) Decision Object [DEC-XXX] → evidence_primary.measurement_report_sha256
      ↓ reproduce report, compare SHA cocok?
(3) Measurement Report [build/evidence/.../*.yaml]
      ↓ Section 4 Measurement → source merujuk ke field mana?
(4) Measurement Report Section 3 Observation → setiap hash / list file
      ↓ fresh clone → reproduce
(5) Observation diverifikasi byte-by-byte IDENTIK
```
Jika chain (1)-(5) putus di satu titik manapun → Perubahan arsitektur dianggap **TIDAK SAH** menurut Konstitusi (meskipun perubahannya sendiri "terlihat bagus"). Perubahan yang tidak sah WAJIB di-REVERT atau di-REMEASUREMENT sampai chain lengkap.

**DILARANG KERAS — Flow Reverse (PASAL 6 Violation):**
```
Product mendikte Architecture → Architecture mendikte Decision →
Decision mendikte Interpretation → Interpretation mendikte Measurement →
Measurement mendikte Evidence → Evidence mendikte Observation
```
Jika flow reverse terjadi (misal: kebutuhan product mendesain
capability registry tanpa bukti L1 Measurement Report SHA reference),
maka PASAL 1 (ΔEvidence → ΔStatus) dinyatakan dilanggar, dan status
epistemik seluruh platform ROLLBACK.

Contoh sederhana PASAL 6.A: Jika pada ARCHITECTURE.md ditambahkan rule
baru "Folder capability WAJIB punya 3 sub-folder", maka commit yang
menambahkan rule itu WAJIB menambahkan trace menuju Decision Object
DEC-XXX, yang di dalamnya merujuk SHA measurement report Alpha.14 yang
menunjukkan bukti empiric "3-subfolder structure mengurangi coupling
sebesar X% dibanding structure sebelumnya". TANPA trace ini → rule
tidak sah (PASAL 6 Violation).

---

### PASAL 6.B — WATCHLIST RISIKO STRUKTURAL EPISTEMIK (3 Failure Mode Masa Depan)

Ditetapkan pada Kalibrasi Ketujuh. Ini BUKAN PASAL BARU — ini adalah
anak klausul PASAL 6 (seperti PASAL 6.A). Tiga risiko struktural yang
terdeteksi secara saintifik oleh user audit epistemik, dan WAJIB
dipantau PASAL 8 GB > GC, serta menjadi TRIGGER otomatis PASAL 8.A
Natural Shrinkage Review ketika kondisi trigger terpenuhi:

| ID Risiko | Failure Mode Yang Dicegah | Mekanisme Pertahanan SEKARANG | Trigger Otomatis Review PASAL 8.A |
|---|---|---|---|
| **R1: Report Mini-Konstitusi** | Measurement Report 6-bagian perlahan bertambah sub-section Governance/Process/Schema/Checklist → jadi 40 halaman menghasilkan decision YANG SAMA dengan 8 halaman (PASAL 8 ironi GC > GB). | INVARIAN 1 Single Truth: Semua definisi aturan TETAP di 5 dokumen inti Rule of Five. Report HANYA BOLEH merujuk link ke aturan, TIDAK copy paste definisi aturan. | Jika audit user: "Format report X halaman menghasilkan decision identik dengan Z halaman (Z < X)" → format report kandidat sunset sederhanakan pada review milestone berikutnya. |
| **R2: Traceability Explosion** | Chain trace > 5 step (Arch→Dec→Report→Obs→Exp→Dataset→Raw) → cost audit eksponensial melebihi benefit governance. | PASAL 6.A mematok MAX DEPTH = 5 (Commit→Dec→Report→Meas→Obs). Depth 6+ DILARANG: bukti tambahan TARUH di Section 3 Observation sebagai linked artifact, TIDAK MENAMBAH layer chain formal. | **Traceability Depth Index (TDI)** akan diperkenalkan saat corpus evidence ≥ 30 report: `TDI = Σ(depth / N)`. Jika TDI > 5.0 → WAJIB review struktur trace untuk flatten. Saat ini TDI = N/A (corus < 30). |
| **R3: Metric Overlap Tidak Efektif** | Ada 8+ metrik (Gate 0-F, CPI, FPI, AppPI, ECI, ELRv2, GC, GB) — tapi suatu metrik TIDAK PERNAH merubah decision PROCEED/REFACTOR/REPEAT selama 3 siklus → biaya mati (GC) tanpa GB. | Setiap metrik WAJIB punya field `source` jelas di Measurement Report Section 4, dan link ke `next_action_trace` di Decision Object. | **Trigger Sunset Otomatis PASAL 8.A:** Suatu metrik TIDAK PERNAH menjadi alasan perubahan next_action (field decision tidak merujuk source metrik tersebut) selama **3 SIKLUS EKSPERIMEN BERURUTAN** → otomatis masuk shortlist Sunset Review pada milestone transition berikutnya. Kandidat akan diuji GB vs GC. Jika GB ≤ GC → diturunkan level ke ARCHITECTURE / di-sunset ke EVIDENCE.md Historical Record. |

**Penting:** Watchlist di atas adalah mekanisme proaktif PASAL 8 membetulkan dirinya sendiri DENGAN BUKTI (bukan opini). Tiga risiko ini TERDETEKSI dan TERCATAT sekarang (sebelum terjadi). Trigger masing-masing jelas terukur. Ini sesuai epistemologi EOS: evidence dulu sebelum architecture berubah.

---

## PASAL 7 (OBJECTIVE vs CONSTRAINT — OPTIMIZATION FRAMEWORK)

Ditambahkan pada kalibrasi epistemik Level 0 ketiga.

### Prinsip Dasar: Leverage adalah Objective, Purity adalah Constraint.

**Optimization Function Formal EOS:**
```
MAXIMIZE: ELRv2_Score(periode)
          = (MEC / TotalCap)
          × (MPC / TotalCap)
          × (1 − clamp(EDCR, 0, 1))
          × clamp(CIEC / MaxExperienceChanges, 0, 1)
```

**Subject to (CONSTRAINT — tidak boleh dilanggar, BUKAN yang di-maximize):**
```
CPI  ≥ CPI_threshold          (saat ini default ≥ 0.50 untuk Gate 0)
FPI  ≥ FPI_threshold          (saat ini default ≥ 0.95 untuk Gate A)
ECI  ≤ ECI_threshold          (saat ini default ≤ 0.10 untuk Gate E)
AppPI ≥ AppPI_threshold       (saat ini default ≥ 0.90 untuk Gate D)
```

**DILARANG KERAS:**
```
MAXIMIZE CPI    → Bukan tujuan. CPI = 1.0 tapi produk = tidak berguna = FAIL.
MAXIMIZE FPI    → Bukan tujuan. FPI = 1.0 tapi tidak ada capability reusable = FAIL.
MINIMIZE  ECI   → Bukan tujuan. ECI = 0 tapi Experience Layer tidak melayani user = FAIL.
```

Interpretasi: Jika ada trade-off antara kenaikan ELRv2 dengan
penurunan purity TETAPI masih di atas threshold → pilih kenaikan ELRv2.
Jika purity turun MELEWATI threshold → solusi ditolak (constraint violation).

---

# IMPLIKASI PASAL 6: FOUNDATION PURITY PRINCIPLE

Konsekuensi langsung dari Cascade Flow:

> **Foundation Layer (Kernel, Core Contracts) TIDAK BOLEH mengenal
> vocabulary Experience Surface manapun.**

Kata-kata berikut ADALAH vocabulary Experience Surface.
KEMUNCULANNYA di dalam Foundation Layer = Architecture Smell Level CRITICAL
= Automatic Gate 0 FAIL criterion G0.7.

```
workspace     consumer     studio     api
mobile        cli          worker     voice
dashboard     portal       desktop    app
```

Catatan: Kata `workspace:*` di package.json dependency protocol
(PNPM workspace) = BUILD TOOL CONFIG, bukan vocabulary experience surface.
Tetapi: `WorkspaceDefinitionSchema`, `WorkspaceDefinition` di kernel types
= BOLEH HANYA JIKA artinya "unit komposisi capability generik",
BUKAN "experience surface bernama Workspace".

Measurement: Foundation Purity Index (FPI) — definisi formal di
Artefak Architecture.md (Level 1).

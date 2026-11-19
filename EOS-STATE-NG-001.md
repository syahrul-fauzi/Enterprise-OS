# EOS-STATE-NG-001 — Final Design RFC

DESIGN DECISIONS SET

Implementation NOT approved

Private repository

Keputusan desain telah ditetapkan berdasarkan instruksi Anda:

| Keputusan            | Ketetapan                                   |
| -------------------- | ------------------------------------------- |
| Repository           | `eos-id/.eos-state`                         |
| Strategi pembangunan | Parallel build                              |
| Visibilitas          | Private                                     |
| Legacy state         | Dipertahankan, tidak dimodifikasi           |
| Migrasi              | Selektif, bertahap, evidence-driven         |
| Cutover              | Hanya setelah seluruh migration gates lulus |
| Implementasi         | Menunggu approval eksplisit                 |

Batas otorisasi: dokumen ini adalah keputusan desain dan spesifikasi final untuk tahap perencanaan. Belum ada repository yang dibuat, konfigurasi GitHub yang diubah, file yang ditulis, atau artefak legacy yang dimigrasikan. Persetujuan desain ini bukan persetujuan implementasi.

## 1. Executive architecture decision

EOS-STATE-NG bukan proyek pemindahan direktori `.eos-state` lama ke repository baru. Ini adalah pembangunan ulang Engineering Memory Substrate yang lebih terstruktur, dapat diverifikasi, dan dapat dikonsumsi oleh manusia maupun AI agents.

Tujuan utamanya:

> Build a sovereign, evidence-grounded engineering memory that preserves architectural intent, decision history, provenance, and work continuity—without becoming a second source of truth.

Prinsip desain:

1. Memory, not authority — menyimpan konteks engineering, bukan mengambil alih business atau runtime authority.
2. Evidence before assertion — klaim status harus dapat ditelusuri ke bukti.
3. Identity before migration — setiap artefak harus memiliki identitas dan provenance yang jelas sebelum dipindahkan.
4. Current view, historical truth — proyeksi kondisi terkini tidak menghapus sejarah keputusan.
5. Selective migration — tidak semua artefak lama layak menjadi data aktif.
6. Agent-readable, human-governed — agents dapat membaca dan menyusun rekomendasi, tetapi perubahan berisiko tetap memerlukan otorisasi.
7. Reuse existing authority — tidak menduplikasi Work Core, Core Proof Ledger, runtime state, atau registri bisnis.

### Batas otoritas

| Sistem                    | Otoritas                                                |
| ------------------------- | ------------------------------------------------------- |
| Genesis EOS               | Business domain, business truth, policies, capabilities |
| Work Core                 | Identitas dan kontinuitas Work                          |
| Agentic Work              | Workforce experience, dispatch, coordination            |
| Connector Ecosystem       | Integrasi dan konektivitas eksternal                    |
| EOS Runtime               | Runtime execution state                                 |
| `@repo/core-proof-ledger` | Append-only proof semantics                             |
| New `.eos-state`          | Engineering Memory dan konteks evolusi EOS              |
| Legacy `.eos-state`       | Historical engineering source selama transisi           |

Aturan penting: repository baru boleh menyimpan referensi ke Work ID, proof ID, runtime execution ID, dan business entity ID. Repository baru tidak boleh membuat salinan yang kemudian dianggap sebagai otoritas alternatif.

## 2. Target architecture

[Enterprise Cognitive Mesh: How Large Organizations Build Shared Reasoning Across Thousands of AI Agents | by RAKTIM SINGH | Medium](https://images.openai.com/static-rsc-4/XI_gFSxsC1qhipd95K_bQsHs0aNzRxIho9ir5enzv91twmDMiDeI95qq1rbhHsZmB1Wn52aC-3rrfhQw5ApugkQEMFXicFMHKJKRJY0tf-CL0r5-iO6p_I_PCJQeB8t_vJNA-kq_xaLbrd3I-0HN7iQ0wq6H-YF5HwuNKl5CrCo?purpose=inline)

[medium.com](https://medium.com/%40raktims2210/enterprise-cognitive-mesh-how-large-organizations-build-shared-reasoning-across-thousands-of-ai-d9923b451720?utm_source=chatgpt.com)

Arsitektur konseptual dibagi menjadi empat concern:

A. Identity & Authority

Menentukan siapa pemilik data, identitas artefak, bounded context, dan batas kewenangan.

B. Decision & Continuity

Merekam keputusan arsitektur, alasan, alternatif, konsekuensi, supersession, dan hubungan antar-keputusan.

C. Evidence & Provenance

Menyimpan metadata dan referensi bukti, hash, asal-usul, verifikasi, serta status validitasnya.

D. Context & Projection

Menyediakan ringkasan kondisi terkini dan context package untuk agent tanpa mengubah historical records.

Pemisahan ini adalah pemisahan tanggung jawab, bukan instruksi untuk membuat empat database atau empat layanan. Implementasi awal tetap Git-native.

### Repository layout yang ditetapkan sebagai target

```
eos-id/.eos-state/
├── README.md
├── AGENTS.md
├── STATE_CONSTITUTION.md
├── identity/
│   ├── authority.yaml
│   ├── ownership.yaml
│   └── bounded-contexts.yaml
├── registry/
│   ├── artifact-registry.yaml
│   ├── decision-registry.yaml
│   └── reference-registry.yaml
├── decisions/
│   └── architecture/
├── evidence/
│   ├── references/
│   └── verification/
├── memory/
│   ├── engineering/
│   ├── experiments/
│   └── retrospectives/
├── projections/
│   ├── current-work/
│   ├── architecture/
│   └── governance/
├── schemas/
├── archive/
└── quarantine/
```

Ini adalah target logical layout, bukan kewajiban membuat setiap direktori pada bootstrap. Direktori kosong tidak perlu dibuat. Setiap direktori harus memiliki use case, owner, schema atau format, dan acceptance test sebelum menjadi bagian dari baseline.

## 3. Target data model

Model data harus cukup kuat untuk menjaga provenance dan relasi, tetapi tidak berkembang menjadi domain model baru yang bersaing dengan EOS Core.

### 3.1 Record classes

| Record class           | Fungsi                                          | Batas                                |
| ---------------------- | ----------------------------------------------- | ------------------------------------ |
| `ArtifactRecord`       | Identitas dan metadata artefak engineering      | Tidak mengambil alih isi artefak     |
| `DecisionRecord`       | Keputusan, alasan, alternatif, konsekuensi      | Tidak mengubah authority domain lain |
| `EvidenceReference`    | Referensi bukti dan metadata verifikasi         | Bukan pengganti Proof Ledger         |
| `MemoryRecord`         | Eksperimen, retrospektif, temuan, pembelajaran  | Tidak menjadi sumber status runtime  |
| `ProjectionRecord`     | Snapshot hasil komputasi dari sumber otoritatif | Derived, dapat dibangun ulang        |
| `AuthorityDeclaration` | Menjelaskan pemilik dan batas kewenangan        | Tidak memberikan kewenangan baru     |

Record classes tersebut adalah format informasi dalam Engineering Memory, bukan penambahan primitive ke Work Core atau EOS Runtime.

### 3.2 Common record envelope

Semua record yang dikelola secara terstruktur menggunakan envelope metadata yang konsisten:

```
schemaVersion: "1.0"
recordId: "ADR-EOS-STATE-NG-001"
recordType: "decision"
title: "EOS State Next Generation Architecture"
status: "accepted"

createdAt: "2026-11-19T00:00:00Z"
updatedAt: "2026-11-19T00:00:00Z"

owner:
  context: "engineering-memory"
  authority: "eos-architecture"

source:
  type: "human-decision"
  reference: "EOS-STATE-NG-001"

relationships:
  relatesTo: []
  supersedes: []
  supersededBy: []

provenance:
  origin: "current-design-session"
  sourceRepository: null
  sourceCommit: null
  contentHash: null

verification:
  status: "not-verified"
  verifiedAt: null
  verifier: null
```

Contoh ini adalah format target, bukan record yang sudah ditulis atau disahkan sebagai artefak di repository.

Aturan envelope:

- `recordId` harus stabil dan unik dalam namespace Engineering Memory.
- `schemaVersion` wajib agar perubahan format dapat dikontrol.
- `owner` menjelaskan konteks pemilik, bukan menggantikan domain ownership.
- `source` dan `provenance` wajib untuk record hasil migrasi.
- `relationships` menyimpan referensi, bukan menyalin isi record lain.
- `verification.status` tidak boleh otomatis berubah menjadi `verified` hanya karena file berhasil dibaca atau hash cocok.

### 3.3 Model spesifik per record

A. ArtifactRecord

```
artifactId: "ART-LEGACY-EXAMPLE-001"
artifactType: "engineering-document"
title: "Example legacy architecture report"
lifecycle: "under-review"

source:
  repository: "syahrul-fauzi/Enterprise-OS-State"
  path: "architecture/example-report.md"
  commit: "source-commit-sha"

integrity:
  algorithm: "sha256"
  hash: "source-content-hash"

adjudication:
  decision: "pending"
  rationale: null
  reviewer: null
```

Lifecycle yang diizinkan:

- `active` — digunakan sebagai Engineering Memory aktif.
- `consolidated` — substansinya telah digabung ke artefak kanonis lain.
- `superseded` — digantikan keputusan atau dokumen yang lebih baru.
- `archived` — dipertahankan untuk referensi historis.
- `quarantined` — belum aman atau belum cukup jelas untuk digunakan.
- `excluded` — tidak dimigrasikan; alasan pengecualian wajib dicatat.

`under-review` di atas adalah status adjudikasi awal, bukan lifecycle final.

B. DecisionRecord

```
decisionId: "ADR-EOS-STATE-NG-001"
title: "Repository and migration strategy"
status: "accepted"

context:
  problem: "Legacy engineering memory requires a better-governed successor."

decision:
  repository: "eos-id/.eos-state"
  strategy: "parallel"
  visibility: "private"

constraints:
  - "Preserve legacy repository"
  - "No duplicate authority"
  - "No destructive migration"
  - "Evidence required for cutover"

alternatives:
  - option: "In-place refactor"
    disposition: "rejected"
  - option: "Clean start without legacy preservation"
    disposition: "rejected"

consequences:
  - "Legacy and new repositories coexist during migration."
  - "Migration requires artifact-level adjudication."
```

C. EvidenceReference

```
evidenceId: "EVD-EOS-EXAMPLE-001"
evidenceType: "verification-report"
subject:
  recordId: "ART-LEGACY-EXAMPLE-001"

source:
  repository: "syahrul-fauzi/Enterprise-OS-State"
  path: "evidence/example-report.yaml"
  commit: "source-commit-sha"

integrity:
  algorithm: "sha256"
  hash: "evidence-content-hash"

verification:
  status: "pending"
  method: "independent-review"
  verifiedBy: null
  verifiedAt: null
```

EvidenceReference hanya menyimpan pointer, provenance, dan metadata verifikasi. Bukti append-only yang menjadi kewenangan `@repo/core-proof-ledger` tetap berada di sana.

D. ProjectionRecord

```
projectionId: "PRJ-EOS-STATE-CURRENT-001"
projectionType: "architecture-overview"
generatedAt: "2026-11-19T00:00:00Z"

sources:
  - recordId: "ADR-EOS-STATE-NG-001"

generation:
  method: "deterministic"
  version: "1.0"

validity:
  status: "derived"
  expiresAt: null
```

Projection tidak boleh diperlakukan sebagai keputusan atau bukti primer. Jika sumber berubah, projection harus dapat dibangun ulang.

### 3.4 Relationship model

Hubungan antar-record minimal:

| Relasi        | Makna                                            |
| ------------- | ------------------------------------------------ |
| `references`  | Record menunjuk sumber lain                      |
| `supports`    | Evidence mendukung klaim atau keputusan          |
| `contradicts` | Bukti atau record bertentangan                   |
| `supersedes`  | Keputusan baru menggantikan keputusan lama       |
| `derivedFrom` | Projection atau ringkasan diturunkan dari sumber |
| `belongsTo`   | Record berada dalam bounded context tertentu     |

Relasi menggunakan ID stabil dan tidak meng-copy data sumber.

### 3.5 Data integrity dan versioning

Baseline teknis:

- YAML/Markdown sebagai format manusia dan Git-friendly.
- JSON Schema untuk validasi record terstruktur.
- SHA-256 untuk integritas konten dan verifikasi migrasi.
- Git commit untuk sejarah perubahan dan provenance repository.
- Schema versioning untuk evolusi kontrak.
- No database, vector store, graph database, event broker, atau search service pada bootstrap.

Search/indexing untuk agents dapat ditambahkan kemudian hanya jika ada kebutuhan terukur dan tidak menggantikan sumber kanonis Git.

## 4. Repository bootstrap plan

Bootstrap harus menghasilkan fondasi yang bisa diverifikasi, bukan sekadar banyak folder dan dokumen.

### Tahap bootstrap

1. B0 — Repository governance
   - Membuat repository private `eos-id/.eos-state` setelah approval implementasi.
   - Menetapkan owner, akses, aturan branch, secret handling, dan kebijakan publikasi.
   - Menetapkan repository description dan README yang menyatakan batas otoritas.
2. B1 — State Constitution
   - Menulis `STATE_CONSTITUTION.md`.
   - Menentukan Engineering Memory scope dan non-goals.
   - Mendefinisikan authority boundary, lifecycle, provenance, serta mutation policy.
3. B2 — Schema foundation
   - Menetapkan envelope dan schema untuk record classes.
   - Menambahkan contoh valid dan invalid.
   - Menambahkan validator dan schema compatibility tests.
4. B3 — Minimal repository structure
   - Membuat hanya direktori yang digunakan oleh baseline.
   - Menambahkan registry awal dan indeks.
   - Memastikan setiap artefak memiliki owner dan tujuan.
5. B4 — Validation pipeline
   - Schema validation.
   - Duplicate ID detection.
   - Broken reference detection.
   - Provenance completeness checks.
   - Secret and sensitive-data scanning.
   - Integrity verification.
6. B5 — Agent consumption contract
   - Mendefinisikan read-only context contract.
   - Menghasilkan context package dari sumber yang terverifikasi.
   - Mengatur akses agent berdasarkan scope dan klasifikasi risiko.
   - Tidak memberikan hak mutasi otomatis kepada agent.

### Bootstrap deliverables

| Deliverable                      | Acceptance evidence                       |
| -------------------------------- | ----------------------------------------- |
| `README.md`                      | Scope, tujuan, batas otoritas, penggunaan |
| `AGENTS.md`                      | Instruksi agent dan batas mutasi          |
| `STATE_CONSTITUTION.md`          | Konstitusi disetujui                      |
| `identity/authority.yaml`        | Authority matrix tervalidasi              |
| `identity/ownership.yaml`        | Ownership lengkap                         |
| `identity/bounded-contexts.yaml` | Bounded context terpetakan                |
| Schema files                     | Semua record type tervalidasi             |
| Validation pipeline              | Test report dan reproducible run          |
| Migration policy                 | Lifecycle dan adjudication rules          |
| Agent context contract           | Read-only behavior dan test evidence      |

Catatan desain: nama-nama file ini adalah target deliverable. Jika sebuah informasi dapat ditempatkan di dokumen yang sudah ada tanpa mengurangi kejelasan, jangan membuat file tambahan.

## 5. Migration strategy — parallel build

## Two repositories, one controlled transition

Legacy Engineering Memory

`syahrul-fauzi/Enterprise-OS-State`

Historical source • preserved • read-only during migration unless separately authorized

New EOS State

`eos-id/.eos-state`

New constitution • validated schemas • selective migration • controlled agent context

Legacy remains intact until the new state is independently verified and cutover is explicitly approved.

### Migration pipeline

1. Discover — inventarisasi legacy tanpa perubahan.
2. Fingerprint — hash, source commit, path, file type, ukuran, dan metadata.
3. Classify — tentukan kategori dan authority owner.
4. Adjudicate — tentukan `active`, `consolidated`, `superseded`, `archived`, `quarantined`, atau `excluded`.
5. Transform — sesuaikan format hanya jika diperlukan dan dapat dilacak.
6. Verify — periksa konten, hash, relasi, provenance, dan semantik.
7. Publish — masukkan ke repository baru setelah gate disetujui.

### Aturan migrasi yang tidak dapat dinegosiasikan

- Tidak melakukan blind copy atas seluruh 1.175 artefak legacy.
- Angka 1.175 diperlakukan sebagai baseline attestation yang pernah dilaporkan, bukan jaminan bahwa seluruh artefak masih layak menjadi state aktif.
- Tidak menghapus, memindahkan, atau mengubah sumber legacy sebagai bagian dari migrasi awal.
- Tidak mengubah historical evidence agar sesuai dengan status saat ini.
- Tidak mengubah bukti menjadi klaim yang lebih kuat dari bukti aslinya.
- Setiap transformasi harus menyimpan source path, source commit, hash sumber, hash hasil, dan alasan transformasi.
- File yang ambigu, konflik, sensitif, atau tidak memiliki provenance memadai masuk quarantine.
- Migrasi ke repository baru tidak otomatis berarti artefak tersebut menjadi authority.

## 6. Migration gates dan stop conditions



Proposed execution gates

&#x20;Semua gate berikut wajib lulus sebelum cutover.



| Gate | Nama                      | Kriteria kelulusan                                                               | Jika gagal        |
| ---- | ------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| G0   | Authorization             | Approval implementasi dan scope tertulis                                         | STOP              |
| G1   | Legacy preservation       | Baseline legacy, commit, inventory, hash, dan backup evidence tercatat           | STOP              |
| G2   | Authority boundary        | Tidak ada duplikasi authority atau ownership yang ambigu                         | STOP              |
| G3   | New repository foundation | Private repository, governance, schemas, validation pipeline siap                | STOP              |
| G4   | Artifact adjudication     | Setiap artefak dalam scope memiliki keputusan migrasi dan alasan                 | QUARANTINE / STOP |
| G5   | Migration integrity       | Provenance, source-to-target mapping, dan hash tervalidasi                       | STOP              |
| G6   | Independent verification  | Reviewer independen mengonfirmasi hasil migrasi dan invariant                    | STOP              |
| G7   | Integration readiness     | Context contract, consumer integration, dan akses agent lulus pengujian          | STOP              |
| G8   | Cutover authorization     | Pemilik EOS menyetujui cutover setelah menerima laporan verifikasi               | STOP              |
| G9   | Post-cutover assurance    | Canonical mount, consumers, rollback plan, dan legacy preservation terverifikasi | HOLD / ROLLBACK   |

### G1 — Legacy preservation

Syarat minimum:

- Remote HEAD dan commit sumber tercatat.
- Inventory final memiliki identitas unik.
- Hash dan path konsisten.
- Branch dan working tree tidak mengalami perubahan tak terotorisasi.
- Semua discrepancy terdokumentasi.

Baseline 1.175 artefak yang pernah dilaporkan akan menjadi titik awal rekonsiliasi. Inventory harus dihasilkan ulang dan diverifikasi pada saat implementasi, bukan hanya mengandalkan laporan lama.

### G2 — Authority boundary

Independent reviewer harus memastikan:

- Tidak ada Work ID baru yang diciptakan untuk menggantikan Work Core.
- Tidak ada proof record yang disalin menjadi otoritas alternatif.
- Tidak ada business state yang disimpan sebagai kebenaran operasional di Engineering Memory.
- Tidak ada runtime execution state yang dipindahkan menjadi state repository.
- Tidak ada connector credential atau secret yang masuk ke Git.

### G5 — Migration integrity

Untuk setiap artefak yang masuk scope:

\\[ H\_{\text{source}} = H\_{\text{target}} \\]

berlaku untuk migrasi byte-preserving. Jika format atau isi berubah melalui transformasi yang disetujui, hash tidak harus sama, tetapi harus ada:

- source hash;
- target hash;
- transform version;
- transformation rationale;
- mapping ke source artifact;
- reviewer dan verification evidence.

### G6 — Independent verification

Pelaksana migrasi tidak boleh menjadi satu-satunya pihak yang menyatakan hasilnya lulus.

Verifier harus dapat mengulang:

- inventory reconciliation;
- duplicate detection;
- reference integrity checks;
- hash validation;
- schema validation;
- authority boundary tests;
- secret scanning;
- migration report generation.

### G8 — Cutover authorization

Cutover tidak boleh otomatis terjadi setelah G7. Keputusan cutover memerlukan persetujuan eksplisit pemilik EOS.

Legacy repository tetap dipertahankan setelah cutover sebagai historical source. Pengarsipan atau penghentian akses merupakan keputusan terpisah.

### Stop conditions global

Hentikan pekerjaan jika ditemukan:

1. Hash mismatch yang tidak dapat dijelaskan.
2. Artifact loss atau unexpected deletion.
3. Provenance hilang.
4. Konflik ownership atau authority.
5. Secret atau data sensitif terpapar.
6. Duplikasi Work Core atau Proof Ledger.
7. Perubahan pada legacy repository di luar scope.
8. Perubahan source/kernel atau runtime authority yang tidak disetujui.
9. Agent melakukan mutasi tanpa otorisasi.

## 7. Acceptance criteria — EOS-STATE-NG-001

Acceptance harus diukur berdasarkan hasil yang dapat diuji, bukan jumlah direktori, jumlah file, atau klaim bahwa repository telah selesai dibangun.

### A. Architecture acceptance

| ID    | Acceptance criteria                               | Target |
| ----- | ------------------------------------------------- | ------ |
| AC-01 | Repository berada di `eos-id/.eos-state`          | 1      |
| AC-02 | Visibility private                                | 100%   |
| AC-03 | Authority boundary terdokumentasi dan tervalidasi | 100%   |
| AC-04 | Tidak ada duplicate authority                     | 0      |
| AC-05 | Tidak ada duplicate core primitive                | 0      |
| AC-06 | Semua record classes memiliki schema              | 100%   |
| AC-07 | Setiap record memiliki stable identity            | 100%   |
| AC-08 | Setiap migrated record memiliki provenance        | 100%   |

### B. Integrity acceptance

| ID    | Acceptance criteria                     | Target |
| ----- | --------------------------------------- | ------ |
| AC-09 | Duplicate record ID                     | 0      |
| AC-10 | Unexplained duplicate artifact          | 0      |
| AC-11 | Broken references                       | 0      |
| AC-12 | Unexplained hash mismatch               | 0      |
| AC-13 | Migrated artifacts without adjudication | 0      |
| AC-14 | Untracked transformations               | 0      |
| AC-15 | Secret leakage                          | 0      |

### C. Governance acceptance

| ID    | Acceptance criteria                    | Target |
| ----- | -------------------------------------- | ------ |
| AC-16 | Mutation protocol documented           | PASS   |
| AC-17 | Agent default access is read-only      | PASS   |
| AC-18 | Risk-based approval rules              | PASS   |
| AC-19 | Independent verification completed     | PASS   |
| AC-20 | Rollback and recovery procedure tested | PASS   |
| AC-21 | Legacy source preserved                | PASS   |

### D. Operational acceptance

| ID    | Acceptance criteria                                      | Target |
| ----- | -------------------------------------------------------- | ------ |
| AC-22 | Schema validation reproducible                           | PASS   |
| AC-23 | Migration report reproducible                            | PASS   |
| AC-24 | Context package generation reproducible                  | PASS   |
| AC-25 | Consumers resolve canonical state consistently           | PASS   |
| AC-26 | No dependency on an unapproved external database/service | PASS   |
| AC-27 | Post-cutover assurance completed                         | PASS   |



Target

&#x20;Semua acceptance criteria wajib PASS atau memiliki pengecualian yang secara eksplisit disetujui pemilik EOS. Pengecualian tidak boleh digunakan untuk menyembunyikan kegagalan integrity, security, atau authority.



## 8. Work breakdown structure

Master Work: EOS-STATE-NG-001 — Build Next Generation EOS Engineering Memory

| Work ID | Workstream                      | Deliverable                            | Dependency    |
| ------- | ------------------------------- | -------------------------------------- | ------------- |
| NG-001A | Legacy Forensic & Preservation  | Verified legacy baseline               | G0            |
| NG-001B | State Constitution & Authority  | Constitution dan authority model       | G0            |
| NG-001C | Canonical Data Model & Schema   | Envelope, schemas, validation rules    | NG-001B       |
| NG-001D | Repository Foundation           | Private repo dan bootstrap baseline    | NG-001B, C    |
| NG-001E | Selective Migration             | Adjudicated migration batches          | NG-001A, C, D |
| NG-001F | Agent Context Interface         | Read-only agent context contract       | NG-001C, D    |
| NG-001G | Integration & Dual Verification | Integration test dan independent audit | NG-001E, F    |
| NG-001H | Canonical Cutover & Closure     | Approved cutover dan closure evidence  | NG-001G       |

### Status awal War Room

Architecture decision

# SET

Implementation authorization

# PENDING

Repository created

# 0

Legacy mutations

# 0

| Workstream | Status                  |
| ---------- | ----------------------- |
| NG-001A    | Planned                 |
| NG-001B    | Design baseline         |
| NG-001C    | Design baseline         |
| NG-001D    | Awaiting approval       |
| NG-001E    | Blocked by G0–G4        |
| NG-001F    | Design baseline         |
| NG-001G    | Blocked by migration    |
| NG-001H    | Blocked by verification |

## 9. Risiko utama dan mitigasi

| Risiko                                      | Dampak                         | Mitigasi                              |
| ------------------------------------------- | ------------------------------ | ------------------------------------- |
| Copy semua artefak lama                     | Legacy complexity ikut terbawa | Selective adjudication                |
| Dua repository dianggap sama-sama canonical | Conflicting state              | Satu canonical target setelah cutover |
| Memory menjadi business authority           | Semantic conflict              | Authority boundary dan tests          |
| Evidence diperlakukan sebagai proof         | Governance failure             | Referensi ke Proof Ledger             |
| Agent mengubah state otomatis               | Integrity failure              | Read-only default, approval gates     |
| Struktur repository terlalu kompleks        | Maintenance overhead           | Bootstrap minimal, evidence-driven    |
| Migration terlalu lama                      | Dual-state ambiguity           | Batch migration dan cutover criteria  |
| Private repository salah konfigurasi        | Data exposure                  | Access review dan security gate       |

## 10. Keputusan desain yang sudah ditetapkan vs yang masih harus dikonfirmasi

Sudah ditetapkan:

- Repository: `eos-id/.eos-state`.
- Strategi: parallel build.
- Visibilitas: private.
- Legacy preservation: wajib.
- Migrasi: selektif dan berbasis evidence.
- Cutover: approval eksplisit.
- No duplicate authority dan no new core primitives.

Belum boleh dianggap sebagai keputusan implementasi:

- Branch protection dan merge policy final.
- Daftar collaborator dan permission.
- Format CI/CD dan tool validator yang dipilih.
- Frekuensi dan ukuran migration batch.
- Integrasi canonical mount dengan Enterprise-OS.
- Retention policy dan jadwal archive.
- Kapan legacy repository menjadi read-only permanen.

Hal-hal tersebut perlu diputuskan atau divalidasi pada tahap implementasi, bukan diasumsikan dari RFC.

## 11. Governance execution rules

Enam aturan governance wajib untuk seluruh tahap pelaksanaan EOS-STATE-NG-001:

1. **RFC Freeze** — `EOS-STATE-NG-001.md` menjadi referensi desain kanonis. Perubahan setelah finalisasi harus melalui Architecture Decision Record (ADR), dengan alasan dan dampak yang terdokumentasi.
2. **Separate Authorization** — Approval implementasi harus diberikan per tahap. Persetujuan NG-001A tidak otomatis mengizinkan pembuatan repository, migrasi, atau cutover.
3. **Legacy Preservation** — Repository lama tetap menjadi historical source. Tidak boleh ada `git reset`, `clean`, force push, penghapusan artefak, atau perubahan massal tanpa otorisasi khusus.
4. **No Premature Migration** — Jangan memigrasikan seluruh 1.175 artefak sekaligus. Gunakan hasil forensic discovery dan adjudication sebagai dasar seleksi.
5. **Independent Verification** — Setiap gate membutuhkan evidence yang dapat diperiksa ulang, bukan hanya laporan dari agent pelaksana.
6. **No Architecture Expansion Without Evidence** — Tidak menambahkan database, vector store, graph engine, event bus, atau core primitive baru sebelum kebutuhan operasional terbukti.

## 12. Final architecture resolution

## EOS-STATE-NG-001

DESIGN BASELINE v1.0 FROZEN

Next Generation EOS State

A Sovereign, Evidence-Grounded Engineering Memory Substrate.

Repository: `eos-id/.eos-state`

Build strategy: Parallel

Visibility: Private

Migration principle: Preserve → Classify → Adjudicate → Migrate → Verify → Cut Over

Core invariant:

> Engineering Memory remembers how EOS evolves. It never replaces the authority that makes EOS true.

### Status War Room

| Dimensi                      | Status                             |
| ---------------------------- | ---------------------------------- |
| RFC                          | Final, Design Baseline v1.0        |
| Architecture baseline        | Frozen                             |
| Implementation authorization | Pending                            |
| GitHub repository            | Belum dibuat                       |
| Legacy repository            | Tidak dimodifikasi                 |
| Migration                    | Belum dimulai                      |
| Cutover                      | Tidak diotorisasi                  |

### Rekomendasi langkah berikutnya

Urutan pelaksanaan yang disarankan:

1. RFC Freeze — konfirmasi finalisasi desain
2. Implementation Authorization Package — persetujuan tertulis per tahap
3. NG-001A Forensic Discovery — inventarisasi legacy tanpa perubahan
4. NG-001B/C Foundation Design Validation — konfirmasi konstitusi dan schema
5. Approval NG-001D Repository Bootstrap — persetujuan pembuatan repository

Prinsip panduan:

> Jangan membangun repository baru hanya agar terlihat lebih modern. Bangun sistem Engineering Memory yang benar-benar membuat EOS lebih mudah dipahami, diverifikasi, dikembangkan, dan diwariskan oleh manusia maupun AI agents.

Status akhir: RFC final dan dibekukan sebagai Design Baseline v1.0. Belum ada otorisasi implementasi. Saya tidak akan membuat repository, mengubah GitHub, atau memodifikasi legacy `.eos-state` berdasarkan keputusan desain ini saja. Implementasi berada dalam status HOLD sampai ada instruksi eksplisit dari pemilik EOS.&#x20;
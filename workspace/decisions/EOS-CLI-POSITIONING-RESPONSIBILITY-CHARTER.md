# EOS CLI Positioning & Responsibility Charter

Status: Draft
Owner: Enterprise Architecture / Tooling
Scope: `workspace/packages/tooling/eos-cli`

## 1. Purpose

Dokumen ini menetapkan **posisi, mandat, batas tanggung jawab, dan arah capability**
untuk `eos-cli` di dalam EOS.

Tujuan utamanya bukan menjelaskan implementasi detail, tetapi menjawab pertanyaan
konstitusional berikut:

- Mengapa `eos-cli` ada?
- Siapa konsumennya?
- Apa yang boleh dan tidak boleh dilakukan?
- Apa hubungan `eos-cli` dengan Enterprise Control Plane?
- Kapan sebuah perubahan pada `eos-cli` dianggap mendekatkan EOS ke mandatnya,
  dan kapan dianggap mengambil tanggung jawab bounded context lain?

Dokumen ini harus menjadi **uji legitimasi** untuk setiap refactor, capability baru,
dan prioritisasi backlog pada `packages/tooling/eos-cli`.

## 2. Constitutional Basis

Charter ini diturunkan dari artefak arsitektur EOS berikut:

- `enterprise/governance/EOS-THREE-DOMAIN-ARCHITECTURE.md`
- `enterprise/decisions/adr/ADR-0009-enterprise-control-graph-decision-artifacts.md`
- `enterprise/decisions/adr/ADR-0011-platform-consolidation-runtime-layering.md`
- `enterprise/decisions/adr/ADR-0012-control-plane-dependency-inversion.md`

Prinsip dasar yang diwarisi:

1. **Enterprise Control Plane adalah cross-domain orchestrator, bukan domain baru.**
2. **Consumer surfaces bersifat disposable dan bukan SSOT.**
3. **Gate C adalah readout surface, bukan reasoning engine.**
4. **Fact, evaluation, decision, dan automation harus tetap terpisah.**
5. **Runtime tidak boleh saling bergantung secara langsung di luar kontrak yang sah.**

## 3. Positioning

### 3.1 What `eos-cli` is

`eos-cli` adalah **official operational console** untuk EOS.

Ia berfungsi sebagai **consumer and orchestration surface** bagi artefak dan capability
yang dimaterialisasikan oleh domain EOS dan Enterprise Control Plane.

Secara arsitektural, `eos-cli` diposisikan sebagai:

- consumer surface resmi
- operator console untuk verification, readout, query, dan controlled execution
- façade tipis untuk orchestration workflow EOS
- entrypoint manusia/automation ke read model, evidence, gate operation, dan verification flow

### 3.2 What `eos-cli` is not

`eos-cli` **bukan**:

- domain baru
- framework storage
- generic runtime platform
- pusat reasoning enterprise
- tempat policy synthesis
- tempat pembentukan SSOT baru
- pengganti bounded context `decision`, `learning`, `knowledge`, `foundation`, `gate`, atau `specification`

### 3.3 Classification

| Question | Position |
| --- | --- |
| Apakah `eos-cli` Control Plane? | Tidak. Ia adalah **surface resmi** yang mengonsumsi dan mengoperasikan capability Control Plane. |
| Apakah `eos-cli` Runtime? | Tidak sebagai runtime inti. Ia boleh mengorkestrasi runtime domain yang sah. |
| Apakah `eos-cli` Framework? | Tidak. Ia tidak boleh berkembang menjadi framework generik baru. |
| Apakah `eos-cli` SDK? | Tidak. Ia bukan public library utama untuk integrasi programatik lintas consumer. |
| Apakah `eos-cli` hanya CLI tipis? | Tidak hanya itu. Ia adalah **operational console**, tetapi tetap harus mempertahankan bentuk consumer/orchestrator, bukan reasoning core. |

## 4. Mission

Mandat jangka panjang `eos-cli` adalah:

> Menjadi permukaan operasional resmi EOS untuk membaca state enterprise,
> menjalankan verifikasi terkontrol, mengoperasikan gate, mematerialisasikan
> artefak yang sah, dan menampilkan hasil reasoning enterprise yang sudah
> dimaterialisasikan oleh bounded context yang berwenang.

Misi ini mengimplikasikan bahwa `eos-cli` harus:

- membaca SSOT, bukan menciptakan SSOT tandingan
- mengorkestrasi flow enterprise, bukan menyintesis policy sendiri
- mengeksekusi command yang sah menurut domain owner
- menjaga dependency direction tetap sejalan dengan Control Plane EOS

## 5. Consumer Model

Konsumen utama `eos-cli`:

1. operator arsitektur EOS
2. engineer platform dan enterprise tooling
3. governance / verification operator
4. CI / automation yang memakai command resmi
5. consumer observability/readout yang membutuhkan permukaan deterministik

Konsumen sekunder:

1. dashboard engineering
2. internal agent runtime
3. future API adapters atau MCP consumer yang perlu menggunakan flow CLI sebagai reference surface

## 6. Responsibility Map

Tabel berikut menetapkan apa yang boleh dilakukan `eos-cli` terhadap tiap bounded context.

| Domain | Domain Owner | `eos-cli` role | Allowed |
| --- | --- | --- | --- |
| Evidence | Evidence / canonical artifact boundary | Consume, materialize official artifacts | Ya |
| Decision | Decision context | Execute official flows, consume projections | Ya |
| Learning | Learning context | Execute official flows, consume events/projections | Ya |
| Knowledge | Knowledge context | Consume projections and registries, never own lifecycle | Ya |
| Foundation | Foundation context | Verify and read out | Ya |
| Gate | Gate context | Operate and read out | Ya |
| Specification | Specification context | Verify, query, consume | Ya |
| Capability | Capability context | Verify, discover, plan, consume | Ya |
| Governance | Governance context | Read governed state and verification outputs | Ya |

### Explicitly forbidden

`eos-cli` tidak boleh:

- menjadi owner lifecycle evidence
- menjadi owner `Decision Artifact`
- menjadi owner `Knowledge Object`
- menghitung ulang reasoning jika decision/evaluation/projection resmi sudah tersedia
- menggabungkan concern domain hanya demi kemudahan CLI
- menambah abstraction family baru tanpa dasar capability EOS yang sah

## 7. Responsibility Boundaries

### 7.1 Allowed responsibilities

`eos-cli` boleh:

- menjalankan verification flow resmi
- memicu materialization flow resmi
- mengoperasikan Gate flow resmi
- menjalankan query resmi di atas read model/graph resmi
- membaca projection, bundle, registry, dan decision artifact resmi
- merender output operasional untuk manusia atau automation

### 7.2 Forbidden responsibilities

`eos-cli` tidak boleh:

- menjadi tempat reasoning utama lintas domain
- memuat business logic domain yang seharusnya tinggal di bounded context domain
- membentuk policy engine baru
- menjadi storage abstraction framework
- menumbuhkan family runtime baru hanya demi wiring
- mengekspor internal compatibility shape sebagai kontrak resmi

## 8. Capability Map

### 8.1 Current capability classes

Capability yang saat ini sudah tampak di `eos-cli`:

- `Status`
- `Verify`
- `Run`
- `Gate`
- `Query`
- `Materialize`
- `Discover / Plan`
- `Readout`

### 8.2 Canonical capability meaning

| Capability | Meaning |
| --- | --- |
| Status | Membaca read model / projection resmi |
| Verify | Menjalankan evaluasi/verifikasi resmi |
| Run | Menjalankan flow eksperimen/operasi resmi |
| Gate | Mengoperasikan gate sebagai readout/operation surface |
| Query | Menjelajah graph/read model secara deterministik |
| Materialize | Menghasilkan artefak resmi dari runtime/domain yang sah |
| Discover / Plan | Membantu capability reuse / execution planning resmi |

### 8.3 Future capability direction

Capability masa depan hanya sah bila mendukung mandat ini:

- `Knowledge Readout`
- `Knowledge Projection Consumption`
- `Decision Readout`
- `Foundation Certification`
- `Enterprise Control Query`
- `Audit / Replay / Deterministic Comparison`

Capability baru **tidak sah** bila pada dasarnya:

- framework concern
- storage concern generik
- consumer-specific rendering tanpa nilai control plane
- domain ownership baru yang seharusnya hidup di bounded context lain

## 9. Architectural Rules for `eos-cli`

1. **CLI is a surface, not a source of truth.**
2. **Command layer must remain orchestration-first.**
3. **Runtime/domain logic must live in bounded contexts, not in the command by convenience.**
4. **If an official decision/evaluation/projection exists, CLI must consume it instead of recomputing it.**
5. **Bundle/projection contracts are preferred over internal read-model leakage.**
6. **`eos-cli` must not become a framework.**
7. **Any new structural expansion must be justifiable through EOS capability and control-plane mandate.**

## 10. Decision Test

Setiap perubahan pada `eos-cli` harus bisa diuji dengan pertanyaan berikut:

1. Apakah perubahan ini membuat `eos-cli` semakin mendekati mandatnya sebagai operational console EOS?
2. Apakah perubahan ini memindahkan tanggung jawab ke bounded context yang benar, atau justru menarik tanggung jawab domain ke dalam CLI?
3. Apakah perubahan ini mengurangi reasoning lokal dan meningkatkan konsumsi artefak resmi?
4. Apakah perubahan ini memperjelas role `eos-cli` sebagai consumer/orchestrator surface?
5. Jika perubahan ini menambah capability baru, capability EOS apa yang sedang diwujudkan?

Jika jawaban atas pertanyaan-pertanyaan itu tidak jelas, maka perubahan harus dianggap
**belum memiliki justifikasi arsitektural yang cukup**.

## 11. Implications for Backlog and Roadmap

Backlog `eos-cli` **tidak boleh** diprioritaskan hanya karena:

- mudah dikerjakan
- terlihat bersih secara engineering
- populer sebagai best practice umum

Sebelum menjadi prioritas roadmap, setiap item harus bisa diturunkan dari rantai berikut:

```text
Visi EOS
    ->
Capability EOS
    ->
Peran eos-cli
    ->
Capability eos-cli
    ->
Backlog
    ->
Task
```

Artinya:

- `portability`, `benchmark`, atau `distribution` bukan otomatis prioritas
- `KnowledgeProjection`, `Gate`, atau `Foundation` juga bukan otomatis prioritas
- prioritas hanya sah jika terhubung ke mandate `eos-cli` dalam EOS

## 12. Immediate Next Artifact

Setelah charter ini diterima, artefak berikutnya yang boleh dibuat adalah:

1. `Responsibility Map`
2. `Capability Map`
3. `Roadmap eos-cli`
4. implementation backlog yang diturunkan dari tiga artefak di atas

Urutan tersebut wajib dipertahankan agar refactor tidak kembali berjalan
tanpa dasar positioning yang eksplisit.

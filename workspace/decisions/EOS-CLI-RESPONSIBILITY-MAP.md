# EOS CLI Responsibility Map

Status: Draft
Owner: Enterprise Architecture / Tooling
Depends on: `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md`
Scope: `workspace/packages/tooling/eos-cli`

## 1. Purpose

Dokumen ini menerjemahkan charter `eos-cli` menjadi peta tanggung jawab operasional
yang eksplisit per domain dan per jenis aksi.

Tujuan dokumen ini:

- menjelaskan domain mana yang boleh disentuh `eos-cli`
- menjelaskan **dalam kapasitas apa** `eos-cli` boleh berinteraksi dengan domain itu
- mencegah `eos-cli` mengambil tanggung jawab bounded context lain
- menjadi dasar capability map dan backlog selanjutnya

Dokumen ini bukan roadmap dan bukan desain implementasi.

## 2. Core Rule

`eos-cli` adalah **official operational console** dan **consumer/orchestration surface**.

Karena itu, semua interaksi `eos-cli` terhadap bounded context lain harus jatuh ke salah
satu kategori berikut:

- `Consume`
- `Execute`
- `Verify`
- `Operate`
- `Query`
- `Materialize`

Di luar kategori itu, `eos-cli` harus dianggap sedang mengambil tanggung jawab yang
bukan miliknya.

## 3. Responsibility Matrix

| Domain | Domain Owner | Role of `eos-cli` | Allowed Actions | Explicitly Not Allowed |
| --- | --- | --- | --- | --- |
| Governance | Governance | Read governed state and governed outputs | `Consume`, `Query`, `Readout` | Menjadi owner aturan governance atau sumber truth baru |
| Evidence | Evidence / canonical artifact boundary | Consume and materialize official artifacts | `Consume`, `Materialize`, `Readout` | Menjadi owner lifecycle evidence atau storage framework generik |
| Decision | Decision context | Execute official decision flows and consume outputs | `Execute`, `Consume`, `Readout` | Menjadi decision engine baru atau policy synthesis layer |
| Learning | Learning context | Execute official learning flows and consume events/projections | `Execute`, `Consume`, `Readout` | Menjadi owner lifecycle learning intelligence penuh |
| Knowledge | Knowledge context | Consume knowledge projections, registries, and previews | `Consume`, `Readout`, `Query` | Menjadi owner `KnowledgeObject`, evolution, registry, lineage |
| Foundation | Foundation context | Verify and read out foundation state | `Verify`, `Consume`, `Readout` | Menjadi owner foundation reasoning di luar kontrak resmi |
| Gate | Gate context | Operate gate workflows and read out gate state | `Operate`, `Consume`, `Readout` | Menjadi reasoning core gate atau decision synthesis engine |
| Specification | Specification context | Verify and query specification surfaces | `Verify`, `Query`, `Consume` | Menjadi specification authoring engine atau vocabulary owner |
| Capability | Capability context | Verify, discover, plan, and consume | `Verify`, `Consume`, `Query`, `Discover`, `Plan` | Menjadi graph truth atau compatibility owner di luar domain |
| Trust | Trust context | Consume trust artifacts and verification outputs | `Consume`, `Verify`, `Readout` | Menjadi trust policy engine baru |
| Enterprise Control Plane outputs | Control-plane bounded outputs | Consume, query, and present results | `Consume`, `Query`, `Readout` | Menjadi replacement dari control-plane runtime atau decision engine |

## 4. Action Definitions

### 4.1 Consume

`eos-cli` boleh membaca:

- projection
- read model
- bundle
- registry
- decision artifact
- verification output

`Consume` tidak memberi hak untuk:

- mengubah semantics domain
- menghitung ulang reasoning bila output resmi sudah tersedia

### 4.2 Execute

`eos-cli` boleh memicu flow resmi yang dimiliki bounded context lain.

Contoh:

- execute decision-related verification flow
- execute learning-related runtime flow

`Execute` tidak memberi hak untuk:

- mengambil ownership logic inti domain

### 4.3 Verify

`eos-cli` boleh memicu dan menampilkan verifikasi resmi.

`Verify` berarti:

- menjalankan flow verifikasi
- membaca hasil verifikasi
- merender hasilnya

`Verify` tidak berarti:

- menciptakan rule verifikasi baru ad hoc di CLI

### 4.4 Operate

`Operate` hanya sah untuk surface seperti `Gate`, di mana `eos-cli` memang berfungsi
sebagai operator console resmi.

`Operate` berarti:

- memicu command resmi
- menjalankan flow append-only atau acceptance resmi
- menampilkan status operasional

`Operate` tidak berarti:

- mensintesis decision logic yang seharusnya dihasilkan evaluator/engine resmi

### 4.5 Query

`eos-cli` boleh menyediakan query surface di atas SSOT resmi atau output control plane.

`Query` tidak berarti:

- membangun graph semantics baru di consumer

### 4.6 Materialize

`eos-cli` boleh memicu materialisasi artefak resmi bila flow itu memang bagian dari
operational console EOS.

`Materialize` tidak berarti:

- menjadikan CLI owner terhadap artifact family tersebut

## 5. Responsibility Boundaries by Layer

| Layer | `eos-cli` position | Boundary |
| --- | --- | --- |
| SSOT | Consumer only | Tidak boleh membuat SSOT tandingan |
| Runtime | Orchestrator / caller | Tidak boleh menjadi runtime inti baru |
| Evaluator | Consumer / invoker | Tidak boleh menjadi evaluator synthesis center |
| Decision | Consumer / operator | Tidak boleh menjadi decision engine |
| Automation | Trigger / surface | Tidak boleh menjadi automation framework baru |
| Presentation | Official console | Boleh merender readout resmi |

## 6. Red Flags

Perubahan pada `eos-cli` harus dianggap mencurigakan bila:

1. menambah logic domain hanya agar command terasa praktis
2. menambah abstraction family yang mirip framework generik
3. membuat CLI menghitung ulang hasil evaluasi resmi
4. membuat consumer lain harus bergantung pada compatibility shape internal CLI
5. memindahkan ownership registry/object/evolution ke package CLI

## 7. Decision Questions

Sebelum menambah capability atau refactor baru pada `eos-cli`, gunakan pertanyaan ini:

1. Domain owner siapa yang berwenang atas logic ini?
2. `eos-cli` berinteraksi sebagai apa: `Consume`, `Execute`, `Verify`, `Operate`, `Query`, atau `Materialize`?
3. Apakah perubahan ini mempertahankan `eos-cli` sebagai surface/orchestrator?
4. Apakah perubahan ini memperkuat atau justru melanggar bounded-context ownership?

Jika tidak ada jawaban yang jelas, perubahan harus dianggap **belum sah secara arsitektural**.

## 8. Immediate Follow-up

Dokumen setelah Responsibility Map adalah:

1. `EOS-CLI-CAPABILITY-MAP.md`
2. roadmap yang diturunkan dari capability map
3. backlog implementasi yang diturunkan dari roadmap

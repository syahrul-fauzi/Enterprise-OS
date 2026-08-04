# EOS CLI Capability Map

Status: Draft
Owner: Enterprise Architecture / Tooling
Depends on:
- `EOS-CLI-POSITIONING-RESPONSIBILITY-CHARTER.md`
- `EOS-CLI-RESPONSIBILITY-MAP.md`
Scope: `workspace/packages/tooling/eos-cli`

## 1. Purpose

Dokumen ini memetakan capability `eos-cli` dalam tiga horizon:

1. **Current**: capability yang sudah nyata di `eos-cli`
2. **Target**: capability yang sah menurut charter dan perlu dituju
3. **Out of Scope**: capability yang tampak menarik secara engineering tetapi
   tidak sesuai mandat `eos-cli`

Dokumen ini adalah penghubung antara positioning dan roadmap.

## 2. Capability Taxonomy

Capability `eos-cli` harus berada di salah satu kategori ini:

- `Readout`
- `Verification`
- `Operation`
- `Query`
- `Materialization`
- `Planning`

Capability di luar kategori itu memerlukan justifikasi arsitektural baru.

## 3. Current Capabilities

### 3.1 Readout

Capability yang sudah nyata:

- `Status`
- `Gate Status`
- `Execution Status`
- `Coverage Readout`

Mandat:

- membaca projection/read model resmi
- menampilkan state enterprise tanpa menjadi reasoning engine

### 3.2 Verification

Capability yang sudah nyata:

- `Verify Foundation`
- `Verify Constitution`
- `Verify Product`
- `Verify Portfolio`
- `Verify Capability Registry`
- `Verify Genesis Baseline`

Mandat:

- memicu flow verifikasi resmi
- menampilkan hasil verifikasi resmi

### 3.3 Operation

Capability yang sudah nyata:

- `Gate Accept`
- `Gate Run Case`
- `Gate Refresh Status`
- `Execution Advance`
- `Execution Complete DoD`

Mandat:

- menjadi operator console resmi untuk flow enterprise tertentu

### 3.4 Query

Capability yang sudah nyata:

- `Enterprise Query`
- controlled traversal/readout terhadap output control plane

### 3.5 Materialization

Capability yang sudah nyata:

- `Gate Genesis Evidence`
- `Gate Regenerate`
- materialization resmi yang menjadi bagian dari operational flow

### 3.6 Planning / Discovery

Capability yang sudah nyata:

- `Discover Capability`
- `Plan Capability`

## 4. Target Capabilities

Capability target di bawah ini sah **hanya jika** tetap sejalan dengan charter.

### 4.1 Knowledge Readout

Target:

- konsumsi `KnowledgeProjection`
- tampilkan preview, maturity, lineage, dan reuse

Boundary:

- `eos-cli` hanya consume
- ownership tetap di bounded context `knowledge`

### 4.2 Decision Readout

Target:

- konsumsi decision artifact / decision ledger output
- tampilkan decision state dan reason trail secara operasional

Boundary:

- bukan decision engine

### 4.3 Foundation Certification Surface

Target:

- readout dan verification surface yang lebih eksplisit untuk certification evidence

Boundary:

- CLI tetap consumer/operator, bukan owner certification model

### 4.4 Enterprise Control Query

Target:

- query resmi di atas control-plane outputs
- membantu `WHY`, `TRACE`, `IMPACT`, `PATH` jika kontrak resmi tersedia

Boundary:

- query harus berakar pada output/runtime resmi, bukan traversal logic liar di consumer

### 4.5 Deterministic Replay & Audit

Target:

- replay
- comparison
- audit readout

Boundary:

- tetap berbasis decision/evidence/projection resmi

## 5. Capability Progression

Rantai progression yang sah untuk `eos-cli`:

```text
Readout
    ->
Verification
    ->
Operation
    ->
Query
    ->
Deterministic Replay / Audit
```

Bukan:

```text
CLI
    ->
framework
    ->
runtime platform
    ->
domain owner
```

## 6. Out-of-Scope Capabilities

Capability berikut **tidak sah** untuk `eos-cli` kecuali ada perubahan positioning formal:

- generic storage framework
- generic source abstraction framework
- policy engine baru
- graph truth owner
- knowledge lifecycle owner
- decision synthesis engine
- cross-domain business logic host
- SDK/library umum untuk semua consumer

## 7. Capability-to-Responsibility Alignment

| Capability | Responsibility Type | Valid? |
| --- | --- | --- |
| Status | `Consume`, `Readout` | Ya |
| Verify | `Verify`, `Consume` | Ya |
| Gate | `Operate`, `Consume` | Ya |
| Query | `Query`, `Consume` | Ya |
| Materialize | `Materialize`, `Operate` | Ya |
| Knowledge Readout | `Consume`, `Readout` | Ya |
| Knowledge Ownership | domain ownership | Tidak |
| Decision Synthesis | domain ownership | Tidak |
| Storage Framework | framework ownership | Tidak |

## 8. Decision Rule for Roadmap

Roadmap `eos-cli` hanya boleh dibentuk dari capability yang:

1. sah menurut charter
2. sah menurut responsibility map
3. terhubung ke capability EOS yang lebih tinggi

Jika sebuah item backlog tidak bisa dipetakan ke capability dalam dokumen ini,
maka item tersebut harus dianggap:

- belum matang
- atau berada di luar mandat `eos-cli`

## 9. Immediate Next Artifact

Setelah capability map ini, artefak berikutnya yang sah adalah:

1. `EOS-CLI-ROADMAP.md`
2. backlog implementasi yang diturunkan dari capability roadmap

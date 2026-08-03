# EOS Execution Contract

Status: ACTIVE
Version: 1.2
Priority: HIGHEST

## Mission

Mulai baseline ini, tujuan utama AI Agent EOS adalah:

> Menyelesaikan EOS menjadi platform production secepat mungkin dengan tetap menjaga integritas scientific foundation yang telah dibekukan.

Semua pekerjaan harus diukur dengan satu pertanyaan:

> Apakah pekerjaan ini membuat EOS lebih dekat menjadi produk production?

Jika tidak, hentikan dan lanjut ke backlog berikutnya.

## Program Transition

Capability Delivery Phase dinyatakan selesai pada `EOS-012`.

Mulai baseline ini, roadmap dibagi menjadi dua domain:

- `Phase 1-5` = Capability Delivery
- `Phase 6` = Platform Qualification / Production Hardening

Setelah `EOS-012`, pekerjaan berikutnya **bukan** membuat capability baru seperti `EOS-013`.
Pekerjaan berikutnya diambil dari workstream paralel pada:

- [ROADMAP.yaml](file:///root/Enterprise-OS/enterprise/execution/ROADMAP.yaml)
- [PRODUCTION-QUALIFICATION-GATE.yaml](file:///root/Enterprise-OS/enterprise/execution/PRODUCTION-QUALIFICATION-GATE.yaml)

## Foundation Status

Foundation dianggap selesai dan dibekukan:

```text
Gate G0                     = COMPLETE
Governance Normalization    = COMPLETE
Gate C Architecture         = FROZEN
Gate C1 Corpus              = RATIFIED
Constitutional Review       = COMPLETE
Decision                    = NOT_CONCLUDED
Architecture Freeze         = ACTIVE
```

Agen dilarang:
- membuka ulang Gate C;
- mengulang Constitutional Review yang sudah final untuk snapshot yang sama;
- melakukan redesign foundation;
- mengubah governance tanpa defect reproduktif tervalidasi.

## Default Working Mode

Mode kerja default adalah `Execution Mode`, bukan `Research Mode`.

Execution Mode berarti:
- implementasi;
- coding;
- testing;
- integration;
- automation;
- delivery.

Bukan:
- diskusi panjang tanpa blocker nyata;
- brainstorming berulang;
- review ulang foundation yang sudah beku;
- pembuatan dokumen yang tidak menambah capability EOS.

Status default agen adalah:

```text
RUNNING
```

bukan:

```text
WAITING
```

## Stop Rule

Sebelum mengerjakan task, agen harus mengecek:

```text
Apakah pekerjaan ini meningkatkan capability EOS?

YES -> kerjakan
NO  -> stop dan ambil backlog berikutnya
```

## EOS Autonomous Execution Rules

### Rule 1 — Never Wait by Default

AI Agent dilarang berhenti setelah menyelesaikan satu task.

Setelah task selesai, agen wajib langsung memilih backlog berikutnya dengan prioritas tertinggi dan melanjutkan implementasi.

### Rule 2 — Stop Only on Hard Blockers

AI Agent hanya boleh berhenti bila terjadi salah satu kondisi berikut:
- defect reproduktif pada foundation;
- requirement bertentangan;
- keputusan bisnis diperlukan;
- akses resource tidak tersedia;
- risiko keamanan tinggi.

Selain itu, agen harus lanjutkan pekerjaan.

### Rule 3 — Continuous Backlog Consumption

Selama backlog masih memiliki item berstatus:

```text
TODO
READY
READY_FOR_IMPLEMENTATION
```

agen harus terus menjalankan loop:

```text
ambil
-> implement
-> test
-> commit atau update evidence
-> ambil berikutnya
```

Agen tidak kembali ke user hanya untuk melaporkan "task selesai" bila masih ada backlog yang siap dikerjakan.

### Rule 4 — Minimize Human Interruptions

Approval hanya dipakai bila perubahan menyentuh:
- requirement;
- architecture;
- domain model;
- security model;
- governance.

Selain itu, langsung implementasi.

### Rule 5 — Output Must Increase Capability

Setiap iterasi harus menghasilkan minimal satu dari berikut:
- feature baru;
- API baru;
- package baru;
- UI baru;
- workflow baru;
- integration baru;
- test baru;
- automation baru;
- observability baru.

Jika output hanya berupa markdown, diskusi, atau review tanpa peningkatan capability, iterasi dianggap gagal memenuhi kontrak eksekusi.

### Rule 6 — Maximum Documentation Ratio

Target kerja:

```text
90% engineering
10% documentation
```

Dokumentasi diprioritaskan hanya untuk:
- ADR;
- API;
- architecture;
- user guide;
- compliance atau auditability yang memang dibutuhkan capability.

### Rule 7 — Think Once, Execute Many

Pikirkan desain sekali di awal, lalu implement sebanyak mungkin sebelum kembali ke mode diskusi.

Pola yang diutamakan:

```text
planning
-> implement
-> implement
-> implement
-> test
-> integrate
```

### Rule 8 — Progress Is Measured by Capability

Progress proyek diukur oleh:

```text
Capability Completed
```

Bukan oleh jumlah dokumen, review, atau diskusi.

### Rule 9 — Architecture Freeze Enforcement

Foundation tidak boleh dibuka lagi.

Ide baru yang tidak mendesak disimpan ke bucket:

```text
Future Improvements
```

dan tidak boleh menghentikan delivery.

### Rule 10 — Finish Before Perfect

Prinsip operasional:

```text
DONE > PERFECT
```

Feature production-ready lebih bernilai daripada diskusi tanpa akhir yang tidak menambah capability.

## Approval Policy

Alur default:

```text
ambil backlog
-> implement
-> test
-> update progress
-> lanjut backlog berikutnya
```

Agen tidak perlu berhenti untuk meminta persetujuan setelah setiap task, kecuali ada blocker yang masuk kategori eskalasi.

Capability dan graph eksekusi canonical dibaca dari:

- [CAPABILITY-REGISTRY.yaml](file:///root/Enterprise-OS/enterprise/execution/CAPABILITY-REGISTRY.yaml)
- [EXECUTION-STATUS.yaml](file:///root/Enterprise-OS/enterprise/execution/EXECUTION-STATUS.yaml)
- [ROADMAP.yaml](file:///root/Enterprise-OS/enterprise/execution/ROADMAP.yaml)

Jika file tersebut tersedia, agen wajib mengambil capability prioritas tertinggi yang dependency-nya terpenuhi dan berstatus `READY` atau `READY_FOR_IMPLEMENTATION` sebelum meminta arahan baru.

## Discussion Budget

Diskusi hanya dilakukan bila:
- ada ambiguity spesifikasi;
- ada konflik requirement;
- ada defect reproduktif;
- ada risiko keamanan atau data;
- ada keputusan bisnis yang harus ditetapkan manusia.

Selain itu, agen langsung implementasi.

## Priority Order

Prioritas backlog wajib dijalankan berurutan:

```text
P0
-> P1
-> P2
-> P3
```

Tidak boleh melompati prioritas tanpa alasan eksplisit yang dapat diaudit.

## Deliverables

Deliverable utama:
- code
- package
- feature
- API
- UI
- workflow
- integration
- test
- automation
- observability

Dokumen hanya dibuat bila benar-benar diperlukan untuk capability, traceability, compliance, atau auditability.

## Success Metrics

Keberhasilan diukur dari:
- capability selesai;
- test lolos;
- integration lolos;
- regression lolos;
- production readiness meningkat.

Bukan dari:
- jumlah diskusi;
- jumlah markdown;
- jumlah review.

## Continuous Execution Loop

Urutan kerja default:

```text
Backlog
-> Implement
-> Unit Test
-> Integration Test
-> Regression
-> Update Progress
-> Ambil backlog berikutnya
```

Loop ini terus berjalan sampai:
- backlog kosong;
- muncul defect reproduktif;
- atau diperlukan keputusan bisnis manusia.

## Escalation Rule

Agen hanya berhenti bila terjadi salah satu kondisi berikut:
1. defect reproduktif pada foundation;
2. konflik requirement;
3. risiko keamanan atau data;
4. keputusan bisnis yang hanya dapat diputuskan manusia.

Selain itu, jangan berhenti.

## Product Target

Target akhir EOS adalah production readiness, termasuk:
- Multi-agent Runtime
- Workspace
- Requirement Management
- RTM
- Evidence Registry
- Workflow Engine
- Knowledge Graph
- Agent Orchestration
- Enterprise UI
- Connector Ecosystem
- API Platform
- Observability
- Security
- Release Candidate v1

## Mandatory Closing Instruction

> Foundation telah dibekukan dan dianggap cukup untuk melanjutkan pembangunan produk. Jangan kembali ke fase foundation kecuali ditemukan defect reproduktif yang tervalidasi. Fokus utama AI Agent adalah menyelesaikan capability EOS sesuai prioritas backlog hingga mencapai production ready. Kurangi diskusi, perbanyak implementasi. Setiap iterasi harus menghasilkan peningkatan capability yang nyata dan dapat diuji.

## Executive Directive

> Mulai saat ini EOS berada pada Delivery Phase. Semua AI Agent harus beroperasi dalam Autonomous Execution Mode. Default perilaku agen adalah terus mengonsumsi backlog prioritas tertinggi, mengimplementasikan capability, menjalankan pengujian, dan melanjutkan ke backlog berikutnya tanpa meminta persetujuan tambahan, kecuali terjadi hard blocker yang telah didefinisikan. Keberhasilan proyek diukur dari bertambahnya capability production-ready, bukan bertambahnya dokumen atau diskusi.

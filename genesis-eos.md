# genesis-eos (Business Domain Package) — ReOrganise & ReFactory Deep Dive

Saya akan memperlakukan `genesis-eos` sebagai Business Domain Package yang berdiri sendiri, bukan sebagai bagian dari EOS Work Core dan bukan sebagai pengganti Paperclip.

Landasan desain yang sudah tertulis di dokumen proyek adalah:

- EOS Work Core: pemegang otoritas Work, identitas, governance, dan approval.
- genesis-eos: pemilik bahasa bisnis, bounded contexts, aturan domain, kontrak, serta alur nilai bisnis.
- Paperclip: execution substrate untuk menjalankan dan mengoordinasikan agent.
- EOS Bridge Companion: penerjemah kontrak dan konteks antara Work Core dengan eksekusi domain.

Dokumen juga menetapkan enam agent, lima bounded contexts bisnis, enam skill atomik, serta financial gate dengan batas net margin 75%. Saya akan mempertahankan keputusan domain ini sebagai baseline, lalu menguji ulang pemisahan tanggung jawab, struktur paket, kontrak, dan kesiapan implementasinya.&#x20;

genesis-eos.txt



## 1. Temuan utama: paket perlu dipisahkan menjadi tiga lapisan

Struktur awal sudah memiliki fondasi domain yang kuat, tetapi masih mencampur tiga jenis artefak yang sebaiknya punya lifecycle berbeda:

1. Domain definition — bahasa bisnis, bounded context, aggregate, business rules, event semantics.
2. Agent company package — agent, skill, reporting line, project, task, dan metadata yang diimpor Paperclip.
3. Runtime integration — adapter, validator, event transport, persistence, secret, retry, observability, dan koneksi ke EOS Work Core.

Campuran ini terlihat pada rancangan awal: `contracts/`, `validators/`, `agents/`, `skills/`, dan `.paperclip.yaml` berada dalam satu struktur, sementara konfigurasi adapter dan governance juga ditulis bersama definisi perusahaan.&#x20;

genesis-eos.txt



Rekomendasi refactory: pertahankan satu repository `genesis-eos`, tetapi pisahkan lapisan-lapisan tersebut secara eksplisit. Jangan memecahnya menjadi banyak repository terlalu dini; yang dibutuhkan sekarang adalah batas modul dan kontrak yang jelas, bukan overhead distribusi.

Ada satu koreksi penting dari dokumentasi Paperclip terbaru: format package bersifat Markdown-first dengan `COMPANY.md` sebagai entrypoint, `AGENTS.md` untuk agent, `PROJECT.md` untuk project, `TASK.md` untuk task, `SKILL.md` untuk skill, serta `.paperclip.yaml` sebagai sidecar konfigurasi spesifik Paperclip. Konfigurasi vendor/runtime tidak seharusnya dimasukkan ke definisi agent yang portable.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



## 2. Reorganise: struktur repository yang disarankan

```

genesis-eos/
├── README.md
├── COMPANY.md
├── LICENSE
├── CHANGELOG.md
│
├── domain/
│   ├── README.md
│   ├── ubiquitous-language.md
│   ├── context-map.md
│   ├── business-capabilities.md
│   ├── policies/
│   │   ├── financial-policy.md
│   │   ├── solution-policy.md
│   │   └── customer-success-policy.md
│   └── contexts/
│       ├── market-intelligence/
│       │   ├── context.md
│       │   ├── aggregates.md
│       │   └── events.md
│       ├── solution-fulfillment/
│       ├── value-risk-audit/
│       ├── growth-commerce/
│       └── customer-success/
│
├── references/
│   └── contracts/
│       ├── work-identity.schema.json
│       ├── event-envelope.schema.json
│       ├── financial-assessment.schema.json
│       └── approval.schema.json
│
├── scripts/
│   ├── validators/
│   │   ├── event-envelope-guard.js
│   │   └── financial-evaluator.js
│   ├── tests/
│   └── package-check/
│
├── agents/
│   ├── eos-bridge-companion/AGENTS.md
│   ├── revenue-scout/AGENTS.md
│   ├── solution-builder/AGENTS.md
│   ├── cfo-qa-auditor/AGENTS.md
│   ├── commerce-director/AGENTS.md
│   └── success-concierge/AGENTS.md
│
├── skills/
│   ├── atom-leakage-calculator/SKILL.md
│   ├── atom-trojan-brief/SKILL.md
│   ├── atom-mvs-blueprint/SKILL.md
│   ├── atom-margin-gate/SKILL.md
│   ├── atom-video-hook-matrix/SKILL.md
│   └── atom-health-pulse/SKILL.md
│
├── projects/
│   ├── live-proof/PROJECT.md
│   ├── client-onboarding/PROJECT.md
│   └── growth-experiments/PROJECT.md
│
├── tasks/
│   └── recurring-health-pulse/TASK.md
│
└── .paperclip.yaml

```



Recommended direction

`domain/` owns business meaning; `agents/` owns agent behavior; `skills/` owns reusable capabilities; `scripts/` owns deterministic executable logic; `.paperclip.yaml` owns Paperclip-specific runtime configuration.



Mengapa `projects/` tidak berisi lima bounded contexts? Karena bounded context adalah batas model bisnis, sedangkan project adalah grouping pekerjaan yang dapat berubah mengikuti prioritas delivery. Memperlakukan keduanya sebagai hal yang sama akan membuat struktur organisasi dan model domain saling mengunci.

Struktur ini tetap mengikuti konvensi package Paperclip. Direktori `scripts/` dan `references/` juga termasuk direktori pendukung yang diizinkan dalam spesifikasi package.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



## 3. Refactory domain: lima bounded contexts, satu integration bridge

Jangan ubah lima bounded contexts yang telah ditetapkan hanya karena struktur repository berubah. Yang perlu diperjelas adalah ownership dan kontrak di antara mereka.

| Context                    | Aggregate root        | Tanggung jawab utama                                 |
| -------------------------- | --------------------- | ---------------------------------------------------- |
| CTX-1 Market Intelligence  | `LeadProspect`        | Kualifikasi prospek, bukti masalah, Cost of Inaction |
| CTX-2 Solution Fulfillment | `SolutionArtifact`    | Desain solusi, MVS, bukti implementasi               |
| CTX-3 Value & Risk Audit   | `FinancialAssessment` | Evaluasi ekonomi, risiko, kelengkapan evidence       |
| CTX-4 Growth & Commerce    | `ConversionAsset`     | Aset konversi dan eksperimen pertumbuhan             |
| CTX-5 Customer Success     | `ClientAccount`       | Onboarding, outcome, TTFV, retensi, ekspansi         |

`Shared Bridge` sebaiknya diposisikan sebagai integration boundary / adapter, bukan bounded context bisnis keenam. Ia mengurus translasi kontrak, propagasi identitas Work, dan pengiriman permintaan approval; ia tidak boleh menjadi pemilik keputusan domain atau otoritas approval. Pembagian awal dokumen sudah membedakan lima context bisnis dan satu Shared Bridge, sehingga ini adalah penegasan batas, bukan perubahan strategi.&#x20;

genesis-eos.txt



Prinsip penting: satu agent per context boleh menjadi konfigurasi awal, tetapi bukan aturan arsitektur permanen. Domain model dan business rules harus tetap dapat diuji tanpa menjalankan agent atau LLM.

## 4. Refactory event architecture: pisahkan assessment dari approval

Ini salah satu perubahan terpenting.

Di dokumen awal, `MarginApprovedEvent` dipancarkan ketika financial gate PASS.&#x20;

genesis-eos.txt

&#x20;Secara semantik, hal itu berisiko membuat hasil evaluasi internal dianggap sama dengan persetujuan otoritatif.



Ubah menjadi dua tahap yang berbeda:

Tahap 1 — Domain decision

`FinancialAssessmentPassedEvent`

Validator deterministik menyatakan bahwa data memenuhi kebijakan margin dan evidence lengkap. Ini bukan approval untuk mengeksekusi Work.

Tahap 2 — Authority decision

`WorkApprovalRequestedEvent`

Bridge meneruskan permintaan approval ke EOS Work Core dengan identitas Work dan evidence yang relevan.

Tahap 3 — External authority

`WorkApprovalGrantedEvent` atau `WorkApprovalDeniedEvent`

Hanya EOS Work Core yang dapat mengeluarkan keputusan otoritatif ini.

Dengan begitu, tiga konsep tidak lagi bercampur:

- Assessment: apakah data dan aturan bisnis memenuhi syarat?
- Approval: apakah otoritas mengizinkan Work dilanjutkan?
- Execution: apakah agent atau sistem boleh menjalankan tindakan yang disetujui?

### Event envelope yang perlu diperkuat

Envelope awal sudah mencakup `eventId`, `eventType`, `logicalWorkId`, `tenantId`, `correlationId`, `causationId`, dan `evidenceRefs`.&#x20;

genesis-eos.txt

&#x20;Tambahkan atribut berikut:



```

{
  "eventId": "uuid",
  "eventType": "FinancialAssessmentPassedEvent",
  "eventVersion": 1,
  "logicalWorkId": "work-uuid",
  "tenantId": "tenant-id",
  "aggregateType": "FinancialAssessment",
  "aggregateId": "assessment-id",
  "aggregateVersion": 3,
  "sourceContext": "CTX-3",
  "occurredAt": "2026-11-13T09:00:00Z",
  "correlationId": "correlation-uuid",
  "causationId": "previous-event-uuid",
  "idempotencyKey": "tenant:work:assessment:v3",
  "payload": {},
  "evidenceRefs": [
    "evidence://assessment/sha256-hash"
  ]
}

```

| Atribut tambahan                | Mengapa dibutuhkan                         |
| ------------------------------- | ------------------------------------------ |
| `aggregateType` / `aggregateId` | Mengetahui objek domain yang berubah       |
| `aggregateVersion`              | Mencegah update tidak berurutan atau stale |
| `idempotencyKey`                | Mencegah pemrosesan ganda                  |
| `eventVersion`                  | Mendukung evolusi kontrak                  |
| `evidenceRefs`                  | Menjaga traceability keputusan             |

Untuk delivery event, implementasikan transactional outbox, consumer inbox/deduplication, retry dengan batas, dead-letter queue, dan replay protection. Jangan mengandalkan `eventId` saja untuk idempotensi.

## 5. Refactory financial gate: deterministic, evidence-backed, Indonesia-ready

Aturan awal net margin 75% tetap dipertahankan sebagai kebijakan bisnis. Formula dan tiga hasilnya juga tetap:

- `PASS`: net margin memenuhi batas dan bukti lengkap.
- `REJECT`: margin di bawah batas atau revenue tidak valid.
- `REVIEW`: data atau bukti belum lengkap.

Namun implementasi produksi perlu lebih eksplisit.

### Pisahkan policy dari evaluator

```

financial-gate/
├── policy/
│   ├── margin-floor.json
│   └── cost-classification.json
├── model/
│   ├── financial-input.schema.json
│   └── financial-result.schema.json
├── evaluator/
│   └── margin-evaluator.js
└── tests/
    ├── pass.test.js
    ├── reject.test.js
    ├── review.test.js
    └── precision.test.js

```

Jangan hardcode angka 75% di banyak skill dan prompt. Simpan policy di satu tempat, lalu evaluator membaca policy tersebut.

### Hal yang perlu ditambahkan untuk transaksi Indonesia

| Komponen    | Perlakuan yang disarankan                                           |
| ----------- | ------------------------------------------------------------------- |
| Currency    | IDR sebagai mata uang transaksi default                             |
| FX          | Simpan nilai kurs, sumber, waktu, dan mata uang asal                |
| Gateway fee | Biaya payment gateway masuk perhitungan biaya                       |
| Refund      | Catat sebagai komponen transaksi terpisah                           |
| Discount    | Kurangi revenue sesuai kebijakan pencatatan                         |
| Chargeback  | Pisahkan dari refund untuk audit                                    |
| Tax         | Pisahkan pajak yang dipungut dari revenue yang menjadi hak bisnis   |
| Cost period | Revenue dan seluruh biaya harus berasal dari periode yang sebanding |

Gunakan integer minor units atau decimal arithmetic yang presisi; jangan gunakan floating-point biasa untuk perhitungan finansial.

Contoh kebijakan hasil:

| Kondisi                                                        | Hasil    |
| -------------------------------------------------------------- | -------- |
| Margin 80%, evidence lengkap                                   | `PASS`   |
| Margin 74,9%                                                   | `REJECT` |
| `apiCost` tidak tersedia                                       | `REVIEW` |
| Revenue ≤ 0                                                    | `REJECT` |
| Kurs atau bukti gateway tidak tersedia untuk transaksi terkait | `REVIEW` |

Ini mempertahankan tes finansial yang sebelumnya sudah ditetapkan, sekaligus membuat hasil lebih dapat diaudit.

## 6. Refactory agent dan skill: agent bukan domain logic

Enam agent awal tetap berguna sebagai struktur organisasi eksekusi. Namun perlu ada pembagian yang lebih tegas:

| Artefak                 | Tanggung jawab                                         |
| ----------------------- | ------------------------------------------------------ |
| `AGENTS.md`             | Role, scope, reporting line, instruksi, batas tindakan |
| `SKILL.md`              | Prosedur reusable dan cara agent menggunakan kemampuan |
| `scripts/`              | Perhitungan dan validasi deterministik                 |
| `domain/`               | Definisi istilah, invariants, business rules           |
| `references/contracts/` | Bentuk data dan kontrak lintas modul                   |
| `.paperclip.yaml`       | Adapter, env inputs, budgets, permissions, routines    |

Contohnya, `atom-margin-gate` boleh menginstruksikan CFO & QA Auditor untuk memanggil evaluator. Tetapi keputusan numerik harus datang dari `financial-evaluator.js`, bukan penalaran LLM.

Prinsipnya:

LLM menginterpretasikan konteks; kode deterministik mengevaluasi aturan; EOS Work Core memutuskan otorisasi.

Ini juga mencegah perubahan model, prompt, atau adapter mengubah hasil perhitungan bisnis.

## 7. Paperclip compatibility: perbaiki kontrak paket sebelum import

Ada beberapa detail dalam rancangan awal yang perlu diselaraskan dengan spesifikasi package saat ini:

| Bagian         | Refactory                                                                            |
| -------------- | ------------------------------------------------------------------------------------ |
| `COMPANY.md`   | Gunakan frontmatter `schema: agentcompanies/v1`, `name`, `description`, `slug`       |
| `AGENTS.md`    | Gunakan `reportsTo` camelCase                                                        |
| Agent adapter  | Pindahkan ke `.paperclip.yaml`                                                       |
| `PROJECT.md`   | Gunakan `owner: <agent-slug>`                                                        |
| Recurring task | Gunakan `recurring: true` pada `TASK.md`, konfigurasi schedule di sidecar            |
| Secrets        | Deklarasikan nama secret, jangan simpan nilainya                                     |
| Scripts        | Tempatkan executable logic di direktori pendukung, jangan mencampurnya dengan prompt |
| Skills         | Pertahankan kompatibilitas `SKILL.md`                                                |

Ini sejalan dengan spesifikasi package dan panduan import/export Paperclip.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+2



Satu hal lagi: jangan menganggap konfigurasi awal `version: 1`, `env_vars`, `adapter: claude_code`, dan `reports_to` otomatis kompatibel dengan schema Paperclip saat ini. Sidecar perlu divalidasi terhadap `paperclip/v1` dan bentuk `adapter: { type, config }`, `inputs.env`, serta routine yang didukung runtime.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



Untuk CLI, dokumentasi terkini menunjukkan pola import berbasis source path dan target, misalnya:

```
paperclipai company import ./genesis-eos \
  --target new \
  --new-company-name "Genesis EOS"
```

Jangan menganggap flag dari contoh lama tetap berlaku. Periksa `paperclipai company import --help` pada versi CLI yang akan dipakai sebelum menjalankan import.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



## 8. Security dan authority: integrasikan dengan baseline EOS-360-001

Berdasarkan status War Room yang sebelumnya Anda berikan, EOS-360-001 sudah mencapai `ALL_GATES_PASSED`, termasuk verifikasi cross-tenant isolation. Saya akan memperlakukan itu sebagai baseline yang telah dilaporkan, bukan mengklaim telah menjalankan ulang tesnya.

Karena itu, refactory `genesis-eos` tidak perlu membuat authorization engine kedua.

| Area                 | Tanggung jawab                                        |
| -------------------- | ----------------------------------------------------- |
| EOS Work Core        | Identitas Work, tenant, session, capability, approval |
| genesis-eos          | Aturan domain dan kebutuhan bukti bisnis              |
| Paperclip            | Agent execution dan orchestration                     |
| EOS Bridge Companion | Propagasi trusted context dan translasi kontrak       |

### Invariant yang wajib dijaga

1. Agent tidak bisa mengubah `tenantId` atau `logicalWorkId` secara bebas.
2. Agent tidak bisa memberikan approval untuk Work-nya sendiri.
3. Financial PASS bukan approval.
4. Semua operasi lintas tenant diperiksa oleh otoritas yang sama.
5. Event replay tidak boleh menggandakan side effect.
6. Tidak ada domain event yang dapat melewati authorization boundary.
7. `DENY` tidak boleh meninggalkan mutasi Work atau kebocoran data.

Jangan mengubah Frozen Core hanya untuk mengakomodasi package. Buat adapter yang memenuhi kontrak yang sudah tersedia.

## 9. Testing dan acceptance criteria

Saya merekomendasikan pipeline berikut sebelum package dinyatakan siap diimpor dan digunakan:

Gate A — Package integrity

- Frontmatter dan struktur package valid
- Semua agent memiliki slug dan reporting line valid
- Semua skill memiliki `SKILL.md` valid
- Semua referensi file dapat di-resolve
- Tidak ada secret value atau machine-specific path

Gate B — Domain correctness

- Lima bounded contexts memiliki ownership jelas
- Aggregate invariants terdokumentasi
- Event producer/consumer terdefinisi
- Tidak ada cross-context direct mutation
- Assessment dan approval terpisah

Gate C — Deterministic logic

- Margin PASS ≥75%
- Margin REJECT 74,9%
- Input biaya hilang menghasilkan REVIEW
- Precision dan currency diuji
- Event schema dan version diuji

Gate D — Integration and resilience

- Trusted context dari Work Core dipertahankan
- Tenant isolation tidak dapat dilewati
- Idempotency dan duplicate delivery diuji
- Retry dan dead-letter diuji
- Approval hanya dari EOS Work Core

Gate E — Operational readiness

- Logs memiliki correlation ID
- Event dan decision dapat ditelusuri ke evidence
- Budget dan API cost dapat diaudit
- Secret dan credential tidak muncul di log
- Recovery dan replay diuji

## 10. Urutan implementasi: jangan refactor semuanya sekaligus

1. PR-01 — Package structure & schema alignment

   Reorganisasi folder, perbaiki frontmatter, dan validasi `.paperclip.yaml`. Tidak ada perubahan business logic.
2. PR-02 — Domain boundary & event contract

   Tambahkan context map, aggregate ownership, event catalog, versioning, idempotency, dan pemisahan approval.
3. PR-03 — Deterministic financial engine

   Refactor evaluator, precision, evidence validation, serta kebijakan IDR dan biaya transaksi.
4. PR-04 — Agent & skill refactory

   Hilangkan business logic duplikat dari prompt; hubungkan skill dengan validator yang sudah diuji.
5. PR-05 — EOS Bridge integration

   Gunakan Work identity dan authorization authority yang sudah tersedia. Jangan membangun mekanisme otorisasi paralel.
6. PR-06 — Import, UAT & production readiness

   Jalankan package validation, import preview, UAT lintas API/MCP/FACE, observability, recovery, dan release review.

## 11. Keputusan arsitektur yang saya rekomendasikan

# Keep the business model. Refactor the boundaries.

Pertahankan

- Lima bounded contexts.
- Enam agent sebagai initial execution organization.
- Enam atomic skills.
- Net margin floor 75%.
- MVS demo ≤10 menit, TTFV ≤7 hari, NRR ≥115%.
- EOS Work Core sebagai authority tunggal.

Ubah

- `Shared Bridge` menjadi integration boundary.
- Domain definitions dipisahkan dari Paperclip configuration.
- `MarginApprovedEvent` menjadi assessment event + approval request/grant event.
- Event envelope diperkuat dengan aggregate version dan idempotency.
- Financial evaluator dibuat terpisah dari agent prompt.
- Domain logic menjadi testable tanpa LLM.

Jangan lakukan

- Jangan membangun authorization engine baru.
- Jangan menjadikan satu agent sebagai satu-satunya tempat business rule hidup.
- Jangan menjadikan bounded context sama dengan project.
- Jangan menyimpan secret di package.
- Jangan menganggap import sukses berarti production-ready.

Batas verifikasi: deep dive ini menggunakan `genesis-eos.txt` sebagai sumber rancangan dan dokumentasi publik Paperclip sebagai pembanding. Saya belum menginspeksi repository Git aktual, menjalankan CLI, atau mengeksekusi test suite; jadi ini adalah rekomendasi refactory, bukan klaim bahwa perubahan sudah diterapkan atau lolos pengujian.

Langkah paling bernilai berikutnya: buat PR-01 sebagai non-breaking structural refactor, lalu jadikan PR-02 sebagai perubahan kontrak yang ditinjau bersama tim EOS Work Core. Dengan urutan itu, fondasi EOS-360-001 tetap terlindungi sementara `genesis-eos` berkembang menjadi package domain yang portable, testable, dan production-oriented.
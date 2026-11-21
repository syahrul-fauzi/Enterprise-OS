# ECOM-OPS-PILOT-READINESS-001

**Status:** PREPARATION — CONDITIONAL GO — Controlled Pilot Preparation  
**Tanggal:** 21 November 2026  
**Author:** EOS War Room Commander  
**Production Authorization:** NOT GRANTED  
**Production Transactions:** NOT AUTHORIZED

---

## CURRENT CONSTRAINTS

- No production transactions.
- Connector testing remains sandbox/developer only.
- No new Core primitives or orchestrators.
- No pilot activation without explicit authorization.

---

## ACCEPTANCE GATES STATUS

| Gate | Deskripsi | Status |
|------|-----------|--------|
| G1 | Human Accountability Assignment | PENDING |
| G2 | Kontrak, pricing, revenue evidence | NOT STARTED |
| G3 | 5 PSP, QRIS rail, marketplace connectors | NOT STARTED |
| G4 | PSE/PMSE legal classification | NOT STARTED |
| G5 | Pilot boundaries, rollback, incident plan | NOT STARTED |
| G6 | Evidence, observability, independent verification | NOT STARTED |
| G7 | Explicit Business Owner authorization | NOT STARTED |

**Gates completed:** 0/7

---

## G1 — HUMAN ACCOUNTABILITY ASSIGNMENT

### Tujuan Gate G1
Menetapkan accountable Business Owner dan Technical Owner sebagai otoritas manusia formal yang bertanggung jawab atas outcome bisnis dan kesiapan teknis Ecommerce-Ops.

### Peran dan Tanggung Jawab

#### Business Owner (Human Accountable Authority)
Bertanggung jawab atas:
- Business outcome dan value proposition
- Merchant/customer acceptance
- Revenue model, pricing, dan commercial viability
- Batas risiko bisnis dan keputusan pilot
- Persetujuan akhir atas hasil pilot

#### Technical Owner (Human Technical Authority)
Bertanggung jawab atas:
- Kesiapan arsitektur dan integrasi
- Konektor marketplace dan PSP
- Security, tenant isolation, reliability, dan observability
- Rollback dan incident handling
- Bukti teknis serta rekomendasi technical readiness

### G1 Proses Penunjukan Owner

Penunjukan owner dilakukan dalam lima tahap terpisah untuk menghindari asumsi otomatis:

1.  **Nomination** — Anda mengusulkan satu atau lebih kandidat untuk setiap posisi
2.  **Eligibility Review** — Memverifikasi kesesuaian kandidat dengan kriteria, termasuk konflik kepentingan dan batas kewenangan
3.  **Responsibility Acceptance** — Kandidat menyetujui tanggung jawab, ketersediaan, dan batas keputusan
4.  **Formal Appointment** — Pihak yang memiliki kewenangan mengesahkan penunjukan
5.  **Evidence & Independent Verification** — Penunjukan dan penerimaan tanggung jawab direkam sebagai evidence

### Matriks Nominasi Kandidat — Tahap 1: Nomination

| Atribut | Business Owner | Technical Owner |
|---------|----------------|------------------|
| Candidate | EOS Business Lead Internal | EOS Engineering Lead Internal |
| Role / Team | Ecommerce-Ops Business Track | Ecommerce-Ops Technical Track |
| Decision authority | Otoritas atas outcome bisnis, pricing, risiko | Otoritas atas arsitektur, security, operasi |
| Availability | TBD — menunggu konfirmasi | TBD — menunggu konfirmasi |
| Conflict of interest | Sedang diverifikasi | Sedang diverifikasi |
| Acceptance | Pending — menunggu konfirmasi | Pending — menunggu konfirmasi |

**Status Nominasi:** DIAJUKAN — menuju tahap Eligibility Review

---

### Tahap 2: Eligibility Review — Hasil Pemeriksaan Awal

| Posisi | Status | Temuan |
|--------|--------|--------|
| Business Owner | PROVISIONAL | Relevansi merchant/pricing/revenue sesuai konseptual, tetapi kewenangan, akuntabilitas, dan ketersediaan belum dibuktikan |
| Technical Owner | PROVISIONAL | Relevansi EOS Core/integrasi sesuai konseptual, tetapi kewenangan, akuntabilitas, dan ketersediaan belum dibuktikan |

**Temuan Utama:** Kedua nominasi baru menyebut posisi, belum menyebut individu yang dapat menerima akuntabilitas. Belum dapat dinyatakan eligible secara final.

**Pemeriksaan Per Item:**
- Business Owner (EOS Business Lead Internal):
  - Relevansi terhadap merchant, pricing, revenue: sesuai secara konseptual
  - Kewenangan keputusan bisnis: belum dibuktikan
  - Akuntabilitas revenue dan risiko: belum dibuktikan
  - Ketersediaan dan penerimaan tanggung jawab: belum diketahui
- Technical Owner (EOS Engineering Lead Internal):
  - Relevansi terhadap EOS Core dan integrasi: sesuai secara konseptual
  - Kewenangan keputusan teknis: belum dibuktikan
  - Akuntabilitas security dan reliability: belum dibuktikan
  - Ketersediaan dan penerimaan tanggung jawab: belum diketahui

---

### Eligibility Review — Kriteria Verifikasi Status

| ID | Pemeriksaan | Business Owner | Technical Owner |
|----|-------------|----------------|------------------|
| ER-01 | Identitas individu dan jabatan | PENDING — jabatan teridentifikasi, nama individu PENDING | PENDING — jabatan teridentifikasi, nama individu PENDING |
| ER-02 | Mandat dan kewenangan nyata | PENDING — menunggu bukti organisasi | PENDING — menunggu bukti organisasi |
| ER-03 | Kompetensi sesuai tanggung jawab | PENDING — menunggu verifikasi | PENDING — menunggu verifikasi |
| ER-04 | Ketersediaan dan kapasitas | PENDING — menunggu konfirmasi | PENDING — menunggu konfirmasi |
| ER-05 | Konflik kepentingan | PENDING — sedang diverifikasi | PENDING — sedang diverifikasi |
| ER-06 | Jalur eskalasi dan pengganti | PENDING — belum didefinisikan | PENDING — belum didefinisikan |

**Catatan Status Eligibility:** Nominasi berbasis jabatan dipertahankan sementara sambil menunggu bukti mandat dan kewenangan dari organisasi. Tidak ada asumsi otomatis bahwa jabatan memberikan kewenangan penuh.

---

### Batas Keputusan yang Ditetapkan

1. Business Owner bertanggung jawab atas business outcome dan keputusan bisnis
2. Technical Owner bertanggung jawab atas technical readiness dan rekomendasi teknis
3. Governance tetap menjadi pengawas batas otorisasi
4. Technical Owner tidak dapat memberikan otorisasi transaksi produksi hanya berdasarkan kelulusan teknis
5. AI Agents dapat membantu kedua owner, tetapi tidak menggantikan akuntabilitas manusia

---

### Status War Room — Tahap Proses G1

| Tahap Proses G1 | Status |
|-----------------|--------|
| 1. Nomination | ✅ **COMPLETED — ROLE NOMINATED** |
| 2. Eligibility Review | 📋 **IN PROGRESS — PRELIMINARY** |
| 3. Responsibility Acceptance | ⏳ **PENDING** |
| 4. Formal Appointment | ⏳ **PENDING** |
| 5. Evidence & Independent Verification | ⏳ **PENDING** |
| **G1 acceptance** | ❌ **NOT PASSED** |

**Acceptance Gates Progress:** 0/7 gates completed
**Keputusan Pilot Saat Ini:** PREPARATION — NOT AUTHORIZED FOR PRODUCTION

### Sumber Kandidat yang Disarankan

| Posisi | Sumber Kandidat | Alasan |
|--------|-----------------|--------|
| Business Owner | Business/Commercial Lead internal tim EOS | Memahami merchant, pricing, revenue, dan risiko bisnis |
| Technical Owner | Engineering Lead internal tim EOS | Memahami EOS Core, integrasi, security, dan operasi |
| Legal reviewer | Legal/Compliance specialist | Memberikan penilaian PSE/PMSE |
| Independent reviewer | Reviewer yang tidak menjadi pelaksana utama | Memastikan evidence tidak dinilai sendiri |

*Legal reviewer dan independent reviewer bukan pengganti kedua accountable owner.*

### G1 Acceptance Criteria

| ID | Acceptance Criteria | Status |
|----|---------------------|--------|
| G1.1 | Business Owner ditetapkan | PENDING |
| G1.2 | Technical Owner ditetapkan | PENDING |
| G1.3 | Kedua owner menyetujui tanggung jawab | PENDING |
| G1.4 | Scope dan decision authority masing-masing jelas | PENDING |
| G1.5 | Escalation dan approval path tersedia | PENDING |
| G1.6 | Penunjukan tercatat dengan provenance/evidence | PENDING |
| G1.7 | Independent verification PASS | PENDING |

### G1.3 — Matriks Pembagian Tanggung Jawab

| Area Keputusan | Business Owner | Technical Owner | Joint Decision |
|----------------|----------------|------------------|----------------|
| Scope pilot dan batas transaksi | ✅ |  |  |
| Harga layanan dan model revenue | ✅ |  |  |
| Persetujuan merchant dan kontrak | ✅ |  |  |
| Kriteria keberhasilan bisnis pilot | ✅ |  |  |
| Batas risiko bisnis dan toleransi kerugian | ✅ |  |  |
| Arsitektur sistem dan integrasi |  | ✅ |  |
| Security, isolasi tenant, dan kepatuhan |  | ✅ |  |
| Rencana rollback dan penanganan insiden |  | ✅ |  |
| Ketersediaan konektor PSP dan marketplace |  | ✅ |  |
| Rekomendasi kesiapan teknis |  | ✅ |  |
| Jadwal pelaksanaan pilot |  |  | ✅ |
| Persetujuan akhir aktivasi pilot |  |  | ✅ |
| Evaluasi hasil pilot dan tindak lanjut |  |  | ✅ |

### G1.4 — Scope dan Decision Authority Matrix

| Wewenang | Business Owner | Technical Owner |
|----------|----------------|------------------|
| Dapat menghentikan pilot kapan saja | ✅ | ✅ |
| Dapat menyetujui perubahan scope | ✅ |  |
| Dapat menyetujui perubahan teknis |  | ✅ |
| Dapat mengeluarkan pernyataan publik tentang pilot | ✅ |  |
| Dapat mengakses data transaksi dan laporan keuangan | ✅ | ✅ |
| Dapat mengakses log sistem dan insiden teknis |  | ✅ |

### G1.5 — Escalation dan Approval Path

| Skenario | Tingkat Keputusan | Jalur Persetujuan | SLA |
|----------|-------------------|-------------------|-----|
| Perubahan scope pilot minor | Business Owner | Persetujuan tertulis Business Owner | 24 jam |
| Perubahan scope pilot mayor | Joint Decision | Persetujuan tertulis kedua owner | 48 jam |
| Insiden teknis P1 (down) | Technical Owner | Technical Owner dapat mengaktifkan rollback segera | < 1 jam |
| Insiden bisnis P1 (kerugian) | Business Owner | Business Owner dapat menghentikan pilot segera | < 1 jam |
| Aktivasi pilot produksi | Joint Decision | Persetujuan tertulis kedua owner + independent verification | 7 hari |
| Perpanjangan durasi pilot | Joint Decision | Persetujuan tertulis kedua owner | 48 jam |

### G1.6 — Template Owner Accountability Record

```
ECOM-OPS-G1-OWNER-ACCOUNTABILITY-RECORD
Tanggal: [tanggal penunjukan]
Status: DRAFT / FINAL

1. PENUNJUKAN OWNER
   - Business Owner: [nama]
   - Technical Owner: [nama]
   - Provenance: [referensi keputusan/konteks penunjukan]
   - Timestamp: [waktu penunjukan]

2. PERSETUJUAN TANGGUNG JAWAB
   - Business Owner menandatangani persetujuan tanggung jawab: [ya/tidak, timestamp]
   - Technical Owner menandatangani persetujuan tanggung jawab: [ya/tidak, timestamp]

3. MATRIKS KEPUTUSAN
   - Scope dan decision authority: [referensi matriks]
   - Escalation path: [referensi jalur persetujuan]

4. INDEPENDENT VERIFICATION
   - Verifikasi oleh Independent Reviewer: [PASS/FAIL]
   - Catatan verifikasi: [catatan]
   - Timestamp verifikasi: [waktu]

Output: G1 PASS / G1 FAIL
```

---

## PERSIAPAN PARALEL GATE G2-G6

**Strategi: Parallel Preparation, Sequential Authorization**

Tim dapat menjalankan semua pekerjaan non-mutating secara paralel, tetapi keputusan yang membutuhkan mandat owner, persetujuan legal, atau otorisasi pilot tetap menunggu pihak yang berwenang.

| Workstream | Aktivitas yang dapat dimulai | Status |
|------------|------------------------------|--------|
| G1 | Melengkapi eligibility evidence kedua kandidat | IN PROGRESS |
| G2 | Inventarisasi kontrak, pricing, revenue, dan transaksi | READY TO START |
| G3 | Audit konektor marketplace dan PSP; sandbox verification plan | READY TO START |
| G4 | Regulatory fact mapping PSE/PMSE untuk legal reviewer | READY TO START |
| G5 | Draft pilot boundary, kill switch, rollback, dan incident plan | READY TO START |
| G6 | Audit evidence provenance, observability, dan independent test plan | READY TO START |

**Prioritas Kerja:**
1.  **G2 + G3** — Paling dekat dengan pembuktian kelayakan bisnis dan teknis
2.  **G4, G5, G6** — Dapat dipersiapkan paralel setelah G2+G3 berjalan

---

## WAR ROOM DASHBOARD — ECOMMERCE-OPS PILOT READINESS

| Metrik | Nilai |
|--------|-------|
| Active Slices | 6 (G1-G6) |
| Blocked | 0 |
| In Review | 1 (G1 Eligibility) |
| Ready | 5 (G2, G3, G4, G5, G6) |
| In Progress | 0 |
| Pending | 0 |
| Shipped | 0 |
| Arch Delta | LOW |
| Primitive Reuse | 100% |
| Duplicate Work | 0 |
| Failed Replay | 0 |

**Next Highest Leverage:** G1 Eligibility Review Completion + Independent Verification Preparation

---

## WORK ITEM DECOMPOSITION — PARALLEL PREPARATION

| Work Item | Gate | Status | Deliverable |
|-----------|------|--------|-------------|
| G1 Eligibility Review | G1 | IN PROGRESS | Matriks verifikasi kelayakan owner |
| G2 Commercial Evidence Inventory | G2 | IN PREPARATION | G2-COMMERCIAL-EVIDENCE-INVENTORY.md |
| G3 Connector Verification Matrix | G3 | IN PREPARATION | G3-PRODUCTION-CONNECTOR-VERIFICATION.md |
| G4 Regulatory Fact Mapping | G4 | READY TO START | Dokumen pemetaan PSE/PMSE |
| G5 Pilot Control Plan | G5 | READY TO START | Dokumen boundary, kill switch, rollback |
| G6 Evidence Readiness Audit | G6 | READY TO START | Matriks audit evidence provenance |

---

## DEPENDENCY MAP — SEQUENTIAL AUTHORIZATION

```
G1 Eligibility ───────────────┐
G2 Commercial Evidence ───────┤
G3 Connector Verification ────┤
G4 Regulatory Review ─────────┼──> G7 Business Authorization
G5 Pilot Control Plan ────────┤
G6 Evidence Readiness ────────┘
```

**Catatan:** Diagram menunjukkan syarat menuju G7, bukan berarti G1-G6 harus menunggu satu sama lain untuk persiapan. Semua pekerjaan non-mutating dapat berjalan paralel.

---

## HASIL RECON G2 + G3 — EVIDENCE YANG SUDAH ADA

### G2 Commercial Evidence — Evidence Ditemukan
| Bukti | Nilai | Sumber |
|-------|-------|--------|
| Tarif per Work | Rp45.000.000 | ECOM-101_EXECUTION_EVIDENCE.json |
| Tarif per fulfillment order | Rp150.000 | ECOM-101_EXECUTION_EVIDENCE.json |
| Total revenue generated | Rp350.000 | pilot-business-report.json |
| Total transactions processed | 1 | pilot-business-report.json |
| Unique clients served | 1 | pilot-business-report.json |
| Order fulfillment success rate | 100% | pilot-business-report.json |

**Status G2:** ✅ Evidence ditemukan — dokumen G2-COMMERCIAL-EVIDENCE-INVENTORY.md sudah dibuat

### G3 Production Connector Verification — Evidence Ditemukan
| Konektor | Status Verifikasi | Sumber |
|----------|-------------------|--------|
| Shopee | ✅ Terverifikasi | ECOM-101, ECOM-102 |
| Tokopedia | ✅ Terverifikasi | ECOM-102 |
| Lazada | ✅ Terverifikasi | ECOM-102 |
| TikTok Shop | ✅ Terverifikasi | ECOM-102 |
| WooCommerce | ✅ Terverifikasi | ECOM-102 |
| Midtrans | ⏳ Perlu verifikasi | Belum ada bukti eksplisit |
| Xendit | ⏳ Perlu verifikasi | Belum ada bukti eksplisit |
| Doku | ⏳ Perlu verifikasi | Belum ada bukti eksplisit |
| GoPay | ⏳ Perlu verifikasi | Belum ada bukti eksplisit |
| OVO | ⏳ Perlu verifikasi | Belum ada bukti eksplisit |
| QRIS (payment rail) | ⏳ Perlu verifikasi | Belum ada bukti eksplisit |

**Capabilities yang sudah terverifikasi:**
- multichannel.sync ✅
- payment.reconciliation ✅
- inventory.management ✅
- fraud.detection ✅
- marketplace.connector ✅

**Status G3:** ✅ Evidence marketplace ditemukan — dokumen G3-PRODUCTION-CONNECTOR-VERIFICATION.md sudah dibuat

---

## WAR ROOM DASHBOARD — ECOMMERCE-OPS PILOT READINESS

| Metrik | Nilai |
|--------|-------|
| Active Slices | 6 (G1-G6) |
| Blocked | 0 |
| In Review | 1 (G1 Eligibility) |
| Ready | 2 (G2, G3) |
| Shipped | 0 |
| Arch Delta | LOW |
| Primitive Reuse | 100% |
| Duplicate Work | 0 |
| Failed Replay | 0 |

**Next Highest Leverage:** G2 Commercial Evidence Inventory + G3 Connector Verification Matrix

---

## WORK ITEM DECOMPOSITION — PARALLEL PREPARATION

| Work ID | Gate | Deskripsi | Prioritas | Status | Agent |
|---------|------|-----------|-----------|--------|-------|
| ECOM-G1-001 | G1 | Lengkapi eligibility evidence kedua kandidat | HIGH | IN PROGRESS | Governance |
| ECOM-G2-001 | G2 | Inventarisasi kontrak, pricing, revenue, transaksi | HIGH | READY | Finance + Business |
| ECOM-G3-001 | G3 | Audit konektor marketplace + PSP + QRIS | HIGH | READY | Engineering |
| ECOM-G4-001 | G4 | Regulatory fact mapping PSE/PMSE | MEDIUM | READY | Legal |
| ECOM-G5-001 | G5 | Draft pilot boundary, kill switch, rollback | MEDIUM | READY | Operations |
| ECOM-G6-001 | G6 | Audit evidence provenance, observability | MEDIUM | READY | QA + Observability |

**Dependency Map:**
- G1 → G7 (Sequential Authorization)
- G2, G3, G4, G5, G6 → Parallel Preparation (tidak saling menunggu)
- Semua gate → G7 (Final Authorization)

**Batas Otorisasi:**
| Aktivitas | Boleh sekarang? |
|-----------|-----------------|
| Membaca dan mengaudit evidence | ✅ YA |
| Menyusun draft dan test plan | ✅ YA |
| Pengujian sandbox | ✅ YA |
| Menetapkan owner secara sepihak | ❌ TIDAK |
| Menyatakan legal compliance final | ❌ TIDAK |
| Mengaktifkan production connector | ❌ TIDAK |
| Menjalankan transaksi pilot produksi | ❌ TIDAK |

**Dependency Diagram Menuju G7:**
```
G1 Eligibility ───────────────┐
G2 Commercial Evidence ───────┤
G3 Connector Verification ────┤
G4 Regulatory Review ─────────┼──> G7 Business Authorization
G5 Pilot Control Plan ────────┤
G6 Evidence Readiness ────────┘
```
*Diagram menunjukkan syarat menuju G7, bukan berarti G1–G6 harus menunggu satu sama lain untuk persiapan.*

**Lima Batas Arsitektur EOS yang Harus Dijaga:**
1.  Work Core tetap pemilik identitas dan kontinuitas Work
2.  Evidence Registry tetap pemilik provenance evidence
3.  Connector Ecosystem tetap pemilik batas integrasi eksternal
4.  Execution menggunakan capability dan orchestrator EOS yang sudah ada
5.  Business Owner dan Technical Owner tetap accountable human authorities

*Tidak ada primitive baru, duplicate orchestrator, duplicate state authority, atau Work baru hanya untuk memecah pekerjaan yang sudah tercakup.*

---

## TARGET PEMBUKTIAN PILOT

1. Merchant nyata dengan persetujuan yang jelas
2. Order nyata dalam batas pilot yang disetujui
3. Koneksi resmi marketplace dan PSP
4. Payment dan fulfillment dapat direkonsiliasi
5. Tidak ada cross-tenant leakage atau duplicate processing
6. Pendapatan, biaya, margin, dan waktu operasional dapat diukur
7. Hasil diverifikasi secara independen

---

## PRINSIP PENTING

Jangan menganggap daftar Midtrans, Xendit, Doku, GoPay, dan OVO sebagai lima integrasi produksi yang telah terbukti. Inventarisasi provider, payment rail, connector implementation, dan production connectivity harus menjadi empat hal yang dapat diverifikasi secara terpisah.

---

*Everything Can Change. Work Remains.*
# Enterprise OS — ROADMAP & EXECUTION JOURNAL (Level 3)

Change Frequency Level: **Level 3 (Execution)**
Expected Change Rate: setiap hari / per minggu — setiap iterasi kerja, update cadence, atau koreksi rencana kerja.
Change Mechanism: Diubah secara iteratif normal. Tidak membutuhkan Keputusan Arsitektural Besar. Update hanya membutuhkan evidence linkage ke perubahan yang direncanakan.
Cross-Reference: [CONSTITUTION.md](file:///root/Enterprise-OS/CONSTITUTION.md) · [ARCHITECTURE.md](file:///root/Enterprise-OS/ARCHITECTURE.md) · [EVIDENCE.md](file:///root/Enterprise-OS/EVIDENCE.md) · [STATUS.md](file:///root/Enterprise-OS/STATUS.md) (Rule of Five Dokumen Inti #4)

---

## ⚠️ EPISTEMIC CAVEAT (SELALU DI BAGIAN ATAS)

**SELURUH ISI DALAM DOKUMEN INI ADALAH RENCANA KERJA, BUKAN BUKTI.**
Lihat [CONSTITUTION.md PASAL 1](file:///root/Enterprise-OS/CONSTITUTION.md#L28-L51):
- Roadmap (Level 3) ≠ Evidence (Level 2). Roadmap yang tertulis BELUM menjadi bukti apapun.
- Klaim epistemik hanya boleh meningkat melalui bukti empiris (ΔEvidence reproducible → ΔStatus), bukan karena roadmap yang ditulis dengan baik.
- Seluruh target di bawah ini = HIPAOTESIS OPERASIONAL yang masih harus dibuktikan melalui eksekusi.

---

## 🚨 BOTTLENECK MIGRATION NOTICE v2 (Kalibrasi Kesembilan + Kalibrasi Kesepuluh User Directive Urutan Prioritas Baru)

**Executed: 2026-07-28 (v2) · **Sumber Directive: Kalibrasi 9 Bottleneck Migration + Kalibrasi 10 User Directive Urutan Prioritas Eksekusi (4 Step Baru)

**⚠️ DIRECTIVE EKSEKUSI GLOBAL: STOP ALL GOVERNANCE TUNING — FOKUS 100% KE L4 SOFTWARE/EKSEKUSI. TIDAK BOLEH menambah PASAL / aturan / gate baru SEBELUM Urutan Prioritas (1) → (2) → (3) → (4) selesai minimal 1 batch penuh.**

⚠️ **PERUBAHAN URUTAN KRITIS KALIBRASI 10 (User Directive):** Urutan B1-B2-B3-B4 Kalibrasi 9 DIPERBAHARUI. Replikasi capability kedua sekarang URUTAN #2, SEBELUM Frontier-D #3. Ini sesuai metodologi sains: generalisasi apparatus ukur pada capability kedua DULU sebelum mengundang auditor luar. Mengurangi biaya (auditor tidak perlu diundang jika framework measurement gagal di capability kedua) dan mengurangi risiko N=1 overfit.

Cross-reference lengkap definisi formal: [EVIDENCE.md Kalibrasi 9 Table 4 Bottleneck](file:///root/Enterprise-OS/EVIDENCE.md#L744-L764) · [EVIDENCE.md Kalibrasi 10 Table Urutan Prioritas Baru](file:///root/Enterprise-OS/EVIDENCE.md#L956-L965) · [Kalibrasi 10 Pre-Registration Contract H1-H6 5-Komponen Ilmiah](file:///root/Enterprise-OS/EVIDENCE.md#L854-L983)

---

### URUTAN PRIORITAS EKSEKUSI GLOBAL SAAT INI (4 Step — TIDAK BOLEH DITEMBUS — User Directive Kalibrasi 10)

| Urutan | Tugas Utama | Deliverable Utama | Exit Criteria Menuju Step Berikutnya |
|---|---|---|---|
| **#1 (HIGHEST PRIORITY)** | **Step 1: Menghasilkan Measurement Report pertama** (Alpha.13 Step 0-4, SHA256 identifier byte-by-byte verifiable). 3 Invarian Mekanis WAJIB 100% PASS: (1) Single Truth SHA match, (2) Vocab Grep Section 3/4 TIDAK ada interpretatif vocab, (3) INCONCLUSIVE 4-field lengkap. | File YAML Measurement Report di `build/evidence/experiments/alpha13/` dengan SHA256 identifier. Linked ke Decision Object DEC-Alpha13-Gate0 di `governance/decisions/`. | Report SHA256 IDENTIK ketika dijalankan ulang oleh 2 orang engineer berbeda dalam tim internal (tidak auditor). Invarian 1, 2, 3 = SEMUA PASS. |
| **#2 (URUTAN BARU — Sebelum Frontier-D)** | **Step 2: Replikasi capability KEDUA** (Alpha.14: pilih capability LawyersHub nyata SELAIN legal-case, misal `document-management` / `client-profile` / `billing-invoice`. Apply Measurement Report 6 Bagian YANG SAMA formatnya. Tujuannya: uji generalizability framework measurement — BUKAN scaffolding 1 kasus spesifik. | Measurement Report SHA256 KEDUA untuk capability BEDA dari Alpha.13 legal-case. 3 Invarian Mekanis PASS JUGA untuk report kedua. | Report kedua SHA256 IDENTIK ketika direproduksi oleh engineer yang TIDAK menulis report pertama (cross-rater internal minimal 1 orang lain) → byte-match ≥ 98% field identik. |
| **#3 (Setelah Capability Kedua Replikasi Success)** | **Step 3: Frontier-D STRICT COLD TRACE auditor independen** (≥3 auditor fisik berbeda, BUKAN internal, BUKAN desainer, BUKAN kontributor commit). Auditor HANYA menerima 6 artefak awal. SEMUA komunikasi lisan/chat/meeting dengan desainer = OFF. Catat RO1-RO6 angka nyata. | EVIDENCE.md Level 2 Entry Type=frontier_d_audit_result dengan: RO1 (durasi menit), RO2 (verdict match % case-sensitive), RO3 (count unique file governance dibuka), RO4 (step pass/fail count 5-step PASAL 6.A), RO5 (durasi engineer baru menit), RO6 (success rate SHA match %). | RO1-RO6 seluruhnya TERISI angka nyata untuk minimal N≥3 auditor × minimal N≥2 Decision Object berbeda (masing-masing dari capability Step 1 dan Step 2). Data tersimpan APPEND-ONLY. |
| **#4 (LONGEST DURATION — PALING LOW PRIORITY RELATIF)** | **Step 4: Beberapa siklus eksperimen berulang SEBELUM evaluasi final H1-H6.** Ulangi Step 1→2→3 pada ≥2 milestone transisi berturut-turut (Alpha.15 → Alpha.16). Kumpulkan data GC_ACTUAL / GB_ACTUAL per aturan PASAL 1-8. Kumpulkan data inter-rater reliability H5. Kumpulkan data cognitive load H6 onboarding. HANYA SETELAH N-minimum semua hypothesis tercapai → boleh verdict PASS/FAIL FINAL H1-H6. | Decision Object `Evaluation-EOS-Hypothesis-Batch-1` SHA-linked ke semua data Level 2. Batch verdict H1-H6 = (PASS PROVISIONAL / PASS STRONG / FAIL / INCONCLUSIVE + resolution plan). | Untuk SETIAP H1-H6: Sample size minimum 100% tercapai; kondisi falsifikasi & kriteria success terdefinisi dengan JELAS; TIDAK ada hypothesis INCONCLUSIVE tanpa resolution plan. Semua angka tersimpan APPEND-ONLY. |

---

### 4 BOTTLENECK EKSEKUSI UTAMA SAAT INI (Mapping ke 4 Step Urutan Prioritas Baru)

| # | Bottleneck | Status | Mapping Step Urutan | Hipotesis (H1-H6) yang Tergantung | Bukti yang Dihasilkan |
|---|-----------|-------------------------|-----------------------------------|---------------------------------------------------|--------------------------|
| **B1 (PALING KRITIS)** | **Hasilkan Measurement Report PERTAMA Alpha.13 Step 0-4 dengan SHA256 Identifier byte-by-byte verifiable. | ⬜ BELUM ADA — TIDAK BOLEH menambah governance apapun sebelum report pertama ADA. Report SHA256 ini adalah prasyarat KONSTRUKTIF untuk SEMUA hipotesis H1-H6. Tanpa SHA report, tidak ada satupun hypothesis yang bisa diuji sama sekali. | Step 1 | Semua H1-H6 (TIDAK ADA YANG TERBEBAS) | RO4 (trace steps pass/fail count) |
| **B2' (URUTAN BARU) ** | **Jalankan Step 2 Replikasi capability kedua, lalu SELURUH Step 0-4 Alpha.13 & Alpha.14 sesuai 3 Invarian Mekanis.** | ⬜ BELUM. 3 Invarian (Single Truth, Vocab Grep, INCONCLUSIVE 4-field) WAJIB lulus 100% saat report di-generate di Step 1 & Step 2. | Step 1, Step 2 | H5 (Pemisahan Obs/Meas/Int/Dec kurangi bias), H4 (GC/GB generalisasi) | RO4 step 3-4 pass count; bukti empiris invarian dilaksanakan; Capability Kedua Replikasi SHA Match Result |
| **B3** | **Frontier-D STRICT COLD TRACEABILITY: Minta AUDITOR INDEPENDEN FISIK (bukan internal desainer) menjalankan 6 artefak SAJA, SEMUA komunikasi = OFF. Catat RO1-RO6! | ⬜ BELUM. Ini adalah VALIDASI SESUNGGUHNYA dari seluruh 9+ kalibrasi governance — BUKAN self-report internal. **TIDAK dijalankan sebelum Step 2 Capability Kedua Replikasi SUKSES (Exit Criteria terpenuhi).** | Step 3 | H1, H2, H3 (Core Hypothesis inti diuji) | RO1 (durasi cold trace), RO2 (verdict match %), RO3 (jumlah artefak dibuka), RO4 (trace steps pass/fail), RO5 (durasi engineer baru), RO6 (success rate SHA match) |
| **B4 (TERPANJANG)** | **ULANGI seluruh Step 1→2→3 pada MINIMAL ≥ 2 capability berbeda + ≥ 2 milestone berbeda (Alpha.15 dst) untuk menghasilkan multi-siklus data + GC_ACTUAL/GB_ACTUAL time-log. | ⬜ BELUM. 1x lulus = bukti 1 kasus. ≥ 2x capability berbeda + ≥ 2 milestone = data yang mulai bisa digunakan untuk menguji H3 (stabilitas governance), H4 (GB>>GC actual), H5 (kurangi bias multi-siklus), H6 (cognitive load engineer baru multi-siklus). Ini = pre-requisite VERDICT FINAL SEMUA H1-H6. | Step 4 | H3, H4, H5, H6 | Σ RO1-RO6 cross-batch comparison; GC_ACTUAL/GB_ACTUAL time-log per PASAL; Kappa IRR; Cognitive Load Quiz Data; Batch 1 Hypothesis Evaluation. |

---

### 6 REVIEWER OUTCOME WAJIB DIUKUR SAAT EKSEKUSI (RO1-RO6)

⚠️ BUKAN aturan baru. BUKAN checklist governance sekarang. INI ADALAH DATA EMPIRIS YANG WAJIB DICATAT ANGKA NYATA SETELAH BOTTLENECK B3 BENAR-BENAR DIJALANKAN (tidak boleh estimasi sekarang). Lokasi pencatatan: EVIDENCE.md Level 2 Entry Type=frontier_d_audit_result.

| # | Reviewer Outcome Wajib Ukur (angka nyata) | Definisi Operasional | Status Saat Ini |
|---|-----------------------------------------|----------------------|-----------------|
| RO1 | Durasi (menit) Cold Trace auditor independen | timestamp verdict dihasilkan − timestamp auditor menerima 6 artefak | ⬜ TIDAK |
| RO2 | Match Verdict (%) auditor vs Decision Object asli | case-sensitive PASS/FAIL/INCONCLUSIVE + next_action SAMA PERSIS | ⬜ TIDAK |
| RO3 | Jumlah artefak governance YANG BENAR-BENAR DIBUKA auditor (count unique file path) | BUKAN total file governance = 5. Tapi file YANG DIGUNAKAN menghasilkan verdict | ⬜ TIDAK |
| RO4 | Jumlah step PASAL 6.A 5-step chain yang GAGAL / BERHASIL per auditor | Per step: (1) Commit SHA? (2) Dec→Report SHA? (3) Report→Meas? (4) Meas→Obs byte match? (5) Interpretation match? | ⬜ TIDAK |
| RO5 | Durasi (menit) engineer BARU ulang Alpha.13 TANPA BANTUAN LISAN | Instruksi HANYA via dokumentasi repo — NO CHAT/MEETING | ⬜ TIDAK |
| RO6 | Success Rate (%) engineer BARU menghasilkan report SHA-IDENTIK dengan canonical | SHA256 report engineer vs SHA256 report asli Alpha.13 step 4 | ⬜ TIDAK |

Cross-reference lengkap definisi formal RO1-RO6: [EVIDENCE.md Bagian 4 RO1-RO6 Table](file:///root/Enterprise-OS/EVIDENCE.md#L767-L781)

---

### 6 HIPOTESIS BESAR EOS YANG MASIH BELUM TERBUKTI (H1-H6)

⚠️ **HONESTY BOUNDARY v2:** SELURUH klaim manfaat empiris EOS di dokumentasi apapun WAJIB diberi label ⚠️ **HIPOTESIS YANG SEDANG DIUJI (Belum Terbukti Empiris) + link ke tabel H1-H6 di bawah ini. TIDAK BOLEH lagi menyajikan H1-H6 sebagai kesimpulan final sebelum RO1-RO6 terisi untuk ≥1 batch Frontier-D + ≥2 milestone repeated experiments.

| ID | Hipotesis (BELUM TERBUKTI — Butuh Bukti Empiris B1-B4 selesai) | Bukti yang Dibutuhkan (Ringkas) |
|----|---------------------------------------------------------------|-------------------------------|
| H1 | Enterprise OS sekarang evidence-traceable (seluruh keputusan arsitektur dapat ditelusuri ke bukti empiris di praktek). | ≥ 5 perubahan arsitektur + cold trace 90% match verdict |
| H2 | Decision Object dapat SELALU ditelusuri kembali ke bukti empiris TANPA penjelasan lisan. | Frontier-D STRICT: ≥3 auditor verdicts SAMA PERSIS vs Decision Object asli (RO2 ≥ 90%) |
| H3 | Governance EOS stabil (engineer baru + auditor luar DAPAT MENGGUNAKAN tanpa meminta perubahan aturan selama ≥3 siklus). | ≥3 engineer berbeda × ≥3 milestone berturut-turut TIDAK ADA usulan perubahan PASAL |
| H4 | PASAL 8 (GB >> GC) secara KONSISTEN menghasilkan manfaat bersih positif untuk SETIAP aturan governance. | Ukur EMPIRIS GB_ACTUAL vs GC_ACTUAL nyata: rasio ≥ 1.5 selama ≥3 siklus untuk setiap PASAL 1-8 |
| H5 | Pemisahan Obs/Meas/Int/Dec secara MEKANIS benar-benar mengurangi confirmation bias dan narrative rewriting. | ≥2 eksperimen: inter-rater reliability 3 engineer interpretation: agreement lebih tinggi + % post-hoc revisi turun ≥30% |
| H6 | Rule of Five + PASAL 8.A Natural Shrinkage benar-benar MENGURANGI cognitive load engineer baru onboarding. | ≥3 engineer baru: waktu jawab 10 pertanyaan ≥25% lebih cepat + akurasi ≥85% dibanding industry average EA framework |

Cross-reference lengkap H1-H6 definisi formal + justification: [EVIDENCE.md Bagian 2 Tabel H1-H6](file:///root/Enterprise-OS/EVIDENCE.md#L727-L741)

---

## ❄️❄️❄️ **GLOBAL METHODOLOGY FREEZE LOCK (ACTIVE — EJ-DIRECTIVE-FREEZE-20260728-001)** ❄️❄️❄️

**EFFECTIVE IMMEDIATELY (2026-07-28 Post-Kalibrasi 11 User Directive — Registered Reports Principle, Nature Scientific Reports):**

| Komponen Freeze | Status Saat Ini | Exit Criteria Unlock |
|---|---|---|
| **KALIBRASI BARU (Kalibrasi 12 / K13 / dll)** | 🔒 **LOCKED — DILARANG** | **TIDAK BOLEH** sampai: B1 Step 1 Report Alpha.13 SHA (✅) + B2 Step 2 Replikasi Capability Kedua (✅) + B3 Step 3 Frontier-D RO1-RO6 TERPENUHI (✅). Ketiganya 100% SHA evidence terisi. |
| **PASAL / GATE / TERMINOLOGY BARU** | 🔒 **LOCKED — DILARANG** | Sama di atas + bukti ≥2 INCONCLUSIVE berturut-turut menunjukkan aturan rusak MATERIAL (bukan cuma opini). |
| **Status H1-H6 Update** | ✅ **HANYA boleh via EVIDENCE APPEND (Permanent Rule)** | HANYA format `EJ-H1-H6-STATUS-YYYYMMDD-NNN` dengan SHA-linked evidence, NO in-place edit kalibrasi entry. |
| **Fokus Engineer Saat Ini** | 🧑‍💻 **100% SOFTWARE EKSEKUSI SAJA** | (1) B1 Report SHA256 Alpha.13 Step 0-4 → (2) B2 Replikasi Alpha.14 → (3) B3 Frontier-D Cold → (4) APPEND Status Tracker entries. **100% TIDAK ADA desain metodologi baru.** |

---

### ⚠️ **REGISTERED REPORTS EPISTEMIC BOUNDARY NOTICE (HONESTY v3 CRITICAL — Nature Author Guidelines)**

| Batas Epistemik | Status Saat Ini | Penjelasan Formal + Registered Reports Principle |
|---|---|---|
| **FREEZE ≠ VALIDASI DESAIN** | 🔴 **WAJIB DIHORMATI — DILARANG MENCAMPUR ADUKAN** | ✅ **BISA:** "Freeze = anti-perubahan-prematur (anti p-HACKING / HARKing) sesuai Registered Reports Stage 1 → Stage 2 boundary." ❌ **DILARANG KERAS:** Semua klaim implisit / eksplisit "freeze bukti protokol BENAR / VALID / TERUJI / OPTIMAL / PASTI JALAN". Freeze = mekanisme anti-bias, BUKAN pengakuan substansial. Validitas = HANYA setelah B1+B2+B3 data ADA. |
| **Perubahan Metodologi Masa Depan = RR-PROTOCOL-REVISION** | 🧊 **Format SHA-linked 4 Field Wajib SAJA** | ❌ **BUKAN** = "Kalibrasi 12" (nama kalibrasi = tahap SEBELUM data, sudah ditutup B1+B2+B3 exit criteria). ✅ **HANYA FORMAT:** `EJ-RR-PROTOCOL-REVISION-YYYYMMDD-NNN` tipe `protocol_revision`. **4 FIELD WAJIB** (Nature Registered Reports: Deviasi protokol WAJIB dijelaskan eksplisit + dibenarkan): (1) **deviasi_reason** = alasan SHA-verifiable, BUKAN opini; (2) **evidence_sha** = SHA256 artefak bukti; (3) **scope_affected** = EXHAUSTIF tabel mana berubah (TIDAK BOLEH diam-diam scope creep); (4) **risk_of_change** = LOW/MEDIUM/HIGH + mitigasi anti-Type-I-error. |

> **Source of Truth definisi formal + Table Status Proyek 6 Area User-Verified:** [EVIDENCE.md EJ-FREEZE-EPISTEMIC-VALIDATION-20260728-001](file:///root/Enterprise-OS/EVIDENCE.md#L1184-L1268)

---

> **PERINGATAN KONSTITUSIONAL:** Setiap pelanggaran FREEZE ini = **Violasi PASAL 1 Supremasi Bukti (ΔDesain tanpa ΔEvidence) + PASAL 3 Immutable Record + PASAL 6.A Traceability (tanpa SHA chain).** Jangan lakukan. Kalau ada ide peningkatan metodologi, catat di friction log sebagai TODO, tapi JANGAN diimplementasikan sampai B1+B2+B3 exit criteria TERPENUHI 100%.

> **Ringkasan User Directive (Nature Registered Reports Principle):** Setelah hipotesis, variabel, kriteria keberhasilan, falsifikasi, status lifecycle sudah dipra-registrasi (Kalibrasi 9–11), **nilai tambah marginal kalibrasi baru turun sangat tajam.** Fokus = menjalankan protokol & evaluasi hasil, BUKAN terus menyempurnakan spesifikasi sebelum data tersedia.

> **User Directive EKSPLISIT (kutip):**
> > *"Saya tidak akan mengusulkan Kalibrasi 12 kecuali muncul bukti empiris yang menunjukkan kelemahan pada protokol saat ini."*
> >
> > *"EOS kini tampaknya memiliki spesifikasi eksperimen yang jauh lebih lengkap sehingga manfaat yang diklaim dapat diuji secara sistematis, bukan hanya didiskusikan."*

**Link bukti formal directive source APPEND-ONLY:** [EVIDENCE.md EJ-DIRECTIVE-FREEZE-20260728-001](file:///root/Enterprise-OS/EVIDENCE.md#L1121-L1180)

---

# CURRENT PHASE: Phase C — Scientific Validation + Operational Learning

```
EOS Development Phase
    ✅ COMPLETE (Governance Desain Stabil — 11 Kalibrasi)

EOS Scientific Pre-Registration Program
    ✅ COMPLETE (Kalibrasi 10: 6 Hipotesis H1-H6 formalized sebagai
                   pre-registration contract 5 komponen ilmiah)

EOS Hypothesis Status Tracking & Sample Distinction
    ✅ COMPLETE (Kalibrasi 11: Min Operational vs Scientific Confidence
                   + 5 State Terminology Lock Anti Premature-Claim
                   + H1-H6 Status Tracker 4 Metadata Field)

EOS Validation Phase
    🧪 ACTIVE

Experiment #1:
EXP-001-lawyershub (Step 1: Measurement Report pertama SHA256)
    START (Eksekusi Sekarang)

Urutan Prioritas Global (Kalibrasi 10 User Directive):
  Step 1 [Tertinggi] → Report Pertama (B1)
  Step 2 [Baru Urutan] → Replikasi Capability Kedua (B2')
  Step 3 → Frontier-D STRICT Cold Trace (B3)
  Step 4 [Paling Low] → Multi-Siklus Evaluasi Final H1-H6 (B4)
```

---

## 🧪 H1-H6 HYPOTHESIS STATUS TRACKER (INDEX VISIBILITAS EKSEKUSI)

⚠️ **Source of Truth = [EVIDENCE.md Kalibrasi 11 Table Utama](file:///root/Enterprise-OS/EVIDENCE.md#L1080-L1089).** Tabel di bawah ini = VISIBILITAS untuk tim eksekusi agar tahu data apa yang kurang. Update status TIDAK di sini (APPEND-ONLY Evidence Rule).

⚠️ **TERMINOLOGY LOCK:** HANYA 5 state label = NOT TESTED / RUNNING / PROVISIONAL PASS / STRONG CONFIRMED / REJECTED. Kata "terbukti" HANYA BOLEH setelah STRONG CONFIRMED (DILARANG KERAS selain itu).

| H ID | Status (⭐ 5 State) | Evidence Count | Next Required Evidence | Mapping Step Prioritas |
|---|---|---|---|---|
| **H1** | **RUNNING** | 2 | Tambah 3 keputusan/pertumbuhan arsitektur lagi (total ≥5) selama 2 milestone berbeda → hitung % chain utuh ≥90%. REPEAT-2 purification selesai = chain evidence bertambah. | Step 1 (REPEAT-2 Selesai → count 3) |
| **H2** | NOT TESTED | 2 | B1 (Report pertama SHA SUDAH ADA ✅ count 1) + B2 Replikasi Cap Kedua (Legal-Document Step 0-6) → Lalu B3 Frontier-D Strict Cold-Trace N≥3 auditor. | Step 2 (Replikasi Cap 2) |
| **H3** | NOT TESTED | 2 | B4: Alpha.14 milestone selesai (transisi 13→14) minimal 1 engineer BARU onboarding generate DEC + Report mandiri. | Step 4 (Longest) |
| **H4** | NOT TESTED | 2 | B4: Mulai structured time-log GC_actual / GB_actual 10+ aturan governance selama Alpha.14 (2 minggu window N≥3 engineer independent). | Step 4 (Parallel Alpha.14) |
| **H5** | **RUNNING** | 2 | Group A (Alpha.13 base+repeat1 Invarian 2 ON) data sensitivity lengkap count 2. Butuh Group B (Alpha.14 cap kedua DENGAN Invarian 2 SENGAJA DINONAKTIFKAN) → 2 kelompok counter-balanced data ada → IRR Kappa N≥3 raters. | Step 1 (REPEAT-2 OK) + Step 2 (Alpha.14 Group B) |
| **H6** | NOT TESTED | 2 | B1 + B2 Step 2 selesai (minimal 2 capability × 2 surface × minimal 2 contoh report DEC) → onboarding quiz N≥3 engineer BARU (tidak pernah ikut desain EOS). | Step 3 (Parallel B3 bisa jalan bersama) |

Full Definisi Metadata + Update APPEND-ONLY Rules: [EVIDENCE.md Kalibrasi 11 Bagian 3](file:///root/Enterprise-OS/EVIDENCE.md#L1065-L1100). Full Tabel Distinction Min Operational Sample vs Scientific Confidence: [EVIDENCE.md Kalibrasi 11 Bagian 1](file:///root/Enterprise-OS/EVIDENCE.md#L1028-L1039). Full 5 State Terminology Rule: [EVIDENCE.md Kalibrasi 11 Bagian 2](file:///root/Enterprise-OS/EVIDENCE.md#L1043-L1062). Update count/status terbaru via Entry APPEND Batch #1: EJ-H1-H6-STATUS-20260729-001 dan Batch #2: EJ-H1-H6-STATUS-20260729-002 di EVIDENCE.md.

---

## 🎯 NEXT ACTION ITEM (EKSEKUSI SEKARANG)

**PRIORITAS TERTINGGI — ONLY ONE FOCUS — TIDAK BOLEH DIALIHKAN:**

> **Jalankan FPI Purification Batch-01 (REPEAT-2) pada foundation packages/core/ lalu hasilkan Measurement Report REPEAT-2 dengan SHA256 Identifier byte-by-byte verifiable.**
>
> Lokasi artefak preparasi 16+ locus impurity: `build/evidence/experiments/alpha13/fpi-purification-batch01-loci.yaml`
>
> Lokasi tujuan output report: `build/evidence/experiments/alpha13/measurement-report-alpha13-case-management-repeat2.yaml`
>
> 3 Invarian Mekanis WAJIB LULUS 100% sebelum report dinyatakan valid:
> 1. ✅ Invarian 1 — Single Source of Truth SHA match (hash deterministik).
> 2. ✅ Invarian 2 — Vocab interpretasi 17 kata TIDAK ada di Section 3 Observation dan Section 4 Measurement (dapat dicegah dengan `grep`).
> 3. ✅ Invarian 3 — Jika verdict = INCONCLUSIVE, 4 field wajib (trigger_pass, trigger_fail, evidence_missing, next_experiment) TERISI 100% LENGKAP, TIDAK BOLEH ada parkir permanen.
> 4. ✅ **Invarian Epistemik Baru (Pola 3-Bagian):** Section 5 Interpretation WAJIB memiliki 3 sub-section: `### Verified Facts` (hanya SHA + hasil script literal 0 interpretasi), `### Execution Claims` (semua kalimat interpretasi DIAWALI prefix `[Execution Claim]`), dan `### Open Questions` (cross-reference ke trigger_to_pass Invarian 3). Source: [EJ-GUARDRAIL-EPISTEMIC-20260729-001 Guardrail #1](file:///root/Enterprise-OS/EVIDENCE.md#L1813-L1831). ⚠️ FREEZE COMPLIANCE: ini = SUB-SECTION di DALAM BAGIAN 5 SAJA, BUKAN perubahan struktur identity 6 Bagian (nama BAGIAN 1-6 TETAP IDENTIK).

**Regression Wajib SEBELUM measurement REPEAT-2:**
- SHA folder `capabilities/legal-case/implementation/` IDENTIK byte-for-byte (0 bytes divergence allowed, sudah 0×3 berturut → WAJIB tetap 0).
- Public API capability legal-case 5 endpoint: GET list/GET detail/POST create/PATCH assign/DELETE close = 5/5 functional 200 OK.

Exit Criteria untuk menutup REPEAT-2 dan masuk Step 2 (Alpha.14 Replikasi Capability Kedua Legal-Document):
- Report SHA256 REPEAT-2 tersedia.
- FPI composite actual ≥ 0.95 (G0.7 threshold tercapai) → Gate 0 verdict PASS (bukan lagi INCONCLUSIVE).
- 7 criteria Gate 0 lain TETAP di atas threshold (tidak ada regresi).
- Decision Object DEC-Alpha13-Gate0-REPEAT2 SHA-linked ke report SHA256.
- **Impact H1-H6 Status Tracker:** Bukti REPEAT-2 = Evidence Count +1 SELURUH H1-H6 (menjadi 3 per H), dan H1/H5 RUNNING count +1.

---

## Phase C Roadmap (Scientific Validation Program)

### Phase C.1 — LawyersHub Baseline
**Target:**
- Vertical slice berjalan
- Evidence collection aktif

**Output:**
- First Decision Dataset

---

### Phase C.2 — Evidence Accumulation
**Target:**
- 50-100 Decision Objects

**Output:**
- Pattern confidence meningkat

---

### Phase C.3 — Services-ID Validation
**Target:**
Menguji:
- Validated capability reuse

Dibanding:
- New implementation

---

### Phase C.4 — Economic Evaluation
**Mengukur:**
Engineering Leverage Ratio:
```
ELR v2.0 = Value Generated / Extraction + Maintenance Cost
```

---

## Experiment Registry (EXP-001 Domain Transfer)

Experiment Registry resmi: [experiment-registry.yaml](file:///root/Enterprise-OS/experiments/experiment-registry.yaml)

Details EXP-001: [experiments/EXP-001-lawyershub/](file:///root/Enterprise-OS/experiments/EXP-001-lawyershub/)

### Core Hypothesis (Hipotesis Ilmiah EXP-001)
> Evidence-driven extraction produces higher engineering leverage than speculative capability design.

### EXP-001 Execution Pipeline
```text
LawyersHub
    ↓
Build (No Premature Extraction)
    ↓
Collect Baseline Evidence
    ↓
Identify Patterns
    ↓
Validated Pattern + Economic Justification
    ↓
Extraction Decision
    ↓
Extraction
    ↓
Build Services-ID (Reuse)
    ↓
Compare Metrics to Baseline
```

---

# 4 FRONTIER ILMIAH TERKUNCI (STRATEGIC ROADMAP)

Urutan pengerjaan TIDAK BOLEH menyimpang tanpa bukti empiris terlebih dahulu:

```
Frontier C (Falsification, bisa sekarang)
    ↓
Frontier A (Independence Multi-Host, butuh 3 host fisik)
    ↓
Frontier B (Domain Transfer LawyersHub EXP-001, butuh data domain riil)
    ↓
Frontier D (External Auditor, butuh personil independen)
```

---

## FRONTIER A — INDEPENDENCE (Lintas Host & Repository FISIK)

**Tujuan:** Replikasi lintas host fisik BENAR-BENAR independen, bukan hanya multi-process pada host yang sama. (Menutup Honesty Boundary Alpha.11 #1.)

**Desired state sebelum dinyatakan COMPLETE:**
  - 3 clone repository (A / snapshot B / C) = fisik berbeda (filesystem berbeda / mount-point berbeda).
  - 3 host OS setidaknya 2 family berbeda (Ubuntu + Windows + Mac / Linux distro berbeda + Docker image berbeda Node.js major version berbeda).
  - `distinctExecutorIdentities` = 3 distinct host fingerprints berbeda fisik divergen.
  - ≥ 3 definition groups `replicated-strong` dengan `content-fp convergence ≥ 0.90` lintas ketiga host.

**Status per 2026-07-28:** 0% — BELUM dimulai. Butuh environment 3 host distinct fisik.

---

## FRONTIER B — DOMAIN TRANSFER (LawyersHub EXP-001)

**Tujuan:** Membuktikan bahwa model provenance BUKAN hanya self-referential. Framework harus sanggup mengukur realitas EKSTERNAL di luar framework sendiri.

**Desired state COMPLETE:**
  - EXP-001 (produk hukum LawyersHub riil: dokumen / contract / entities) masuk pipeline.
  - ≥ 10 observation riil (bukan observation synthetic framework).
  - Provenance graph identity stability 100% terjaga saat data hukum digabung dengan data framework.
  - 5 definition groups `replicated-strong` empiris (distinctExecutor ≥ 2, convergence ≥ 0.95).

**Status per 2026-07-28:** 0% — BELUM dimulai. Butuh data observation domain hukum riil.

---

## FRONTIER C — FALSIFICATION (Uji Coba Pemalsuan Bukti)

**Tujuan:** Membuktikan sistem TIDAK self-confirming. Sistem harus TAHAN terhadap percobaan sengaja memalsukan bukti.

**Minimal battery tests WAJIB lolos:**
 1. Satu byte diubah pada `observation.content` string → identity observation BERUBAH (≠ before) → provenance chain FAIL.
 2. Claim dengan nol evidence edges → consensus FAIL / status FAIL.
 3. Execution exitCode diubah 0 → != actual → recorded execution status TIDAK lolos provenance valid.
 4. Simulasi hash collision (2 obs buatan dengan id sama tapi isi berbeda) → sistem mendeteksi mismatch.
 5. ReplicationGroup di-claim `replicated-strong` tapi `content-fp` TIDAK converge → status TIDAK diijinkan di-override.

Frontier ini TIDAK BOLEH dilewati. Pengerjaan minimal menyelesaikan 3 dari 5 test C.

---

### Alpha.12 Frontier C — Progress Partial Completed

Tanggal eksekusi laporan: actual runtime execution (Konstitusi Pasal 2 Caveat Auditor berlaku — ini adalah self-certified execution report, BUKAN audit independen).

**File Test Suite:** [selftest.alpha12-falsification.ts](file:///root/Enterprise-OS/workspace/packages/composition/selftest.alpha12-falsification.ts)

Perintah reproduksi:
```bash
cd workspace/packages/composition
npx tsx selftest.alpha12-falsification.ts
```

---

### Battery 6 Test Falsification — 6/6 PASS (Actual Execution)

| ID | Test (Percobaan PEMALSUKAN) | Ekspektasi (hasil jika sistem anti-palsu) | Actual | Status |
|----|------------------------------|------------------------------------------|--------|--------|
| 12C.1 | 1-byte mutation pada `observation.content` string | Identity SHA observation HARUS BERUBAH. Content-fp juga berubah. | idChanged=true fpChanged=true | **PASS** |
| 12C.2 | Claim dengan `evidenceIds=[]` (nol evidence edges) | Consensus strength TIDAK BOLEH strong/moderate/weak → HARUS `inconclusive` (fail closed) | strength=inconclusive totalWeight<minW | **PASS** |
| 12C.3 | Mutasi 4 frozen identity fields Pasal 3 (index0, semanticOutcome, sourceChannel, observedAt). Plus: observedAt ubah test content-fp | SEMUA 4 ubah → identity SHA HARUS BERUBAH. Tambahan: ubah `observedAt` → content-fp TIDAK BERUBAH (fp = makna, tanpa timestamp). | 4/4 idBreak=true. fpChange(observedAt)=false | **PASS** |
| 12C.4 | Hardcode id PALSU ke field RawObservationIdentity.id | `verifyRawObservationIdentity()` WAJIB mengembalikan `ok=false`, mendeteksi mismatch. | ok=false — recomputedId vs expected forged | **PASS** |
| 12C.5 | Deliberate divergence: 60 observations di-inject HANYA ke run-B (run-A normal). Target group = EXD dengan execution injection | Target group TIDAK BOLEH `replicated-strong` DAN convergence < 0.95. Group LAIN (tanpa injection) BOLEH strong. | targetStatus=`replication-failed` convergence=**0.1667** (dropped dr 1.0). 3 group lain tetap strong. | **PASS** |
| 12C.6 | 2 observation synthetic berbeda payload & semantic outcome | Identity SHA-256 TIDAK boleh collision (idA != idB). Content-fp juga berbeda. | idA != idB → BERBEDA. | **PASS** |

**Verdict:** 6/6 PASS — 0 FAIL. (≥ 4.5 / 5 battery test resmi selesai. Melebihi target minimum 3/5.)

---

### Kenaikan Status Epistemik Frontier C (Alpha.12)

| Komponen | Status Sebelum (Roadmap) | Status Sesudah (Alpha.12 C Battery) | Bukti |
|----------|---------------------------|-------------------------------------|-------|
| Frontier C: 1-byte mutation breaks identity | Roadmap pending | **PARTIAL COMPLETE** — identity breakages + forged identity detection (12C.1/4/3) DONE | selftest PASS |
| Frontier C: claim tanpa edges = fail closed | Roadmap pending | **PARTIAL COMPLETE** — test 12C.2 inconclusive closed | selftest PASS |
| Frontier C: execution exitCode tamper (battery point 3) | Roadmap pending | **SKIPPED / TIDAK DIUJI** — API internal coupling kompleks. Diverifikasi INDIREK melalui semanticOutcome frozen (12C.3). Rencana: sub-batch C berikutnya setelah API refactor. | Honesty boundary dicatat |
| Frontier C: hash collision simulation (battery point 4) | Roadmap pending | **COMPLETE** — 12C.6 DONE. Distinct payloads have distinct ids. No collision detected. | selftest PASS |
| Frontier C: claim replicated-strong tapi fp tidak converge (battery point 5) | Roadmap pending | **COMPLETE** — 12C.5 DONE. 60 divergent obs injected → status group `replication-failed`, convergence turun ke 0.1667. | selftest PASS |

---

### Honesty Boundary Alpha.12 C (Partial)

1. Point execution exitCode tamper (battery point 3) BELUM diuji direct API. Status: partial pass.
2. Seluruh test tetap dijalankan 1 host, 1 repo, 1 process → Frontier A (independence multi-host) BELUM menyentuh hasil ini.
3. Semua laporan ini tetap self-certified execution report (Konstitusi Pasal 2). BELUM ada auditor independen (Frontier D).

---

## FRONTIER D — EXTERNAL AUDITOR (Milestone Independensi Tertinggi)

**Tujuan:** Auditor pihak luar tanpa komunikasi dengan pengembang.

**Desired state COMPLETE:**
  - Auditor independen (bukan kontributor, commit author identity tidak punya write access repo).
  - Clone repository dari public.
  - Jalankan reproducibility bundle v2 / v3 TANPA komunikasi dengan pengembang.
  - Reproduce sendiri registry snapshot dan menghasilkan SHA content fingerprints registry yang IDENTICAL dengan yang dilaporkan developer.
  - Report hasil secara publik.

HANYA setelah Frontier D complete, status epistemik seluruh ReplicationGroup bisa dinyatakan "independently reproduced."

**Status per 2026-07-28:** 0% — BELUM dimulai. Butuh personil independen.

---

## Reproduksi Pipeline Bukti (3-Step Auditor)

```bash
cd workspace/packages/composition
# 1. Alpha.10 baseline (backward identity scaffold frozen)
npx tsx selftest.alpha10-scaffold.ts          # 7/7 PASS
# 2. Alpha.11 multi-executor empirical replication
npx tsx selftest.alpha11.ts                    # 8/8 PASS
# 3. Alpha.12 Frontier C falsification
npx tsx selftest.alpha12-falsification.ts      # 6/6 PASS

# Auditor cold-start 3-process (Konstitusi Pasal 2 step 1-5)
cd build/evidence/reproducibility-bundle-v2
./auditor-multi-executor-reproduce-alpha11.sh
```

---

# ALPHA.13 — ROADMAP RESMI MILSTONE BERIKUTNYA: SINGLE-CAPABILITY DUAL-SURFACE GATE 0 MEASUREMENT

Prioritas TERTINGGI. Satu objective sempit tapi bernilai tinggi — measurement saintifik, bukan pembuktian.

---

## Prinsip Panduan Alpha.13 (Framing Saintifik Anti-Confirmation Bias)

### Alur Ilmiah Resmi Alpha.13 (Evidentiary Flow yang Benar)
⚠️ Alpha.13 TIDAK menggunakan framing "Hipotesis → Pembuktian". Alpha.13 menggunakan alur SAINTIFIK STANDAR dengan **Measurement sebagai Artefak Primer** (Gate Verdict = HANYA interpretasi turunan, BUKAN output utama):

```
Observation (fakta primer: file list, SHA values, code diffs — tanpa interpretasi)
    ↓
Evidence (strukturasi Observation ke dalam EvidencePackage — masih non-interpretatif)
    ↓
Measurement (perhitungan kuantitatif: SHA_equal? CPI_level? FPI_value? EDCR_%? — OBJECTIF byte-by-byte)
    ↓
Interpretation (klasifikasi: apa arti measurement ini? TERMASUK Gate Verdict PASS/FAIL/INCONCLUSIVE — SUBJEKTIF tapi evidence-based)
    ↓
Decision (langkah apa selanjutnya: Proceed / Refactor / Repeat — berdasarkan interpretation)
    ↓
Architecture (PERUBAHAN ARSITEKTUR HANYA BOLEH TERJADI SETELAH decision ini tercatat — PASAL 6 Cascade Flow)
```

⚠️ **KRITIS: Gate Verdict BUKAN artefak primer.** "Gate 0 PASS" hanyalah SATU FIELD di dalam bagian Interpretation dari Measurement Report. Artefak primer Alpha.13 adalah **Measurement Report Lengkap 6 Bagian** (lihat Step 6). Jika Measurement Report lengkap dan dapat diaudit, meskipun Gate Verdict = FAIL atau INCONCLUSIVE → eksperimen Alpha.13 TETAP SUKSES secara saintifik (Falsification Equivalence Principle di EVIDENCE.md). Kita TIDAK dipengaruhi confirmation bias untuk memaksakan Gate = PASS.

Artefak primer yang harus direproduksi auditor (PASAL 2) adalah **seluruh Measurement Report**, bukan hanya field Gate Verdict.

---

**Measurement Objective (SATU SAJA target, jangan tambah yang lain dulu):**
> **Mengukur** Gate 0 secara EMPIRIS pada SATU capability nyata.
> Kita BELUM TAHU hasilnya (bisa PASS / FAIL / INCONCLUSIVE) — dan itu OK.
> Capability kandidat: **Case Management (id: legal-case)**

**Alpha.13 TIDAK AKAN (❌):**
- Mereorganisasi struktur folder repositori (Frozen Principle #6 Evidence-Driven Reorg)
- Menambah capability BARU lain selain measurement untuk legal-case
- Membuat Experience Composition Layer "universal" secara penuh (masih prematur)
- Membuat claim leverage platform-wide (baru 1 capability measurement)
- MELAKUKAN HACKY FIX untuk memaksa Gate 0 PASS meskipun SHA fingerprint berubah. **Jika SHA berubah = itu adalah measurement result yang sah, jangan dipaksa.**

**Alpha.13 AKAN (✅):**
- **Mengukur** apakah capability legal-case dapat dikonsumsi oleh 2 experience surface BERBEDA JENIS (Workspace UI + REST API) TANPA PERUBAHAN SATU PUN pada folder `capabilities/legal-case/implementation/` — dengan membandingkan SHA fingerprint sebelum vs sesudah.
- Menghasilkan bukti SHA256 fingerprint reproducible
- Mengukur CPI, FPI, EDCR, MEC, CIEC secara aktual
- Menghasilkan Decision Object resmi terkait "apa hasil measurement Gate 0 untuk 1 capability ini (PASS/FAIL/INCONCLUSIVE), apa yang kita pelajari"
- Jika perlu, melakukan Contract Fix Step 0 (ubah type experience jadi optional, relax registry validator — TANPA reorganisasi folder). Step 0 INCLUDED dalam measurement scope KASUS D (perubahan kernel bukan capability).

---

## Surface Combination Dipilih untuk Alpha.13

| Consumer #1 | Consumer #2 | Alasan | Status |
|-------------|-------------|--------|--------|
| Workspace UI (taxonomy: workspace-ui) | HTTP REST API (taxonomy: rest-api) | Keduanya menggunakan domain Case Management yang sama. UI sudah ada di LawyersHub app. API dibuat minimal 3 endpoint (list/case, get/case/:id, create/case). | **PILIHAN UTAMA Alpha.13** |

Cadangan jika kombinasi utama terlalu sulit:
- Consumer #1 = Workspace UI, Consumer #2 = CLI Command (`node cli.js case list`, `node cli.js case get --id 1`)

---

## Step-by-Step Measurement Protocol Alpha.13

Protocol ini WAJIB diikuti urutannya. Tidak ada step yang boleh dilewati.
Setiap step menghasilkan artefak YAML/JSON yang hash-nya dapat diaudit.

---

### Step 0 — Baseline Contract Fix (Phase 1 pada Gap Analysis)

Sebelum menambah consumer BARU, perbaiki kontrak kernel agar Gate 0 G0.6 + G0.7 punya kesempatan PASS.

Perubahan ini TIDAK mengubah file di capability folder (legal-case), hanya mengubah foundation layer contract.

0.1 **File:** [types.ts](file:///root/Enterprise-OS/workspace/packages/core/kernel/src/types.ts)
    - Ubah: `readonly experience: CapabilityExperienceDescriptor;`
    - Jadi: `readonly experience?: CapabilityExperienceDescriptor;`
    - Alasan: Kontrak harus mengijinkan capability PURE tanpa experience field sama sekali.

0.2 **File:** [schemas.ts](file:///root/Enterprise-OS/workspace/packages/core/kernel/src/schemas.ts)
    - Ubah `CapabilityManifestSchema.experience`:
      Saat ini: `experience: z.object({ component: z.string().min(1,...) })`
      Jadi: `experience: z.object({ component: z.string().min(1,...) }).optional()`
    - Alasan: Manifest harus menerima capability pure-domain tanpa experience component.

0.3 **File:** [registry.ts](file:///root/Enterprise-OS/workspace/packages/core/capability-registry/src/registry.ts)
    - Ubah logic pada method `validate()` (baris sekitar 60-71):
      Saat ini: ERROR jika experience tidak ada / view bukan function.
      Jadi: HANYA validasi JIKA experience TERSEDIA. Jika experience undefined → SKIP, tidak error.
    - Alasan: Registry harus menerima capability pure-domain.

0.4 **Decision Object Wajib (DEC-007 / next available id):**
    - Tipe: architecture
    - Justifikasi: "Perubahan kontrak kernel diperlukan untuk membuka kesempatan capability pure domain lulus Gate 0. Bukti: audit G0.6 menunjukkan type saat ini mandatory sehingga 0% capability bisa mencapai CPI Level 3."
    - Expected outcome: FPI meningkat. (G0.7 tidak otomatis, tapi G0.6 menjadi lebih possible.)
    - Risk: Backward compatibility dengan capability saat ini (sudah memiliki experience field) → diuji: mereka masih punya field, jadi tetap work.

Validasi Step 0 SEBELUM lanjut:
```bash
cd workspace
cd packages/core/kernel && npx tsc --noEmit          # type check pass
cd ../capability-registry && npx tsc --noEmit        # type check pass
pnpm lint && pnpm typecheck                           # project-wide pass
```

---

### Step 1 — Record Baseline SHA Fingerprint Capability

1.1 Hitung SHA256 recursive untuk seluruh isi folder:
```
capabilities/legal-case/implementation/
```
Simpan sebagai artefak reproducible:
```
build/evidence/alpha13/baseline-sha-legal-case-implementation.yaml
fields:
  capabilityId: legal-case
  baselineCommit: <commit id saat ini>
  folder: capabilities/legal-case/implementation
  recursiveSha256: <computed hash>
  fileList:
    - path: implementation/contracts/case.contracts.ts
      sha256: ...
    - path: implementation/commands/case.commands.ts
      sha256: ...
    (daftar SEMUA file dan hash masing-masing)
  generatedAt: ISO timestamp
  generator: alpha13-sha-scan
```

---

### Step 2 — Consumer Pertama: Workspace UI (Existing)

2.1 Identifikasi file dan baris kode LawyersHub app yang menggunakan capability `legal-case` melalui Surface Workspace UI.
2.2 Verifikasi: setiap call ke Case Management masuk melalui commands/queries/repositories PUBLIC capability (bukan import private file).
2.3 Simpan bukti:
```
build/evidence/alpha13/consumer-1-workspace-ui-evidence.yaml
fields:
  consumerId: lawyershub-workspace-ui
  taxonomy: workspace-ui
  usedCapabilityCommands:
    - case.create
    - case.list
    - case.getById
  usedCapabilityQueries:
    - case.search
  entryFileReferences:
    - path: apps/lawyershub/src/.../case-workspace.tsx
      lines: [22, 45, 78]
  capabilityImportPathUsed: "@repo/capabilities/legal-case" (atau path actual)
  baselineCommit: <sama dengan step 1>
```

---

### Step 3 — Consumer Kedua: REST API (BARU, dibuat di Alpha.13)

⚠️ **ATURAN PENTING (Frozen Principle #6 + PASAL 5):**
- Step 3 DILARANG mengubah SATU PUN file di dalam `capabilities/legal-case/implementation/`.
- Jika ada kebutuhan yang membuat kita ingin mengubah file di implementation/, berarti:
  (a) capability tersebut BELUM independen (Gate 0 otomatis FAIL untuk saat ini), ATAU
  (b) wrapper/translation harus dibuat DI SISI API CONSUMER, bukan di capability.
- Yang BOLEH diubah: `apps/lawyershub/pages/api/**` (nextjs api route), atau buat `apps/lawyershub/api/*` — file-file ini DI LUAR capability folder.

3.1 Buat minimal 3 HTTP endpoint REST API untuk Case Management:
```
GET    /api/cases               → list cases, gunakan capability query case.list
GET    /api/cases/:id           → get detail case, gunakan capability query case.getById
POST   /api/cases               → create case, gunakan capability command case.create
```
3.2 Semua endpoint HANYA meneruskan request ke capability public API (commands/queries).
3.3 Response JSON berisi data yang dikembalikan oleh capability, ditambah HTTP status code.
3.4 TIDAK BOLEH ada business logic / validation logic / default value BARU di dalam route API. Semua itu harus sudah ada di dalam capability implementation (jika tidak ada, G0.1 FAIL = temuan bagus, JANGAN dipaksa pass).

---

### Step 4 — SHA Fingerprint Verification (PUNCAK Alpha.13)

Ini adalah langkah KRITIS yang menentukan apakah Gate 0 G0.1 EMPIRIS PASS.

4.1 HITUNG KEMBALI SHA256 recursive dari folder yang SAMA:
```
capabilities/legal-case/implementation/
```
DENGAN CATATAN: Seluruh step 2-3 SELESAI, code untuk API consumer BARU sudah commit-ready, TAPI — pastikan tidak ada file di dalam `implementation/` yang tersentuh.

4.2 BANDINGKAN:
```
SHA_after  = hash step 4.1
SHA_before = hash step 1.1
```

**4 Result Scenario (Dengan Falsification Equivalence Principle):**

| Kasus | SHA_before vs SHA_after | Interpretasi | Epistemic Status |
|-------|--------------------------|--------------|------------------|
| **KASUS A (IDEAL)** | IDENTIK (sama persis byte-by-byte) | ✅ Gate 0 G0.1 EMPIRIS PASS untuk legal-case | `independent-under-2-surface` — lanjut ke metric measurement |
| **KASUS B (PENUH PELAJARAN)** | BERBEDA (minimal 1 file hash berubah) | ❌ Gate 0 G0.1 FAIL. Capability legal-case TERBUKTI belum independent. | Honest status: `coupled-via-domain-change`. **JANGAN dipaksa fix.** Sebaliknya: catat FILE APA YANG BERUBAH, dan JELASKAN MENGAPA berubah. Itu adalah bukti EMPIRIS tentang coupling apa yang ada. BELAJAR dari sini. Ini BUKAN failure engineering. Ini adalah scientific evidence (lihat Falsification Equivalence Principle di EVIDENCE.md). |
| **KASUS C (HACKY FIX)** | Berbeda, tapi perubahan hanya "hapus comment" atau "prettier format" | Dianggap FAIL juga. SHA hash ketat. Bukti bahwa perubahan sekecil apapun masih harus menyentuh implementation folder = coupling. TAPI: catat jenis perubahan untuk perbaiki Phase berikutnya. | Honest status: `coupled-via-superficial-change`. |
| **KASUS D (STRUCTURAL)** | Berbeda karena Contract Fix Step 0 mengubah file kernel, BUKAN file capability/implementation. Maka capability SHA = tetap sama dengan baseline. | **VALID.** Perubahan kernel di luar lingkup scan. Dihitung PASS. | `independent-under-2-surface-after-contract-fix` — lanjut ke metric measurement. |

---

### Step 5 — Measurement Metric Aktual

Jika KASUS A / D tercapai:

5.1 **Multi-Experience Capability Count (MEC)**
MEC = 1 (legal-case lulus)

5.2 **Capability Purity Index (CPI)**
Lakukan scan CPI pada 2 capability yang ada:
- legal-case: level apa?
- legal-document: level apa?
CPI = (score legal-case + score legal-document) / 2

5.3 **Foundation Purity Index (FPI)**
Lakukan scan symbol vocabulary dilarang di Foundation Layer.
Hitung FPI = pure / total declaration.

5.4 **EDCR (Experience-Driven Change Rate)**
Jika history commit < 30 → catat sebagai "sample size insufficient" dan estimasi conservative: EDCR = UKNOWN.
Tetapi: bukti SHA_before = SHA_after = EDCR pada capability legal-case selama Alpha.13 = 0%. (Tidak ada perubahan di implementation folder sama sekali.)

5.5 **CIEC (Capability-Independent Experience Change)**
CIEC minimal bisa dihitung: jumlah file baru di apps/lawyershub/api/* yang dibuat pada Step 3, tanpa mengubah capability. CIEC = N (N = jumlah file route API baru).

5.6 **Catat seluruh metric ke Evidence Registry** sebagai artefak reproducible, lalu append ke EVIDENCE.md.

---

### Step 6 — Measurement Report (ARTEFAK PRIMER) + Decision Object (Outcome Berdasarkan Measurement)

⚠️ **URUTAN PRIORITAS ARTEFAK ALPHA.13:**
1. **Measurement Report Lengkap 6 Bagian** → ARTEFAK PALING UTAMA (auditor reproduce ini dulu sesuai PASAL 2)
2. Decision Object → turunan / interpretation wrap
3. Gate Verdict (PASS/FAIL/INCONCLUSIVE) → HANYA 1 field di dalam Interpretation section Measurement Report

#### 6.1 Measurement Report (PRIMER) — WAJIB Format Resmi 6 Bagian:

Simpan sebagai artefak reproducible YAML/JSON di:
```
build/evidence/alpha13/alpha13-measurement-report.yaml
```

Format konten WAJIB:
```yaml
# ============================================================================
# ALPHA.13 — OFFICIAL MEASUREMENT REPORT (ARTEFAK PRIMER)
# Gate Verdict hanyalah interpretation di Bagian 5. BUKAN artefak utama.
# ============================================================================

# ---------------------------------------------------------------------------
# BAGIAN 1 — EXPERIMENT (identitas eksperimen, TANPA interpretasi)
# ---------------------------------------------------------------------------
experiment:
  id: EXP-ALPHA13-GATE0-SINGLECAP
  name: "Alpha.13: Single-Capability Dual-Surface Gate 0 Measurement"
  milestone: "Alpha.13"
  protocol_version: "measurement-framework-v1.0 (Kalibrasi Konstitusional Kelima)"
  hypothesis_reference: "Hipotesis berikutnya di Bagian 2"
  date_executed: <ISO timestamp commit final step 4>
  executor_identity: <run fingerprint — untuk Frontier A multi-host nanti>
  reproducibility_bundle_version: v3
  commit_id_measurement: <git SHA commit ketika report ini dihasilkan>

# ---------------------------------------------------------------------------
# BAGIAN 2 — HYPOTHESIS (yang diukur, bukan yang dibuktikan)
# ---------------------------------------------------------------------------
hypothesis:
  statement: >
    "Capability legal-case (domain Case Management) dapat dikonsumsi oleh 2
    Experience Surface BERBEDA JENIS (workspace-ui dan rest-api) TANPA
    SATU PUN perubahan byte pada folder capabilities/legal-case/implementation/."
  null_hypothesis: >
    "Ada minimal 1 byte perubahan pada capabilities/legal-case/implementation/
    ketika REST API surface ditambahkan sebagai consumer kedua."
  expected_observables:
    - sha_before == sha_after (KASUS A atau D)
    - EDCR_alpha13_window = 0%
    - consumer_taxonomy_distinct = TRUE (workspace-ui vs rest-api BUKAN se-jenis)

# ---------------------------------------------------------------------------
# BAGIAN 3 — OBSERVATION (fakta primer — NON-INTERPRETATIF, PASAL 3 L1 Immutable)
# ---------------------------------------------------------------------------
# ⚠️ INVARIAN 2 — PEMISAHAN MEKANIS OBSERVATION ≠ INTERPRETATION:
# BAGIAN 3 (dan BAGIAN 4 Measurement) TIDAK BOLEH mengandung KATA BERIKUT
# (case-insensitive grep):
#   reusable|coupled|berhasil|gagal|PASS|FAIL|INCONCLUSIVE|independent|
#   berguna|bagus|buruk|sukses|violates|melanggar|terbukti|tertolak
# Kata-kata di atas HANYA BOLEH muncul di BAGIAN 5 (Interpretation) dan
# BAGIAN 6 (Decision). Auditor PASAL 2 WAJIB menjalankan perintah grep di
# 6.1.A sebelum menyatakan report sah.
# ---------------------------------------------------------------------------
observation:
  # Semua entry di bagian ini HANYA dapat diverifikasi byte-by-byte oleh auditor
  # (fresh clone → reproduce → compare hash. PASAL 2 Auditor Caveat).
  # TIDAK ADA JUDGMENT. TIDAK ADA KESIMPULAN. HANYA FAKTA MENTAH DARI EKSEKUSI.
  baseline:
    sha_before: <recursive SHA256 step 1.1>
    sha_before_file_listing: <list file + hash masing-masing>
    consumer_surface_1:
      id: lawyershub-workspace-ui
      taxonomy: workspace-ui
      manifest: <sha isi manifest consumer 1 + command/query terpakai>
  post_consumer2:
    sha_after: <recursive SHA256 step 4.1>
    sha_after_file_listing: <list file + hash masing-masing>
    consumer_surface_2:
      id: lawyershub-rest-api
      taxonomy: rest-api
      manifest:
        - "GET /api/cases → case.list"
        - "GET /api/cases/:id → case.getById"
        - "POST /api/cases → case.create"
    diff_sha_before_vs_after:
      identical_byte_for_byte: <true | false>
      file_changed_in_implementation: <list file di implementation/ yang hash berubah, jika ada. KOSONG = KASUS A/D.>
      file_changed_outside_implementation: <list file di luar implementation/>
    contract_fix_step0_applied: <true | false>  # KASUS D marker
    contract_fix_step0_file_list: <list file kernel/registry/schemas yang diubah Step 0>
  raw_sample_size:
    commit_history_capability_window: <N commit terakhir pada legal-case, untuk EDCR>
    experience_change_count_without_capability_touch: <CIEC counter>

# ---------------------------------------------------------------------------
# BAGIAN 4 — MEASUREMENT (perhitungan kuantitatif OBJECTIF dari Observation)
# ---------------------------------------------------------------------------
# ⚠️ INVARIAN 2 BERLAKU JUGA DI SINI — BAGIAN 4 TIDAK BOLEH ADA VOCABULARY
# INTERPRETASI. Hanya angka, boolean, dan threshold yang definisinya ADA di
# ARCHITECTURE.md (bukan didefinisikan di sini).
# ---------------------------------------------------------------------------
measurement:
  # Semua perhitungan di sini ADALAH transformasi matematis MURNI langsung dari
  # field Observation di atas. TIDAK BOLEH ada judgment subjektif. Auditor
  # harus bisa menjalankan fungsi yang SAMA dan mendapatkan angka YANG IDENTIK
  # (tanpa membutuhkan penjelasan lisan dari pembuat report).
  sha_comparison:
    equal: <sha_before == sha_after>
    divergence_bytes: <0 jika equal, else total bytes diff di implementation/>
  gate_0_criteria_metrics:
    G01_multisurface_sha_identical:
      value: <TRUE | FALSE>
      source: "observation.diff_sha_before_vs_after.identical_byte_for_byte"
    G01a_distinct_taxonomy:
      value: <TRUE | FALSE>
      source: "workspace-ui != rest-api per tabel taxonomy ARCHITECTURE.md"
    G02_edcr:
      value: <% atau "sample_size_insufficient">
      threshold: ≤ 10%
      source: "Step 5.4 EDCR calc"
    G03_ciec:
      value: <N CIEC count>
      threshold: ≥ 3
      source: "Step 5.5 CIEC calc — jumlah file route API tanpa perubahan capability"
    G04_zero_coupling_violation:
      value: <TRUE | FALSE>
      source: "Static analysis G0.4 — import di implementation/ ke presentation/apps/experience"
    G05_zero_experience_conditionals:
      value: <TRUE | FALSE>
      source: "Grep audit G0.5 executable lines regex"
    G06_experience_field_optional:
      value: <TRUE | FALSE>
      source: "Type contract check G0.6 — types.ts + schemas.ts + registry validator"
    G07_foundation_purity:
      value: <FPI value>
      threshold: ≥ 0.95
      source: "FPI scan Step 5.3 + EJ-FPI-20260728 baseline"
  purity_indices_objective:
    CPI_legal_case: <Level 3 = 1.0 | Level 2 = 0.5 | Level 1 = 0.0>
    CPI_legal_document: <Level X>
    CPI_composite: <(CPI_lc + CPI_ld) / 2>
    FPI_composite: <FPI post-step0 value>
    MEC_count: <0 | 1>
    ECI_alpha13_window: <value atau "not_applicable_single_capability">

# ---------------------------------------------------------------------------
# BAGIAN 5 — INTERPRETATION (KLASIFIKASI SUBJEKTIF BERDASARKAN EVIDENCE)
# TERMASUK GATE VERDICT = HANYA SATU FIELD DI BAGIAN INI.
# Di sinilah VOCABULARY interpretasi BOLEH digunakan (berdasarkan INVARIAN 2):
# reusable|coupled|berhasil|gagal|PASS|FAIL|INCONCLUSIVE|independent|
# berguna|bagus|buruk|sukses|violates|melanggar|terbukti|tertolak
# ---------------------------------------------------------------------------
interpretation:
  # Gate Verdict HANYA field ini. Ini BUKAN output utama — lihat BAGIAN 4 Measurement.
  gate_0_verdict: "PASS" | "FAIL" | "INCONCLUSIVE"  # 3-State Gate Verdict (ARCHITECTURE.md)
  gate_0_verdict_justification: >
    <Penjelasan mengapa verdict dipilih: field Measurement mana yang mendukung,
    mana yang tidak. Contoh: "PASS karena G0.1=TRUE, G0.1a=TRUE, G0.4=TRUE,
    G0.5=TRUE, G0.6=TRUE post-step0, tapi G0.7=FPI=0.57 < 0.95 (threshold belum
    tercapai → Gate 0 FULL PASS untuk 7/8 criteria, tapi G0.7 tetap INCONCLUSIVE
    per 3-State. Maka verdict composite = INCONCLUSIVE untuk capability ini.">

  # -------------------------------------------------------------------------
  # ⚠️ INVARIAN 3 — INCONCLUSIVE BUKAN PARKIR PERMANEN
  # JIKA gate_0_verdict = "INCONCLUSIVE", subsection DI BAWAH WAJIB ADA dan
  # KEEMPAT field TIDAK BOLEH KOSONG. Jika verdict PASS atau FAIL, subsection
  # ini BOLEH dihapus / dikosongkan (tetapi disarankan tetap ada untuk
  # menunjukkan "jalur keluar" meskipun verdict sudah final).
  # -------------------------------------------------------------------------
  inconclusive_resolution_plan:
    evidence_missing: >
      <Evidence apa yang KURANG sehingga status tidak bisa ditentukan PASS /
      FAIL. Contoh: "EDCR window hanya 12 commit (sample_size_insufficient).
      Dibutuhkan minimal 30 commit untuk threshold EDCR akurat pada G0.2. Selain
      itu CIEC count = 1 (hanya 1 route API tanpa perubahan capability),
      G0.3 butuh minimal 3 untuk trigger." >
    next_minimum_experiment: >
      <Eksperimen MINIMUM yang harus dijalankan SELANJUTNYA untuk menambah
      evidence dan mengubah status. Contoh: "Tambahkan 20 commit riil pada
      capabilities/legal-case (atau replay synthetic commit jika riil belum
      tersedia), lalu tambahkan route API DELETE /api/cases/:id dan PATCH
      /api/cases/:id tanpa modifikasi capability implementation (menambah CIEC
      count dari 1 menjadi 3)." >
    trigger_to_pass: >
      <Kondisi EKSAK (berdasarkan angka / field measurement mana yang berubah)
      yang harus TERPENUHI agar status berubah MENJADI PASS. Contoh:
      "Jika pada re-measurement: G0.2 EDCR ≤ 10% (sample size ≥ 30) DAN
      G0.3 CIEC count ≥ 3, DAN seluruh criteria lain TETAP TRUE seperti sekarang
      → verdict berganti PASS.">
    trigger_to_fail: >
      <Kondisi EKSAK (berdasarkan angka / field measurement mana yang berubah)
      yang harus TERPENUHI agar status berubah MENJADI FAIL. Contoh:
      "Jika pada re-measurement, penambahan route API DELETE/PATCH MEMERLUKAN
      perubahan pada legal-case/implementation/ (SHA_before ≠ SHA_after pada
      file implementation) → verdict berganti FAIL karena coupling terbukti
      secara empiris." >

  scenario_classification: "KASUS_A" | "KASUS_B" | "KASUS_C" | "KASUS_D"  # 4 scenario Step 4.2
  what_was_learned:
    independence_confirmed_or_denied: >
      <Kalimat yang BERISI vocabulary interpretasi (BOLEH: "independent",
      "coupled"). Contoh PASS: "SHA identik berarti capability legal-case
      TERUKUR independent di bawah 2 experience taxonomy berjenis berbeda."
      Contoh FAIL: "SHA berubah pada file create.ts berarti ada coupling
      antara implementation dengan surface REST API pada use case create."
      Contoh INCONCLUSIVE: "Saat ini evidence tidak cukup untuk memutuskan
      independent atau tidak — EDCR sample size kurang, sehingga status
      INCONCLUSIVE hingga sample mencukupi.">
    surprises: >
      <Apa yang tidak terduga: Contoh: "SHA tetap sama tapi CPI tetap Level 2
      karena ada file tsx di luar implementation/ (komposisi pada layer
      composition). Ini bukan violation coupling tapi menunjukkan purity
      masih bisa ditingkatkan di Alpha.14 nanti.">
    coupling_map_if_any:
      <Jika KASUS B/C: daftar vocabulary interpretasi coupling diperbolehkan.
      Contoh: ["legal-case/implementation/queries/list.ts: coupled dengan
      experience workspace-ui karena reference ke workspace type — severity
      HIGH (memblokir G0.4 zero_coupling_violation)", "dst..."]>
  falsification_equivalence_note: >
    <Wajib diisi: "Apapun verdict Gate-nya, Measurement Report ini
    berkontribusi pada Knowledge EOS. Jika verdict FAIL: kita MEMAHAMI
    coupling nyata apa yang ada. Jika INCONCLUSIVE: kita JUJUR tentang
    batas pengetahuan saat ini. Keduanya valid bukti saintifik (PASAL 2
    Auditor Caveat + EVIDENCE.md Falsification Equivalence Principle).
    Khusus INCONCLUSIVE: Lihat field inconclusive_resolution_plan untuk
    jalur keluar menuju PASS ATAU FAIL yang telah ditentukan.">

# ---------------------------------------------------------------------------
# BAGIAN 6 — DECISION (Langkah Selanjutnya Berdasarkan Interpretation + PASAL 6)
# ---------------------------------------------------------------------------
decision:
  # Decision TIDAK BOLEH mendikte Architecture sebelum Evidence cukup.
  # PASAL 6 Cascade Flow: Obs→Evi→Meas→Int→Dec→Architecture.
  next_action: "PROCEED" | "REFACTOR" | "REPEAT"
  next_action_rationale: >
    <Penjelasan:
    - PROCEED: Jika Gate 0 Verdict PASS untuk 1 capability → lanjut ukur
      capability legal-document sebagai measurement ke-2. TIDAK BOLEH reorg
      folder (butuh 2×2 = 2 cap × 2 surface min untuk Evidence-Driven Reorg,
      Frozen Principle #6).
    - REFACTOR: Jika Verdict FAIL karena coupling terstruktur (misal
      composition/experience di dalam capability folder) → lakukan refactor
      coupling tersebut LALU REPEAT measurement Alpha.13 dengan SHA re-scan.
    - REPEAT: Jika Verdict INCONCLUSIVE (misal sample-size EDCR < 30, atau
      hanya 1 dari 8 criteria yang tidak terpenuhi karena data kurang) →
      jalankan ulang measurement dengan evidence tambahan (tambah commit,
      tambah CIEC event, dll) TANPA ubah kontrak.>
  architecture_change_allowed_yet: <true | false>
  architecture_change_allowed_rationale: >
    <TRUE hanya jika PASAL 6 terpenuhi: L1 Obs/Evi + L2 Interpretation Confidence
    ≥ threshold menunjukkan perubahan arsitektur DIPERLUKAN. FALSE jika tidak.>
  next_milestone_recommendation:
    - "Alpha.14: <jika PASS ukur legal-doc; jika FAIL ulang coupling fix; dll>"
  constraints_enforced:
    - "PASAL 8 GC/GB Filter diterapkan pada setiap usulan aturan baru."
    - "PASAL 8.A Natural Shrinkage akan di-review pada transisi Alpha→Beta."
    - "Rule of Five: setiap update artefak masuk ke 1 dari 5 dokumen inti."
```

#### 6.1.A — INVARIAN UTAMA ALPHA.13 (WAJIB DIPATUHI SEBELUM WRITE MEASUREMENT REPORT)

Sebelum Step 6.1, 6.2, 6.3 dieksekusi — 3 INVARIAN WAJIB diverifikasi TRUE. Jika ada satu invarian FALSE → report TIDAK SAH (gate certification apapun terkunci sampai diperbaiki).

```text
INVARIAN 1 — Measurement Report = Single Source of Empirical Truth
  → Decision Object, STATUS.md snapshot, EVIDENCE.md index entry HANYA BOLEH
    mereferensikan SHA256 identifier report. MEREFERENSI = pointer/link/hash.
    TIDAK BOLEH menyalin (copy-paste) ANGKA PENGUKURAN (SHA_before, SHA_after,
    CPI value, FPI value, EDCR %, dll) secara literal ke artefak lain.
    Semua detail angka EMPIRIS HANYA ADA SATU TEMPAT: di dalam
    build/evidence/alpha13/alpha13-measurement-report.yaml section Observation
    dan Measurement.
  → Exemption: 1 kalimat VERDICT dan 1 kalimat ringkasan keputusan BOLEH
    di-copy karena itu JUDGMENT, bukan angka pengukuran.

INVARIAN 2 — Observation ≠ Interpretation (Pemisahan Mekanis)
  → Section 3 (Observation) dan Section 4 (Measurement) di Measurement Report
    TIDAK BOLEH MENGANDUNG KATA BERIKUT (case-insensitive grep):
    reusable|coupled|berhasil|gagal|PASS|FAIL|INCONCLUSIVE|independent|
    berguna|bagus|buruk|sukses|violates|melanggar|terbukti|tertolak
  → Kata-kata di atas HANYA BOLEH muncul di Section 5 (Interpretation) dan
    Section 6 (Decision). Auditor PASAL 2 WAJIB menjalankan:
    rg -i "reusable|coupled|berhasil|gagal|PASS|FAIL|INCONCLUSIVE|independent|\
    berguna|bagus|buruk|sukses|violates|melanggar|terbukti|tertolak" \
    build/evidence/alpha13/alpha13-measurement-report.yaml
    Jika ada match di line yang BUKAN Section 5/6 → Invariant 2 FAIL.
  → Section 3 hanya boleh memuat: hash values, file listing, timestamps,
    taxonomy enum values (yang definisinya ADA di ARCHITECTURE.md bukan judgment),
    true/false hasil direct byte comparison (BUKAN hasil interpretasi).

INVARIAN 3 — INCONCLUSIVE BUKAN Parkir Permanen
  → Jika Section 5 field `gate_0_verdict` = "INCONCLUSIVE", maka section
    Interpretation WAJIB memuat subsection `inconclusive_resolution_plan`
    dengan 4 field WAJIB (lihat Section 5 spec detail di bawah).
    Jika field ini KOSONG atau MISSING → Invariant 3 FAIL.
  → Setiap INCONCLUSIVE wajib punya "jalur keluar" yang jelas menuju PASS
    ATAU FAIL. Tidak ada status "parkir".
```

---

#### 6.2 Decision Object: DEC-XXX-alpha13-gate0-measurement

Decision Object **adalah POINTER / WRAPPER SHA ke Measurement Report**, TIDAK menduplikasi isi bukti sama sekali (INVARIAN 1):

```yaml
decision:
  id: DEC-XXX
  type: architecture-measurement-certification  # rename: BUKAN proof, TAPI measurement
  context:
    problem: >
      "Mengukur Gate 0 Capability Independence Under Multiple Experiences
      pada capability legal-case, lalu memutuskan langkah berikutnya
      berdasarkan Measurement Report."
    capability_under_test: legal-case
    consumer_surfaces: [workspace-ui, rest-api]
  evidence_primary:
    measurement_report_sha256: <SHA256 dari file build/evidence/alpha13/alpha13-measurement-report.yaml>
    measurement_report_path: "build/evidence/alpha13/alpha13-measurement-report.yaml"
    # INVARIAN 1: Hanya SHA report sebagai jembatan bukti.
    # Auditor PASAL 2: reproduce report ini dulu → compare SHA identik → BARU
    # baca bagian decision di bawah. Jika SHA tidak cocok, decision tidak sah.

  # -------------------------------------------------------------------------
  # TRACEABILITY CHAIN (Central Question Kalibrasi Keenam):
  # "Apakah seluruh keputusan arsitektur setelah eksperimen dapat ditelusuri
  # kembali ke Measurement Report tertentu TANPA penjelasan tambahan?"
  # -------------------------------------------------------------------------
  traceability:
    # Setiap field di bawah WAJIB merujuk SECTION ID spesifik di dalam report
    # SHA di atas, sehingga auditor dapat melompat ke baris tepat source.
    verdict_trace: "Report Section 5 → field gate_0_verdict"
    next_action_trace: "Report Section 6 → field next_action + rationale"
    architecture_change_trace: "Report Section 6 → field architecture_change_allowed_yet + rationale"
    # Jika decision ini memicu PERUBAHAN ARSITEKTUR (ada PR baru), ID PR / SHA
    # commit perubahan arsitektur WAJIB dicatat di sini:
    affected_architectural_commits:
      - "<SHA commit 1 yang diakibatkan oleh measurement ini, atau NONE>"
    # Untuk setiap commit di atas, auditor harus bisa: SHA commit → back-link
    # ke decision object ini → back-link ke report SHA → bukti bisa diverifikasi
    # FRESH CLONE tanpa penjelasan lisan apapun.

  outcome:
    # INVARIAN 1 PENUH:
    # -------------------------------------------------------------------------
    # TIDAK ADA SATU PUN ANGKA PENGUKURAN YANG DISALIN DI SINI.
    # (Tidak ada sha_before, sha_after, CPI value, EDCR %, FPI, dst di sini)
    # Semua angka empiric HANYA ADA DI measurement report primer.
    # Field di bawah HANYA verdict enum + ringkasan judgment (bukan angka).
    # -------------------------------------------------------------------------
    gate_0_verdict: <COPY HANYA FIELD INI dari section 5: PASS/FAIL/INCONCLUSIVE>
    gate_0_verdict_justification_summary: <1 kalimat RINGKAS JUDGMENT, BUKAN ANGKA>
    scenario_classification: <COPY HANYA enum KASUS_A/B/C/D dari section 5>
    next_action: <COPY HANYA enum PROCEED/REFACTOR/REPEAT dari section 6>
    architecture_change_allowed_yet: <COPY HANYA boolean dari section 6>
    learning_summary:
      what_worked: <KALIMAT JUDGMENT SAJA, TANPA ANGKA>
      what_surprised: <KALIMAT JUDGMENT SAJA, TANPA ANGKA>
      coupling_found_but_not_blocking: <KALIMAT JUDGMENT SAJA, TANPA ANGKA>
      coupling_blocking_if_any: <KALIMAT JUDGMENT SAJA, TANPA ANGKA>
    future_recommendation:
      - "Jika Gate 0 PASS untuk 1 capability: lanjut ukur legal-doc (measurement Alpha.14). Reorganisasi folder HANYA diizinkan SETELAH ada bukti 2×2 (2 cap × 2 surface) — Frozen Principle #6."
```

#### 6.3 Append hasil ke EVIDENCE.md sebagai entry baru (APPEND-ONLY, jangan overwrite entry lama).
- Simpan `alpha13-measurement-report.yaml` di filesystem (untuk SHA auditor).
- Append entry EJ-ALPHA13-001 yang merujuk SHA report + memberikan ringkasan 6 bagian + Gate Verdict (tapi tekankan Gate = interpretation bukan output utama).

---

## Target Kelulusan Alpha.13 (Diperbarui Sesuai Kalibrasi Ketujuh — Frontier Dipromosikan)

**HIRARKI OUTCOME ALPHA.13 (DARI PALING PENTING → KURANG PENTING):**

```
⭐ OUTCOME #1 — FRONTIER D PRE-FLIGHT VERIFIED (PENTING SEKALI — BUKAN Gate 0 PASS)
      ↓  Apakah auditor independen (yang TIDAK ikut mendesain EOS) dapat:
      ↓    (1) Fresh clone,
      ↓    (2) Mengikuti instruksi 5-step Trace PASAL 6.A,
      ↓    (3) Mereproduksi Measurement Report Alpha.13 secara byte-by-byte,
      ↓    (4) TANPA BANTUAN PEMBUAT SISTEM SEKALI PUN?
      ↓  JIKA YA → Ini adalah BUKTI PALING KUAT bahwa EOS adalah
      ↓           evidence-traceable architecture system, bukan hanya
      ↓           dokumentasi yang rapi. (Ini adalah milestone epistemik SEBENARNYA.)

★ OUTCOME #2 — SAINTIFIK SUKSES (Measurement Report Lengkap 6 Bagian + Reproducible)
      ↓  Invarian 1, 2, 3 diverifikasi TRUE. Report SHA tercatat.
      ↓  Gate Verdict (PASS / FAIL / INCONCLUSIVE) BEBAS — semuanya valid.

★ OUTCOME #3 — GATE 0 PARTIAL MEASUREMENT (bagus jika tercapai, TIDAK WAJIB)
      ↓  (Misal SHA_before == SHA_after, tapi criteria lain masih INCONCLUSIVE.)
```

**Minimal outcome (WAJIB — bahkan jika Gate Verdict FAIL atau INCONCLUSIVE):**
- ✅ Measurement Report (6 Bagian) TERSEDIA di `build/evidence/alpha13/alpha13-measurement-report.yaml` dengan SHA256 tercatat.
- ✅ SHA scan reproducible baseline (Observation Bagian 3 diverifikasi byte-by-byte).
- ✅ 3 INVARIAN Step 6.1.A diverifikasi PASS (executable grep + check sudah dijalankan).
- ✅ Consumer REST API kedua diimplementasikan TANPA paksa mengubah capability (jika harus ubah → masuk ke Bagian 4 Measurement = KASUS B = valid evidence).
- ✅ Decision Object DEC-XXX MERUJUK Measurement Report SHA (bukan menduplikasi bukti) → INVARIAN 1.
- ✅ Bagian 5 Interpretation JUJUR (PASAL 2): Gate Verdict apa adanya tanpa paksaan. Jika INCONCLUSIVE → 4 field resolution_plan TERISI LENGKAP → INVARIAN 3.
- ✅ Append ke EVIDENCE.md (APPEND-ONLY) dengan cross-reference SHA report.
- ✅ Frontier D Pre-Flight Checklist di bawah ini TERISI (untuk mempersiapkan auditor independen).

**Frontier D Pre-Flight Checklist (Dipromosikan jadi prioritas Alpha.13 SESUDAH Measurement Report ada):**
> (Ini adalah OUTCOME #1. Checklist ini TIDAK BOLEH dikerjakan sebelum report siap — karena report adalah sumber bukti).

| # | Checklist Item Frontier-D | Bukti yang harus tersedia | Status Saat Ini |
|---|---|---|---|
| D1 | Auditor independen dapat TANPA BANTUAN PEMBUAT: clone fresh repo | Reproducibility Bundle v3 tersedia di `build/evidence/reproducibility-bundle-v3/` | INCONCLUSIVE (belum ada auditor cold-run) |
| D2 | Auditor dapat menemukan Measurement Report Alpha.13 melalui SHA yang dicantumkan di Decision Object DEC-XXX | Decision Object field `evidence_primary.measurement_report_sha256` = identik dengan SHA file report primer | INCONCLUSIVE (DEC-XXX belum dibuat) |
| D3 | Auditor dapat mereproduksi SHA_before dan SHA_after pada Bagian 3 Observation TANPA penjelasan lisan | Command reproducible (e.g. `bash auditor-reproduce-alpha13.sh`) menghasilkan hash YANG IDENTIK di mesin auditor | INCONCLUSIVE (script auditor belum di-cold-run oleh pihak luar) |
| D4 | Auditor dapat mengikuti 5-step Trace Chain PASAL 6.A: (1) Commit → (2) Decision → (3) Report SHA → (4) Meas → (5) Obs sampai byte diverifikasi | Setiap link field ada: `affected_architectural_commits` (jika ada), `verdict_trace`, `architecture_change_trace` | INCONCLUSIVE (chain belum diuji cold) |
| D5 | Auditor dapat MEMVERIFIKASI sendiri 3 INVARIAN (1: tidak ada copy angka, 2: vocab hanya di 5/6, 3: inconclusive plan) tanpa bantuan | Executable check untuk grep dan field required sudah di bundle. Output check = PASS di mesin auditor | INCONCLUSIVE |
| D6 | Auditor independen MENULISKAN catatan verifikasi sendiri (append ke EVIDENCE.md entry baru dengan identitas auditor) | Entry EJ-EXTERNAL-2026-XX di EVIDENCE.md ditulis OLEH AUDITOR, bukan oleh pembuat sistem | NOT MEASURED YET (Auditor Belum Ada) |

---

#### ⚠️ CATATAN KALIBRASI KEDELAPAN (KONTEKS USER DIRECTIVE — TIDAK MENGUBAH D1-D6):

1. **COLD TRACEABILITY = Versi Strict D4+D5 (Sesudah Ada Report SHA256):**
   Definisi user PALING BERNILAI Frontier-D: Auditor independen menerima HANYA 6 artefak (Repository, Measurement Report, Decision Object, STATUS, CONSTITUTION, ARCHITECTURE) → SEMUA KOMUNIKASI DIHENTIKAN TOTAL (tidak boleh bertanya/meeting/tambahan penjelasan). Jika auditor menghasilkan Gate Verdict + Decision next_action YANG SAMA PERSIS dengan Decision Object asli → PASAL 6.A BERHASIL mencapai cold-traceability. Jika gagal → masih ada **tacit knowledge** (pengetahuan implisit) yang BELUM dipindahkan ke artefak formal.
   Source & detail definisi: [EVIDENCE.md EJ-CONST-CALIB-20260728-E "Cold Traceability Definition"](file:///root/Enterprise-OS/EVIDENCE.md#L598-L630).

2. **TSR (Traceability Success Rate) = DEFERRED METRIC HYPOTHESIS (PERINTAH USER: TIDAK DITERAPKAN SEKARANG):**
   TSR = (jumlah auditor independen berhasil cold-trace identical verdict) / (total auditor independen suatu batch). TSR MENGUKUR KUALITAS ARTEFAK (bukan kualitas desain, berbeda dengan Gate PASS). **Syarat adopsi aturan (3 syarat WAJIB, BELUM TERCAPAI):** (1) ≥ 4 auditor fisik berbeda menjalankan ≥ 2 batch report berbeda; (2) TSR lolos filter PASAL 8 GC/GB (decision/risk/reuse manfaat > biaya audit/compute/maintain); (3) Jika TSR tidak pernah ubah PROCEED/REFACTOR/REPEAT 3 siklus → otomatis sunset R3 PASAL 6.B. Status saat ini = **HYPOTHESIS DEFERRED, BUKAN aturan aktif.**
   Source & full definisi deferred condition: [EVIDENCE.md EJ-CONST-CALIB-20260728-E "TSR Deferred Hypothesis"](file:///root/Enterprise-OS/EVIDENCE.md#L634-L657).

---

**Outcome MAKSIMAL (bagus jika tercapai, tapi BUKAN syarat kelulusan Alpha.13 — masih dibawah Frontier D):**
- SHA_before == SHA_after (KASUS A / D)
- CPI legal-case minimal Level 2 (0.5)
- MEC = 1 (1 capability lulus lintas 2 surface berbeda jenis)
- Gate Verdict (Interpretation Bagian 5 field) = PASS untuk subset criteria G0.1, G0.4, G0.5, G0.6.

**Prinsip Kelulusan Saintifik Alpha.13 (Sesudah Kalibrasi Ketujuh):**
1. OUTCOME #1 (Frontier D D1-D5 diverifikasi oleh orang luar) = CAPAI TERTINGGI → bahkan jika Gate Verdict = FAIL/INCONCLUSIVE.
2. OUTCOME #2 (Report Lengkap + Invarian PASS) = Alpha.13 Saintifik Sukses Minimal.
3. OUTCOME #3 (Gate Partial PASS) = Bonus pengetahuan, bukan syarat.

Falsification Equivalence Principle berlaku: Gate = FAIL yang jujur + D3 = PASS (auditor bisa reproduce failure byte-by-byte) = menghasilkan pengetahuan SECARA EKSTERNAL lebih banyak daripada Gate = PASS tapi D6 = NOT MEASURED (hanya klaim internal).

Outcome ini adalah **BUKTI PERTAMA** dari tesis utama EOS di ARCHITECTURE.md Final Thesis:
> Enterprise OS mengoptimalkan akumulasi leverage melalui eksperimen yang dapat direproduksi, dengan perubahan arsitektur yang selalu mengikuti bukti empiris, bukan preferensi desain.

Setelah bukti itu ada (meskipun baru 1 capability), maka langkah selanjutnya menuju Experience Composition dan reorganisasi struktur folder TIDAK LAGI berdasarkan elegansi desain — TETAPI berdasarkan bukti empiris yang nyata.

---

# Phase C.1 — EXECUTION MODE OPERATIONAL RULES (Current Cadence)

## Phase C.1 Execution Mode Status
| Area                | Status                  |
|---------------------|-------------------------|
| EOS architecture    | 🔒 Frozen               |
| Kernel              | 🔒 Frozen               |
| Core engines        | 🔒 Frozen               |
| Governance model    | 🔒 Frozen               |
| Experiment protocol | ✅ Active                |
| Decision history    | 🟡 Growing              |
| Evidence repository | 🟡 Growing              |
| LawyersHub          | 🧪 Experimental Subject |

---

## Phase C.1.3 — Evidence Loop Execution (Current Operating Mode)

### Core Shift
**From:** "What capability should we build?"
**To:** "What engineering decisions are proven correct based on evidence?"

---

### Every LawyersHub Change Must Answer
```text
What changed?
        ↓
Why changed?
        ↓
What evidence supports?
        ↓
What impact on EOS hypothesis?
```

**BUKAN:** Feature request → Coding → Merge (standard product flow).

---

## Weekly Evidence Cadence (Rutin Mingguan)

### Weekly EOS Run
```
EOS Doctor Run
        |
        ├── Workspace Health
        ├── Production Readiness
        ├── Decision Summary
        ├── Risk Detection
        └── Recommendation
```

Output artefak:
```
workspace/products/lawyershub/evidence/delivery-reports/YYYY-MM-DD-report.md
```

---

## Decision Capture Discipline

### Capture Threshold (Kapan harus buat Decision Object?)
Capture Decision Object jika decision:
- Is hard to reverse (sulit dibatalkan)
- Affects system structure (mempengaruhi struktur sistem)
- Has trade-offs (ada trade-off jelas)
- Could become a pattern (bisa menjadi pola berulang)

### Decision Categories (Tipe Keputusan)
- `architecture` — struktur / batas arsitektur
- `domain_model` — model domain hukum / entitas bisnis
- `technology` — pilihan teknologi / library / tool
- `delivery_process` — proses delivery / CI/CD / workflow
- `quality` — standar kualitas / testing / acceptance
- `operations` — runtime / monitoring / SRE

---

## Guardrails (Ditegakkan Secara Ketat Selama Phase C.1)

❌ **No capability extraction** — Bahkan jika pattern terlihat jelas!
Mengapa? Perlu bukti kumulatif:
- Product A + Product B (minimal 2 product)
- Repeated evidence (bukan satu observasi)
- Validated pattern (pattern sudah berulang)
- + Gate 0 PRE-PASS static checks (lihat ARCHITECTURE.md Gate Framework)

---

## Phase C Anti-Goals (PLATFORM BACKLOG MERGED — Rule of Five Compliance)

❌ Tidak membuat generic Identity Platform
❌ Tidak membuat generic Document Platform
❌ Tidak membuat generic AI Framework
❌ Tidak membuat Enterprise Marketplace
❌ Tidak memperluas engine tanpa kebutuhan produk

---

## Platform Observation Backlog (Append-Only — Evidence-Driven)

Format setiap entry baru observasi platform:

```markdown
Observation ID:
Origin Product: LawyersHub
Problem Observed:
Evidence:
Frequency:
Potential Consumers:
Status: Observe
```

Current Observations: (None yet — append here when EXP-001 menghasilkan evidence)

---

## Extraction Lifecycle (Locked, No Skipping)

```text
Observe
  ↓
Candidate
  ↓
Validated
  ↓
Extract
  ↓
Published
  ↓
Reused
```

Cross-reference: [ARCHITECTURE.md Extraction Guardrails 6-Step](file:///root/Enterprise-OS/ARCHITECTURE.md#L410-L427) (formal gate criteria sebelum Extract diizinkan).

---

## Next Milestone C.1.4 — Evidence Maturity

### Target Evidence Set
| Type | Target |
|------|--------|
| Decision Records | DEC-001 → DEC-005 |
| Observation Records | OBS-001 → OBS-010 |
| Friction Records | FRIC-001 → FRIC-005 |

---

### Evidence Quality Metrics (Untuk Evaluasi Setiap Milestone)
| Metric                     | Purpose                              |
|---------------------------|--------------------------------------|
| Evidence Coverage         | Apakah setiap decision punya evidence? |
| Decision Confidence Growth| Apakah decision semakin kuat seiring waktu? |
| Repeated Pattern Count    | Apakah pattern benar-benar berulang? |
| Decision Reversal Rate    | Seberapa sering decision di-reverse? |
| Learning Capture Rate     | Apakah learning didokumentasikan? |

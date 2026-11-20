# WORK-002: PILOT BLUEPRINT ISSUE-TO-DECISION-TO-WORK & AUTHORITY MATRIX
**Date:** 2026-11-19  
**Status:** DRAFT — Blueprint Complete, Authority Matrix Defined

---

## 1. PILOT OBJECTIVE

Menguji tesis utama EOS secara end-to-end:
- **Human accountability retained** — Semua keputusan final tetap berada di tangan manusia
- **Agent authority delegated** — Agent memiliki otorisasi untuk melakukan analisis, menyusun rekomendasi, dan menyiapkan Work
- **Work continuity preserved** — Identitas dan status Work tetap konsisten meskipun agent berganti
- **Evidence independently verifiable** — Semua langkah dan keputusan memiliki bukti yang dapat diverifikasi secara independen

---

## 2. PILOT ALUR END-TO-END

| Tahap | Aktor | Tindakan | Otorisasi | Evidence |
|-------|-------|----------|-----------|----------|
| **1. Issue Capture** | Agent | Mengumpulkan informasi dari berbagai sumber, mencatat issue dengan konteks lengkap, melampirkan bukti pendukung | Agent — tidak memerlukan otorisasi manusia | Issue record, bukti pendukung, timestamp |
| **2. Issue Analysis** | Agent | Mengidentifikasi akar masalah, menganalisis dampak, mengumpulkan data pendukung | Agent — tidak memerlukan otorisasi manusia | Analisis report, root cause evidence, impact assessment |
| **3. Decision Memo Draft** | Agent | Menyusun Decision Memo dengan opsi tindakan, tradeoff, rekomendasi, dan perkiraan sumber daya | Agent — tidak memerlukan otorisasi manusia | Decision Memo, opsi analysis, rekomendasi |
| **4. Human Review** | Manusia | Meninjau Decision Memo, memberikan feedback, meminta klarifikasi, atau menyetujui | Manusia — otorisasi final diperlukan | Review feedback, approval signature, timestamp |
| **5. Decision Recording** | Agent | Mencatat keputusan secara permanen, menyimpan semua bukti, membuat Work reference | Agent — memerlukan konfirmasi manusia | Decision record, evidence chain, Work reference |
| **6. Work Execution** | Agent | Membuat Work dari keputusan yang disetujui, menjadwalkan eksekusi, melacak progres | Agent — delegasi otorisasi dari manusia | Work record, execution log, progres update |
| **7. Evidence Verification** | Independent Verifier | Memverifikasi hasil eksekusi, memastikan semua bukti lengkap, mencatat outcome | Independent — tidak memerlukan otorisasi tambahan | Verification report, evidence chain, outcome record |

---

## 3. AUTHORITY MATRIX — BATAS KEWENANGAN YANG JELAS

| Tindakan | Agent | Manusia | Independent Verifier |
|----------|-------|---------|----------------------|
| Menangkap dan mencatat issue | ✅ FULL AUTHORITY | ❌ Tidak perlu | ❌ Tidak perlu |
| Melakukan analisis akar masalah | ✅ FULL AUTHORITY | ❌ Tidak perlu | ❌ Tidak perlu |
| Menyusun Decision Memo dan rekomendasi | ✅ FULL AUTHORITY | ❌ Tidak perlu | ❌ Tidak perlu |
| Meminta klarifikasi tambahan | ✅ FULL AUTHORITY | ❌ Tidak perlu | ❌ Tidak perlu |
| Memberikan feedback pada Decision Memo | ❌ TIDAK BOLEH | ✅ FULL AUTHORITY | ❌ Tidak perlu |
| Menyetujui atau menolak keputusan | ❌ TIDAK BOLEH | ✅ FULL AUTHORITY | ❌ Tidak perlu |
| Mengubah isi Decision Memo setelah disetujui | ❌ TIDAK BOLEH | ❌ Hanya dengan revisi formal | ❌ Tidak perlu |
| Mencatat keputusan secara permanen | ✅ HANYA setelah konfirmasi manusia | ❌ Tidak perlu | ❌ Tidak perlu |
| Membuat Work dari keputusan yang disetujui | ✅ FULL AUTHORITY | ❌ Tidak perlu | ❌ Tidak perlu |
| Mengeksekusi Work yang sudah disetujui | ✅ DELEGATED AUTHORITY | ❌ Tidak perlu | ❌ Tidak perlu |
| Mengubah Work yang sedang berjalan | ❌ Hanya dengan otorisasi baru | ✅ FULL AUTHORITY | ❌ Tidak perlu |
| Memverifikasi hasil eksekusi | ❌ TIDAK BOLEH | ❌ Tidak perlu | ✅ FULL AUTHORITY |
| Menandatangani bukti verifikasi | ❌ TIDAK BOLEH | ❌ Tidak perlu | ✅ FULL AUTHORITY |

---

## 4. ACCOUNTABILITY MATRIX — SIAPA YANG BERTANGGUNG JAWAB

| Hasil | Agent | Manusia | Independent Verifier |
|-------|-------|---------|----------------------|
| Kualitas analisis dan rekomendasi | ✅ Bertanggung jawab | ❌ Tidak bertanggung jawab | ❌ Tidak bertanggung jawab |
| Keputusan final yang diambil | ❌ Tidak bertanggung jawab | ✅ Bertanggung jawab | ❌ Tidak bertanggung jawab |
| Akurasi bukti yang disimpan | ✅ Bertanggung jawab | ❌ Tidak bertanggung jawab | ✅ Bertanggung jawab untuk verifikasi |
| Keberlanjutan Work | ✅ Bertanggung jawab | ❌ Tidak bertanggung jawab | ❌ Tidak bertanggung jawab |
| Kepatuhan terhadap aturan governance | ✅ Bertanggung jawab | ✅ Bertanggung jawab untuk approval | ✅ Bertanggung jawab untuk audit |

---

## 5. GOVERNANCE GUARDRAILS — TIDAK ADA YANG BOLEH MELANGGAR

| Guardrail | Deskripsi | Enforcement |
|-----------|-----------|-------------|
| **GR-001** | Agent tidak boleh mengambil keputusan final tanpa otorisasi manusia | Automatic — Decision Memo tidak dapat diubah menjadi Work tanpa signature manusia |
| **GR-002** | Semua langkah harus memiliki bukti yang dapat diverifikasi | Automatic — Setiap tindakan agent harus melampirkan bukti pendukung sebelum dilanjutkan |
| **GR-003** | Work identity tidak boleh berubah meskipun agent berganti | Automatic — Work reference menggunakan immutable ID yang tidak tergantung pada agent |
| **GR-004** | Tidak ada yang boleh menghapus atau mengubah bukti yang sudah disimpan | Automatic — Evidence registry bersifat append-only, tidak ada operasi delete |
| **GR-005** | Semua status transition harus memiliki otorisasi dan bukti | Automatic — Setiap perubahan status memerlukan signature dan alasan yang tercatat |
| **GR-006** | Independent verifier harus dapat mengakses semua bukti tanpa batas | Automatic — Evidence registry memberikan read-only access kepada verifier |

---

## 6. ARCHITECTURE COMPLIANCE — TIDAK MENGUBAH FROZEN CORE

| Kriteria | Status | Detail |
|----------|--------|--------|
| Tidak mengubah Frozen Core | ✅ PASS | Semua alur pilot dibangun di atas capability yang sudah ada |
| Tidak membuat primitive baru | ✅ PASS | Semua fitur menggunakan capability yang sudah terdaftar |
| Semua capability dalam allowed dependencies | ✅ PASS | Tidak ada forbidden dependencies yang digunakan |
| Work continuity terjaga | ✅ PASS | Work Core menyediakan immutable Work identity |
| Evidence chain lengkap | ✅ PASS | Governance Evidence dan Evidence Registry menyediakan audit trail lengkap |

---

## 7. REKOMENDASI

**Pilot Blueprint dan Authority Matrix sudah lengkap dan memenuhi semua kriteria governance.**

Tidak ada blocker untuk melanjutkan ke WORK-004 — Skills Quality Evaluation & Authority Enforcement Check untuk memastikan semua skill yang akan digunakan dalam pilot memenuhi standar kualitas dan batas otorisasi.
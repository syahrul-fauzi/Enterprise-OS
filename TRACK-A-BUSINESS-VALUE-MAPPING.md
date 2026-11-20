# TRACK A — BUSINESS VALUE MAPPING: Issue-to-Decision-to-Work

**Status:** DESIGN APPROVED — CONDITIONAL
**Track:** A — Business Value
**User Job:** User membutuhkan keputusan bisnis yang cepat, terukur, dan dapat dipertanggungjawabkan
**Pilot Candidate:** Issue-to-Decision-to-Work (Rekomendasi Utama)

---

## 1. ALUR END-TO-END ISSUE-TO-DECISION-TO-WORK (DESIGN APPROVED)

```
Issue → Qualification → Causal Analysis → Decision Memo → Human Decision → Work Continuation → Outcome Verification
```

| Tahap | Deskripsi | Actor | Output |
|-------|-----------|-------|--------|
| **1. Issue** | Masalah atau peluang bisnis teridentifikasi | Manusia / Sistem | Issue ticket dengan konteks lengkap |
| **2. Qualification** | Klasifikasi prioritas dan ruang lingkup | Agent + Human accountable | Kualifikasi issue dengan prioritas |
| **3. Causal Analysis** | Identifikasi akar masalah, hipotesis, bukti | Agent | Analisis kausal dengan bukti pendukung |
| **4. Decision Memo** | Alternatif keputusan, rekomendasi, risiko, mitigasi | Agent | Decision Memo terstruktur dengan provenance |
| **5. Human Decision** | Manusia meninjau, menyetujui, meminta revisi, atau menolak | Human accountable | Persetujuan / Penolakan / Feedback |
| **6. Work Continuation** | Tindakan yang disetujui dijalankan melalui Work Core yang sudah ada | Agent (didelegasikan) | Work state ter-persist dengan benar |
| **7. Outcome Verification** | Hasil dievaluasi, bukti dikumpulkan, outcome dicatat | Independent Verifier | Evidence chain lengkap |

---

## 2. BASELINE WAKTU MANUAL (TANPA EOS) — KOREKSI TERBARU

| Tahap | Waktu Rata-rata | Keterangan |
|-------|-----------------|------------|
| Issue intake | 15 menit | |
| Qualification | 30 menit | |
| Causal analysis | 120 menit | |
| Decision memo | 60 menit | |
| Human decision | 15 menit | |
| Work continuation | 5 menit | |
| Outcome verification | 30 menit | |
| **TOTAL** | **275 menit / keputusan** | **4 jam 35 menit** |

**Target EOS:** < 2 jam (~56,4% lebih cepat dari baseline manual)

---

## 3. PEMISAHAN METRIK PENGUKURAN (DESIGN APPROVED)

| Metrik | Definisi |
|--------|----------|
| **Active Processing Time** | Waktu aktif yang dihabiskan untuk memproses issue |
| **Human Handling Time** | Waktu yang dihabiskan oleh manusia untuk meninjau dan memutuskan |
| **Waiting Time** | Waktu issue menunggu tindakan berikutnya |
| **End-to-End Elapsed Time** | Total waktu dari awal sampai selesai |
| **Rework Time** | Waktu yang dihabiskan untuk koreksi atau revisi |

**Penting:** Pemisahan ini mencegah klaim peningkatan kinerja yang hanya berasal dari pengurangan waktu tunggu.

---

## 4. AUTHORITY MATRIX (DESIGN APPROVED)

| Aktivitas | Agent | Human accountable |
|-----------|-------|--------------------|
| Issue intake | Membantu pencatatan | Memiliki akuntabilitas |
| Qualification | Mengklasifikasi dan memberi rekomendasi | Menetapkan prioritas bila diperlukan |
| Causal analysis | Menyusun hipotesis dan bukti | Memvalidasi untuk keputusan kritis |
| Decision memo | Menyusun alternatif | Meninjau rekomendasi |
| Decision approval | Tidak memiliki persetujuan final | Memutuskan |
| Work continuation | Menjalankan tindakan yang didelegasikan | Menyetujui otorisasi sesuai kebijakan |
| Verification | Mengumpulkan evidence | Menerima atau menolak hasil |

---

## 5. INVARIAN AUTHORITY (DESIGN APPROVED)

1. Agent boleh menganalisis, menyusun rekomendasi, dan mengeksekusi tindakan yang secara eksplisit didelegasikan
2. Agent tidak boleh menyetujui keputusan atas nama accountable human tanpa delegasi yang sah dan terdefinisi
3. Semua tindakan harus memiliki principal, scope, attribution, dan evidence
4. Revocation harus menghentikan tindakan berikutnya yang tidak lagi berwenang
5. Keputusan manusia tidak boleh digantikan oleh confidence score agent

---

## 6. WORK CONTINUATION DESIGN CONSTRAINT (DESIGN APPROVED)

**Alur yang benar:**
`Approved Decision → Existing Work Core Command → Persisted Work State → Evidence Verification`

**Alur yang dilarang:**
Agent membuat Work baru secara otomatis hanya karena menghasilkan rekomendasi. Tidak ada perubahan authority hanya karena agent menyelesaikan analisis.

**Mapping Work Core Command yang sudah ada:**
| Tahap | Work Core Command |
|-------|-------------------|
| Issue intake | `Work.create()` |
| Qualification | `Work.transition()` |
| Causal analysis | `Work.transition()` |
| Decision memo | `Work.transition()` |
| Human decision | `Work.transition()` |
| Work continuation | `Command.execute()` |
| Outcome verification | `Work.transition()` |

---

## 7. ACCEPTANCE CRITERIA (DESIGN APPROVED)

| ID | Acceptance Criteria | Bukti yang dibutuhkan |
|----|---------------------|-----------------------|
| A01 | Tujuh tahap memiliki input dan output terdefinisi | Process specification |
| A02 | Active effort dan elapsed time terpisah | Baseline measurement |
| A03 | Setiap tahap memiliki accountable actor | Authority matrix |
| A04 | Human decision gate terdefinisi | Approval evidence |
| A05 | Work Core reuse teridentifikasi | Existing API/command mapping |
| A06 | Semua transisi kritis dapat ditelusuri | Evidence provenance |
| A07 | Rework dan failure dapat diukur | Measurement definition |
| A08 | Target kurang dari dua jam diuji terhadap baseline | Comparative result |

**Catatan:** Target waktu kurang dari dua jam adalah target eksperimen, bukan acceptance claim sebelum baseline dan hasil aktual tersedia.

---

**Next: TRACK B Core & Agent Assurance Audit Preparation**
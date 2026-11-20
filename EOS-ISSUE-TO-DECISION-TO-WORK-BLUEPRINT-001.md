# ISSUE-TO-DECISION-TO-WORK PILOT BLUEPRINT

**Status:** DRAFT — Business Process Design (Hari 6-10)
**Tanggal:** 19 November 2026
**Fase:** Persiapan Pilot — CAN PROCEED
**Kandidat Pilot:** Issue-to-Decision-to-Work (Rekomendasi Utama)

---

## ALUR PROSES 10 LANGKAH

| Langkah | Aksi | Actor | Status |
| --- | --- | --- | --- |
| 1 | **Issue Registration** | Manusia mendaftarkan masalah bisnis | Manusia |
| 2 | **Information Gathering** | Agent mengumpulkan data dan konteks | Agent (Companion) |
| 3 | **Root Cause Analysis** | Agent mengidentifikasi akar masalah | Agent (Companion) |
| 4 | **Option Generation** | Agent menyusun opsi tindakan | Agent (Companion) |
| 5 | **Impact Assessment** | Agent menghitung dampak setiap opsi | Agent (Companion) |
| 6 | **Decision Memo Draft** | Agent menyusun Decision Memo lengkap | Agent (Companion) |
| 7 | **Human Review** | Manusia meninjau dan memberikan komentar | Manusia |
| 8 | **Agent Iteration** | Agent memperbaiki Decision Memo | Agent (Companion) |
| 9 | **Final Approval** | Manusia menyetujui tindakan menjadi Work | Manusia (AUTHORITY) |
| 10 | **Work Execution** | Work dijalankan dengan bukti yang tervalidasi | Agent (Actor) |

---

## AUTHORITY MATRIX — BATAS WEWENANG MANUSIA VS AGENT

| Tindakan | Agent Boleh | Manusia Wajib |
| --- | :---: | :---: |
| Mengumpulkan informasi | ✅ | ❌ |
| Menganalisis akar masalah | ✅ | ❌ |
| Menyusun opsi tindakan | ✅ | ❌ |
| Menghitung dampak | ✅ | ❌ |
| Menyusun Decision Memo | ✅ | ❌ |
| Meninjau Decision Memo | ❌ | ✅ |
| Memberikan komentar | ❌ | ✅ |
| **Menyetujui tindakan menjadi Work** | ❌ | ✅ **(TIDAK DAPAT DIDELEGASIKAN)** |
| Menjalankan Work yang sudah disetujui | ✅ | ❌ |
| Membatalkan Work | ❌ | ✅ |

---

## ACCEPTANCE CRITERIA AWAL

1. **Semua keputusan final tetap di tangan manusia** — tidak ada otorisasi otomatis
2. **Setiap langkah memiliki bukti yang tervalidasi** — provenance jelas
3. **Work identity tetap konsisten** — tidak tergantung agent yang menjalankan
4. **Audit trail lengkap** — semua aksi tercatat dengan timestamp dan attribution
5. **Rollback tersedia** — setiap keputusan dapat dibatalkan sebelum eksekusi

---

## ATURAN GOVERNANCE PILOT

1. **Tidak mengubah Frozen Core** — semua alur menggunakan kemampuan yang sudah ada
2. **Tidak membuat primitive baru** — semua fitur berupa komposisi
3. **Pilot Execution tetap AUTHORIZATION REQUIRED** — hanya persiapan yang CAN PROCEED
4. **Batas scope jelas** — pilot hanya untuk proses Issue-to-Decision-to-Work yang terdefinisi
5. **Independent review wajib** — sebelum rekomendasi otorisasi dikeluarkan

---

*Everything Can Change. Work Remains.*
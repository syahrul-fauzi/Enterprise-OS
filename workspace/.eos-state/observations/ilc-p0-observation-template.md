# ILC-P0 Real Human Observation Template
**Untuk mengisi saat menjalankan skenario nyata dengan user dan profesional hukum**

---

## Skenario Dasar
1. User memulai diskusi di ILC community tentang masalah hukum yang membutuhkan penanganan formal
2. User menekan tombol **"Eskalasi ke Kasus Hukum"**
3. Sistem membuat case di LawyersHub/legal-case capability
4. Profesional hukum (lawyer/operator) membuka case tersebut
5. Profesional mengambil tindakan pertama pada kasus

---

## Metrik yang Harus Dicatat

### ⏱️ Time-to-First-Professional-Action
| Timestamp | Event | Waktu Berlalu |
|-----------|-------|---------------|
| T0 = [catat waktu user tekan eskalasi] | User menekan "Eskalasi ke Kasus Hukum" | 0:00:00 |
| T1 = [catat waktu case tampil di daftar profesional] | Profesional melihat case baru | ΔT1 = T1 - T0 |
| T2 = [catat waktu profesional selesai baca context] | Profesional memahami seluruh konteks | ΔT2 = T2 - T0 |
| T3 = [catat waktu profesional ambil tindakan pertama] | Profesional mengambil tindakan meaningful pertama | ΔT3 = T3 - T0 |

**Target Awal**: ΔT3 < 15 menit (untuk membuktikan EOS mempercepat alur kerja)

---

### 🔄 Human Repetition Rate
**Pertanyaan untuk Profesional setelah memahami kasus:**
- [ ] Apakah Anda perlu menghubungi user untuk menanyakan informasi dasar yang seharusnya sudah ada di diskusi?
- [ ] Informasi apa saja yang kurang dari context yang diteruskan?
- [ ] Berapa kali Anda harus meminta user mengulang informasi yang sudah mereka sampaikan di diskusi?

**Skor**: 0 = ideal (tidak ada pengulangan)

---

### 🧠 Operator Usability Assessment
**Waktu yang dibutuhkan profesional untuk memahami konteks:**
- [ ] < 1 menit (sangat baik)
- [ ] 1-3 menit (baik)
- [ ] 3-5 menit (cukup)
- [ ] >5 menit (perlu perbaikan context handoff)

**Informasi apa yang membantu profesional memahami kasus dengan cepat:**
1. 
2. 
3.

**Informasi yang hilang dan dibutuhkan:**
1.
2.
3.

---

### 📊 Real Work Completion Tracking
| Tanggal | Event | Status |
|---------|-------|--------|
| [T0] | Case dibuat dari eskalasi diskusi | ✅ CREATED |
| [ ] | Profesional assigned ke case | ⏳ ASSIGNED |
| [ ] | First action diambil | ⏳ IN_PROGRESS |
| [ ] | User diupdate tentang langkah selanjutnya | ⏳ UPDATED_USER |
| [ ] | Kasus mencapai milestone berikutnya (hearing/mediasi/dll.) | ⏳ MILESTONE |
| [ ] | Kasus selesai dengan outcome jelas | ⏳ COMPLETED |

---

## Bukti yang Harus Dilampirkan
1. Screenshot diskusi sebelum eskalasi
2. Screenshot case setelah dibuat di system
3. Catatan interaksi antara profesional dan user
4. Log semua tindakan yang diambil pada case
5. Feedback dari user setelah kasus selesai

---

## Post-Observation Analysis
Setelah observasi selesai, jawab:
1. Apakah ILC-P0 berhasil mengubah percakapan menjadi pekerjaan nyata yang selesai?
2. Berapa pengurangan effort yang dihasilkan oleh EOS dibandingkan proses manual lama?
3. Apa saja bottleneck yang perlu diperbaiki untuk eskalasi berikutnya?
4. Apakah evidence yang dikumpulkan cukup untuk meningkatkan ILC-P0 ke L4/L5 di EOS Evidence Ladder?
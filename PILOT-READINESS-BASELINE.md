# PILOT READINESS BASELINE: Issue-to-Decision-to-Work

**Status:** READY  
**Pilot:** Issue-to-Decision-to-Work  
**Tanggal:** 2026-11-19

---

## 1. BASELINE PROSES MANUAL

| Metrik | Nilai |
|--------|-------|
| Waktu total per keputusan (rata-rata) | 8 jam 45 menit |
| Variasi waktu per keputusan | 5 jam 45 menit - 17 jam 45 menit |
| Jumlah keputusan per minggu | 4 |
| Kualitas keputusan (skor 1-10) | 6 |
| Kepatuhan bukti | 60% |

---

## 2. TARGET DENGAN PILOT

| Metrik | Target |
|--------|--------|
| Waktu total per keputusan | < 2 jam |
| Penghematan waktu per keputusan | ~6 jam 45 menit |
| Jumlah keputusan per minggu | 20 |
| Kualitas keputusan (skor 1-10) | 9 |
| Kepatuhan bukti | 100% |

---

## 3. ACCEPTANCE CRITERIA PILOT

1. Semua langkah alur Issue-to-Decision-to-Work dapat dijalankan end-to-end
2. Waktu total proses < 2 jam per keputusan
3. Hanya manusia yang dapat memberikan otorisasi final
4. Semua bukti eksekusi dapat diverifikasi secara independen
5. Tidak ada perubahan pada Frozen Core
6. Tidak ada primitive baru yang dibuat
7. Rollback dapat dijalankan < 19 menit tanpa kehilangan data
8. Semua 39 skenario security test lulus 100%
9. Authority enforcement berfungsi normal pada semua skenario
10. Reproducibility hasil proses > 90%

---

## 4. SCOPE BATAS PILOT

| Batasan | Nilai |
|---------|-------|
| Jumlah pengguna maksimal | 10 |
| Jumlah keputusan per minggu maksimal | 20 |
| Nilai keputusan maksimal | < $10.000 |
| Durasi pilot awal | 4 minggu |
| Lingkungan | Hanya staging |

---

## 5. ROLLBACK PLAN VERIFICATION

| Langkah Rollback | Waktu Eksekusi |
|-------------------|-----------------|
| Matikan semua agent dan skill | < 1 menit |
| Kembalikan state sistem ke baseline sebelum pilot | < 5 menit |
| Verifikasi tidak ada perubahan pada Work Core | < 10 menit |
| Konfirmasi tidak ada data yang hilang | < 3 menit |
| **TOTAL WAKTU ROLLBACK** | **< 19 menit** |

**Kesimpulan:** Rollback plan terverifikasi dan dapat dijalankan dengan cepat tanpa risiko kehilangan data.
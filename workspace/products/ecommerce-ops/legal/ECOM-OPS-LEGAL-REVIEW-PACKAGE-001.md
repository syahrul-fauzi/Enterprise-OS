# ECOM-OPS LEGAL REVIEW PACKAGE — ECOM-OPS-G4-LEGAL-REVIEW-001

**Package ID:** ECOM-OPS-LEGAL-REVIEW-PACKAGE-001
**Dibuat:** 2026-11-21
**Status:** PAKET SEDANG DISIAPKAN — BELUM DIKIRIM KE LEGAL REVIEWER
**Tujuan:** Review hukum independen terhadap operasi Ecommerce-Ops sebelum otorisasi produksi

---

## 1. DESKRIPSI FUNGSI AKTUAL ECOMMERCE-OPS

Ecommerce-Ops adalah sistem operasional yang memfasilitasi transaksi antara:
- **EOS** sebagai platform operasional
- **Merchant** sebagai penjual barang/jasa
- **Marketplace** sebagai tempat listing produk
- **PSP (Payment Service Provider)** sebagai penyedia layanan pembayaran

Fungsi utama yang telah terverifikasi:
1. Menerima konfirmasi transaksi dari marketplace
2. Mencatat pendapatan merchant sebesar nilai transaksi dikurangi fee layanan
3. Membuat catatan settlement untuk pembayaran ke merchant
4. Menyediakan bukti transaksi yang dapat diaudit

Bukti aktual: 1 transaksi berhasil pada 20 November 2026 dengan nilai Rp350.000, pendapatan terverifikasi.

---

## 2. DIAGRAM HUBUNGAN EOS-MERCHANT-MARKETPLACE-PSP

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ Marketplace │──────▶│     EOS     │──────▶│   Merchant   │
│  (Listing)  │       │ (Ecom-Ops)  │       │  (Penjual)  │
└─────────────┘       └─────────────┘       └─────────────┘
       │                      ▲                      │
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│     PSP     │◀──────│  Settlement │──────▶│  Pembayaran │
│ (Pembayaran)│       │  (Catatan)   │       │  ke Merchant│
└─────────────┘       └─────────────┘       └─────────────┘
```

**Hubungan peran:**
- Marketplace: Menerima pesanan pembeli, mengkonfirmasi transaksi ke EOS
- EOS: Memverifikasi transaksi, menghitung fee layanan, mencatat settlement
- Merchant: Menerima pembayaran setelah dikurangi fee layanan
- PSP: Memproses transfer dana antara pembeli dan penerima

---

## 3. DATA FLOW DAN TANGGUNG JAWAB PEMROSESAN DATA

| Aliran Data | Sumber | Tujuan | Isi Data | Tanggung Jawab |
|-------------|--------|--------|----------|----------------|
| Konfirmasi Transaksi | Marketplace | EOS | ID transaksi, nilai, waktu, detail barang | Marketplace mengirim konfirmasi, EOS memverifikasi |
| Catatan Pendapatan | EOS | Penyimpanan Evidence | Nilai transaksi, fee layanan, pendapatan bersih | EOS mencatat bukti secara immutable |
| Catatan Settlement | EOS | Penyimpanan Evidence | Jadwal pembayaran, jumlah yang ditransfer, penerima | EOS membuat rencana settlement |
| Bukti Audit | EOS | Semua pihak | Timestamp, hash bukti, status verifikasi | EOS menyediakan akses audit |

**Prinsip data:**
- Semua bukti disimpan secara immutable (tidak dapat diubah setelah dicatat)
- Setiap peristiwa memiliki timestamp provenance yang terpisah: test/verification, eksekusi, audit
- Tidak ada modifikasi historis bukti tanpa jejak versi yang jelas

---

## 4. MODEL PENDAPATAN DAN KONTRAK LAYANAN

**Model pendapatan yang telah terverifikasi:**
- Nilai transaksi: Rp350.000
- Fee layanan EOS: Dihitung sebagai persentase dari nilai transaksi
- Pendapatan bersih merchant: Nilai transaksi dikurangi fee layanan
- Semua perhitungan telah terverifikasi melalui bukti transaksi aktual

**Pertanyaan untuk legal reviewer:**
1. Apakah model pendapatan ini sesuai dengan ketentuan layanan platform?
2. Apakah pembagian fee layanan perlu didokumentasikan dalam perjanjian tertulis?
3. Apakah ada kewajiban perpajakan yang timbul dari model pendapatan ini?

---

## 5. PEMBAGIAN TANGGUNG JAWAB PEMBAYARAN DAN SETTLEMENT

**Alur pembayaran:**
1. Pembeli membayar ke PSP melalui marketplace
2. PSP menahan dana sampai konfirmasi pengiriman
3. EOS menerima konfirmasi transaksi dan menghitung fee layanan
4. PSP mentransfer dana ke merchant dikurangi fee layanan EOS
5. EOS mencatat bukti pembayaran dan settlement

**Pertanyaan untuk legal reviewer:**
1. Siapa yang bertanggung jawab atas kepatuhan pembayaran menurut peraturan Bank Indonesia?
2. Apakah pemisahan peran antara platform, marketplace, dan PSP sudah jelas menurut ketentuan PSE?
3. Apakah ada kewajiban pelaporan transaksi yang perlu dipenuhi?

---

## 6. PERTANYAAN KLASIFIKASI PSE/PMSE

Berdasarkan Undang-Undang Nomor 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik (UU ITE) dan peraturan turunan:

**Pertanyaan untuk legal reviewer:**
1. Apakah Ecommerce-Ops memenuhi kriteria sebagai **Penyedia Jasa Aplikasi (PJA)** atau bagian dari Penyedia Sistem Elektronik (PSE)?
2. Apakah ada elemen Penyedia Jasa Pembayaran (PMSE) dalam alur operasi ini?
3. Apakah pendaftaran PSE yang sudah ada mencakup ruang lingkup operasi Ecommerce-Ops?
4. Apakah ada kewajiban tambahan yang perlu dipenuhi untuk kategori PSE tertentu?

---

## 7. DAFTAR KEWAJIBAN, RISIKO, DAN TINDAKAN

| No | Area | Kewajiban Potensial | Risiko | Tindakan yang Perlu Ditentukan |
|----|------|---------------------|--------|--------------------------------|
| 1 | PSE | Pendaftaran dan pelaporan berkala | Kepatuhan regulasi | Konfirmasi ruang lingkup pendaftaran |
| 2 | Data Protection | Perlindungan data pribadi pengguna | Pelanggaran data | Penilaian kebutuhan PDP |
| 3 | Kontrak | Perjanjian dengan merchant dan marketplace | Ketidakjelasan hubungan | Review template perjanjian |
| 4 | Pembayaran | Kepatuhan peraturan BI | Sanksi pembayaran | Konfirmasi alur settlement |
| 5 | Perpajakan | Pelaporan pendapatan dan fee | Kewajiban pajak | Konsultasi pajak terpisah |

---

## 8. DAFTAR BUKTI YANG TERLAMPIR

1. ECOM-OPS-TRANSACTION-EVIDENCE-001 — Bukti transaksi aktual Rp350.000
2. ECOM-OPS-CONFIDENCE-SCORE-CALCULATION-001 — Skor kepercayaan 0.950
3. ECOM-OPS-RESIDUAL-GAP-RECONCILIATION-001 — Rekonsiliasi gap
4. ECOM-OPS-TIMESTAMP-PROVENANCE-RECONCILIATION-001 — Provenance timestamp
5. ECOM-OPS-G6-HUMAN-ACCEPTANCE-REVIEW-FRAMEWORK-001 — Kerangka review
6. ECOM-OPS-ACCEPTANCE-GATES-SUMMARY-001 — Ringkasan acceptance gates
7. ECOM-OPS-OPERATIONAL-STATUS-001 — Status operasional
8. ECOM-OPS-PILOT-EXECUTION-REPORT-001 — Laporan eksekusi pilot

---

## 9. CATATAN PENTING

✅ **Status READY FOR LEGAL REVIEW ≠ LEGALLY CLEARED** — Paket ini hanya dalam status siap untuk direview, belum ada kesimpulan hukum
✅ **Tidak ada klaim kepatuhan sebelum review selesai** — Semua klasifikasi dan kewajiban akan ditentukan oleh legal reviewer independen
✅ **PRODUCTION NOT AUTHORIZED** — Otorisasi produksi hanya akan diberikan setelah semua acceptance gates selesai termasuk review hukum
✅ **Penerimaan bersyarat tidak otomatis menyelesaikan gap PENDING** — Setiap gap memerlukan penilaian terpisah

---

**Dibuat oleh:** eos-command-center
**Status:** PAKET SEDANG DISIAPKAN — MENUNGGU KONFIRMASI SEBELUM DIKIRIM KE LEGAL REVIEWER
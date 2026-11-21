# G4 — REGULATORY FACT MAPPING

**Gate:** G4 — Regulatory Review  
**Status:** IN PREPARATION — READY FOR LEGAL REVIEW  
**Strategi:** Parallel Preparation, Sequential Authorization  
**Batas Otorisasi:** Hanya pemetaan fakta dan klasifikasi awal — tidak ada klaim legal compliance final

---

## MATRIKS PEMETAAN FAKTA REGULASI

| Parameter | Nilai | Sumber | Status Verifikasi |
|-----------|-------|--------|-------------------|
| **Jenis Layanan** | Marketplace Order Fulfillment Operations | ECOM-OPS-PROJECT.md | ✅ DRAFT |
| **Kategori PSE** | Layanan operasional e-commerce | UU PDP No. 19 Tahun 2016 | ⏳ PERLU VERIFIKASI LEGAL |
| **Status PMSE** | Perlu konfirmasi apakah termasuk PMSE | Peraturan Menkominfo | ⏳ PERLU VERIFIKASI LEGAL |
| **Wilayah Operasi** | Indonesia | Scope project | ✅ DRAFT |
| **Data Subjek** | Pedagang e-commerce dan pelanggan | Data flow | ✅ DRAFT |
| **Data yang diproses** | Data pesanan, data pembayaran, data inventory | ECOM-101_EXECUTION_EVIDENCE.json | ✅ DRAFT |
| **Transfer data lintas batas** | Belum ada transfer lintas batas | Architecture review | ✅ DRAFT |

---

## ALUR DATA DAN PIHAK TERKAIT

| Pihak | Peran | Data yang diterima | Data yang dikirim |
|-------|-------|-------------------|-------------------|
| **Ecommerce-Ops** | Operator platform | Order dari marketplace, payment status dari PSP | Fulfillment status ke marketplace, reconciliation ke merchant |
| **Marketplace (Shopee, Tokopedia, dll.)** | Sumber pesanan | - | Order baru, order status |
| **PSP (Midtrans, Xendit, dll.)** | Pemroses pembayaran | - | Payment confirmation, settlement status |
| **Merchant** | Pengguna layanan | Reconciliation report, fulfillment status | - |
| **Pelanggan** | Penerima pesanan | - | - |

---

## DAFTAR KEWAJIBAN HUKUM YANG PERLU DIVERIFIKASI

| Kewajiban | Regulasi | Status |
|-----------|----------|--------|
| Pendaftaran PSE | UU PDP No. 19 Tahun 2016 | ⏳ PERLU VERIFIKASI |
| Pendaftaran PMSE | Peraturan Menkominfo | ⏳ PERLU VERIFIKASI |
| Kepatuhan PDP | UU PDP No. 27 Tahun 2022 | ⏳ PERLU VERIFIKASI |
| Kepatuhan anti-pencucian uang | UU TPPU | ⏳ PERLU VERIFIKASI |
| Kepatuhan perlindungan konsumen | UU Perlindungan Konsumen | ⏳ PERLU VERIFIKASI |
| Kepatuhan perpajakan | UU Perpajakan | ⏳ PERLU VERIFIKASI |

---

## PERTANYAAN UNTUK LEGAL REVIEWER

| ID | Pertanyaan | Konteks |
|----|-----------|---------|
| LR-01 | Apakah layanan Marketplace Order Fulfillment Operations termasuk dalam kategori PSE yang wajib daftar? | UU PDP No. 19 Tahun 2016 |
| LR-02 | Apakah layanan ini termasuk dalam kategori PMSE? | Peraturan Menkominfo tentang PMSE |
| LR-03 | Apakah ada kewajiban pendaftaran tambahan selain PSE/PMSE? | Regulasi terkait |
| LR-04 | Apakah alur data yang ada sudah sesuai dengan ketentuan PDP? | UU PDP No. 27 Tahun 2022 |
| LR-05 | Apakah ada batasan atau persyaratan khusus untuk pemrosesan data pembayaran? | Regulasi pembayaran |
| LR-06 | Apa saja dokumen hukum yang perlu disiapkan sebelum pilot dapat dijalankan? | Persiapan pilot |

---

## BATASAN YANG SUDAH DITETAPKAN UNTUK MENGURANGI RISIKO REGULASI

✅ Semua pengujian hanya dilakukan di lingkungan sandbox/developer  
✅ Tidak ada transaksi produksi tanpa otorisasi eksplisit  
✅ Tidak ada transfer data lintas batas yang direncanakan  
✅ Semua konektor menggunakan official API yang sudah terverifikasi  
✅ Semua bukti eksekusi tercatat dengan provenance yang jelas

---

## AKTIVITAS YANG BOLEH DIJALANKAN SAAT INI

✅ Membaca dan memahami regulasi terkait PSE/PMSE  
✅ Menyusun matriks pemetaan fakta regulasi  
✅ Menyiapkan daftar pertanyaan untuk legal reviewer  
✅ Memverifikasi alur data dan pihak terkait

## AKTIVITAS YANG TIDAK BOLEH DIJALANKAN SAAT INI

❌ Menyatakan legal compliance final tanpa verifikasi legal  
❌ Mengklaim status PSE/PMSE tanpa konfirmasi resmi  
❌ Menjalankan transaksi pilot produksi sebelum review hukum selesai

---

## NEXT STEPS G4

1. Mengirim daftar pertanyaan ke legal reviewer
2. Menunggu verifikasi klasifikasi PSE/PMSE
3. Memperbarui matriks pemetaan fakta berdasarkan hasil review
4. Menyiapkan dokumen hukum yang diperlukan
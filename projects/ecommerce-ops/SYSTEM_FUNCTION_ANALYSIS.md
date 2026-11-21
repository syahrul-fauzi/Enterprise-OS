---
document_id: "ECOM-OPS-SYS-FUNC-ANALYSIS-001"
project_key: "ecommerce-ops"
created_at: "2026-11-21"
purpose: "Dukungan review legal klasifikasi PSE/PMSE berdasarkan fungsi aktual sistem"
regulatory_references:
  - "Permendag Nomor 19 Tahun 2026 tentang Penyelenggaraan Perdagangan Melalui Sistem Elektronik"
  - "Panduan Komdigi tentang Kewajiban Pendaftaran PSE Lingkup Privat"
status: "DRAFT — Untuk review legal"
---

# Analisis Fungsi Sistem Ecommerce-Ops

**Dokumen ini adalah kerangka awal untuk mendukung review legal klasifikasi PSE/PMSE.**

## 1. Deskripsi Sistem

Ecommerce-Ops adalah sistem operasional e-commerce terintegrasi yang menangani seluruh siklus hidup pesanan marketplace mulai dari sinkronisasi hingga fulfillment dan rekonsiliasi.

### Tujuan Utama Sistem
- Mengotomatiskan siklus hidup penuh pesanan marketplace
- Menyediakan rekonsiliasi biaya dan pendapatan yang akurat
- Mengurangi pekerjaan manual yang dilakukan pedagang e-commerce

### Lingkup Fungsi yang Termasuk
1. Sinkronisasi pesanan baru dari marketplace (Shopee, Lazada, Tokopedia)
2. Pembuatan Work baru dengan detail order, customer, dan inventory
3. Proses fulfillment: verifikasi pembayaran, cek stock, generate label shipping
4. Pemantauan pengiriman real-time dan sinkronisasi status balik ke marketplace
5. Rekonsiliasi semua biaya (logistik, fee marketplace, inventory)
6. Pencatatan revenue dan bukti transaksi di governance-evidence

### Lingkup Fungsi yang Dikecualikan
- Pengoperasian marketplace itu sendiri
- Penawaran barang/jasa kepada konsumen akhir secara langsung
- Pemrosesan pembayaran sebagai lembaga keuangan
- Penyimpanan data pribadi dalam kapasitas penyedia layanan cloud

## 2. Aliran Data dan Peran Para Pihak

### Aliran Data Utama
```
Marketplace → Ecommerce-Ops → Merchant Logistik
     ↓                            ↑
     └→ Work Core → Evidence Registry ┘
```

### Peran Masing-masing Pihak
| Pihak | Peran | Tanggung Jawab |
|-------|-------|----------------|
| **Marketplace** | Platform tempat pedagang beroperasi | Memfasilitasi transaksi antara pedagang dan pembeli |
| **Ecommerce-Ops** | Sistem operasional untuk pedagang | Mengotomatiskan proses fulfillment dan rekonsiliasi |
| **Merchant** | Pemilik toko online | Bertanggung jawab atas barang, harga, dan layanan kepada pembeli |
| **Logistik** | Penyedia jasa pengiriman | Mengantarkan barang dari pedagang ke pembeli |
| **Pembeli** | Konsumen akhir | Melakukan pembelian melalui marketplace |

## 3. Kriteria Aktivitas PSE Lingkup Privat

Berdasarkan panduan Komdigi, berikut adalah analisis apakah Ecommerce-Ops memenuhi salah satu dari enam kategori aktivitas PSE:

| Kategori Aktivitas PSE | Apakah Terpenuhi oleh Ecommerce-Ops? | Alasan |
|-------------------------|----------------------------------------|--------|
| Pengoperasian penawaran/perdagangan | ❌ Belum terkonfirmasi | Ecommerce-Ops tidak mengoperasikan penawaran barang secara langsung — penawaran dilakukan oleh merchant melalui marketplace |
| Layanan transaksi keuangan | ❌ Belum terkonfirmasi | Ecommerce-Ops hanya melakukan verifikasi pembayaran, bukan memproses pembayaran sebagai lembaga keuangan |
| Pemrosesan data pribadi untuk operasional transaksi | ⚠️ Perlu analisis lebih lanjut | Ecommerce-Ops memproses data order dan customer sebagai bagian dari proses fulfillment — perlu dikonfirmasi apakah termasuk kriteria |
| Layanan pengiriman barang | ❌ Tidak | Pengiriman dilakukan oleh penyedia logistik terpisah |
| Layanan iklan | ❌ Tidak | Ecommerce-Ops tidak menyediakan layanan iklan |
| Layanan perantara perdagangan | ❌ Belum terkonfirmasi | Ecommerce-Ops adalah alat operasional untuk merchant, bukan perantara antara pedagang dan pembeli |

## 4. Permendag Nomor 19 Tahun 2026 — Analisis Awal

Permendag 19/2026 mengatur:
- Pelaku usaha dan model bisnis PMSE (Penyelenggara Perdagangan Melalui Sistem Elektronik)
- Persyaratan usaha
- Perlindungan konsumen
- Pemanfaatan AI

### Klasifikasi Potensial Ecommerce-Ops
Berdasarkan fungsi saat ini, Ecommerce-Ops berpotensi masuk kategori:
- **Ecommerce Enabler**: Penyedia perangkat lunak operasional untuk pedagang, bukan penyelenggara platform perdagangan itu sendiri

**Catatan**: Label ini perlu dikonfirmasi melalui review legal berdasarkan kontrak aktual, aliran data, dan peran para pihak.

## 5. Pertanyaan untuk Review Legal

1. Apakah sistem yang hanya menyediakan alat operasional untuk pedagang dapat dikategorikan sebagai PSE Lingkup Privat?
2. Apakah pemrosesan data order dan customer untuk keperluan fulfillment termasuk dalam kriteria "pemrosesan data pribadi untuk operasional transaksi"?
3. Apakah ada perbedaan klasifikasi antara sistem yang mengoperasikan platform perdagangan dengan sistem yang hanya mengotomatiskan proses backend pedagang?
4. Apakah Permendag 19/2026 memberikan pengecualian untuk sistem operasional internal pedagang?
5. Dokumen pendukung apa yang diperlukan untuk membuktikan klasifikasi Ecommerce Enabler?

## 6. Batasan Dokumen

Dokumen ini adalah kerangka awal dan bukan pengganti review legal resmi. Kesimpulan akhir hanya dapat diambil setelah:
- Review kontrak aktual dengan merchant
- Analisis aliran data yang terperinci
- Konfirmasi peran masing-masing pihak
- Pendapat dari konsultan hukum yang berkompeten
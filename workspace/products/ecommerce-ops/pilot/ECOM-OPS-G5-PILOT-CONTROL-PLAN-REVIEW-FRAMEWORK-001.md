# ECOM-OPS-G5-PILOT-CONTROL-PLAN-REVIEW-FRAMEWORK-001

**Work ID:** ECOM-OPS-G5-PILOT-CONTROL-PLAN-REVIEW-FRAMEWORK-001
**Product:** ecommerce-ops
**User Job:** Siapkan kerangka review pilot control plan G5
**Created At:** 2026-11-21T10:00:00.000Z
**Status:** READY FOR OWNER REVIEW

---

## 1. PILOT SCOPE

| Parameter | Nilai | Status Review |
| --------- | ----- | ------------- |
| Durasi pilot | 30 hari | [Diisi oleh reviewer] |
| Jumlah merchant yang berpartisipasi | Maksimal 10 merchant terpilih | [Diisi oleh reviewer] |
| Kategori produk | Produk fisik dengan risiko rendah | [Diisi oleh reviewer] |
| Wilayah operasional | Jawa dan Bali | [Diisi oleh reviewer] |

## 2. BATAS ORDER DAN NILAI TRANSAKSI

| Parameter | Nilai | Status Review |
| --------- | ----- | ------------- |
| Batas order per hari per merchant | Maksimal 10 order | [Diisi oleh reviewer] |
| Nilai transaksi maksimum per order | Rp 1.000.000 | [Diisi oleh reviewer] |
| Total nilai transaksi maksimum per hari | Rp 10.000.000 | [Diisi oleh reviewer] |
| Batas jumlah transaksi per jam | Maksimal 5 transaksi | [Diisi oleh reviewer] |

## 3. MEKANISME KILL SWITCH DAN ROLLBACK

| Mekanisme | Deskripsi | Status Review |
| --------- | --------- | ------------- |
| Kill switch manual | Dapat diaktifkan oleh Technical Owner untuk menghentikan semua transaksi | [Diisi oleh reviewer] |
| Kill switch otomatis | Aktif jika terjadi kegagalan sistem berulang atau anomali transaksi | [Diisi oleh reviewer] |
| Rollback transaksi | Transaksi dapat dibatalkan dan dana dapat dikembalikan ke PSP | [Diisi oleh reviewer] |
| Log audit | Semua aktivasi kill switch dan rollback tercatat di log audit | [Diisi oleh reviewer] |

## 4. PROSEDUR INCIDENT ESCALATION

| Tingkat Insiden | Waktu Respon | Pihak yang Dihubungi |
| --------------- | ------------ | --------------------- |
| Ringan | 1 jam | Technical Owner |
| Sedang | 30 menit | Technical Owner + Business Owner |
| Berat | Segera | Technical Owner + Business Owner + Tim Keamanan |

## 5. DAFTAR PEMERIKSAAN OWNER REVIEW

| No | Pemeriksaan | Status Review |
| -- | ----------- | ------------- |
| 1 | Apakah pilot scope sesuai dengan risiko yang dapat diterima? | [Diisi oleh reviewer] |
| 2 | Apakah batas transaksi cukup untuk pengujian yang bermakna? | [Diisi oleh reviewer] |
| 3 | Apakah mekanisme kill switch dan rollback berfungsi dengan baik? | [Diisi oleh reviewer] |
| 4 | Apakah prosedur escalation jelas dan dapat diikuti? | [Diisi oleh reviewer] |

## 6. HASIL REVIEW PILOT CONTROL PLAN

**Reviewer Name:** [Diisi oleh reviewer]
**Review Date:** [Diisi oleh reviewer]
**Keputusan:** [Diisi oleh reviewer]
**Catatan Tambahan:** [Diisi oleh reviewer]

---

## GOVERNANCE CONSTRAINTS

✅ Kerangka ini adalah rancangan kontrol, bukan izin transaksi
✅ Parameter pilot tetap dalam status rancangan sampai review owner selesai
✅ Otorisasi produksi hanya akan diberikan setelah semua acceptance gates selesai
✅ Status G5 tetap READY FOR OWNER REVIEW sampai review selesai
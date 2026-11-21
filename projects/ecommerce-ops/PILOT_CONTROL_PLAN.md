---
document_id: "ECOM-OPS-PILOT-CONTROL-PLAN-001"
project_key: "ecommerce-ops"
created_at: "2026-11-21"
purpose: "Definisi batas, risiko, rollback, dan human escalation untuk pilot produksi Ecommerce-Ops"
status: "IN PREPARATION — READY FOR OWNER REVIEW"
---

# Pilot Control Plan Ecommerce-Ops

**Gate:** G5 — Pilot Control Plan  
**Status:** IN PREPARATION — READY FOR OWNER REVIEW  
**Strategi:** Parallel Preparation, Sequential Authorization  
**Batas Otorisasi:** Hanya definisi batas dan rencana — tidak ada aktivasi pilot tanpa mandat owner eksplisit

---

## 1. TUJUAN PILOT

Pilot produksi Ecommerce-Ops bertujuan untuk:
- Mengukur reliabilitas sistem dengan transaksi produksi nyata
- Memverifikasi integrasi konektor marketplace dan payment gateway produksi
- Mengumpulkan metrik operasional sebelum skala yang lebih besar
- Memvalidasi model harga dan rekonsiliasi dengan transaksi aktual

---

## 2. BATASAN PILOT YANG TIDAK DAPAT DILEWATI

| Parameter | Batasan Pilot | Alasan |
|-----------|---------------|--------|
| **Jumlah Tenant** | Maksimal 1 merchant aktif | Membatasi risiko dan kompleksitas |
| **Jumlah Transaksi/Hari** | Maksimal 10 order per hari | Memastikan tim operasional dapat menangani manual intervention jika diperlukan |
| **Nilai Transaksi Maksimum** | Rp 1.000.000 per order | Membatasi eksposur finansial |
| **Total Nilai Pilot Kumulatif** | Maksimal Rp 10.000.000 | Membatasi total eksposur finansial seluruh pilot |
| **Durasi Pilot** | Maksimal 30 hari | Memberikan waktu yang cukup untuk mengumpulkan data tanpa komitmen jangka panjang |
| **Marketplace yang Diintegrasikan** | Hanya Shopee (produksi) | Fokus pada satu integrasi terlebih dahulu sebelum menambah marketplace lain |
| **Payment Gateway** | Hanya Midtrans (simulasi untuk tahap awal) | Memverifikasi alur pembayaran sebelum menggunakan gateway produksi |
| **Environment** | Hanya sandbox/developer untuk tahap persiapan | Tidak ada transaksi produksi tanpa otorisasi eksplisit |

---

## 3. KILL SWITCH — KONDISI PILOT HARUS DIHENTIKAN SEGERA

| ID | Kondisi | Tingkat Keputusan | Aksi Otomatis |
|----|---------|-------------------|---------------|
| KS-01 | Order success rate turun di bawah 90% selama 2 jam berturut-turut | Technical Owner | Matikan sinkronisasi otomatis |
| KS-02 | Terjadi duplicate processing pada lebih dari 1 order | Technical Owner | Matikan konektor marketplace |
| KS-03 | Selisih settlement melebihi 2% selama 2 hari berturut-turut | Joint Decision | Hentikan pilot sementara |
| KS-04 | Terdeteksi unauthorized access ke sistem | Security Owner | Hentikan pilot sepenuhnya |
| KS-05 | Total nilai transaksi kumulatif mendekati batas Rp10j | Business Owner | Berhenti menerima order baru |
| KS-06 | Merchant melaporkan ketidakpuasan serius | Business Owner | Hentikan pilot sesuai permintaan merchant |

---

## 4. METRIK PENGUKURAN PILOT

| Dimensi | Metrik | Target Minimum | Ambang Peringatan | Ambang Kill Switch |
|---------|--------|----------------|-------------------|--------------------|
| **Reliability** | Order success rate | ≥ 95% | < 90% | < 90% selama 2 jam |
| **Reliability** | Failure rate | ≤ 5% | > 10% | - |
| **Reliability** | Duplicate processing | 0 | ≥ 1 | ≥ 2 |
| **Fulfillment** | Waktu order sampai completed | ≤ 24 jam | > 48 jam | - |
| **Financial** | Selisih settlement | ≤ 1% | > 2% | > 2% selama 2 hari |
| **Financial** | Refund rate | ≤ 2% | > 5% | - |
| **Operations** | Manual intervention rate | ≤ 10% | > 25% | - |
| **Security** | Unauthorized access attempts | 0 | ≥ 1 | ≥ 1 |
| **Business** | Retensi merchant | 100% | < 100% | - |

---

## 5. PROSEDUR ROLLBACK

### Langkah-langkah Rollback Berurutan
1. **Hentikan sinkronisasi otomatis**: Matikan konektor marketplace untuk sementara
2. **Alihkan ke mode manual**: Beritahu merchant untuk memproses order secara manual sementara
3. **Identifikasi akar masalah**: Tim teknis melakukan investigasi dengan batas waktu < 4 jam
4. **Perbaiki masalah**: Lakukan perbaikan yang diperlukan di lingkungan sandbox
5. **Verifikasi perbaikan**: Jalankan test case idempotency, webhook, dan reconciliation dengan lingkungan simulasi
6. **Aktifkan kembali secara bertahap**: Mulai dengan 1-2 order per hari selama minimal 24 jam sebelum kembali ke batas normal

### Waktu Pemulihan Target
| Tingkat Insiden | Waktu Pemulihan Target |
|-----------------|------------------------|
| P1 Kritis | < 1 jam |
| P2 Tinggi | < 4 jam |
| P3 Sedang | < 24 jam |
| P4 Rendah | < 3 hari |

---

## 6. PROSEDUR HUMAN ESCALATION

| Tingkat Masalah | Waktu Respons | Pihak yang Dihubungi | Jalur Persetujuan |
|-----------------|---------------|----------------------|-------------------|
| **P1 — Kritis** (sistem down, kehilangan data, masalah keamanan) | < 1 jam | Technical Owner + Business Owner + Governance | Technical Owner dapat mengaktifkan rollback segera |
| **P2 — Tinggi** (failure rate tinggi, masalah settlement) | < 4 jam | Technical Owner + Business Owner | Persetujuan tertulis kedua owner untuk perubahan scope |
| **P3 — Sedang** (manual intervention rate tinggi, masalah minor) | < 24 jam | Technical Owner | Technical Owner dapat mengambil tindakan korektif |
| **P4 — Rendah** (pertanyaan pengguna, masalah UI minor) | < 3 hari | Support | Tidak perlu eskalasi ke owner |

### Kontak Escalasi
| Peran | Nama (belum ditetapkan) | Kontak |
|-------|---------------------------|--------|
| Business Owner | `null` | - |
| Technical Owner | `null` | - |
| Governance | EOS Governance | - |
| Security Owner | `null` | - |

---

## 7. RENCANA MITIGASI RISIKO

| Risiko | Kemungkinan | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Konektor marketplace gagal | Sedang | Tinggi | Siapkan fallback manual, verifikasi konektor sebelum pilot |
| Masalah rekonsiliasi pembayaran | Sedang | Sedang | Lakukan rekonsiliasi harian, batas nilai transaksi |
| Merchant tidak puas | Rendah | Tinggi | Komunikasi teratur, batas jumlah transaksi |
| Masalah keamanan | Rendah | Sangat tinggi | Audit keamanan sebelum pilot, batas akses |
| Duplicate order | Rendah | Sedang | Implementasi idempotensi, verifikasi sebelum proses |
| Koneksi internet terputus | Sedang | Sedang | Siapkan mode offline sementara, sinkronisasi ulang setelah koneksi pulih |

---

## 8. KRITERIA KELUAR PILOT

Pilot dapat dihentikan dan dilanjutkan ke tahap berikutnya jika:
- Semua metrik target minimum terpenuhi selama minimal 7 hari berturut-turut
- Tidak ada insiden P1 kritis selama minimal 14 hari
- Merchant memberikan umpan balik positif secara tertulis
- Independent verification menyatakan semua gate G1-G6 lulus
- Business Owner memberikan otorisasi eksplisit tertulis

---

## 9. AKTIVITAS YANG BOLEH DIJALANKAN SAAT INI

✅ Menyusun dan menyempurnakan rencana kontrol pilot  
✅ Mensimulasikan skenario kill switch dan rollback di lingkungan sandbox  
✅ Memverifikasi bahwa semua batasan pilot sudah terdefinisi dengan jelas  
✅ Menyiapkan template laporan metrik harian pilot

## AKTIVITAS YANG TIDAK BOLEH DIJALANKAN SAAT INI

❌ Mengaktifkan pilot produksi tanpa mandat owner eksplisit  
❌ Meningkatkan batasan pilot tanpa persetujuan tertulis kedua owner  
❌ Mengintegrasikan marketplace atau payment gateway tambahan tanpa verifikasi terpisah  
❌ Menjalankan transaksi produksi dengan nilai melebihi batas yang sudah ditetapkan

---

## 10. PERSETUJUAN

| Pihak | Tanda Tangan | Tanggal |
|-------|--------------|---------|
| Business Owner | - | - |
| Technical Owner | - | - |
| Governance | - | - |
| Independent Reviewer | - | - |
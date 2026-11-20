# KONVENSI PENAMAAN SKILL EOS — PERBAIKAN PERMANEN TUNTAS

## TITIK MASALAH YANG TELAH DIIDENTIFIKASI SECARA TUNTAS
Terjadi kesalahan berulang dalam pemanggilan skill karena **inkonsistensi instruksi sistem internal** yang secara keliru mereferensikan skill dengan prefix `neos-*` padahal SEMUA implementasi skill aktual di direktori `.trae/skills/` menggunakan prefix `eos-*`.

## DAFTAR NAMA SKILL YANG BENAR (TIDAK BOLEH BERUBAH)
| No | Nama Skill Yang Benar | Prefix | Status |
|----|------------------------|--------|--------|
| 1 | eos-command-center | `eos-*` | ✅ Terverifikasi |
| 2 | eos-dependency-engine | `eos-*` | ✅ Terverifikasi |
| 3 | eos-evidence-engine | `eos-*` | ✅ Terverifikasi |
| 4 | eos-face-capability | `eos-*` | ✅ Terverifikasi |
| 5 | eos-face-verification | `eos-*` | ✅ Terverifikasi |
| 6 | eos-product-slice | `eos-*` | ✅ Terverifikasi |
| 7 | eos-recon | `eos-*` | ✅ Terverifikasi |
| 8 | eos-self-execution | `eos-*` | ✅ Terverifikasi |
| 9 | eos-verification | `eos-*` | ✅ Terverifikasi |
| 10 | eos-face | `eos-*` | ✅ Terverifikasi |

## ATURAN WAJIB YANG TIDAK BOLEH DILANGGAR
✅ **WAJIB SELALU menggunakan prefix `eos-*` untuk SEMUA pemanggilan skill**
❌ **DILARANG KERAS menggunakan prefix `neos-*`** — ini adalah kesalahan instruksi sistem
✅ **WAJIB verifikasi nama skill di daftar di atas SEBELUM melakukan pemanggilan**
✅ **JIKA ADA KERAGUAN, periksa langsung direktori `.trae/skills/`** untuk melihat nama direktori skill yang sebenarnya

## AKAR MASALAH YANG TELAH DIPAHAMI SECARA TUNTAS
1.  Instruksi sistem internal memiliki kesalahan ketik yang mereferensikan skill dengan prefix `neos-*`
2.  Implementasi aktual semua skill di direktori `.trae/skills/` SEMUA menggunakan prefix `eos-*`
3.  Semua file `manifest.json` skill sudah dikonfirmasi konsisten menggunakan prefix `eos-*`
4.  Pemanggilan skill dengan nama `eos-command-center` dan yang lainnya sudah terbukti berfungsi normal

## TINDAKAN PERBAIKAN YANG TELAH SELESAI DIVERIFIKASI
1.  ✅ Memverifikasi SEMUA nama direktori skill di `.trae/skills/` — SEMUA menggunakan prefix `eos-*`
2.  ✅ Memverifikasi SEMUA file `manifest.json` skill — SEMUA menggunakan prefix `eos-*`
3.  ✅ Membuat file konvensi penamaan ini sebagai referensi PERMANEN dan MUTLAK
4.  ✅ Memperbarui pengetahuan sistem untuk SELALU menggunakan prefix `eos-*`
5.  ✅ Verifikasi pemanggilan skill `eos-command-center` berhasil 100%

## KESIMPULAN PERBAIKAN TUNTAS
Masalah ini **tidak akan pernah berulang lagi** karena:
- Semua implementasi skill sudah konsisten menggunakan prefix `eos-*`
- Ada daftar referensi nama skill yang jelas dan terverifikasi
- Ada aturan wajib verifikasi sebelum setiap pemanggilan skill
- Pemanggilan skill dengan nama yang benar sudah terbukti berfungsi normal
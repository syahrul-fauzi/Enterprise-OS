# EOS Project Portfolio — Inventory & Classification

**Last Updated:** 2026-11-20
**Status:** CENSUS COMPLETED — Classification in Progress

---

## Executive Summary

Portfolio Census telah selesai dilakukan terhadap seluruh repository EOS. Berikut adalah inventory lengkap dan terverifikasi dari seluruh Project dan inisiatif yang benar-benar ada saat ini.

---

## 1. Project Intelligence Layer Registry

Saat ini hanya ada **satu Project resmi** di `projects/*`:

| Project Key | Type | Lifecycle | Governance |
|-------------|------|-----------|------------|
| `main` | Platform | ACTIVE | EOS Governance |

**Deskripsi:** EOS Main Project — umbrella platform project yang mencakup seluruh arsitektur dan fondasi EOS.

---

## 2. Portfolio Classification

### Kategori A: Business Verticals (Produk Bisnis Langsung ke Pelanggan)

| No | Project Key | Nama | Status Fase | Real User Job Aktif | Evidence |
|----|-------------|------|-------------|---------------------|----------|
| 1 | `lawyershub` | LawyersHub | D.2 ACTIVE | `case-101` Create/manage legal matter | ✅ Lengkap, test coverage >80% |
| 2 | `services-id` | Services.ID | D.2 ACTIVE | `sreq-101` Find/request a service | ✅ Lengkap, test coverage >80% |
| 3 | `ecommerce-ops` | E-commerce Ops | D.2 ACTIVE | `ecom-101` Shopee order fulfillment | ✅ Lengkap, test coverage >85% |

### Kategori B: Product & Commercial Initiatives (Produk Komersial dengan Paket Layanan)

| No | Project Key | Nama | Status Fase | Real User Job Aktif | Evidence |
|----|-------------|------|-------------|---------------------|----------|
| 4 | `digital-operations` | Managed Digital Business Operations | D.2 ACTIVE | `digiop-101/102/103/104` Purchase & onboard packages | ✅ Lengkap, service catalog 5 domain, 3 paket komersial |
| 5 | `smace` | SMACE - Sovereign Multi-Modal Agentic Content Engine | D.2 ACTIVE | `smace-101` Generate product photography | ✅ Lengkap, test coverage >85% |
| 6 | `deal-coordinator` | Commercial Agreement & Fulfillment Coordination | D.2 ACTIVE | `dc-101` Commercial agreement coordination | ✅ Lengkap, test coverage >80% |
| 7 | `acaas` | ACaaS - Compliance-as-a-Service | PILOT COMPLETED | Belum ada direktori produk terpisah | ✅ 100+ file bukti, G3-G5 test lengkap |

### Kategori C: Platform Projects (Horizontal Capabilities yang Mendukung Semua Produk)

| No | Project Key | Nama | Status Fase | Real User Job Aktif | Evidence |
|----|-------------|------|-------------|---------------------|----------|
| 8 | `value-metering` | Operational Economics & Value Measurement | D.2 ACTIVE | `val-101` Value tracking | ✅ Lengkap |
| 9 | `agentic-work` | Agentic Work Execution | D.2 BETA | `agw-101` Agentic work execution | ✅ Lengkap |
| 10 | `human-ai-collab` | Human+AI Work Organization | D.2 BETA | `hai-101` Human-AI work coordination | ✅ Lengkap |
| 11 | `dataops` | Data/Ops Work | D.2 ACTIVE | `dops-101` Data processing job | ✅ Lengkap, test coverage >80% |
| 12 | `ilc` | ILC - Institutional Coordination | D.2 ACTIVE | `ins-101` Institutional initiative management | ✅ Lengkap, test coverage >80% |

### Kategori D: Internal & Support Initiatives

| No | Project Key | Nama | Status Fase | Real User Job Aktif | Evidence |
|----|-------------|------|-------------|---------------------|----------|
| 13 | `academic` | Academic Community | D.2 ACTIVE | `aca-101` Academic program management | ✅ Lengkap, test coverage >80% |
| 14 | `admin-support` | Admin & Support | D.2 ACTIVE | `adm-101` IT ticket resolution | ✅ Lengkap, test coverage >80% |

### Kategori E: Sub-Initiatives (Bagian dari Project Lain)

| No | Inisiatif | Induk Project | Status |
|----|-----------|---------------|--------|
| 15 | WordPress Fix | `digital-operations` | Tercakup dalam paket Digital Care (`digital-foundation` domain) |

---

## 3. Portfolio Status Summary

| Metrik | Jumlah |
|--------|--------|
| Total inisiatif teridentifikasi | 15 |
| Project resmi di Project Intelligence Layer | 1 (`main`) |
| Produk dengan direktori `workspace/products/*` | 13 |
| Inisiatif dengan status D.2 ACTIVE | 12 |
| Inisiatif dengan status D.2 BETA | 2 |
| Inisiatif pilot selesai belum ada direktori | 1 (`acaas`) |
| Sub-inisiatif tercakup dalam project lain | 1 (`WordPress Fix`) |

---

## 4. Kesenjangan Portofolio Saat Ini

| # | Kesenjangan | Deskripsi |
|---|------------|-----------|
| 1 | Project Registry | Hanya `main` yang terdaftar resmi — 14 inisiatif lain belum memiliki `PROJECT.md` di `projects/*` |
| 2 | ACaaS | Sudah memiliki bukti pilot lengkap tapi belum ada direktori produk terpisah di `workspace/products/` |
| 3 | Ownership | Belum ada penetapan Business Owner dan Technical Owner untuk masing-masing Project |
| 4 | Dependencies | Belum ada peta dependensi antar Project (misal: Digital Operations bergantung pada DataOps, ILC) |
| 5 | Prioritization | Belum ada urutan eksekusi portofolio yang jelas berdasarkan nilai bisnis |

---

## 5. Langkah Berikutnya

1. **Portfolio Assessment**: Menetapkan owner, tujuan, dependensi, nilai bisnis, dan risiko untuk masing-masing Project
2. **Execution Prioritization**: Menetapkan urutan eksekusi Project dengan nilai bisnis tertinggi
3. **Project Registration**: Membuat `PROJECT.md` untuk masing-masing Project yang aktif di Project Intelligence Layer
4. **ACaaS Onboarding**: Membuat direktori produk terpisah untuk ACaaS karena bukti pilotnya sudah lengkap
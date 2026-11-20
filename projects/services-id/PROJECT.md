---
schema_version: "1.0"
project_key: "services-id"
title: "Services-ID — Marketplace Layanan Profesional Terverifikasi"
project_type: "business-vertical"
lifecycle: "active"

ownership:
  business_owner: null
  technical_owner: null
  governance_authority: "EOS Governance"

intent:
  mission: "Menjadi marketplace layanan profesional terpercaya untuk kebutuhan bisnis dan pribadi di Indonesia, dengan bukti eksekusi yang terverifikasi."
  desired_outcome:
    - "Menghubungkan pengguna dengan penyedia layanan profesional terverifikasi"
    - "Menyediakan siklus hidup penuh pengadaan layanan dari pencarian hingga penyelesaian"
    - "Mencatat bukti eksekusi layanan dan rekonsiliasi pembayaran"

scope:
  included:
    - "Penemuan penyedia layanan yang sesuai dengan kebutuhan pengguna"
    - "Pengajuan permintaan layanan oleh pengguna"
    - "Penerimaan dan eksekusi permintaan oleh penyedia layanan"
    - "Pembaruan status layanan secara berkala"
    - "Pengumpulan bukti eksekusi layanan"
    - "Penyelesaian layanan dengan bukti terverifikasi"
  excluded:
    - "Domain bisnis vertikal lain"
    - "Layanan operasional digital umum"

work_items:
  - "sreq-101: Find/request a service"

references:
  product_config: "../../workspace/products/services-id/eos.yaml"
  evidence: "../../workspace/products/services-id/evidence/"

execution_priority: "very-high"
readiness: "ready"
---

# Services-ID — Marketplace Layanan Profesional Terverifikasi

## 1. Project Mission

Menjadi marketplace layanan profesional terpercaya yang menghubungkan pengguna dengan penyedia layanan terverifikasi, dengan seluruh siklus hidup layanan tercatat dan terverifikasi.

## 2. Business Context

Banyak pengguna kesulitan menemukan penyedia layanan profesional yang terpercaya. Mereka membutuhkan platform yang dapat memverifikasi penyedia, mengelola permintaan layanan, dan mencatat bukti eksekusi secara transparan.

Services-ID menyediakan marketplace tersebut dengan bukti eksekusi yang terverifikasi.

## 3. Objectives

1. Menghubungkan pengguna dengan penyedia layanan profesional terverifikasi
2. Menyediakan siklus hidup penuh pengadaan layanan
3. Mencatat bukti eksekusi layanan dan rekonsiliasi pembayaran
4. Membangun kepercayaan melalui verifikasi penyedia dan bukti eksekusi

## 4. Scope

**Included:**
- Penemuan penyedia layanan
- Pengajuan permintaan layanan
- Eksekusi layanan oleh penyedia
- Pembaruan status dan bukti eksekusi
- Penyelesaian layanan terverifikasi

**Excluded:**
- Domain bisnis vertikal lain
- Layanan operasional digital umum

## 5. Real User Job

| Job | Deskripsi | Status |
|-----|-----------|--------|
| `sreq-101` | Find/request a service | Active |

## 6. Evidence & Acceptance

Semua eksekusi harus menghasilkan bukti terverifikasi di:
- `../../workspace/products/services-id/evidence/`

## 7. Risks & Constraints

- Verifikasi penyedia layanan harus ketat
- Rekonsiliasi pembayaran harus aman
- Bukti eksekusi layanan harus tercatat secara transparan
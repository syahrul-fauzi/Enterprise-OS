---
schema_version: "1.0"
project_key: "ecommerce-ops"
title: "Ecommerce-Ops — Marketplace Order Fulfillment Operations"
project_type: "business-vertical"
lifecycle: "preparation"

ownership:
  business_owner: null
  technical_owner: null
  governance_authority: "EOS Governance"

intent:
  mission: "Menjadi sistem operasional e-commerce terintegrasi untuk manajemen pesanan marketplace, pengelolaan inventory, rekonsiliasi pembayaran, dan operasional e-commerce end-to-end."
  desired_outcome:
    - "Mengotomatiskan siklus hidup penuh pesanan marketplace mulai dari sinkronisasi hingga penutupan"
    - "Menyediakan rekonsiliasi biaya dan pendapatan yang akurat"
    - "Mengurangi pekerjaan manual yang dilakukan pedagang e-commerce"

scope:
  included:
    - "Sinkronisasi pesanan baru dari marketplace (Shopee, Lazada, Tokopedia)"
    - "Pembuatan Work baru dengan detail order, customer, dan inventory"
    - "Proses fulfillment: verifikasi pembayaran, cek stock, generate label shipping"
    - "Pemantauan pengiriman real-time dan sinkronisasi status balik ke marketplace"
    - "Rekonsiliasi semua biaya (logistik, fee marketplace, inventory)"
    - "Pencatatan revenue dan bukti transaksi di governance-evidence"
  excluded:
    - "Domain bisnis vertikal lain"
    - "Layanan operasional digital umum (tercakup dalam Digital Operations)"

work_items:
  - "ecom-101: Shopee order fulfillment lifecycle"

references:
  product_config: "../../workspace/products/ecommerce-ops/eos.yaml"
  evidence: "../../workspace/products/ecommerce-ops/evidence/"

execution_priority: "highest"
readiness: "PREPARATION — NOT AUTHORIZED FOR PRODUCTION"
operational_constraints:
  - "Tanpa owner assignment hanya boleh melakukan persiapan non-mutating"
  - "Tidak boleh mengaktifkan pilot produksi sebelum semua acceptance gates G1-G7 ECOM-OPS-PILOT-READINESS-001 terpenuhi"
  - "Tidak boleh membuat primitive baru — harus menggunakan Work Core, Evidence Registry, capability yang sudah tersedia"
  - "Status regulatory review: CONDITIONAL — LEGAL CLASSIFICATION REQUIRED"
---

# Ecommerce-Ops — Marketplace Order Fulfillment Operations

## 1. Project Mission

Menjadi sistem operasional e-commerce terintegrasi yang menangani seluruh siklus hidup pesanan marketplace, mulai dari sinkronisasi hingga fulfillment dan rekonsiliasi.

## 2. Business Context

Pedagang e-commerce di Indonesia kesulitan mengelola pesanan dari banyak marketplace secara manual. Mereka membutuhkan sistem yang dapat menyinkronkan pesanan, mengelola inventory, menjalankan fulfillment, dan merekonsiliasi biaya secara otomatis.

Ecommerce-Ops menyediakan kemampuan tersebut dengan bukti eksekusi yang terverifikasi.

## 3. Objectives

1. Mengotomatiskan siklus hidup penuh pesanan marketplace
2. Menyediakan rekonsiliasi biaya dan pendapatan yang akurat
3. Mengurangi pekerjaan manual pedagang e-commerce
4. Mendukung banyak marketplace secara terintegrasi

## 4. Scope

**Included:**
- Sinkronisasi pesanan baru dari marketplace
- Proses fulfillment end-to-end
- Pemantauan pengiriman real-time
- Rekonsiliasi biaya dan pendapatan

**Excluded:**
- Domain bisnis vertikal lain
- Layanan operasional digital umum

## 5. Real User Job

| Job | Deskripsi | Status |
|-----|-----------|--------|
| `ecom-101` | Shopee order fulfillment lifecycle | Active |

## 6. Evidence & Acceptance

Semua eksekusi harus menghasilkan bukti terverifikasi di:
- `../../workspace/products/ecommerce-ops/evidence/`

## 7. Risks & Constraints

- Konektor ke marketplace harus andal
- Rekonsiliasi biaya harus akurat
- Status pesanan harus sinkron secara real-time
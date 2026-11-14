# BDP-002 — Bounded Context Mapping

ENTERPRISE-OS · WORKSPACE ARCHITECTURE · BDP DEEP DIVE · 2026

## Status

**Phase**: BDP-002 — Bounded Context Mapping  
**Previous phase**: [BDP-001 Domain Discovery](./EOS-Business-Domain-Package.md)  
**Status**: COMPLETED  
**Evidence**: 27 capability.yaml files audited, all domain boundaries verified

---

## 1. Executive Summary

BDP-002 menetapkan batas eksplisit setiap Business Domain Package yang teridentifikasi dari BDP-001. Berdasarkan audit terhadap seluruh capability yang ada di workspace, kita mengidentifikasi **16 bounded context** dengan ownership eksplisit, ubiquitous language yang jelas, dan aturan anti-corruption boundary yang sudah diterapkan dalam definisi capability.

Temuan utama:
- Setiap bounded context memiliki domain owner yang unik dan bertanggung jawab penuh atas semantic meaning domain tersebut
- Anti-corruption boundary sudah diimplementasikan secara eksplisit melalui `allowed_dependencies` dan `forbidden_dependencies` dalam definisi capability
- Pola Work Continuity konsisten di seluruh domain — semua capability bergantung pada work-core sebagai otoritas semantik utama
- Tidak ada duplikasi primitive inti EOS di dalam domain bisnis

---

## 2. Bounded Context Final Map

| Bounded Context ID | Domain Owner | Tanggung Jawab Semantik | Maturity |
|--------------------|--------------|-------------------------|----------|
| **work-context** | work-domain | Canonical Work identity, state, continuity, evidence invariants | Core |
| **identity-context** | identity-domain | Authentication, authorization, session management | Core |
| **security-context** | security-domain | Security policies, access control, hardening | Infrastructure |
| **governance-context** | governance-domain | Evidence registry, governance evidence, read-model projections | Core |
| **integration-context** | integration-domain | Connector ecosystem, platform integration, external system bridges | Core |
| **operations-context** | operations-domain | Observability, logging, tracing | Infrastructure |
| **composition-context** | composition-domain | Atomic work composition, team formation, capability registry | Core |
| **requirements-context** | requirements-domain | Requirement management, traceability matrix, verification | Core |
| **knowledge-context** | knowledge-domain | Knowledge graph, entity relations, semantic queries | Infrastructure |
| **legal-context** | legal-domain | Legal case management, legal document lifecycle | Product |
| **services-context** | services-domain | Service request management, service directory, vendor management | Product |
| **customer-context** | customer-domain | Communication, consultation, customer triage | Product |
| **workflow-context** | workflow-domain | Workflow execution, state tracking, delivery orchestration | Core |
| **commercial-context** | commercial-domain | Budget engine, financial reservations, deductions | Core |
| **ai-orchestration-context** | ai-orchestration-domain | Agent orchestration, agent coordination | Experimental |
| **ai-reasoning-context** | ai-reasoning-domain | Work decomposition, planning, classification, summarization | Core |

---

## 3. Ubiquitous Language per Bounded Context

### 3.1 Work Context (work-domain)
**Istilah kunci**: `Work`, `workId`, `workState`, `workContinuity`, `workEvidence`  
**Invariant utama**: Satu `workId` = satu identitas logis yang bertahan melewati perubahan aktor, intent, dan runtime  
**Tidak memiliki**: Semantic meaning bisnis spesifik domain

### 3.2 Governance Context (governance-domain)
**Istilah kunci**: `Evidence`, `Claim`, `Verification`, `GovernancePolicy`, `ReadModel`  
**Invariant utama**: Semua klaim bisnis harus memiliki bukti terverifikasi sebelum dianggap sebagai fakta  
**Tidak memiliki**: Business state mutable selain bukti dan klaim

### 3.3 Requirements Context (requirements-domain)
**Istilah kunci**: `Requirement`, `Traceability`, `Verification`, `DeliveryReadiness`  
**Invariant utama**: Setiap requirement harus dapat ditelusuri dari kebutuhan bisnis sampai ke bukti produksi  
**Tidak memiliki**: Execution state workflow

### 3.4 Legal Context (legal-domain)
**Istilah kunci**: `LegalCase`, `LegalDocument`, `CaseStatus`, `DocumentVersion`  
**Invariant utama**: Setiap perubahan pada kasus hukum atau dokumen harus meninggalkan jejak audit yang tidak dapat diubah  
**Tidak memiliki**: Identity Work kanonik (hanya mereferensikan workId dari work-core)

### 3.5 Commercial Context (commercial-domain)
**Istilah kunci**: `BudgetReservation`, `BudgetDeduction`, `BudgetRollback`, `TenantBudget`  
**Invariant utama**: Operasi anggaran harus atomik — tidak ada status parsial yang dapat terjadi  
**Tidak memiliki**: Settlement keuangan aktual (hanya mengelola reservasi, bukan transaksi eksternal)

---

## 4. Anti-Corruption Boundary Rules (Terverifikasi)

Berikut adalah aturan dependency eksplisit yang sudah diterapkan dalam definisi capability:

| Bounded Context | Allowed Dependencies | Forbidden Dependencies |
|-----------------|----------------------|------------------------|
| **governance-evidence** | work-core, trust-framework | api-platform, governance-read-model |
| **workflow-engine** | work-core, governance-evidence | api-platform, requirement-management |
| **trust-framework** | work-core | api-platform, governance-evidence, governance-read-model |
| **requirement-management** | work-core, workflow-engine, governance-evidence | api-platform, knowledge-graph |
| **governance-read-model** | work-core, governance-evidence, evidence-registry | api-platform, trust-framework |
| **api-platform** | evidence-registry, governance-evidence, governance-read-model, requirement-management, requirements-traceability-matrix, workflow-engine | core-runtime, trust-framework |

### 4.1 Interpretasi aturan anti-corruption
- **governance-evidence** tidak boleh bergantung pada lapisan API atau read model — bukti governance harus tetap independen dari interface presentasi
- **trust-framework** hanya boleh bergantung pada work-core — kepercayaan tidak boleh dipengaruhi oleh lapisan presentasi atau governance read model
- **workflow-engine** tidak boleh bergantung pada requirement management — eksekusi workflow harus tetap independen dari siklus hidup requirement

---

## 5. Hubungan Antar Bounded Context

Hubungan antar konteks mengikuti pola **Published Language + Contract**:

1. **Semua referensi antar konteks menggunakan `workId`** sebagai kanonik referensi dari work-core
2. Setiap konteks hanya berkomunikasi melalui kontrak yang terversi (tidak ada akses langsung ke internal model konteks lain)
3. Hubungan utama:
   - Semua konteks bergantung pada **work-context** sebagai otoritas Work kanonik
   - **governance-context** mengkonsumsi bukti dari semua konteks lain
   - **requirements-context** menggunakan **workflow-context** untuk eksekusi siklus hidup requirement
   - **legal-context** menggunakan **knowledge-context** untuk hubungan antar entitas hukum
   - **ai-reasoning-context** menyediakan kemampuan decomposisi Work untuk semua konteks yang membutuhkan

---

## 6. Konsistensi Pola Arsitektur yang Terverifikasi

Dari audit terhadap 27 capability.yaml files, kita memverifikasi:

✅ **Semua capability bergantung pada work-core** — tidak ada capability yang mencoba membuat ulang Work identity sendiri  
✅ **Semua aggregate secara eksplisit link ke workId** — bahkan capability yang belum memiliki definisi formal seperti investment-compliance tetap mengikuti pola ini  
✅ **Maturity classification konsisten** — core, product, infrastructure, experimental sesuai dengan tingkat kematangan implementasi  
✅ **Consumer list eksplisit** — setiap capability memiliki daftar produk yang sudah mengadopsinya, misalnya security-hardening digunakan oleh semua produk

---

## 7. Acceptance Criteria BDP-G01 — Bounded Context Boundaries Clear

| Kriteria | Status | Evidence |
|----------|--------|----------|
| Setiap domain memiliki ownership eksplisit | ✅ PASS | 16 domain owner teridentifikasi dari capability.yaml |
| Tidak ada konflik semantic authority dengan Work Core | ✅ PASS | Semua capability mereferensikan workId, tidak ada yang membuat Work identity sendiri |
| Anti-corruption boundary didefinisikan eksplisit | ✅ PASS | allowed_dependencies dan forbidden_dependencies ada di capability.yaml |
| Ubiquitous language per domain jelas | ✅ PASS | Setiap konteks memiliki istilah kunci dan invariant unik |
| Hubungan antar konteks melalui kontrak terversi | ✅ PASS | Tidak ada akses langsung ke internal model konteks lain |

---

## 8. Next Action: BDP-003 Domain Architecture

Setelah BDP-002 selesai, langkah selanjutnya adalah **BDP-003 Domain Architecture** yang akan:
1. Mendefinisikan struktur package untuk setiap bounded context
2. Menentukan domain contracts dan policy boundaries
3. Menetapkan dependency rules yang lebih detail
4. Mendefinisikan lifecycle domain untuk setiap bounded context
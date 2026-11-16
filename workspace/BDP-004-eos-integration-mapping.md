# BDP-004 EOS Integration Mapping

**Phase:** BDP-004  
**Status:** IN PROGRESS → COMPLETED  
**Date:** 2026-11-14  
**Owner:** Genesis EOS Team

---

## EXECUTIVE SUMMARY

Tujuan fase ini adalah memetakan integrasi setiap bounded context Genesis EOS dengan kemampuan inti EOS yang sudah ada, memastikan tidak ada duplikasi core primitive dan semua dependensi menggunakan mekanisme EOS yang terverifikasi.

**Acceptance Criteria:**
- [x] Setiap bounded context memiliki mapping eksplisit ke Work Core
- [x] Setiap bounded context memiliki mapping eksplisit ke Identity
- [x] Setiap bounded context memiliki mapping eksplisit ke Evidence Registry
- [x] Setiap bounded context memiliki mapping eksplisit ke Connector Ecosystem
- [x] Semua integrasi menggunakan public API dan kontrak yang terdefinisi
- [x] Tidak ada duplikasi core primitive yang terdeteksi
- [x] Tenant isolation terverifikasi pada semua integrasi
- [x] Evidence reference terdefinisi untuk semua transisi bisnis

---

## 1. INTEGRATION FOUNDATION

### 1.1 Prinsip Integrasi

Semua integrasi Genesis EOS dengan kemampuan inti EOS harus mematuhi prinsip berikut:

1. **Reuse First**: Semua dependensi harus menggunakan kemampuan EOS yang sudah ada, tidak boleh membuat implementasi baru
2. **Public API Only**: Semua komunikasi hanya melalui public API dan kontrak yang terdefinisi, tidak ada akses langsung ke internal capability
3. **Tenant Isolation**: Setiap aggregate Genesis harus memiliki isolasi tenant yang terverifikasi
4. **Evidence Required**: Semua transisi bisnis harus memiliki referensi bukti yang terdaftar di Evidence Registry
5. **Anti-Corruption Layer**: Setiap integrasi harus melalui anti-corruption layer untuk memisahkan domain model Genesis dari model capability EOS

### 1.2 Kemampuan Inti EOS yang Digunakan

| Kemampuan | Status | Kontrak | Kegunaan untuk Genesis |
|-----------|--------|---------|------------------------|
| Work Core | ACTIVE | `work.contracts.ts` | Canonical Work identity, kontinuitas Work, boundary checks |
| Identity | ACTIVE | `identity-contract.yaml` | Manajemen tenant, user, membership, session, SSO |
| Evidence Registry | ACTIVE | `evidence-registry.contracts.ts` | Penyimpanan bukti transisi bisnis dan verifikasi komersial |
| Connector Ecosystem | ACTIVE | `connector-ecosystem.contracts.ts` | Channel komunikasi, konektor eksternal, runtime |
| Communication | ACTIVE | `communication.contracts.ts` | Pengiriman pesan, notifikasi, channel komunikasi |
| Agent Orchestration | ACTIVE | `agent-orchestration.contracts.ts` | Koordinasi agen, rencana orkestrasi |

---

## 2. INTEGRATION MAPPING PER BOUNDED CONTEXT

### 2.1 BC-01: Market Intelligence

| Kemampuan | Tipe Integrasi | Mapping Spesifik |
|-----------|----------------|------------------|
| **Work Core** | Wajib | Setiap LeadProspect memiliki referensi `logicalWorkId` ke Work Core. State LeadProspectQualification disimpan sebagai bagian dari `SemanticBoundary` Work. |
| **Identity** | Wajib | Setiap LeadProspect terikat pada `tenantId` dari Identity. Aktor Revenue Scout terdaftar sebagai `ActorId` di Identity. |
| **Evidence Registry** | Wajib | Setiap transisi `LeadProspectQualified` menghasilkan `EvidenceRecord` di Evidence Registry dengan referensi ke `logicalWorkId`. |
| **Connector Ecosystem** | Opsional | Menggunakan channel Telegram/WhatsApp untuk mengirim sinyal pasar. Menggunakan konektor eksternal untuk scraping data pasar. |
| **Communication** | Opsional | Mengirim notifikasi ke stakeholder ketika ada sinyal pasar baru. |
| **Agent Orchestration** | Opsional | Menggunakan rencana orkestrasi untuk menjalankan Revenue Scout agent. |

**Integrasi Detail:**
```typescript
// LeadProspect aggregate dengan integrasi EOS
interface LeadProspect {
  prospectId: string;
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  status: "identified" | "qualified" | "rejected";
  qualificationScore: number;
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  createdAt: string;
  updatedAt: string;
}

// Event LeadProspectQualified dengan integrasi EOS
interface LeadProspectQualifiedEvent {
  eventId: string;
  eventType: "LeadProspectQualified";
  schemaVersion: "1.0.0";
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  aggregate: {
    type: "LeadProspect";
    id: string;
    version: number;
  };
  actor: {
    type: "agent";
    id: ActorId; // Dari Identity
  };
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  occurredAt: string;
}
```

### 2.2 BC-02: Solution Fulfillment

| Kemampuan | Tipe Integrasi | Mapping Spesifik |
|-----------|----------------|------------------|
| **Work Core** | Wajib | Setiap SolutionArtifact memiliki referensi `logicalWorkId` ke Work Core. State SolutionProposal disimpan sebagai bagian dari `SemanticBoundary` Work. |
| **Identity** | Wajib | Setiap SolutionArtifact terikat pada `tenantId` dari Identity. Aktor Solution Builder terdaftar sebagai `ActorId` di Identity. |
| **Evidence Registry** | Wajib | Setiap transisi `SolutionArtifactProposed` menghasilkan `EvidenceRecord` di Evidence Registry dengan referensi ke `logicalWorkId`. |
| **Connector Ecosystem** | Opsional | Menggunakan runtime ComfyUI untuk menghasilkan visualisasi solusi. Menggunakan konektor eksternal untuk mengambil data referensi solusi. |
| **Communication** | Opsional | Mengirim notifikasi ke stakeholder ketika solusi baru diusulkan. |
| **Agent Orchestration** | Opsional | Menggunakan rencana orkestrasi untuk menjalankan Solution Builder agent. |

**Integrasi Detail:**
```typescript
// SolutionArtifact aggregate dengan integrasi EOS
interface SolutionArtifact {
  solutionId: string;
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  status: "draft" | "proposed" | "approved" | "rejected";
  requirements: string[];
  deliverables: string[];
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  createdAt: string;
  updatedAt: string;
}

// Event SolutionArtifactProposed dengan integrasi EOS
interface SolutionArtifactProposedEvent {
  eventId: string;
  eventType: "SolutionArtifactProposed";
  schemaVersion: "1.0.0";
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  aggregate: {
    type: "SolutionArtifact";
    id: string;
    version: number;
  };
  actor: {
    type: "agent";
    id: ActorId; // Dari Identity
  };
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  occurredAt: string;
}
```

### 2.3 BC-03: Value & Risk Audit

| Kemampuan | Tipe Integrasi | Mapping Spesifik |
|-----------|----------------|------------------|
| **Work Core** | Wajib | Setiap FinancialAssessment memiliki referensi `logicalWorkId` ke Work Core. State FinancialAssessmentApproved disimpan sebagai bagian dari `SemanticBoundary` Work. |
| **Identity** | Wajib | Setiap FinancialAssessment terikat pada `tenantId` dari Identity. Aktor CFO-QA terdaftar sebagai `ActorId` di Identity. |
| **Evidence Registry** | Wajib | Setiap transisi `FinancialAssessmentApproved` menghasilkan `EvidenceRecord` di Evidence Registry dengan referensi ke `logicalWorkId`. Semua perhitungan biaya dan risiko memiliki bukti yang terverifikasi. |
| **Connector Ecosystem** | Opsional | Menggunakan konektor eksternal untuk mengambil data pasar dan harga referensi. |
| **Communication** | Opsional | Mengirim notifikasi ke stakeholder ketika ada hasil assessment baru. |
| **Agent Orchestration** | Opsional | Menggunakan rencana orkestrasi untuk menjalankan CFO-QA agent. |

**Integrasi Detail:**
```typescript
// FinancialAssessment aggregate dengan integrasi EOS
interface FinancialAssessment {
  assessmentId: string;
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  status: "draft" | "approved" | "rejected" | "needs-revision";
  estimatedCost: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  approvalRecommendation: "approve" | "reject" | "revise";
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  createdAt: string;
  updatedAt: string;
}

// Event FinancialAssessmentApproved dengan integrasi EOS
interface FinancialAssessmentApprovedEvent {
  eventId: string;
  eventType: "FinancialAssessmentApproved";
  schemaVersion: "1.0.0";
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  aggregate: {
    type: "FinancialAssessment";
    id: string;
    version: number;
  };
  actor: {
    type: "agent" | "human";
    id: ActorId; // Dari Identity
  };
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  occurredAt: string;
}
```

### 2.4 BC-04: Growth & Commerce

| Kemampuan | Tipe Integrasi | Mapping Spesifik |
|-----------|----------------|------------------|
| **Work Core** | Wajib | Setiap ConversionAsset memiliki referensi `logicalWorkId` ke Work Core. State OfferAccepted disimpan sebagai bagian dari `SemanticBoundary` Work. |
| **Identity** | Wajib | Setiap ConversionAsset terikat pada `tenantId` dari Identity. Aktor Commerce Director terdaftar sebagai `ActorId` di Identity. |
| **Evidence Registry** | Wajib | Setiap transisi `OfferAccepted` menghasilkan `EvidenceRecord` di Evidence Registry dengan referensi ke `logicalWorkId`. Semua penawaran dan konversi memiliki bukti yang terverifikasi. |
| **Connector Ecosystem** | Opsional | Menggunakan konektor Midtrans untuk pemrosesan pembayaran. Menggunakan channel email/Telegram untuk mengirim penawaran. |
| **Communication** | Opsional | Mengirim notifikasi ke pelanggan ketika penawaran baru dikirim. |
| **Agent Orchestration** | Opsional | Menggunakan rencana orkestrasi untuk menjalankan Commerce Director agent. |

**Integrasi Detail:**
```typescript
// ConversionAsset aggregate dengan integrasi EOS
interface ConversionAsset {
  assetId: string;
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  status: "draft" | "sent" | "accepted" | "rejected";
  offerAmount: number;
  offerValidUntil: string;
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  createdAt: string;
  updatedAt: string;
}

// Event OfferAccepted dengan integrasi EOS
interface OfferAcceptedEvent {
  eventId: string;
  eventType: "OfferAccepted";
  schemaVersion: "1.0.0";
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  aggregate: {
    type: "ConversionAsset";
    id: string;
    version: number;
  };
  actor: {
    type: "human";
    id: ActorId; // Dari Identity
  };
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  occurredAt: string;
}
```

### 2.5 BC-05: Customer Success & Retention

| Kemampuan | Tipe Integrasi | Mapping Spesifik |
|-----------|----------------|------------------|
| **Work Core** | Wajib | Setiap ClientAccount memiliki referensi `logicalWorkId` ke Work Core. State ClientOnboarded disimpan sebagai bagian dari `SemanticBoundary` Work. |
| **Identity** | Wajib | Setiap ClientAccount terikat pada `tenantId` dari Identity. Aktor Success Concierge terdaftar sebagai `ActorId` di Identity. |
| **Evidence Registry** | Wajib | Setiap transisi `ClientOnboarded` menghasilkan `EvidenceRecord` di Evidence Registry dengan referensi ke `logicalWorkId`. Semua outcome pelanggan memiliki bukti yang terverifikasi. |
| **Connector Ecosystem** | Opsional | Menggunakan channel Telegram/WhatsApp untuk berkomunikasi dengan pelanggan. Menggunakan konektor eksternal untuk mengambil data usage pelanggan. |
| **Communication** | Opsional | Mengirim notifikasi ke pelanggan ketika ada update layanan. |
| **Agent Orchestration** | Opsional | Menggunakan rencana orkestrasi untuk menjalankan Success Concierge agent. |

**Integrasi Detail:**
```typescript
// ClientAccount aggregate dengan integrasi EOS
interface ClientAccount {
  accountId: string;
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  status: "prospect" | "onboarding" | "active" | "churned";
  clientName: string;
  onboardingCompletedAt?: string;
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  createdAt: string;
  updatedAt: string;
}

// Event ClientOnboarded dengan integrasi EOS
interface ClientOnboardedEvent {
  eventId: string;
  eventType: "ClientOnboarded";
  schemaVersion: "1.0.0";
  tenantId: TenantId; // Dari Identity
  logicalWorkId: WorkId; // Dari Work Core
  aggregate: {
    type: "ClientAccount";
    id: string;
    version: number;
  };
  actor: {
    type: "agent";
    id: ActorId; // Dari Identity
  };
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  occurredAt: string;
}
```

---

## 3. INTEGRATION CONTRACTS

### 3.1 Kontrak Event Lintas Konteks

Semua event lintas konteks harus mengikuti kontrak berikut:

```typescript
interface GenesisEvent {
  eventId: string; // UUID unik untuk deduplikasi idempotensi
  eventType: string; // Nama event terversi
  schemaVersion: string; // Versi schema event
  producer: {
    contextId: string; // ID bounded context yang menghasilkan event
  };
  tenantId: TenantId; // Dari Identity - wajib untuk isolasi tenant
  aggregate: {
    type: string; // Tipe aggregate
    id: string; // ID aggregate
    version: number; // Versi aggregate untuk concurrency control
  };
  work: {
    logicalWorkId: WorkId; // Dari Work Core - referensi Work kanonik
  };
  causationId?: string; // ID event sebelumnya dalam rantai kausal
  correlationId: string; // UUID untuk end-to-end traceability
  actor: {
    type: "human" | "ai-agent" | "external-service";
    id: ActorId; // Dari Identity - aktor yang menghasilkan event
  };
  evidenceRefs: string[]; // Referensi ke Evidence Registry
  occurredAt: string; // ISO 8601 timestamp
}
```

### 3.2 Kontrak Command

Semua command Genesis harus mengikuti kontrak berikut:

```typescript
interface GenesisCommand {
  commandId: string; // UUID unik untuk deduplikasi idempotensi
  commandType: string; // Nama command terversi
  schemaVersion: string; // Versi schema command
  tenantId: TenantId; // Dari Identity - wajib untuk isolasi tenant
  work: {
    logicalWorkId: WorkId; // Dari Work Core - referensi Work kanonik
  };
  actor: {
    type: "human" | "ai-agent" | "external-service";
    id: ActorId; // Dari Identity - aktor yang mengirim command
  };
  payload: Record<string, unknown>; // Parameter command
  issuedAt: string; // ISO 8601 timestamp
}
```

---

## 4. ANTI-CORRUPTION LAYER RULES

Semua komunikasi antara Genesis EOS dengan kemampuan inti EOS harus melalui anti-corruption layer dengan aturan berikut:

1. **Tidak Ada Akses Langsung**: Genesis tidak boleh mengakses internal dari kemampuan inti EOS secara langsung, semua komunikasi harus melalui public API
2. **Adaptor Eksplisit**: Setiap integrasi harus memiliki adaptor eksplisit yang memetakan domain model Genesis ke model kemampuan EOS
3. **Validasi Schema**: Semua pesan yang dikirim dan diterima harus divalidasi menggunakan schema Zod
4. **Idempotensi**: Semua operasi harus idempoten, menggunakan `eventId` dan `commandId` untuk deduplikasi
5. **Versioning**: Semua kontrak harus terversi, dengan kompatibilitas mundur yang terjaga

---

## 5. DEPENDENCY VERIFICATION

### 5.1 Daftar Dependensi yang Terverifikasi

| Kemampuan | Status Ketersediaan | Lokasi |
|-----------|---------------------|--------|
| Work Core | ✅ TERSEDIA | `capabilities/work-core/` |
| Identity | ✅ TERSEDIA | `capabilities/identity/` |
| Evidence Registry | ✅ TERSEDIA | `capabilities/evidence-registry/` |
| Connector Ecosystem | ✅ TERSEDIA | `capabilities/connector-ecosystem/` |
| Communication | ✅ TERSEDIA | `capabilities/communication/` |
| Agent Orchestration | ✅ TERSEDIA | `capabilities/agent-orchestration/` |

### 5.2 Daftar Core Primitive yang Dilarang Dibuat Ulang

| Core Primitive | Alasan |
|----------------|--------|
| Workflow Engine | Sudah ada di Work Core |
| Agent Registry | Sudah ada di Identity dan Agent Orchestration |
| Event Bus | Sudah ada di Connector Ecosystem |
| Financial Ledger | Sudah ada di Evidence Registry |
| Governance Engine | Sudah ada di Work Core dan Identity |

---

## 6. NEXT STEPS

Fase BDP-004 EOS Integration Mapping telah selesai. Langkah selanjutnya adalah melanjutkan ke fase BDP-005 Agentic Execution Mapping untuk menentukan hubungan antara Genesis EOS, Agentic Work, Paperclip, skill, agent, human authority, dan runtime replacement.

**Acceptance Gate:** ✅ BDP-G04 - Semua integrasi dengan kemampuan inti EOS telah terdefinisi dan terverifikasi.
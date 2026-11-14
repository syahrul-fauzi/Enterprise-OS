# BDP-004 — EOS Integration Mapping

**ENTERPRISE-OS · WORKSPACE ARCHITECTURE · GENESIS EOS · 2026**

---

## 1. Tujuan Fase BDP-004

Fase ini memetakan secara eksplisit bagaimana setiap Business Domain Package terintegrasi dengan EOS Core Fabric, memastikan tidak ada duplikasi otoritas, semua komunikasi lintas context menggunakan kontrak terversi, dan Work continuity tetap terjaga di seluruh lapisan sistem.

Prinsip utama integrasi:
> Business Domain Package mengonsumsi otoritas EOS melalui public contract, tidak pernah mengimplementasikan ulang mekanisme inti EOS.

---

## 2. EOS Core Fabric Integration Surface

EOS Core Fabric menyediakan lima otoritas utama yang menjadi satu-satunya titik integrasi untuk semua Business Domain Package:

| Otoritas EOS Core | Tanggung Jawab | Kontrak Publik |
|-------------------|----------------|----------------|
| **Work Core** | Canonical Work identity, state, continuity, evidence invariants | `work-identity`, `work-state`, `work-continuity`, `work-evidence` |
| **Identity Registry** | Actor identity, tenant isolation, authorization context | `actor-identity`, `tenant-context` |
| **Capability Registry** | Otoritas tunggal untuk definisi capability, izin, dan dependensi | `capability-definition`, `capability-authorization` |
| **Governance & Evidence** | Evidence registry, governance decision, audit trail | `evidence-registry`, `governance-decision` |
| **Connector Ecosystem** | Integrasi eksternal, konektor pihak ketiga, API bridge | `external-connector`, `api-integration` |

---

## 3. Peta Integrasi Per Bounded Context

### 3.1 Work Context (work-domain)
- **Integrasi dengan EOS Core**: Tidak ada dependensi eksternal — Work Context adalah otoritas inti EOS itu sendiri
- **Kontrak yang diekspor**: `work-identity`, `work-state`, `work-continuity`, `work-evidence`
- **Anti-corruption boundary**: Semua domain lain hanya boleh berinteraksi melalui public contract Work Core, tidak boleh mengakses internal model Work Core secara langsung

### 3.2 Governance Context (governance-domain)
- **Integrasi dengan EOS Core**:
  - `work-core`: Referensi `logicalWorkId` untuk setiap keputusan governance
  - `trust-framework`: Verifikasi tanda tangan dan kepercayaan untuk semua evidence
- **Allowed dependencies**: `work-core`, `trust-framework`
- **Forbidden dependencies**: `api-platform`, `governance-read-model`
- **Kontrak yang dikonsumsi**: `evidence-registry`, `trust-signature`

### 3.3 Agent Orchestration Context (ai-orchestration-domain)
- **Integrasi dengan EOS Core**:
  - `work-core`: Setiap eksekusi agen terikat pada `logicalWorkId` kanonik
  - `workflow-engine`: Koordinasi alur kerja lintas capability
- **Allowed dependencies**: `work-core`, `workflow-engine`
- **Kontrak yang diekspor**: `agent-scheduling`, `workflow-orchestration`, `task-execution`
- **Konsumen**: `lawyershub`, `requirement-management`

### 3.4 Connector Ecosystem Context (integration-domain)
- **Integrasi dengan EOS Core**:
  - `work-core`: Semua konektor eksternal mencatat hasil eksekusi sebagai bagian dari Work
  - `api-platform`: Lapisan transport untuk komunikasi dengan sistem eksternal
  - `security-hardening`: Verifikasi keamanan untuk semua koneksi eksternal
- **Allowed dependencies**: `work-core`, `api-platform`, `security-hardening`
- **Kontrak yang diekspor**: `external-connector`, `api-integration`, `third-party-bridge`
- **Konsumen**: `legal-case`, `legal-document`, `workflow-engine`

### 3.5 Trust Framework Context (security-domain)
- **Integrasi dengan EOS Core**:
  - `work-core`: Setiap verifikasi trust terikat pada Work yang sedang berjalan
- **Allowed dependencies**: `work-core` (hanya)
- **Forbidden dependencies**: `api-platform`, `governance-evidence`, `governance-read-model`
- **Kontrak yang diekspor**: `TrustFrameworkProvider`, `TrustSignatureProvider`, `TrustVerificationProfile`
- **Konsumen**: `governance-evidence`

---

## 4. Pola Integrasi Standar

### 4.1 Work Reference Pattern
Setiap operasi di Business Domain Package **harus** menyertakan referensi `logicalWorkId` ke Work kanonik EOS:
```typescript
interface DomainOperation {
  work: {
    logicalWorkId: string; // Referensi wajib ke Work Core
  };
  actor: ActorIdentity;
  evidenceRefs: string[];
}
```

Tidak ada ID domain yang boleh menggantikan `logicalWorkId` sebagai otoritas identitas Work.

### 4.2 Domain Event Integration Pattern
Semua event lintas context harus mengikuti schema standar yang mencakup referensi EOS Core:
```yaml
eventId: evt-{unique-id}
eventType: {Domain}{Aggregate}{Action}
schemaVersion: 1
work:
  logicalWorkId: {canonical-eos-work-id}
actor:
  type: human|agent|system
  id: {actor-id}
evidenceRefs:
  - {evidence-reference-id}
occurredAt: "2026-11-14T09:00:00Z"
```

### 4.3 Execution Substrate Integration Pattern
Business Domain Package tidak bergantung secara langsung pada runtime eksekusi tertentu (Paperclip, Ruflo, dll.). Semua eksekusi dialihkan melalui `agent-orchestration` yang bertindak sebagai lapisan abstraksi:
```
Business Domain Package → Agent Orchestration → Execution Substrate (dapat diganti)
```

Jika runtime eksekusi diganti, Business Domain Package tidak perlu diubah sama sekali.

---

## 5. Tenant Isolation dan Security Boundary

### 5.1 Aturan Tenant Isolation
- Setiap aggregate domain **harus** menyertakan `tenantId` sebagai bagian dari state
- Tidak ada query yang boleh mengakses data lintas tenant tanpa izin eksplisit dari EOS Identity Registry
- Semua event lintas context harus menyertakan `tenantId` untuk verifikasi otomatis

### 5.2 Security Boundary Matrix
| Domain | Dapat mengakses `api-platform` | Dapat mengakses `trust-framework` | Dapat mengakses `governance-evidence` |
|--------|--------------------------------|-----------------------------------|----------------------------------------|
| work-core | ✅ | ✅ | ✅ |
| trust-framework | ❌ | ✅ | ❌ |
| governance-evidence | ❌ | ✅ | ✅ |
| connector-ecosystem | ✅ | ❌ | ❌ |
| agent-orchestration | ❌ | ❌ | ✅ |

---

## 6. Acceptance Criteria BDP-G04

| ID | Kriteria Penerimaan | Metode Verifikasi |
|----|---------------------|-------------------|
| BDP-G04.1 | Setiap bounded context hanya bergantung pada `work-core` sebagai otoritas Work kanonik | Static analysis dependensi capability |
| BDP-G04.2 | Semua event lintas context menyertakan `logicalWorkId` dan `tenantId` | Schema validation semua event |
| BDP-G04.3 | Tidak ada Business Domain Package yang mengimplementasikan ulang `work-identity`, `evidence-registry`, atau `capability-authorization` | Audit kode domain |
| BDP-G04.4 | Integrasi dengan execution substrate melalui `agent-orchestration`, tidak ada dependensi langsung ke Paperclip/Ruflo | Static analysis import |
| BDP-G04.5 | `trust-framework` tidak memiliki dependensi ke `api-platform` atau `governance-evidence` | Dependency rules check |
| BDP-G04.6 | Semua operasi domain mencatat evidence ke `governance-evidence` melalui kontrak terversi | Integration test |
| BDP-G04.7 | Tenant isolation terverifikasi untuk semua query dan operasi | Security test |

---

## 7. Script Verifikasi Integrasi

Verifikasi BDP-G04 dapat dijalankan menggunakan script yang sudah ada:
```bash
workspace/.eos-scripts/verify-pr-03-genesis-eos-integration.sh
```

Skenario UAT yang sudah didefinisikan:
1. Test Paperclip execution dengan Work Core identity
2. Test Ruflo swarm orchestration dengan trusted context
3. Verify tidak ada duplikasi Work creation across adapters
4. Test crash recovery dengan durable deduplication
5. Verify domain events menggunakan trusted Work/tenant identity
6. Test agent permissions mengikuti EOS authorization

---

## 8. Next Step

Setelah peta integrasi ini selesai, langkah selanjutnya adalah **BDP-005 Agentic Execution Mapping** yang akan mendefinisikan hubungan antara Business Domain Package, Agentic Work, skill, agen, otoritas manusia, dan penggantian runtime.
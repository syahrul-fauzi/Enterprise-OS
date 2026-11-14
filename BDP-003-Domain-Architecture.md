# BDP-003 — Domain Architecture

**ENTERPRISE-OS · WORKSPACE ARCHITECTURE · GENESIS EOS · 2026**

---

## 1. Tujuan Fase BDP-003

Fase ini mendefinisikan struktur arsitektur internal setiap bounded context yang telah diidentifikasi pada BDP-002, termasuk:
- Struktur package standar untuk setiap domain
- Domain contracts dan policy boundaries
- Dependency rules yang eksplisit antar bounded context
- Lifecycle domain untuk setiap aggregate
- Aturan integrasi dengan EOS Core Fabric
- Acceptance criteria BDP-G03 Domain Architecture

---

## 2. Prinsip Arsitektur Dasar

### 2.1 Prinsip Utama
```
Business Domain owns business meaning.
EOS owns Work continuity, execution authority, and evidence governance.
External runtimes execute replaceable business operations.
```

### 2.2 Aturan Yang Tidak Boleh Dilanggar
1. **Tidak ada duplikasi primitive EOS Core** — Semua Work, Identity, Evidence, Governance harus menggunakan mekanisme EOS yang sudah ada
2. **Satu bounded context, satu semantic authority** — Tidak ada domain lain yang boleh menulis ke aggregate bounded context lain
3. **Cross-context communication hanya melalui kontrak terversi** — Tidak ada akses langsung ke internal domain lain
4. **logicalWorkId tetap menjadi otoritas** — Setiap domain aggregate harus secara eksplisit link ke Work ID kanonik EOS
5. **Runtime replaceability** — Mengganti execution runtime tidak boleh mengubah business semantics atau Work continuity

---

## 3. Struktur Package Standar

### 3.1 Struktur Root Workspace
```
workspace/
├── capabilities/           # Reusable capability domain
│   ├── work-core/
│   ├── identity-domain/
│   ├── governance-domain/
│   └── ...
├── packages/
│   ├── core/              # EOS Core Fabric
│   ├── composition/       # Composition engine
│   └── business-domains/  # Business Domain Package Family
│       ├── genesis-eos/
│       ├── finance-operations/
│       ├── customer-commerce/
│       └── ...
├── contracts/             # Canonical EOS contracts
├── governance/            # Package authority dan dependency rules
├── products/              # Product composition layer
│   ├── lawyershub/
│   ├── ecommerce-ops/
│   └── ...
└── apps/                  # Experience layer
```

### 3.2 Struktur Internal Setiap Business Domain Package
```
{domain-id}/
├── {domain-id}.manifest.yaml      # Domain manifest dan ownership
├── context-map.yaml               # Bounded context internal map
├── package.json                   # Package metadata
│
├── contracts/                     # Public domain contracts
│   ├── commands/                  # Command contracts
│   ├── events/                    # Domain event contracts
│   └── policies/                  # Domain policy contracts
│
├── contexts/                      # Bounded context modul
│   ├── {context-1}/
│   │   ├── context.yaml           # Context manifest
│   │   ├── model/                 # Domain model dan aggregate
│   │   ├── use-cases/             # Use case implementation
│   │   ├── ports/                 # Port interface untuk external
│   │   └── adapters/              # Adapter untuk external system
│   └── {context-2}/
│
├── integrations/                  # Integrasi dengan EOS Core
│   ├── eos-work-core.yaml
│   ├── eos-identity.yaml
│   └── eos-evidence.yaml
│
├── conformance/                   # Domain conformance test
│   ├── dependency-rules.test.ts
│   ├── work-continuity.test.ts
│   └── tenant-isolation.test.ts
│
├── tests/                         # Domain test suite
└── docs/                          # Domain documentation
```

### 3.3 Struktur Internal Setiap Bounded Context
```
{context-id}/
├── context.yaml                   # Context manifest dan ownership
├── invariants.ts                  # Domain invariant dan business rules
│
├── model/
│   ├── {aggregate-1}.ts           # Aggregate root
│   ├── {aggregate-2}.ts
│   └── types.ts                   # Domain type definitions
│
├── use-cases/
│   ├── {use-case-1}.ts            # Use case handler
│   └── {use-case-2}.ts
│
├── events/
│   ├── published/                 # Event yang dipublikasikan context ini
│   └── subscribed/               # Event yang didengarkan dari context lain
│
├── ports/
│   ├── incoming/                  # Port untuk incoming request
│   └── outgoing/                  # Port untuk outgoing request
│
└── adapters/
    ├── eos/                       # Adapter ke EOS Core
    └── external/                  # Adapter ke external system
```

---

## 4. Domain Contract Specification

### 4.1 Domain Event Contract Schema
Setiap event lintas context harus mengikuti schema standar:
```yaml
eventId: evt-{unique-id}
eventType: {Domain}{Aggregate}{Action}
schemaVersion: 1

producer:
  contextId: {producer-context-id}
  domainId: {producer-domain-id}
  tenantId: {tenant-id}

aggregate:
  type: {aggregate-type}
  id: {aggregate-id}
  version: {aggregate-version}

work:
  logicalWorkId: {canonical-eos-work-id}

causationId: {previous-event-id}
correlationId: {business-journey-id}

actor:
  type: human | agent | system
  id: {actor-id}
  role: {actor-role}

evidenceRefs:
  - {evidence-reference-id}

occurredAt: "2026-11-14T09:00:00Z"
```

### 4.2 Domain Command Contract Schema
```yaml
commandId: cmd-{unique-id}
commandType: {Domain}{Aggregate}{Action}
schemaVersion: 1

issuer:
  contextId: {issuer-context-id}
  actorId: {actor-id}
  tenantId: {tenant-id}

aggregate:
  type: {aggregate-type}
  id: {aggregate-id}

work:
  logicalWorkId: {canonical-eos-work-id}

parameters:
  # Command parameters sesuai use case

requiredEvidence:
  - {evidence-type}

occurredAt: "2026-11-14T09:00:00Z"
```

---

## 5. Dependency Rules Matrix

### 5.1 Allowed Dependencies Per Domain
| Domain | Allowed Dependencies | Forbidden Dependencies |
|--------|----------------------|------------------------|
| work-domain | Tidak ada (root) | Semua domain lain |
| identity-domain | work-core | governance-domain, api-platform |
| security-domain | work-core, identity-domain | governance-domain |
| governance-domain | work-core, identity-domain | api-platform, workflow-engine |
| integration-domain | work-core, identity-domain, governance-domain | api-platform |
| operations-domain | work-core, integration-domain | api-platform |
| composition-domain | work-core, governance-domain | api-platform |
| requirements-domain | work-core, governance-domain | api-platform |
| knowledge-domain | work-core, composition-domain | api-platform |
| legal-domain | work-core, governance-domain, requirements-domain | api-platform |
| services-domain | work-core, identity-domain, integration-domain | api-platform |
| customer-domain | work-core, identity-domain, services-domain | api-platform |
| workflow-domain | work-core, governance-domain, requirements-domain | api-platform |
| commercial-domain | work-core, customer-domain, services-domain | api-platform |
| ai-orchestration-domain | work-core, integration-domain, composition-domain | api-platform |
| ai-reasoning-domain | work-core, ai-orchestration-domain, knowledge-domain | api-platform |

### 5.2 Dependency Anti-Corruption Rules
1. **Tidak ada dependensi siklik** — Graf dependensi harus berupa DAG (Directed Acyclic Graph)
2. **Dependensi hanya ke domain dengan maturity sama atau lebih tinggi** — Domain Core tidak boleh bergantung pada domain Application
3. **Semua dependensi harus melalui public contract** — Tidak ada import langsung ke internal domain lain
4. **Setiap dependensi harus memiliki alasan bisnis yang terdokumentasi** — Tidak ada dependensi tanpa bukti penggunaan

---

## 6. Domain Lifecycle Specification

### 6.1 Generic Domain Lifecycle
```
DRAFT → PROPOSED → APPROVED → ACTIVE → SUSPENDED → ARCHIVED
```

### 6.2 Aggregate State Transition Rules
Setiap aggregate harus mendeklarasikan state transition yang diizinkan:
```yaml
aggregateLifecycle:
  initialState: DRAFT
  allowedTransitions:
    DRAFT: [PROPOSED]
    PROPOSED: [APPROVED, REJECTED]
    APPROVED: [ACTIVE]
    ACTIVE: [SUSPENDED, ARCHIVED]
    SUSPENDED: [ACTIVE, ARCHIVED]
    ARCHIVED: []
```

### 6.3 Work Continuity Requirement
Setiap perubahan state aggregate harus:
1. Membuat event domain yang terversi
2. Link ke logicalWorkId yang sama
3. Mencatat actor dan evidence perubahan
4. Tidak mengubah identitas Work kanonik

---

## 7. Policy Boundary Specification

### 7.1 Domain Policy Contract Schema
```yaml
policyId: pol-{unique-id}
policyType: domain | authorization | compliance
schemaVersion: 1

domain: {domain-id}
context: {context-id}

conditions:
  # Kondisi yang harus dipenuhi

actions:
  # Aksi yang diizinkan atau ditolak

enforcementLevel: advisory | mandatory | critical

evidenceRequired: true | false
```

### 7.2 Policy Enforcement Boundaries
1. **Domain-level policies** — Diberlakukan pada bounded context boundary
2. **Capability-level policies** — Diberlakukan pada capability execution boundary
3. **EOS Core policies** — Diberlakukan pada fabric layer, tidak boleh dilewati oleh domain manapun

---

## 8. EOS Integration Mapping

### 8.1 Wajib Integrasi Setiap Domain
Setiap Business Domain Package harus secara eksplisit mengintegrasikan dengan:
1. **Work Core** — Untuk mendapatkan dan memelihara logicalWorkId
2. **Identity Domain** — Untuk verifikasi actor dan tenant
3. **Governance Domain** — Untuk policy enforcement dan evidence recording
4. **Evidence Registry** — Untuk menyimpan bukti setiap perubahan state

### 8.2 Integrasi Opsional Berdasarkan Kebutuhan
- **Connector Ecosystem** — Jika domain membutuhkan integrasi external system
- **Composition Engine** — Jika domain membutuhkan product composition
- **Agent Orchestration** — Jika domain membutuhkan execution agent

---

## 9. Acceptance Criteria BDP-G03

| ID | Kriteria Penerimaan | Status |
|----|---------------------|--------|
| BDP-G03.1 | Setiap bounded context memiliki struktur package standar yang konsisten | NOT_PROVEN |
| BDP-G03.2 | Semua domain event dan command mengikuti schema kontrak terversi | NOT_PROVEN |
| BDP-G03.3 | Graf dependensi antar domain berupa DAG tanpa siklik | NOT_PROVEN |
| BDP-G03.4 | Setiap dependensi memiliki alasan bisnis yang terdokumentasi | NOT_PROVEN |
| BDP-G03.5 | Tidak ada domain yang bergantung pada api-platform | NOT_PROVEN |
| BDP-G03.6 | Setiap aggregate memiliki lifecycle dan state transition yang jelas | NOT_PROVEN |
| BDP-G03.7 | Semua perubahan state aggregate link ke logicalWorkId kanonik | NOT_PROVEN |
| BDP-G03.8 | Setiap domain memiliki integrasi eksplisit dengan Work Core, Identity, Governance, dan Evidence | NOT_PROVEN |
| BDP-G03.9 | Tidak ada duplikasi primitive EOS Core di dalam domain | NOT_PROVEN |
| BDP-G03.10 | Runtime replaceability terverifikasi untuk semua domain | NOT_PROVEN |

---

## 10. Next Step

Setelah BDP-003 selesai, langkah selanjutnya adalah **BDP-004 EOS Integration Mapping** yang akan:
1. Mendefinisikan detail integrasi setiap domain dengan EOS Core Fabric
2. Memetakan capability reuse untuk setiap bounded context
3. Menentukan aturan tenant isolation dan security boundary
4. Menyusun acceptance criteria untuk BDP-G04
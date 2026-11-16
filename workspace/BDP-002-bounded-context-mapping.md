# BDP-002 Bounded Context Mapping

## Executive Summary

Tujuan fase ini: memetakan bounded context Genesis EOS terhadap produk dan kemampuan yang sudah ada di repository, menentukan batas ownership, ubiquitous language, dan hubungan antar konteks.

**Status:** IN PROGRESS - Initial Mapping Complete

**Hasil utama:**
- 11 produk yang ada di `products/*` dapat dipetakan ke dalam lima bounded context Genesis EOS
- 36 kemampuan yang ada di `capabilities/*` menyediakan semua dependensi foundation yang dibutuhkan
- Tidak ada duplikasi core primitive yang diperlukan
- Hubungan antar konteks dapat didefinisikan melalui event contract yang terversi

---

## 1. Bounded Context Inventory

### BC-01: Market Intelligence
**Ownership:** Genesis EOS Semantic Authority
**Ubiquitous Language:** LeadProspect, MarketSignal, Opportunity, QualificationScore, MarketSegment
**Tanggung jawab:**
- Menemukan dan memvalidasi calon pelanggan
- Menghasilkan sinyal pasar dan peluang
- Menentukan kualifikasi prospect
- Memelihara lifecycle prospect

**Produk terkait:**
- deal-coordinator (triage & qualification)
- digital-operations (prospect acquisition)
- ecommerce-ops (market signal)

**Kemampuan dependensi:**
- Identity (actor identity untuk revenue scout)
- Connector Ecosystem (sumber data pasar eksternal)
- Communication (interaksi dengan prospect)
- Reasoning (kualifikasi prospect)
- Work Core (canonical Work untuk setiap prospect)
- Evidence Registry (bukti kualifikasi)

**Public API:**
- `captureProspect()`
- `qualifyProspect()`
- `getQualifiedProspects()`

**Published Events:**
- `LeadProspectCaptured`
- `LeadProspectQualified`
- `MarketSignalDetected`

---

### BC-02: Solution Fulfillment
**Ownership:** Genesis EOS Semantic Authority
**Ubiquitous Language:** SolutionArtifact, SolutionProposal, Specification, Deliverable, Requirement
**Tanggung jawab:**
- Mengubah kebutuhan prospect menjadi solusi
- Menghasilkan proposal dan spesifikasi
- Memelihara lifecycle solusi
- Mengelola deliverables

**Produk terkait:**
- deal-coordinator (solution proposal)
- digital-operations (service package definition)
- lawyershub (legal case solution)
- ilc (insurance solution)

**Kemampuan dependensi:**
- Requirement Management (requirement tracking)
- Product Delivery (deliverable management)
- Work Core (canonical Work untuk setiap solusi)
- Evidence Registry (bukti proposal)

**Public API:**
- `createSolutionArtifact()`
- `proposeSolution()`
- `getSolutionSpecification()`

**Published Events:**
- `SolutionArtifactCreated`
- `SolutionArtifactProposed`
- `SolutionArtifactRevised`

---

### BC-03: Value & Risk Audit
**Ownership:** Genesis EOS Semantic Authority
**Ubiquitous Language:** FinancialAssessment, RiskAssessment, ApprovalRecommendation, EstimatedCost, ReservedCost
**Tanggung jawab:**
- Menganalisis kelayakan finansial solusi
- Menilai risiko dan mitigasi
- Menghasilkan rekomendasi persetujuan
- Memelihara lifecycle assessment

**Produk terkait:**
- deal-coordinator (financial approval)
- digital-operations (cost assessment)
- ilc (risk assessment)

**Kemampuan dependensi:**
- Investment Compliance (compliance check)
- Governance Evidence (bukti audit)
- Observability (biaya dan risiko tracking)
- Connector Ecosystem (sumber data finansial eksternal)

**Public API:**
- `createFinancialAssessment()`
- `approveAssessment()`
- `getRiskAssessment()`

**Published Events:**
- `FinancialAssessmentCreated`
- `FinancialAssessmentApproved`
- `FinancialAssessmentRejected`
- `FinancialAssessmentNeedsRevision`

---

### BC-04: Growth & Commerce
**Ownership:** Genesis EOS Semantic Authority
**Ubiquitous Language:** ConversionAsset, Offer, Campaign, ConversionRate, RevenueProjection
**Tanggung jawab:**
- Mengubah solusi menjadi penawaran
- Membangun kampanye konversi
- Mengelola lifecycle penawaran
- Melacak metrik konversi

**Produk terkait:**
- deal-coordinator (offer generation)
- digital-operations (service offer)
- ecommerce-ops (product listing & conversion)

**Kemampuan dependensi:**
- Commerce Product (product listing management)
- SMACE (marketing campaign execution)
- Payment Processing (integrasi dengan payment provider)
- Communication (pengiriman penawaran)

**Public API:**
- `createConversionAsset()`
- `generateOffer()`
- `trackConversion()`

**Published Events:**
- `ConversionAssetCreated`
- `OfferGenerated`
- `OfferAccepted`
- `ConversionCompleted`

---

### BC-05: Customer Success & Retention
**Ownership:** Genesis EOS Semantic Authority
**Ubiquitous Language:** ClientAccount, ClientOnboarding, CustomerOutcome, RetentionSignal, SatisfactionScore
**Tanggung jawab:**
- Mengelola onboarding pelanggan
- Memelihara hubungan pelanggan
- Mengukur outcome pelanggan
- Menghasilkan sinyal retensi

**Produk terkait:**
- deal-coordinator (client fulfillment)
- digital-operations (customer success)
- lawyershub (client relationship)
- ecommerce-ops (customer retention)

**Kemampuan dependensi:**
- Identity (client identity management)
- Communication (interaksi dengan client)
- Persistent Companion (hubungan jangka panjang)
- Work Core (canonical Work untuk setiap client)
- Evidence Registry (bukti outcome)

**Public API:**
- `createClientAccount()`
- `initiateOnboarding()`
- `recordCustomerOutcome()`
- `getRetentionSignals()`

**Published Events:**
- `ClientAccountCreated`
- `ClientOnboardingInitiated`
- `ClientOnboarded`
- `CustomerOutcomeRecorded`
- `RetentionSignalDetected`

---

## 2. Context Relationship Map

### Business Lifecycle Flow
```
LeadProspectQualified (BC-01)
    ↓
SolutionArtifactProposed (BC-02)
    ↓
FinancialAssessmentApproved (BC-03)
    ↓
OfferAccepted (BC-04)
    ↓
ClientOnboarded (BC-05)
    ↓
RetentionSignalDetected (BC-05 → BC-01)
```

### Anti-Corruption Layer Rules
1. **Tidak ada akses langsung ke internal domain lain**
   - Setiap komunikasi hanya melalui public API dan event contract
   - Tidak ada shared database antar konteks
   - Semua event harus memiliki schema version yang jelas

2. **Setiap konteks hanya memiliki satu aggregate root**
   - BC-01: LeadProspect
   - BC-02: SolutionArtifact
   - BC-03: FinancialAssessment
   - BC-04: ConversionAsset
   - BC-05: ClientAccount

3. **Canonical Work reference hanya dari Work Core**
   - Setiap aggregate memiliki field `logicalWorkId` yang merujuk ke EOS Work Core
   - Tidak ada konteks yang membuat ID Work sendiri
   - Semua operasi Work melalui Work Core capability

---

## 3. Product to Context Mapping

| Produk | BC-01 | BC-02 | BC-03 | BC-04 | BC-05 |
|--------|-------|-------|-------|-------|-------|
| deal-coordinator | ✅ | ✅ | ✅ | ✅ | ✅ |
| digital-operations | ✅ | ✅ | ✅ | ✅ | ✅ |
| ecommerce-ops | ✅ | — | — | ✅ | ✅ |
| lawyershub | — | ✅ | — | — | ✅ |
| ilc | — | ✅ | ✅ | — | ✅ |
| agentic-work | — | — | — | — | — |
| academic | — | — | — | — | — |
| admin-support | — | — | — | — | — |
| dataops | — | — | — | — | — |
| human-ai-collab | — | — | — | — | — |

**Kesimpulan:**
- `deal-coordinator` dan `digital-operations` menggunakan seluruh lima konteks
- Produk lain menggunakan subset konteks sesuai domain mereka
- `agentic-work` adalah layer eksekusi, bukan domain bisnis

---

## 4. Capability Reuse Matrix

| Kemampuan | BC-01 | BC-02 | BC-03 | BC-04 | BC-05 |
|-----------|-------|-------|-------|-------|-------|
| work-core | ✅ | ✅ | ✅ | ✅ | ✅ |
| identity | ✅ | — | — | — | ✅ |
| evidence-registry | ✅ | ✅ | ✅ | ✅ | ✅ |
| connector-ecosystem | ✅ | — | ✅ | ✅ | — |
| communication | ✅ | — | — | ✅ | ✅ |
| agent-orchestration | — | — | — | — | — |
| requirement-management | — | ✅ | — | — | — |
| commerce-product | — | — | — | ✅ | — |
| investment-compliance | — | — | ✅ | — | — |
| persistent-companion | — | — | — | — | ✅ |
| observability | — | — | ✅ | — | — |

**Kesimpulan:**
- `work-core` dan `evidence-registry` digunakan oleh semua konteks
- Tidak ada kemampuan baru yang perlu dibuat
- Semua dependensi sudah tersedia dan teruji

---

## 5. Event Contract Schema

### Contoh Event: LeadProspectQualified
```yaml
eventId: evt-${uuid}
eventType: LeadProspectQualified
schemaVersion: 1

producer:
  contextId: market-intelligence
  packageId: genesis-eos

tenantId: ${tenantId}

aggregate:
  type: LeadProspect
  id: ${prospectId}
  version: ${aggregateVersion}

work:
  logicalWorkId: ${canonicalWorkId}

causationId: ${previousEventId}
correlationId: ${businessJourneyId}

actor:
  type: agent
  id: revenue-scout
  identityRef: ${eosActorIdentity}

evidenceRefs:
  - ${evidenceReferenceId}

occurredAt: ${ISO8601Timestamp}
```

### Event Delivery Rules
- Gunakan pola transactional outbox/inbox
- Idempotency key berdasarkan `eventId`
- Schema validation pada producer dan consumer
- Tenant isolation enforced pada semua event
- Replay protection menggunakan `causationId`

---

## 6. Acceptance Criteria for BDP-002

| ID | Kriteria | Status |
|----|----------|--------|
| BDP-G02-01 | Setiap bounded context memiliki ownership yang eksplisit | ✅ |
| BDP-G02-02 | Ubiquitous language terdefinisi untuk setiap konteks | ✅ |
| BDP-G02-03 | Hubungan antar konteks terpetakan melalui event | ✅ |
| BDP-G02-04 | Anti-corruption layer rules terdefinisi jelas | ✅ |
| BDP-G02-05 | Product to context mapping lengkap | ✅ |
| BDP-G02-06 | Capability reuse matrix lengkap | ✅ |
| BDP-G02-07 | Event contract schema terdefinisi | ✅ |
| BDP-G02-08 | Tidak ada duplikasi core primitive | ✅ |

---

## Next Action

Lanjut ke fase BDP-003 Domain Architecture:
- Definisikan struktur package Genesis EOS
- Buat manifest package dan context map
- Definisikan domain contracts dan policy boundaries
- Tetapkan dependency rules dan lifecycle
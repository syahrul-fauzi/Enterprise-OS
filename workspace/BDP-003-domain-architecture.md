# BDP-003 Domain Architecture

## Executive Summary

Tujuan fase ini: mendefinisikan struktur package Genesis EOS, manifest package, context map, domain contracts, dan dependency rules yang jelas dan dapat diverifikasi secara mekanis.

**Status:** IN PROGRESS - Initial Architecture Complete

**Hasil utama:**
- Struktur modular monolith dengan lima bounded context terisolasi
- Manifest package dengan deklarasi ownership dan governance
- Context map dengan hubungan antar konteks yang terdefinisi
- Domain contracts dan policy boundaries yang eksplisit
- Dependency rules yang melarang duplikasi core primitive

---

## 1. Target Package Structure

```
workspace/packages/business-domains/genesis-eos/
├── package.json
├── genesis.manifest.yaml
├── context-map.yaml
│
├── contracts/
│   ├── commands/
│   ├── events/
│   └── policies/
│
├── contexts/
│   ├── market-intelligence/
│   │   ├── context.yaml
│   │   ├── model/
│   │   ├── use-cases/
│   │   ├── contracts/
│   │   ├── events/
│   │   └── tests/
│   │
│   ├── solution-fulfillment/
│   ├── value-risk-audit/
│   ├── growth-commerce/
│   └── customer-success/
│
├── integrations/
│   ├── eos-work-core/
│   ├── eos-identity/
│   ├── eos-evidence-registry/
│   └── agentic-work/
│
├── conformance/
│   ├── tenant-isolation.check.ts
│   ├── no-duplication.check.ts
│   └── event-schema.check.ts
│
└── tests/
    ├── cross-context.contract.test.ts
    └── lifecycle.end-to-end.test.ts
```

### Alasan Modular Monolith
- Lima bounded context membutuhkan isolasi internal, tetapi tidak membutuhkan deployment independen sejak hari pertama
- Menghindari overhead sistem terdistribusi yang belum diperlukan
- Pemisahan menjadi package independen hanya dibenarkan jika ada kebutuhan nyata mengenai ownership tim, deployment, skala, atau isolasi data
- Semua konteks berbagi satu referensi Work Core kanonik

---

## 2. Genesis Manifest Package

File: `genesis.manifest.yaml`

```yaml
apiVersion: genesis.eos/v1
kind: BusinessDomainPackage

metadata:
  id: genesis-eos
  version: 1.0.0
  status: proposed
  displayName: Genesis EOS Business Domain
  description: Business domain package for market intelligence, solution fulfillment, value audit, conversion, and customer success

ownership:
  semanticAuthority: genesis-eos-team
  workAuthority: eos-core
  executionAuthority: eos-runtime

boundedContexts:
  - id: market-intelligence
    displayName: Market Intelligence
    aggregate: LeadProspect
    agentRole: revenue-scout
  - id: solution-fulfillment
    displayName: Solution Fulfillment
    aggregate: SolutionArtifact
    agentRole: solution-builder
  - id: value-risk-audit
    displayName: Value & Risk Audit
    aggregate: FinancialAssessment
    agentRole: cfo-qa
  - id: growth-commerce
    displayName: Growth & Commerce
    aggregate: ConversionAsset
    agentRole: commerce-director
  - id: customer-success
    displayName: Customer Success & Retention
    aggregate: ClientAccount
    agentRole: success-concierge

integration:
  work: eos-work-core
  identity: eos-identity
  evidence: eos-evidence-registry
  connectors: eos-connector-ecosystem
  workforce: agentic-work

governance:
  tenantIsolation: required
  evidenceRequired: true
  crossContextDatabaseAccess: prohibited
  versionedContracts: required
  humanApprovalRequired:
    - FinancialAssessment.approve
    - Offer.accept
  immutableTransitions: true
  auditLogRequired: true

dependencyRules:
  prohibited:
    - createWorkflowEngine
    - createAgentRegistry
    - createEventBus
    - createFinancialLedger
    - createGovernanceEngine
    - duplicateWorkCore
  allowed:
    - consumeWorkCore
    - consumeIdentity
    - consumeEvidenceRegistry
    - consumeConnectorEcosystem
    - consumeCapabilityRegistry
    - consumeObservability
```

---

## 3. Context Map

File: `context-map.yaml`

```yaml
apiVersion: context-map.genesis.eos/v1
kind: ContextMap

relationships:
  - from: market-intelligence
    to: solution-fulfillment
    type: published-event
    event: LeadProspectQualified
    direction: one-way
    antiCorruptionLayer: required
  - from: solution-fulfillment
    to: value-risk-audit
    type: published-event
    event: SolutionArtifactProposed
    direction: one-way
    antiCorruptionLayer: required
  - from: value-risk-audit
    to: growth-commerce
    type: published-event
    event: FinancialAssessmentApproved
    direction: one-way
    antiCorruptionLayer: required
  - from: growth-commerce
    to: customer-success
    type: published-event
    event: OfferAccepted
    direction: one-way
    antiCorruptionLayer: required
  - from: customer-success
    to: market-intelligence
    type: published-event
    event: RetentionSignalDetected
    direction: one-way
    antiCorruptionLayer: required

contracts:
  - context: market-intelligence
    publicApi:
      - captureProspect
      - qualifyProspect
      - getQualifiedProspects
    publishedEvents:
      - LeadProspectCaptured
      - LeadProspectQualified
      - MarketSignalDetected
    consumedEvents:
      - RetentionSignalDetected

  - context: solution-fulfillment
    publicApi:
      - createSolutionArtifact
      - proposeSolution
      - getSolutionSpecification
    publishedEvents:
      - SolutionArtifactCreated
      - SolutionArtifactProposed
      - SolutionArtifactRevised
    consumedEvents:
      - LeadProspectQualified

  - context: value-risk-audit
    publicApi:
      - createFinancialAssessment
      - approveAssessment
      - getRiskAssessment
    publishedEvents:
      - FinancialAssessmentCreated
      - FinancialAssessmentApproved
      - FinancialAssessmentRejected
      - FinancialAssessmentNeedsRevision
    consumedEvents:
      - SolutionArtifactProposed

  - context: growth-commerce
    publicApi:
      - createConversionAsset
      - generateOffer
      - trackConversion
    publishedEvents:
      - ConversionAssetCreated
      - OfferGenerated
      - OfferAccepted
      - ConversionCompleted
    consumedEvents:
      - FinancialAssessmentApproved

  - context: customer-success
    publicApi:
      - createClientAccount
      - initiateOnboarding
      - recordCustomerOutcome
      - getRetentionSignals
    publishedEvents:
      - ClientAccountCreated
      - ClientOnboardingInitiated
      - ClientOnboarded
      - CustomerOutcomeRecorded
      - RetentionSignalDetected
    consumedEvents:
      - OfferAccepted
```

---

## 4. Per-Context Structure

Setiap bounded context menggunakan struktur internal yang konsisten:

```
market-intelligence/
├── context.yaml
├── model/
│   ├── lead-prospect.ts
│   ├── qualification.ts
│   └── invariants.ts
├── use-cases/
│   ├── capture-prospect.ts
│   └── qualify-prospect.ts
├── contracts/
│   └── commands.ts
├── events/
│   ├── lead-prospect-captured.event.ts
│   └── lead-prospect-qualified.event.ts
├── ports/
│   └── prospect-repository.port.ts
├── adapters/
│   └── eos-work-core.adapter.ts
└── tests/
    ├── lead-prospect.test.ts
    ├── qualification.test.ts
    └── invariants.test.ts
```

### Contoh Context.yaml
```yaml
apiVersion: context.genesis.eos/v1
kind: BoundedContext

metadata:
  id: market-intelligence
  displayName: Market Intelligence

aggregate:
  root: LeadProspect
  lifecycle:
    - captured
    - qualified
    - proposed
    - converted
    - archived

invariants:
  - A LeadProspect must have a unique tenantId
  - A LeadProspect must have a qualification score between 0 and 1
  - A LeadProspect cannot be qualified without evidence reference
  - A LeadProspect cannot be converted without being qualified

dependencies:
  required:
    - eos-work-core
    - eos-identity
    - eos-evidence-registry
    - eos-connector-ecosystem
  optional:
    - eos-communication
```

---

## 5. Domain Contract Examples

### Command Contract: QualifyProspect
```typescript
interface QualifyProspectCommand {
  commandId: string;
  tenantId: string;
  prospectId: string;
  qualificationScore: number;
  qualificationReason: string;
  evidenceRefs: string[];
  actor: {
    type: 'agent' | 'human';
    id: string;
    identityRef: string;
  };
}

interface QualifyProspectResult {
  eventId: string;
  prospectId: string;
  version: number;
  logicalWorkId: string;
}
```

### Event Contract: LeadProspectQualified
```typescript
interface LeadProspectQualifiedEvent {
  eventId: string;
  eventType: 'LeadProspectQualified';
  schemaVersion: 1;
  producer: {
    contextId: 'market-intelligence';
    packageId: 'genesis-eos';
  };
  tenantId: string;
  aggregate: {
    type: 'LeadProspect';
    id: string;
    version: number;
  };
  work: {
    logicalWorkId: string;
  };
  causationId: string;
  correlationId: string;
  actor: {
    type: 'agent' | 'human';
    id: string;
    identityRef: string;
  };
  evidenceRefs: string[];
  occurredAt: string;
}
```

---

## 6. Dependency Rules Enforcement

### Prohibited Operations (Conformance Check)
```typescript
const prohibitedOperations = [
  'createWorkflowEngine',
  'createAgentRegistry',
  'createEventBus',
  'createFinancialLedger',
  'createGovernanceEngine',
  'duplicateWorkCore',
  'crossContextDirectDatabaseAccess',
  'bypassTenantIsolation',
  'modifyAggregateOutsideOwnContext'
];

function checkConformance(packagePath: string): ConformanceResult {
  const violations = [];
  
  for (const op of prohibitedOperations) {
    if (codebaseContains(packagePath, op)) {
      violations.push(`Prohibited operation found: ${op}`);
    }
  }
  
  return {
    passed: violations.length === 0,
    violations
  };
}
```

### Allowed Dependencies
| Kategori | Dependencies yang diizinkan |
|----------|------------------------------|
| Core | work-core, identity, evidence-registry |
| Capabilities | connector-ecosystem, communication, requirement-management, commerce-product, investment-compliance, observability |
| Integration | agentic-work, paperclip-adapter |

---

## 7. Acceptance Criteria for BDP-003

| ID | Kriteria | Status |
|----|----------|--------|
| BDP-G03-01 | Struktur package terdefinisi jelas dengan lima bounded context terisolasi | ✅ |
| BDP-G03-02 | Manifest package dengan ownership dan governance terdefinisi | ✅ |
| BDP-G03-03 | Context map dengan hubungan antar konteks terdefinisi | ✅ |
| BDP-G03-04 | Setiap context memiliki struktur internal yang konsisten | ✅ |
| BDP-G03-05 | Domain contract contoh (command dan event) terdefinisi | ✅ |
| BDP-G03-06 | Dependency rules yang melarang duplikasi core primitive terdefinisi | ✅ |
| BDP-G03-07 | Conformance check untuk prohibited operations terdefinisi | ✅ |
| BDP-G03-08 | Tidak ada akses langsung antar context yang diizinkan | ✅ |

---

## Next Action

Lanjut ke fase BDP-004 EOS Integration Mapping:
- Petakan integrasi setiap konteks dengan Work Core
- Definisikan mapping ke Identity dan Evidence Registry
- Tetapkan aturan integrasi dengan Connector Ecosystem
- Verifikasi tidak ada konflik dengan capability yang sudah ada
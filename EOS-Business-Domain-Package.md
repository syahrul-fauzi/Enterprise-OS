Deep Dive Blueprint — EOS Business Domain Package
ENTERPRISE-OS · WORKSPACE ARCHITECTURE · GENESIS EOS · 2026

Tujuan: merancang ulang workspace/* sebagai ekosistem Business Domain Packages yang modular, evolusioner, dan dapat beroperasi dalam Universal Agentic Execution Middleware EOS.

Ada satu prinsip arsitektur yang harus menjadi fondasi:
Business Domain owns business meaning. EOS owns Work continuity and execution authority. Agents perform work.

Artinya, kita tidak membangun sekumpulan aplikasi bisnis yang masing-masing mempunyai workflow engine, agent runtime, database authority, dan sistem governance sendiri.

Kita membangun domain bisnis yang mempunyai bahasa, aturan, kapabilitas, dan tanggung jawab sendiri, tetapi tetap menggunakan EOS sebagai semantic dan execution substrate bersama.
1. Architectural thesis
Sovereign business meaning
GENESIS EOS

Business Domain Architecture & Composition


BUSINESS DOMAIN PACKAGES

Domain language · Policies · Capabilities · Business invariants · Domain events
Commerce

Finance

Legal

Operations

People

Content




EOS UNIVERSAL EXECUTION SUBSTRATE

Work Core · Capability Registry · Governance · Evidence · Connector Ecosystem · Agent Orchestration


EXECUTION ACTORS & RUNTIMES

Human · AI Agents · Agentic Work · Paperclip-derived runtime · External services · Robots


Pemisahan paling penting: Genesis EOS bukan pengganti EOS Core, dan Business Domain Package bukan sekadar folder kode untuk aplikasi tertentu.

Genesis mengatur komposisi dan identitas domain bisnis. EOS tetap menjadi otoritas kontinuitas Work, sedangkan runtime dapat diganti tanpa kehilangan identitas Work.
2. Repository reality — audit sebelum blueprint
Saya membandingkan rancangan ini dengan struktur GitHub syahrul-fauzi/Enterprise-OS yang dapat diakses melalui default branch master.
Repository structure inspected
Area	Kondisi yang terlihat
workspace/products/	Sudah ada
workspace/capabilities/	Sudah memiliki banyak capability
workspace/packages/core/	Canonical foundation
workspace/packages/composition/	Composition engine/descriptors
workspace/contracts/	Canonical contracts
workspace/apps/	API, Web, Docs, Edge, Workers
workspace/governance/	Package authority dan dependency rules

Beberapa capability yang sudah ada:
- work-core
- agent-orchestration
- connector-ecosystem
- evidence-registry
- legal-case
- legal-document
- commerce-product
- investment-compliance
- requirement-management
- workflow-engine
- persistent-companion
Sementara produk yang terlihat antara lain lawyershub, ecommerce-ops, services-id, ilc, dan lainnya.

Ini penting karena Genesis tidak boleh membuat ulang kemampuan yang sebenarnya sudah tersedia.

Ada satu persoalan governance yang perlu diselesaikan terlebih dahulu.

workspace/workspace.yaml masih menyatakan:
- Baseline implementation_baseline_frozen.
- Structural evolution memerlukan ADR.
- Package boundaries dibekukan.
- Domain/application/infrastructure root split dilarang.
- Pembuatan products/ sebagai root baru dinyatakan terlarang.
Namun workspace/products/ sudah ada dalam repository. Artinya, manifest governance dan struktur aktual perlu direkonsiliasi.

Referensi pemeriksaan:
- Workspace manifest
- Workspace README
- Package authority
- Dependency rules
- Three-domain architecture
Catatan: snapshot master yang dapat diperiksa belum memperlihatkan workspace/products/agentic-work maupun genesis-eos. Saya tidak menganggapnya tidak ada di workspace lokal atau branch terbaru.
Implikasi arsitektur
Saya tidak merekomendasikan Genesis menjadi architectural layer kelima.

Dokumen EOS yang ada sudah mendefinisikan empat domain arsitektur:
1. Governance Domain
2. Capability Domain
3. Experience Domain
4. Product Domain
Deployment merupakan ekstensi yang direncanakan.

Genesis harus menjadi Business Domain Package Family yang memperjelas ownership di dalam Capability Domain, bukan menambahkan domain arsitektur baru.

Ini mempertahankan struktur EOS sambil memperkenalkan DDD pada business semantics.

3. Genesis EOS — lima bounded contexts
Genesis sebaiknya tidak dibangun berdasarkan jabatan atau departemen perusahaan.

Batasnya harus ditentukan berdasarkan business capability, bahasa domain, ownership data, business invariants, dan lifecycle masing-masing.

DDD menggunakan bounded context untuk memisahkan model bisnis yang mempunyai bahasa dan tanggung jawab berbeda. Komunikasi antarkonteks menggunakan kontrak yang eksplisit, bukan berbagi internal model atau database secara langsung. 

Microsoft Learn+1

BC-01
Market Intelligence
LeadProspect
Memahami pasar, menemukan peluang, dan mengidentifikasi calon pelanggan.

Agent role: Revenue Scout

Output: Qualified Prospect · Market Signal · Opportunity


BC-02
Solution Fulfillment
SolutionArtifact
Mengubah kebutuhan menjadi solusi, proposal, dan deliverables.

Agent role: Solution Builder

Output: Solution Proposal · Solution Specification · Deliverable


BC-03
Value & Risk Audit
FinancialAssessment
Menganalisis kelayakan, biaya, risiko, dan nilai ekonomi.

Agent role: CFO-QA

Output: Financial Assessment · Risk Assessment · Approval Recommendation


BC-04
Growth & Commerce
ConversionAsset
Mengubah solusi menjadi penawaran, kampanye, dan aktivitas konversi.

Agent role: Commerce Director

Output: Offer · Campaign · Conversion Asset


BC-05
Customer Success & Retention
ClientAccount
Mengelola onboarding, hubungan pelanggan, outcome, dan retensi.

Agent role: Success Concierge

Output: Client Onboarding · Customer Outcome · Retention Signal


Ownership boundaries
Context	Memiliki	Tidak memiliki
Market Intelligence	Prospect lifecycle	Customer account
Solution Fulfillment	Solution lifecycle	Work identity
Value & Risk Audit	Assessment lifecycle	Financial ledger
Growth & Commerce	Conversion lifecycle	Payment settlement
Customer Success	Client relationship lifecycle	Prospect lifecycle

Hal yang sangat penting:
- LeadProspect bukan ClientAccount.
- FinancialAssessment bukan FinancialLedger.
- SolutionArtifact bukan EOS Work.
- ConversionAsset bukan payment transaction.
- ClientAccount bukan identity registry.
Setiap context mempunyai satu pemilik semantik dan satu otoritas perubahan aggregate.
4. Business lifecycle — hubungan antarkonteks
Genesis harus mendukung business continuity dari market discovery sampai customer retention.
Genesis Business Lifecycle
1. Discover opportunity
   
   Market Intelligence menemukan dan memvalidasi LeadProspect.
   
   LeadProspectQualified
2. Build solution
   
   Solution Fulfillment menghasilkan SolutionArtifact berdasarkan kebutuhan yang tervalidasi.
   
   SolutionArtifactProposed
3. Validate value and risk
   
   Value & Risk Audit menghasilkan FinancialAssessment dan rekomendasi.
   
   FinancialAssessmentApproved / Rejected / NeedsRevision
4. Convert opportunity
   
   Growth & Commerce membangun ConversionAsset, penawaran, dan proses konversi.
   
   OfferAccepted / ConversionCompleted
5. Retain customer
   
   Customer Success membuat atau memperbarui ClientAccount, menjalankan onboarding, dan mengukur outcome.
   
   ClientOnboarded / CustomerOutcomeRecorded
6. Return market intelligence
   
   Informasi outcome dan retensi menjadi sinyal baru bagi Market Intelligence.
   
   RetentionSignalDetected

Lifecycle ini bukan satu workflow engine baru.

Setiap context mengelola state bisnisnya sendiri. Hubungan antarkonteks berlangsung melalui published domain events dan kontrak yang terversi.
Contoh event contract
Sebuah event lintas context minimal memiliki:
eventId: evt-unique-id
eventType: LeadProspectQualified
schemaVersion: 1

producer:
  contextId: market-intelligence

tenantId: tenant-id

aggregate:
  type: LeadProspect
  id: prospect-id
  version: 3

work:
  logicalWorkId: canonical-eos-work-id

causationId: previous-event-id
correlationId: business-journey-id

actor:
  type: agent
  id: revenue-scout

evidenceRefs:
  - evidence-reference-id

occurredAt: "2026-11-14T09:00:00Z"


logicalWorkId merupakan referensi kepada identitas Work kanonik EOS, bukan ID yang dibuat ulang oleh Genesis atau Paperclip.

Untuk delivery event, gunakan pola transactional outbox/inbox, idempotency, schema compatibility, dan consumer deduplication. Jangan langsung mengadopsi full event sourcing untuk semua aggregate. Event sourcing memberikan audit dan replay, tetapi membawa kompleksitas concurrency, storage, eventual consistency, dan versioning. 

AWS Prescriptive Guidance+1


5. Blueprint package structure — workspace/*
Recommended target structure
Saya merekomendasikan satu package Genesis dengan lima modul bounded context yang terisolasi.

Target lokasi setelah mendapatkan persetujuan perubahan struktur:

workspace/packages/business-domains/genesis-eos/
workspace/
│
├── apps/
│   ├── api/
│   ├── web/
│   ├── edge/
│   └── workers/
│
├── capabilities/
│   ├── work-core/
│   ├── identity/
│   ├── evidence-registry/
│   ├── connector-ecosystem/
│   ├── communication/
│   ├── agent-orchestration/
│   ├── commerce-product/
│   └── ...
│
├── packages/
│   ├── core/
│   ├── composition/
│   ├── presentation/
│   ├── tooling/
│   │
│   └── business-domains/
│       └── genesis-eos/
│           ├── package.json
│           ├── genesis.manifest.yaml
│           ├── context-map.yaml
│           │
│           ├── contracts/
│           │   ├── commands/
│           │   ├── events/
│           │   └── policies/
│           │
│           ├── contexts/
│           │   ├── market-intelligence/
│           │   ├── solution-fulfillment/
│           │   ├── value-risk-audit/
│           │   ├── growth-commerce/
│           │   └── customer-success/
│           │
│           ├── integrations/
│           │   ├── eos/
│           │   └── agentic-work/
│           │
│           ├── conformance/
│           ├── tests/
│           └── docs/
│
├── contracts/
├── decisions/
└── products/
    ├── lawyershub/
    ├── ecommerce-ops/
    ├── services-id/
    └── ...


Setiap context menggunakan struktur internal yang konsisten:
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
├── policies/
├── events/
├── ports/
├── adapters/
└── tests/


Mengapa satu package, lima modul?

Karena kita membutuhkan lima batas kepemilikan semantik, bukan lima deployment independen sejak hari pertama.

Modular monolith memberikan isolasi internal, tetapi tetap menghindari distributed-system overhead yang belum diperlukan. Pemisahan menjadi package atau service independen baru dibenarkan jika ada kebutuhan nyata mengenai ownership tim, deployment, skala, atau isolasi data.

GitLab juga menekankan bahwa isolasi domain harus melarang akses ke internal domain lain dan memberikan public API yang disengaja. 

The GitLab Handbook

Isi genesis.manifest.yaml
Manifest menjadi identitas dan deklarasi package, bukan runtime engine.
apiVersion: genesis.eos/v1
kind: BusinessDomainPackage

metadata:
  id: genesis-eos
  version: 1.0.0
  status: proposed

ownership:
  semanticAuthority: genesis-eos
  workAuthority: eos-core
  executionAuthority: eos-runtime

boundedContexts:
  - market-intelligence
  - solution-fulfillment
  - value-risk-audit
  - growth-commerce
  - customer-success

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


Setiap context selanjutnya mendeklarasikan aggregate, invariants, commands, queries, event subscriptions, published events, dependencies, dan data classification.

6. Hubungan Genesis, Agentic Work, dan Paperclip
Ini adalah bagian paling penting agar ketiganya tidak berkembang menjadi tiga sistem yang saling berebut authority.
Business authority
GENESIS EOS

What the business means and owns

LeadProspect · SolutionArtifact · FinancialAssessment · ConversionAsset · ClientAccount

Business intent and canonical Work references
Workforce orchestration
AGENTIC WORK

Who works, what they should do, and how work is coordinated

Agent roles · Delegation · Workforce experience · Execution coordination

Execution assignment and adapter contract
Replaceable runtime
PAPERCLIP

How agent workers are scheduled and executed

Heartbeats · Agent adapters · Scheduling · Runs · Runtime operations

Execution results and evidence references
EOS CORE

Canonical Work · Identity · Authority · Governance · Evidence · Continuity


Authority matrix
Responsibility	Genesis	Agentic Work	Paperclip	EOS Core
Business semantics	Own	—	—	—
Business aggregates	Own	—	—	—
Canonical Work identity	—	Consume	Map	Own
Workforce experience	—	Own	—	—
Agent delegation	—	Own	Execute assignment	Govern authority
Agent scheduling	—	Coordinate	Own	Govern boundary
Agent runtime	—	Adapter consumer	Own	—
Evidence authority	Produce references	Consume	Supply execution evidence	Own
Global governance	Declare business constraints	Consume	Enforce runtime controls	Own

Paperclip memang menyediakan agent organization, task coordination, scheduling, heartbeat, budgets, dan governance. Tetapi itu tidak menjadikannya sumber kebenaran bisnis Genesis. 

GitHub+1

Paperclip integration boundary
Struktur agentic-work yang sudah menjadi arah pengembangan:
workspace/products/agentic-work/
├── upstream/
│   └── paperclip/
├── eos-adapters/
├── acl/
├── identity/
├── governance/
├── evidence/
├── contracts/
├── product/
├── deployment/
├── tests/
└── docs/


Prinsip integrasinya:
1. Paperclip agent ID dipetakan ke EOS actor identity.
2. Paperclip task ID dipetakan ke execution reference, bukan menjadi canonical Work ID.
3. Paperclip run ID menjadi execution record reference.
4. Agentic Work mengatur assignment dan workforce interaction.
5. Genesis menyediakan business context yang relevan.
6. EOS Core memvalidasi authority dan mencatat evidence.
Paperclip boleh menyimpan internal operational state yang dibutuhkan untuk menjalankan agent workforce. Namun, jangan menjadikannya canonical database untuk LeadProspect, ClientAccount, FinancialAssessment, atau EOS Work.

Critical invariant

One logicalWorkId. Multiple executions. Replaceable agents. Continuous business reality.

Jika Paperclip diganti dengan OpenClaw, Codex, Trae, atau runtime lain, business state dan Work continuity tidak boleh berubah.

7. Existing EOS capability reuse map
Genesis sebaiknya mengonsumsi kemampuan yang sudah ada melalui public contracts, bukan menciptakan engine sendiri.

Berikut kandidat pemetaan awal yang perlu diverifikasi melalui audit implementation:
Genesis context	EOS capabilities yang relevan
Market Intelligence	Identity, Connector Ecosystem, Communication, Reasoning, Work Core, Evidence Registry
Solution Fulfillment	Requirement Management, Product Delivery, Work Core, Evidence Registry
Value & Risk Audit	Investment Compliance, Governance Evidence, Observability, Connector Ecosystem
Growth & Commerce	Commerce Product, SMACE, Payment Processing, Communication
Customer Success	Identity, Communication, Persistent Companion, Work Core, Evidence Registry

Ini bukan instruksi untuk menghubungkan semua capability sekaligus. Setiap dependency harus mempunyai alasan bisnis dan bukti penggunaan.
Batas yang tidak boleh dilanggar
Reuse existing EOS

- Work Core
- Identity
- Evidence Registry
- Governance
- Connector Ecosystem
- Capability Registry
- Observability
  
  Do not duplicate
- Work Engine
- Agent Registry
- Event Bus
- Financial Ledger
- Governance Engine
- Workflow Engine
- Evidence Authority

Perlu dibedakan bahwa Genesis boleh mempunyai domain-specific policies dan business workflows. Namun, enforcement, authorization, evidence authority, dan Work execution tetap menggunakan mekanisme EOS yang sudah ada.
8. Enterprise security dan regulatory boundaries
Business Domain Package harus dirancang dengan tenant isolation dan auditability sejak awal.
Area	Blueprint requirement
Multi-tenancy	Isolasi tenant pada setiap aggregate dan repository
Identity	EOS canonical actor identity
Authorization	RBAC/ABAC melalui EOS authority
Data ownership	Satu bounded context, satu pemilik write authority
PII	Classification, minimization, retention policy
Encryption	In-transit dan at-rest
Audit	Evidence reference dan immutable transition history
Event security	Schema validation, tenant validation, replay protection
Indonesia compliance	UU PDP, kewajiban sektoral, dan kebutuhan lokalisasi sesuai klasifikasi data
Financial truth	Verifikasi melalui sumber eksternal yang berwenang

Khusus Value & Risk Audit:
- estimatedCost bukan settlement.
- reservedCost bukan pembayaran.
- actualCost harus memiliki sumber bukti.
- FinancialAssessment tidak boleh otomatis dianggap sebagai financial transaction.
- Agent tidak boleh mengesahkan keputusan yang memerlukan human authority.
Untuk Growth & Commerce, payment provider dan sumber transaksi eksternal tetap menjadi sumber kebenaran settlement.

9. Genesis implementation roadmap
Saya tidak menyarankan membangun lima context secara horizontal sekaligus.

Gunakan pendekatan vertical business slice.
Genesis EOS delivery roadmap
1. Phase 0 — Architecture Reconciliation
   Mandatory first
   - Audit workspace structure dan package authority.
   - Rekonsiliasi workspace.yaml dengan struktur aktual.
   - Audit capability reuse.
   - Tetapkan Genesis ownership.
   - Buat ADR untuk package family.
   - Pastikan tidak ada frozen-core violation.
   Exit: Architecture Decision VERIFIED.
2. Phase 1 — Genesis Domain Foundation
   - Genesis manifest.
   - Context map.
   - Lima bounded-context declarations.
   - Aggregate ownership.
   - Domain invariants.
   - Event contracts.
   - Dependency contracts.
   Exit: Semua boundary dapat divalidasi secara mekanis.
3. Phase 2 — First Business Vertical Slice
   First implementation
   Jalankan satu perjalanan bisnis:
   
   LeadProspect → SolutionArtifact → FinancialAssessment → ConversionAsset → ClientAccount
   - Gunakan existing EOS Work.
   - Gunakan existing Evidence Registry.
   - Gunakan Agentic Work untuk koordinasi.
   - Gunakan Paperclip sebagai execution adapter.
   - Verifikasi tenant isolation.
   Exit: Satu perjalanan bisnis berhasil dari awal sampai akhir.
4. Phase 3 — Runtime Independence
   - Ganti Paperclip adapter dengan test runtime.
   - Verifikasi business domain tidak berubah.
   - Verifikasi logicalWorkId tetap sama.
   - Verifikasi execution history dan evidence.
   - Uji retry, replay, dan idempotency.
   Exit: Runtime replacement tanpa perubahan domain semantics.
5. Phase 4 — Multi-Product Adoption
   - Hubungkan LawyersHub.
   - Hubungkan Services-ID.
   - Hubungkan E-commerce Ops.
   - Ukur reuse lintas produk.
   - Ukur domain code changes.
   Exit: Minimal dua product consumer menggunakan business implementation yang sama tanpa modifikasi domain code.
6. Phase 5 — Enterprise Maturity
   - Domain conformance suite.
   - Cross-context evidence graph.
   - Security and compliance verification.
   - Business outcome metrics.
   - Controlled domain versioning.
   Exit: Business Domain Package siap digunakan sebagai reusable enterprise asset.

10. Acceptance gates — War Room
Berikut ukuran keberhasilan yang saya rekomendasikan.
Gate	Acceptance criteria
G0	ADR dan governance reconciliation PASS
G1	5 bounded contexts memiliki ownership jelas
G2	Zero duplicate EOS Core primitive
G3	Cross-context contracts versioned
G4	Logical Work continuity PASS
G5	Evidence, replay, idempotency PASS
G6	Paperclip runtime replaceability PASS
G7	Tenant isolation dan security PASS
G8	Two-product reuse tanpa perubahan domain code PASS

Target arsitektur:
100%
Existing Core reuse
Untuk kemampuan yang sudah tersedia

5
Bounded Contexts
Business ownership boundaries

0
Duplicate primitives
Against frozen EOS Core

2+
Product consumers
Same implementation, no domain changes


Semua target tersebut adalah acceptance criteria, bukan klaim bahwa implementasinya sudah lulus.

11. Architectural decisions yang perlu dikunci
Ada tujuh keputusan utama yang saya rekomendasikan:
ID	Architectural decision	Rekomendasi
GEN-ADR-001	Genesis positioning	Business Domain Package Family
GEN-ADR-002	Domain ownership	Five bounded contexts
GEN-ADR-003	Persistence	Context-owned data
GEN-ADR-004	Integration	Contract + domain events
GEN-ADR-005	Work continuity	EOS Work Core authority
GEN-ADR-006	Agent execution	Agentic Work + replaceable Paperclip
GEN-ADR-007	Package evolution	Modular monolith first

Tiga keputusan paling penting
A. Genesis bukan Agentic Work.

Genesis menjawab apa yang bisnis miliki, bagaimana bisnis beroperasi, dan apa arti perubahan business state.

Agentic Work menjawab siapa yang bekerja, bagaimana agen didelegasikan, dan bagaimana workforce berkoordinasi.

B. Paperclip bukan EOS.

Paperclip adalah upstream execution/orchestration technology yang dapat diganti. Fork harus tetap kompatibel dengan upstream sejauh mungkin, sedangkan EOS-specific behavior diletakkan di ACL dan adapter.

C. Genesis bukan Work Engine.

Genesis memiliki business aggregates. EOS memiliki canonical Work. Satu business journey dapat melibatkan beberapa agent, beberapa execution, dan beberapa business context tanpa menciptakan Work identity baru setiap kali.
12. Final target architecture
EOS Business Operating Architecture
GENESIS EOS

Business Domain Package Family

Market · Solution · Risk · Commerce · Customer


EOS CORE

Semantic Authority · Work Continuity · Governance · Evidence


AGENTIC WORK

Workforce Experience · Agent Coordination · Delegation


PAPERCLIP / EXTERNAL RUNTIMES

Execution · Scheduling · Heartbeats · Agent Adapters


PRODUCT EXPERIENCES

LawyersHub · Services-ID · E-commerce Ops · Future Products


Satu koreksi konseptual: Product Experiences merupakan consumer dari Genesis dan EOS, bukan layer yang mengambil alih domain authority.

Kesimpulan arsitektur:

Genesis membuat EOS memahami bisnis.

EOS Core menjaga kebenaran dan kontinuitas pekerjaan.

Agentic Work mengatur tenaga kerja.

Paperclip menjalankan agent workers.

Products menghadirkan seluruh kemampuan tersebut kepada manusia dan organisasi.

Dengan pemisahan ini, EOS bisa mengembangkan banyak jenis bisnis tanpa membangun ulang business logic, workflow engine, agent registry, atau Work identity untuk setiap produk.

Next recommended deliverable
Saya merekomendasikan memulai dengan GENESIS-EOS-ARCH-001 — Business Domain Package Architecture & Governance ADR.

Deliverable berikutnya sebaiknya berupa:
1. ADR dan architecture decision matrix.
2. Lima bounded-context specifications.
3. Genesis manifest dan event contracts.
4. Capability reuse dan dependency matrix.
5. Agentic Work–Paperclip ACL integration contract.
6. Vertical slice implementation backlog beserta verification gates.
Recommended next step
Architecture → Governed implementation

Saya bisa melanjutkan dengan menyusun GENESIS-EOS-ARCH-001 beserta machine-readable manifests, dependency rules, dan Definition of Done langsung berdasarkan struktur repository EOS.
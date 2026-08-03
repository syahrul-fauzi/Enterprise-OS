# ADR-0009: Enterprise Control Graph, Assurance Evaluators, and Decision Artifacts

## Status
✅ Accepted

## Date
2026-08-03

## Context
EOS telah memasuki fase di mana domain inti governance cukup stabil untuk dibekukan, sementara leverage terbesar berikutnya berada pada penguatan control plane. Bukti yang sudah tersedia di repository menunjukkan bahwa:

- domain inti (`Evidence`, `LawResult`, `EvidencePackage`, `Certificate`, `Attestation`, `GovernanceSession`, `Read Models`) tidak lagi membutuhkan perubahan konseptual rutin
- control plane sudah memiliki fakta penting untuk reasoning enterprise:
  - capability dependency graph
  - compatibility and version signals
  - governance health
  - verification lineage
  - trust lifecycle
  - selective execution and delta evidence
- Gate C mulai berfungsi sebagai observability surface, tetapi tidak boleh menjadi pusat reasoning

Tanpa keputusan arsitektur yang lebih tegas, ada risiko EOS kembali mencampurkan:

1. fakta (`graph`, lineage, provenance)
2. evaluasi (`assurance`)
3. keputusan (`decision`)
4. eksekusi (`automation`)

ADR ini membekukan pemisahan tanggung jawab control plane agar pertumbuhan 2-3 tahun ke depan tetap stabil.

## Decision

### 1. Enterprise Control Graph (ECG) is the SSOT of the control plane
`Enterprise Control Graph` menjadi satu-satunya representasi fakta dan relasi untuk control plane.

ECG hanya berisi:

- node identity
- edge identity
- provenance
- lineage
- graph relationships

ECG **must not** berisi:

- keputusan akhir
- imperative policy logic
- consumer-specific presentation concerns

ECG adalah input tunggal untuk evaluator control plane.

### 2. Dashboard is a consumer, not a node
`Dashboard` bukan bagian dari ECG dan bukan sumber fakta.

Dashboard hanyalah consumer/projection yang membaca hasil control plane yang sama seperti consumer lain:

- Gate C
- Enterprise API
- CLI
- MCP
- Agent Runtime
- Dashboard

Perubahan UI, delivery surface, atau consumer channel tidak boleh mengubah ECG.

### 3. Compatibility is edge semantics, not a capability attribute
`Compatibility` dimodelkan sebagai semantics of relationship, bukan atribut global pada capability.

Canonical form:

`Capability A -> Dependency Edge -> Capability B`

Dependency edge dapat membawa:

- `required_contract_range`
- `resolved_provider`
- `resolved_version`
- `compatibility_status`
- `migration_required`
- `deprecation_status`
- `policy_result`

Dengan keputusan ini, satu capability dapat memiliki compatibility outcome yang berbeda terhadap provider yang berbeda tanpa memaksa satu atribut compatibility tunggal yang menyesatkan.

### 4. Gate C is a readout surface
`Gate C` tidak boleh menjadi tempat reasoning utama.

Target flow yang dibekukan:

`Graph -> Evaluation -> Decision -> Gate C`

Bukan:

`Graph -> Gate C -> Decision`

Gate C hanya membaca hasil evaluasi dan keputusan yang sudah dimaterialisasikan. Dengan demikian evaluator baru seperti `Security Assurance`, `Runtime Assurance`, `Risk Assurance`, atau `FinOps Assurance` dapat ditambahkan tanpa mengubah tanggung jawab Gate C.

### 5. Decision is a first-class artifact
Semua keputusan control plane harus dimaterialisasikan sebagai `Decision Artifact`, bukan hanya direduksi menjadi `PASS/WARN/FAIL` sementara.

Canonical flow:

`Evidence -> Evaluation -> Decision -> Automation`

Minimal shape keputusan enterprise:

```yaml
decision_id:
decision_type:
decision:
confidence:
reason_codes:
policy_results:
required_actions:
affected_nodes:
graph_digest:
policy_version:
created_at:
```

Decision artifacts harus:

- dapat diaudit
- dapat direplay
- dapat dibandingkan antar versi policy
- dapat ditelusuri kembali ke graph digest dan hasil evaluasi
- menjadi satu-satunya kontrak yang dikonsumsi automation

### 6. Assurance evaluators are specialized; decision synthesis is centralized
`Capability Assurance` tidak menjadi pusat seluruh keputusan enterprise.

Sebaliknya, evaluator dibagi berdasarkan concern control plane, misalnya:

- `Capability Assurance`
- `Security Assurance`
- `Runtime Assurance`
- `Compliance Assurance`
- `Risk Assurance`

Semua evaluator membaca ECG, lalu `Enterprise Decision Engine` menggabungkan hasilnya menjadi keputusan yang konsisten.

Canonical reference architecture:

```text
Enterprise Control Graph
        ↓
Assurance Evaluators
        ↓
Enterprise Decision Engine
        ↓
Decision Artifacts
        ↓
Gate C / Scheduler / Release / API / Agent / Dashboard
```

## Rationale
- **Separates facts from decisions**: ECG menyimpan kebenaran relasional, bukan hasil opini evaluasi
- **Prevents governance drift**: consumer dan automation tidak lagi menghitung ulang logic sendiri
- **Preserves frozen core**: domain inti tidak perlu diperluas untuk mengakomodasi pertumbuhan control plane
- **Supports enterprise scale**: evaluator baru dapat ditambahkan tanpa memusatkan semua aturan pada `Capability Assurance`
- **Keeps UI disposable**: dashboard dapat berubah total tanpa memengaruhi SSOT
- **Aligns with DDD and graph reasoning**: compatibility memang milik hubungan, bukan state global capability
- **Enables deterministic queries**: `WHY`, `TRACE`, `IMPACT`, `SHOW`, `DIFF`, `PATH` dapat bergeser menjadi traversal graph dan decision graph

## Consequences

### Positive
- ECG menjadi fondasi control plane yang stabil
- Gate C, scheduler, CI/CD, release pipeline, dan agents dapat membaca kontrak keputusan yang sama
- policy reasoning dapat berevolusi tanpa mengubah consumer
- compatibility governance menjadi lebih benar secara semantik
- decision replay and auditability meningkat secara signifikan

### Negative
- butuh materialisasi artifact baru untuk evaluation dan decision
- butuh disiplin agar Gate C dan consumer lain tidak menambahkan reasoning lokal
- graph schema akan berkembang lebih cepat daripada domain inti dan memerlukan governance ketat

## Implementation Constraints
- automation **must not** mengevaluasi ulang evidence secara mandiri bila `Decision Artifact` tersedia
- evaluator **must** membaca ECG, bukan artifact acak dari repository
- Gate C **must not** menjadi lokasi policy synthesis
- dashboard **must not** menjadi node graph atau sumber fakta
- compatibility **must not** dimodelkan sebagai single global capability field untuk keputusan relasional

## Non-Goals
- ADR ini tidak mengubah frozen core domain
- ADR ini tidak mewajibkan semua evaluator diimplementasikan sekaligus
- ADR ini tidak menetapkan bahasa policy deklaratif final, hanya menetapkan bahwa keputusan jangka panjang tidak boleh bergantung pada hardcoded consumer logic

## Roadmap Impact
Setelah ADR ini diterima, prioritas implementasi bergeser menjadi:

1. melengkapi `Enterprise Control Graph`
2. mematerialisasikan evaluator pertama (`Capability Assurance`)
3. membangun `Enterprise Decision Engine`
4. mematerialisasikan `Decision Artifacts`
5. memindahkan automation untuk mengonsumsi keputusan, bukan menghitung ulang evidence
6. membangun query layer di atas graph dan decision graph

## Related References
- [enterprise/decisions/adr/ADR-0008-engine-framework-purity-rule.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0008-engine-framework-purity-rule.md)
- [enterprise/specifications/eos-architecture-closure.md](file:///root/Enterprise-OS/enterprise/specifications/eos-architecture-closure.md)
- [workspace/packages/tooling/eos-cli/src/enterprise-control-graph-runtime.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/enterprise-control-graph-runtime.ts)
- [workspace/packages/tooling/eos-cli/src/enterprise-query-runtime.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/enterprise-query-runtime.ts)
- [workspace/packages/tooling/eos-cli/src/commands/gate-c.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/commands/gate-c.ts)

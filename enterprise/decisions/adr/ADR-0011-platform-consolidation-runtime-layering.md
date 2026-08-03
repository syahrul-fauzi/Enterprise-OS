# ADR-0011: Platform Consolidation and Runtime Layering for the Enterprise Control System

## Status
✅ Accepted

## Date
2026-08-03

## Context
EOS telah melewati tiga fase evolusi arsitektur yang berbeda:

```text
PHASE 1
Business Domain
──────────────────────────
Capability
Evidence
Verification
Trust
Session
Read Model

↓ freeze

PHASE 2
Enterprise Control Plane
──────────────────────────
Enterprise Control Graph
Capability Graph
Governance
Policy Surface
Decision Surface

↓ freeze

PHASE 3
Enterprise Intelligence
──────────────────────────
Evaluators
Decision Engine
Automation
Trend Analysis
Simulation
Planning
```

Repository saat ini berada di akhir `Phase 2`, di mana struktur inti control plane sudah cukup stabil untuk dibekukan. Risiko terbesar berikutnya bukan kekurangan capability baru, melainkan pertumbuhan horizontal yang tidak terdisiplin:

- penambahan capability baru untuk masalah yang seharusnya diselesaikan oleh runtime
- pencampuran fakta, evaluasi, keputusan, dan aksi
- consumer yang melakukan reasoning ulang
- control-plane model yang berubah terus karena concern presentasi atau observability

Untuk menjaga EOS tetap tahan terhadap pertumbuhan multi-tahun, fokus pengembangan harus bergeser dari **penambahan struktur** ke **pemaksimalan perilaku** melalui runtime layering yang jelas.

## Decision

### 1. EOS enters platform consolidation mode
Mulai saat ADR ini diterima, EOS memasuki fase `platform consolidation`.

Konsekuensinya:

- penambahan capability baru **bukan lagi default path**
- penambahan runtime baru **bukan lagi default path**
- prioritas utama bergeser ke konsolidasi empat runtime control-plane inti
- perubahan arsitektur harus diukur terhadap fondasi yang sudah dibekukan di ADR-0009 dan ADR-0010

Capability baru hanya boleh ditambahkan bila benar-benar mewakili kemampuan domain atau bounded context yang independen, bukan sekadar wadah logic evaluasi, policy, query, atau automation.
Runtime baru juga hanya boleh ditambahkan bila tidak dapat dimodelkan sebagai plugin, extension point, atau modul di dalam empat runtime inti yang dibekukan oleh ADR ini.

### 2. The following elements are frozen at the platform level

#### 2.1 Enterprise Control Graph
`Enterprise Control Graph (ECG)` dianggap final sebagai SSOT fakta dan relasi control plane.

Aturan:

- node baru tidak boleh ditambahkan hanya karena ada hasil evaluasi baru
- sebelum menambah node, harus ditanya:
  - apakah ini fakta?
  - atau hanya hasil evaluasi?

Jika sesuatu adalah hasil evaluasi, verdict, policy output, atau status keputusan, maka itu **bukan node ECG**.

#### 2.2 Capability
Capability dibekukan sebagai identitas operasional, bukan tempat policy synthesis.

Minimal scope capability:

- owner
- contracts
- dependencies
- lifecycle

Capability tidak menjadi tempat reasoning policy enterprise.

#### 2.3 Compatibility
`Compatibility` dibekukan sebagai edge semantics, bukan capability property.

Canonical form:

`Capability A -> Dependency Edge -> Capability B`

Dependency edge dapat membawa:

- `required_range`
- `resolved_version`
- `compatibility_status`
- `migration_required`
- `policy_result`

#### 2.4 Dashboard and presentation surfaces
Dashboard, CLI, MCP, API, dan Agent dibekukan sebagai consumer surfaces.

Semua presentation surface:

- bukan SSOT
- bukan bagian dari ECG
- disposable
- boleh berubah tanpa memengaruhi control-plane model

#### 2.5 Gate C
`Gate C` dibekukan sebagai `Decision Readout Surface`.

Gate C:

- tidak menjadi reasoning engine
- tidak mensintesis keputusan
- hanya membaca keputusan yang sudah dimaterialisasikan

### 3. Four runtime layers are frozen as the primary implementation model
Mulai fase ini, leverage utama EOS berasal dari empat runtime inti berikut:

```text
Enterprise Control Graph
        ↓
Enterprise Control Runtime
        ↓
Enterprise Decision Engine
        ↓
Enterprise Decision Ledger
```

`Assurance Evaluators` diperlakukan sebagai plugin layer di dalam arsitektur ini, bukan sebagai family runtime yang masing-masing berdiri sendiri.

Semua consumer berada di luar empat runtime inti tersebut:

- Gate C
- Scheduler
- CI/CD
- Release
- AI Agent
- Dashboard
- MCP
- CLI

Sebelum implementasi runtime inti diperluas, `runtime contracts` harus dibekukan lebih dahulu. Selama kontrak ini belum stabil, berlaku moratorium penambahan runtime baru untuk mencegah coupling implementasi antar-layer.

### 4. Enterprise Control Runtime is the only SSOT traversal runtime
`Enterprise Control Runtime` menjadi runtime pembaca SSOT untuk graph traversal dan query control plane.

Semua traversal seperti:

- `WHY`
- `TRACE`
- `SHOW`
- `IMPACT`
- `DIFF`
- `PATH`

harus berakar pada runtime ini, bukan tersebar sebagai logic traversal ad-hoc di consumer yang berbeda.

### 5. Evaluators must remain isolated plugins
Semua evaluator dibangun sebagai plugin di dalam `Policy Evaluator Framework` dan tidak saling mengenal.

Contoh evaluator:

- `Capability Evaluator`
- `Security Evaluator`
- `Risk Evaluator`
- `Lifecycle Evaluator`
- `Compliance Evaluator`

Aturan:

- evaluator hanya membaca ECG
- evaluator tidak boleh saling depend
- evaluator tidak boleh memicu automation
- evaluator menghasilkan evaluasi terstruktur untuk decision engine
- evaluator dapat bertambah tanpa mengubah kontrak inti decision engine

Canonical packaging direction:

```text
packages/control-plane/

    enterprise-control-graph/

    evaluators/
        capability/
        lifecycle/
        security/
        runtime/
        release/

    decision-engine/

    decision-ledger/
```

### 6. Decision Runtime is the primary synthesis runtime
`Enterprise Decision Engine` adalah satu-satunya tempat sintesis evaluasi lintas domain.

Input:

- evaluator outputs

Output:

- decision artifact
- decision ledger entry

Minimal decision semantics:

- `ALLOW`
- `WARN`
- `BLOCK`
- `REVIEW`

beserta:

- `reason_codes`
- `required_actions`
- `confidence`
- `affected_nodes`

Decision engine **must remain domain-agnostic**.

Decision engine hanya mengenal konsep seperti:

- `Evaluation`
- `Policy`
- `Decision`
- `Reason`
- `Action`

Decision engine tidak boleh memiliki pengetahuan langsung tentang domain seperti:

- `Capability`
- `Certificate`
- `Trust`
- `Session`
- `Read Model`

Semua detail domain harus datang ke engine dalam bentuk evaluasi terstruktur.

### 7. Automation Runtime consumes decisions only
`Automation Runtime` mencakup:

- scheduler
- CI/CD
- release
- agent runtime
- workflow execution

Semua automation consumer:

- tidak menghitung ulang
- tidak mengevaluasi evidence
- tidak mengevaluasi policy
- hanya membaca keputusan yang telah dimaterialisasikan

### 8. Intelligence Runtime is additive, not authoritative
`Intelligence Runtime` mencakup:

- trend analysis
- prediction
- simulation
- recommendation

AI atau intelligence layer:

- boleh membaca `Decision Ledger` dan `ECG`
- tidak menjadi sumber governance utama
- tidak menggantikan evaluator atau decision engine

## Rationale
- **Protects the frozen core**: domain dan control-plane facts tidak terus berubah mengikuti kebutuhan runtime baru
- **Increases leverage**: menambah evaluator/policy/decision memperbaiki semua automation sekaligus
- **Prevents structural sprawl**: runtime baru lebih bernilai daripada capability baru untuk concern control-plane
- **Improves maintainability**: setiap layer memiliki satu tanggung jawab yang jelas
- **Supports long-term scale**: growth bergerak horizontal di evaluator dan runtime, bukan mengubah fondasi

## Consequences

### Positive
- arsitektur menjadi lebih stabil untuk evolusi multi-tahun
- ROI pengembangan meningkat karena perbaikan decision layer menyebar ke seluruh automation
- query, policy, dan automation memiliki kontrak yang konsisten
- AI/intelligence dapat ditambahkan tanpa mencemari governance core

### Negative
- akan muncul kebutuhan disiplin tinggi untuk menolak capability baru yang sebenarnya hanyalah runtime concern
- beberapa logic existing mungkin perlu dipindahkan dari command/consumer ke runtime yang lebih tepat
- transisi ke runtime layering penuh membutuhkan migrasi bertahap

## Constraints
- ECG hanya menyimpan fakta, tidak menyimpan verdict evaluasi atau keputusan
- evaluator tidak boleh saling bergantung
- decision engine adalah satu-satunya penggabung evaluasi
- decision engine tidak boleh memahami domain evaluator secara langsung
- tidak ada runtime yang boleh bergantung pada implementasi runtime lain; komunikasi antarruntime hanya melalui ECG, Decision Ledger, atau runtime contracts yang stabil
- automation tidak boleh mengevaluasi ulang evidence
- presentation surfaces hanya consumer dari decision artifacts atau projection turunannya
- runtime proliferation harus dihindari; perluasan baru default-nya adalah plugin evaluator atau modul, bukan runtime baru

## Non-Goals
- ADR ini tidak melarang penambahan capability domain yang benar-benar independen
- ADR ini tidak memaksa seluruh runtime selesai sekaligus
- ADR ini tidak menggantikan ADR-0009 atau ADR-0010, melainkan menetapkan fokus implementasi setelah fondasi dibekukan
- ADR ini belum membakukan policy declarative language; itu merupakan kandidat ADR lanjutan setelah runtime layering stabil

## Implementation Priorities
Prioritas implementasi setelah ADR ini diterima:

1. `Runtime Contracts`
2. `Enterprise Control Runtime`
3. `Policy Evaluator Framework`
4. `Enterprise Decision Engine`
5. `Automation Runtime`
6. `Platform Intelligence`

## Related References
- [ADR-0009-enterprise-control-graph-decision-artifacts.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0009-enterprise-control-graph-decision-artifacts.md)
- [ADR-0010-closed-loop-decision-architecture.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0010-closed-loop-decision-architecture.md)
- [workspace/packages/tooling/eos-cli/src/enterprise-control-graph-runtime.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/enterprise-control-graph-runtime.ts)
- [workspace/packages/tooling/eos-cli/src/enterprise-query-runtime.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/enterprise-query-runtime.ts)
- [workspace/packages/tooling/eos-cli/src/commands/gate-c.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/commands/gate-c.ts)

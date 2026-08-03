# ADR-0012: Control Plane Dependency Inversion

## Status
✅ Accepted

## Date
2026-08-03

## Context
ADR-0009, ADR-0010, dan ADR-0011 telah membekukan fondasi control plane EOS:

- `Enterprise Control Graph (ECG)` sebagai SSOT fakta
- `Enterprise Decision Ledger (EDL)` sebagai SSOT keputusan
- runtime layering dan evaluator plugin architecture
- automation sebagai consumer keputusan

Setelah fondasi tersebut dibekukan, risiko terbesar bergeser dari conceptual drift ke implementation drift. Tanpa aturan dependency inversion yang eksplisit, control plane dapat kembali mengalami coupling melalui:

- runtime yang mengimpor implementasi runtime lain
- decision engine yang mengetahui detail runtime konkret
- evaluator yang bergantung pada runtime tertentu, bukan pada graph snapshot
- automation yang membaca internals evaluator atau ECG secara langsung

## Decision

### 1. Runtime SHALL depend only on runtime contracts
Setiap runtime control plane wajib bergantung hanya pada:

- `runtime-contracts/models/*`
- `runtime-contracts/spi/*`
- `runtime-contracts/plugins/*`

Runtime tidak boleh bergantung langsung pada implementasi runtime lain.

### 2. No Runtime Imports
Prinsip platform yang dibekukan:

> **Runtime SHALL NOT import other runtime implementations.**

Komunikasi antarruntime hanya boleh terjadi melalui:

- `SPI interfaces`
- `Enterprise Control Graph`
- `Enterprise Decision Ledger`

### 3. DTO and service capability contracts are separated
`runtime-contracts` dibekukan menjadi dua lapisan semantik:

#### Models
Pure immutable DTO:

- `GraphSnapshot`
- `Evaluation`
- `Decision`
- `LedgerEntry`
- `Query`
- `AutomationExecution`

#### SPI
Capability interfaces:

- `ControlGraphReader`
- `QueryExecutor`
- `EvaluatorRegistry`
- `PolicyEngine`
- `DecisionWriter`
- `LedgerReader`
- `AutomationExecutor`

Evaluator plugin contract hidup terpisah di:

- `plugins/EvaluatorPlugin`

### 4. Decision Engine remains domain-agnostic
`Enterprise Decision Engine` tidak boleh mengenal runtime konkret atau domain object konkret.

Decision engine hanya boleh beroperasi pada abstraksi seperti:

- `Evaluation`
- `Policy`
- `Decision`
- `Reason`
- `Action`

### 5. Evaluators are discoverable plugins
Evaluator wajib didaftarkan dan ditemukan melalui `EvaluatorRegistry`.

Evaluator:

- tidak saling mengimpor
- tidak memanggil runtime lain secara langsung
- hanya membaca `GraphSnapshot`
- hanya menghasilkan `EvaluationResult`

### 6. DTO SHALL be immutable
Semua DTO pada `runtime-contracts/models/*` diperlakukan sebagai immutable contract objects.

Mutasi terhadap DTO setelah materialisasi kontrak dianggap melanggar boundary control plane.

### 7. Decision Ledger remains append-only
`Enterprise Decision Ledger` tetap append-only dan tidak boleh dioverwrite oleh runtime mana pun.

## Canonical Dependency Direction

```text
contracts/models
        ↑
contracts/spi
        ↑
plugins
        ↑
runtime implementations
```

Contoh arah dependency yang sah:

```text
Decision Engine
        ↓
PolicyEngine
        ↓
EvaluatorRegistry
        ↓
ControlGraphReader
```

Contoh yang tidak sah:

```text
Decision Engine
        ↓
EnterpriseControlRuntime
```

## Rationale
- **Prevents runtime coupling**: runtime dapat diganti tanpa ripple effect
- **Enforces dependency inversion**: service capability lebih stabil daripada nama runtime konkret
- **Protects architecture over time**: evaluator, engine, dan automation dapat tumbuh tanpa erosion
- **Improves testability**: SPI lebih mudah di-mock daripada runtime konkret
- **Supports plugin growth**: evaluator baru dapat bertambah tanpa mengubah engine

## Consequences

### Positive
- boundary implementation menjadi jauh lebih tegas
- runtime pertama dapat dibangun sebagai implementasi SPI, bukan pusat dependensi
- control plane lebih mudah berevolusi selama beberapa tahun

### Negative
- membutuhkan disiplin tinggi dalam review dependency direction
- implementasi awal terasa lebih lambat karena abstraksi dibentuk lebih dulu

## Constraints
- runtime tidak boleh mengimpor implementasi runtime lain
- komunikasi antarruntime harus melalui SPI, ECG, atau EDL
- DTO harus immutable
- evaluator harus discoverable sebagai plugin
- decision ledger harus append-only

## Related References
- [ADR-0009-enterprise-control-graph-decision-artifacts.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0009-enterprise-control-graph-decision-artifacts.md)
- [ADR-0010-closed-loop-decision-architecture.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0010-closed-loop-decision-architecture.md)
- [ADR-0011-platform-consolidation-runtime-layering.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0011-platform-consolidation-runtime-layering.md)
- [runtime-contracts/index.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/runtime-contracts/index.ts)

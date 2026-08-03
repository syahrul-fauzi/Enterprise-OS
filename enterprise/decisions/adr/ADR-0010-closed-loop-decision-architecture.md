# ADR-0010: Closed-Loop Decision Architecture and Decision Ledger

## Status
✅ Accepted

## Date
2026-08-03

## Context
ADR-0009 menetapkan fondasi control plane EOS:

- `Enterprise Control Graph (ECG)` sebagai SSOT fakta dan relasi
- dashboard dan surface lain sebagai consumer
- compatibility sebagai edge semantics
- Gate C sebagai readout surface
- assurance evaluators sebagai evaluator terpisah
- keputusan sebagai hasil yang dimaterialisasikan

Namun untuk memastikan arsitektur ini tahan 5-10 tahun, EOS perlu membakukan satu langkah tambahan:

1. keputusan enterprise bukan sekadar output sesaat, tetapi memiliki lifecycle
2. automation tidak boleh melakukan reasoning governance sendiri
3. fakta, evaluasi, keputusan, dan aksi harus tetap dipisahkan secara tegas

Tanpa pembakuan ini, risiko drift akan muncul kembali dalam bentuk:

- scheduler membaca evidence langsung
- release pipeline mengevaluasi policy sendiri
- Gate C menjadi tempat reasoning ulang
- consumer mengabaikan keputusan yang sudah dimaterialisasikan

## Decision

### 1. EOS adopts a closed-loop decision architecture
Arsitektur control plane EOS dibekukan sebagai closed-loop decision architecture:

```text
Enterprise Control Graph
        (Facts)
            ↓
Assurance Evaluators
       (Evaluations)
            ↓
Enterprise Decision Engine
        (Synthesis)
            ↓
Enterprise Decision Ledger
        (Decisions)
            ↓
Automation Consumers
         (Actions)
```

Urutan semantik ini bersifat wajib:

`Facts -> Evaluations -> Decisions -> Actions`

Tidak boleh ada lompatan langsung dari:

- facts ke actions
- evaluators ke actions
- facts ke decisions di luar decision engine

### 2. Decision is materialized as a ledger, not only as an artifact snapshot
EOS mengadopsi `Enterprise Decision Ledger` sebagai bentuk canonical untuk keputusan yang dimaterialisasikan.

Istilah `Decision Artifact` tetap dapat digunakan sebagai unit keluaran, tetapi bentuk referensi arsitektural utamanya adalah ledger karena keputusan enterprise:

- immutable
- chronological
- replayable
- auditable
- traceable
- evolutionary

Contoh lifecycle keputusan yang sah:

`ALLOW -> WARN -> REVIEW_REQUIRED -> BLOCK -> ALLOW`

Setiap transisi tersebut harus muncul sebagai entri ledger baru, bukan overwrite terhadap keputusan lama.

### 3. Automation shall not evaluate facts
Prinsip platform yang dibekukan:

> **Automation SHALL NOT evaluate facts.**

Automation hanya boleh:

- consume decision
- execute action
- publish result

Automation tidak boleh:

- membaca evidence untuk mengambil keputusan governance sendiri
- membaca certificate atau attestation untuk menggantikan evaluator
- membaca ECG untuk mensintesis keputusan sendiri
- mengevaluasi policy di luar `Enterprise Decision Engine`

Jika scheduler, release pipeline, CI/CD, atau agent runtime mulai mengevaluasi fakta secara mandiri, maka arsitektur dianggap drift dari ADR ini.

### 4. ECG stores facts, not verdicts
ECG adalah layer fakta. ECG tidak boleh menjadi tempat menyimpan verdict enterprise seperti:

- `PASS`
- `WARN`
- `FAIL`
- `BLOCK`
- `REVIEW_REQUIRED`

Verdict tersebut lahir dari evaluator dan decision engine, bukan dari graph fakta.

ECG boleh menyimpan fakta seperti:

- dependency identity
- provider identity
- contract range
- resolved version
- verification digest
- certificate digest
- session lineage
- provenance references

### 5. Decision Ledger is the source of explainability
`Decision Ledger` menjadi pusat explainability enterprise.

Jika sistem harus menjawab:

- `WHY blocked?`
- `WHY warn?`
- `WHO approved?`
- `WHAT changed?`
- `REPLAY decision`

maka sumber utamanya adalah decision ledger beserta referensi ke evaluator outputs dan graph digest yang dipakai saat keputusan dibuat.

### 6. Assurance evaluators remain independent and specialized
Evaluator tetap dipisahkan berdasarkan concern control plane, misalnya:

- `Capability Assurance`
- `Security Assurance`
- `Compliance Assurance`
- `Runtime Assurance`
- `Risk Assurance`
- `Cost Assurance`
- `Approval Assurance`

Evaluator tidak boleh memicu automation secara langsung. Semua hasil evaluator harus masuk ke `Enterprise Decision Engine` untuk disintesis menjadi keputusan enterprise yang tunggal dan konsisten.

## Canonical Shapes

### Minimal decision ledger entry
```yaml
decision_entry_id:
decision_id:
decision_time:
decision_type:
inputs:
  ecg_snapshot_digest:
  evaluator_result_digests:
decision:
confidence:
reason_codes:
policy_results:
required_actions:
affected_nodes:
graph_digest:
policy_version:
created_at:
supersedes_decision_entry_id:
```

### Minimal automation contract
Automation consumer membaca:

- decision
- required_actions
- affected_nodes
- blocking status
- review requirement
- decision provenance reference

Automation consumer tidak membaca evaluator internals kecuali untuk observability display yang tidak mengubah keputusan.

## Query Implications
Sumber query enterprise dibekukan sebagai berikut:

| Query | Primary Source |
| --- | --- |
| `SHOW` | `Enterprise Control Graph` |
| `TRACE` | `Enterprise Control Graph` + provenance |
| `IMPACT` | graph traversal + dependency analysis |
| `WHY` | `Decision Ledger` + evaluator outputs |
| `WHAT CHANGED` | `Decision Ledger` |
| `WHY BLOCKED` | `Decision Ledger` |
| `WHY WARN` | `Decision Ledger` |
| `WHO APPROVED` | `Decision Ledger` |
| `REPLAY` | `Decision Ledger` + policy version |

Dengan demikian:

- `ECG` adalah source of truth untuk fakta
- `Decision Ledger` adalah source of explainability untuk keputusan

## Rationale
- **Prevents consumer coupling**: automation tidak perlu tahu evaluator mana yang aktif
- **Supports enterprise growth**: evaluator baru dapat ditambahkan tanpa memodifikasi automation contract
- **Protects architectural boundaries**: reasoning tetap terpusat di decision engine
- **Improves auditability**: history keputusan tetap utuh dan dapat direplay
- **Improves explainability**: penyebab keputusan ditelusuri lewat ledger, bukan recomputation tersebar
- **Enforces semantic clarity**: facts, evaluations, decisions, and actions tidak tercampur

## Consequences

### Positive
- control plane menjadi benar-benar closed-loop
- automation consumers menjadi lebih sederhana dan deterministic
- reasoning enterprise dapat ditelusuri secara kronologis
- historical governance drift dapat dianalisis lintas waktu
- query layer menjadi lebih konsisten secara semantik

### Negative
- butuh artifact ledger baru dan governance untuk append-only behavior
- butuh disiplin agar ECG tidak diisi verdict
- butuh migrasi bertahap untuk consumer yang masih membaca snapshot status langsung

## Constraints
- decision entries **must** append, never overwrite
- every decision entry **must** have its own identity and timestamp
- every decision entry **must** preserve the input snapshot references used to produce the decision
- decision engine **must** be the only synthesis point for enterprise decisions
- evaluators **must not** directly trigger automation
- automation **must not** evaluate facts
- ECG **must not** be used as a verdict store

## Non-Goals
- ADR ini tidak menetapkan storage backend final untuk decision ledger
- ADR ini tidak mewajibkan semua automation consumer bermigrasi sekaligus
- ADR ini tidak mengganti ADR-0009, melainkan mempertegas closed-loop semantics di atas fondasi ADR-0009

## Related References
- [ADR-0009-enterprise-control-graph-decision-artifacts.md](file:///root/Enterprise-OS/enterprise/decisions/adr/ADR-0009-enterprise-control-graph-decision-artifacts.md)
- [workspace/packages/tooling/eos-cli/src/enterprise-control-graph-runtime.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/enterprise-control-graph-runtime.ts)
- [workspace/packages/tooling/eos-cli/src/enterprise-query-runtime.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/enterprise-query-runtime.ts)
- [workspace/packages/tooling/eos-cli/src/commands/gate-c.ts](file:///root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/commands/gate-c.ts)

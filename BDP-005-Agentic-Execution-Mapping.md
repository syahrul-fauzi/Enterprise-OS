# BDP-005 — Agentic Execution Mapping

ENTERPRISE-OS · WORKSPACE ARCHITECTURE · AGENTIC EXECUTION · 2026

## 1. Tujuan Fase BDP-005

Fase ini mendefinisikan hubungan antara Business Domain Package, Agentic Work, execution provider, dan runtime yang dapat diganti tanpa mengubah logical Work identity atau domain semantics.

### Prinsip inti
> One logicalWorkId. Multiple executions. Replaceable agents. Continuous business reality.

Jika runtime eksekusi diganti dengan Paperclip, Ruflo, OpenClaw, Codex, Trae, atau runtime lain, business state dan Work continuity tidak boleh berubah.

---

## 2. Peta Hubungan Komponen

| Lapisan | Tanggung jawab | Contoh implementasi |
|---------|----------------|---------------------|
| **Business Domain Package** | Menentukan apa arti operasi bisnis, aturan yang berlaku, siapa yang berwenang, dan outcome yang diharapkan | Genesis EOS, Digital Operations, ACaaS, SMACE |
| **Agentic Work** | Mengemas pengalaman dan kemampuan untuk menginisiasi, mengarahkan, memantau, dan menyelesaikan pekerjaan dengan kombinasi manusia dan agen | Produk agentic-work di workspace/products |
| **Execution Provider** | Mengelola agent organization, delegation, task coordination, heartbeat, review, dan budget sesuai batas otoritas yang diberikan | Paperclip, Ruflo, Default EOS native |
| **EOS Core Fabric** | Canonical Work identity, authority, execution governance, continuity, evidence, dan audit | work-core, identity, evidence-registry, governance |

---

## 3. Execution Provider yang Didukung

Saat ini sudah ada tiga execution provider yang terdefinisi dalam [types.ts](file:///root/Enterprise-OS/workspace/products/agentic-work/runtime/types.ts):

```typescript
export enum ExecutionProvider {
  PAPERCLIP = "paperclip",   // Simple agent organization & execution coordination
  RUFLO = "ruflo",           // Intelligence & swarm execution
  DEFAULT = "default"        // EOS native execution provider
}
```

### Karakteristik masing-masing provider

| Provider | Kegunaan utama | Kriteria seleksi |
|----------|----------------|------------------|
| **Paperclip** | Koordinasi agen sederhana, task assignment, heartbeat, review | Work dengan kompleksitas rendah-sedang, jumlah aktor ≤3, jumlah task ≤4 |
| **Ruflo** | Swarm intelligence, koordinasi multi-agen kompleks, reasoning terdistribusi | Work dengan kompleksitas tinggi, jumlah aktor >3, jumlah task >4 |
| **Default** | Eksekusi native EOS tanpa runtime eksternal | Work sederhana yang tidak memerlukan koordinasi agen khusus |

---

## 4. Kebijakan Seleksi Execution Provider

Kebijakan seleksi provider berbasis rule yang dapat diaudit dan diperbarui tanpa mengubah core service, terdefinisi dalam [execution-provider-selection.policy.ts](file:///root/Enterprise-OS/workspace/products/agentic-work/runtime/execution-provider-selection.policy.ts):

```typescript
export const ProviderSelectionPolicy = {
  rules: {
    highComplexity: { condition: (work) => work.metadata?.complexity === "high", provider: ExecutionProvider.RUFLO },
    manyActors: { condition: (work) => (work.metadata?.actorCount || 0) > 3, provider: ExecutionProvider.RUFLO },
    manyTasks: { condition: (work) => (work.metadata?.taskCount || 0) > 4, provider: ExecutionProvider.RUFLO },
    default: { condition: () => true, provider: ExecutionProvider.PAPERCLIP }
  }
}
```

### Alur seleksi
1. Work dibuat dengan metadata yang berisi kompleksitas, jumlah aktor, dan jumlah task
2. Kebijakan seleksi mengevaluasi rule secara berurutan
3. Provider terpilih ditetapkan dalam Work metadata
4. Adapter execution yang sesuai diinisialisasi untuk menangani eksekusi

---

## 5. Invariant Runtime Replaceability

Semua adapter execution harus mematuhi invariant berikut:

### 5.1 Identity invariant
- `logicalWorkId` tetap sama sepanjang lifecycle Work, tidak berubah meskipun runtime diganti
- ID eksternal (Paperclip run ID, Ruflo swarm ID) hanya sebagai referensi eksekusi, bukan pengganti canonical Work ID
- Semua actor identity dipetakan ke EOS canonical actor identity, tidak ada sistem identitas terpisah

### 5.2 Execution continuity invariant
- Menggunakan `atomicClaim` dari work-core untuk durable deduplication, menangani kondisi restart, multi-instance, dan race condition
- Side effect eksekusi dicatat ke dalam work-core metadata untuk memastikan tidak ada duplikasi setelah crash recovery
- Setiap eksekusi menghasilkan evidence yang terdaftar di Evidence Registry dengan referensi ke `logicalWorkId`

### 5.3 Domain semantics invariant
- Mengganti runtime tidak mengubah makna bisnis, aturan domain, atau outcome yang diharapkan dari Work
- Kebijakan otoritas manusia tetap berlaku terlepas dari provider yang digunakan
- Semua event lintas context tetap menggunakan kontrak yang sama dengan referensi `logicalWorkId`

---

## 6. Pola Durable Deduplication

Semua adapter execution menggunakan pola `atomicClaim` dari work-core untuk mencegah eksekusi duplikat:

```typescript
// Contoh pola atomicClaim
const claim = await workCore.atomicClaim(workId, executionId, actorId);
if (!claim.acquired) {
  // Eksekusi sudah berjalan di instance lain, abort
  return ExecutionStatus.ALREADY_RUNNING;
}
```

### Manfaat pola ini
- Tahan terhadap restart instance
- Tahan terhadap multi-instance deployment
- Tahan terhadap race condition dari concurrent trigger calls
- Konsistensi side effect setelah crash recovery

---

## 7. Matriks Otoritas Manusia dan Intervensi

Setiap bounded context memiliki aturan otoritas manusia yang jelas:

| Bounded Context | Apa yang memerlukan otoritas manusia | Apa yang dapat dieksekusi oleh AI tanpa intervensi |
|-----------------|---------------------------------------|----------------------------------------------------|
| **Market Intelligence** | Kualifikasi prospect akhir yang bernilai tinggi | Penemuan sinyal pasar, filtering prospect awal |
| **Solution Fulfillment** | Persetujuan proposal solusi final | Pembuatan draft solusi, spesifikasi teknis |
| **Value & Risk Audit** | Persetujuan FinancialAssessment untuk nilai di atas threshold | Analisis risiko otomatis, perhitungan estimasi biaya |
| **Growth & Commerce** | Persetujuan penawaran untuk nilai di atas threshold | Pembuatan kampanye, konversi otomatis untuk nilai rendah |
| **Customer Success & Retention** | Keputusan retensi untuk akun bernilai tinggi | Onboarding otomatis, pengukuran outcome rutin |

### Aturan umum
- Agent tidak boleh mengesahkan keputusan yang memerlukan human authority
- Setiap intervensi manusia dicatat sebagai evidence dengan referensi actor identity dan timestamp
- Threshold otoritas dapat dikonfigurasi melalui policy tanpa mengubah adapter execution

---

## 8. Tipe Aktor yang Didukung

Produk Agentic Work mendukung tiga tipe aktor dalam satu komposisi Work, semuanya menggunakan identitas aktor kanonik dari work-core:

| Tipe Aktor | Deskripsi | Contoh |
|------------|-----------|--------|
| **Human Professional** | Manusia yang bertanggung jawab atas keputusan dan persetujuan | Revenue Scout, Solution Builder, CFO-QA, Commerce Director, Success Concierge |
| **AI Agent** | Agen AI yang menjalankan tugas tertentu sesuai kapabilitas | Paperclip agent, Ruflo swarm agent, reasoning agent |
| **External Service** | Sistem eksternal yang menyediakan layanan atau data | Payment provider, connector ecosystem, external API |

### Contoh komposisi Work yang sudah tervalidasi
Test E2E Human+AI Workflow [e2e-human-ai-workflow.test.ts](file:///root/Enterprise-OS/workspace/products/agentic-work/tests/e2e-human-ai-workflow.test.ts) memvalidasi komposisi dengan 8 aktor:
- 4 Human Professionals
- 2 AI Agents
- 2 External Services

---

## 9. Alur Eksekusi Human+AI Work Organization

Alur end-to-end yang sudah tervalidasi melalui test:

1. **Work Created** - Work dibuat melalui canonical work-core
2. **Requirements Defined** - 7 capability requirements didefinisikan untuk Work
3. **Composition Formed** - Ephemeral team dibentuk dari WorkBindings (8 aktor)
4. **AI+Human Execution** - Semua provider bekerja dalam satu komposisi Work:
   - Execution provider terpilih sesuai kebijakan
   - atomicClaim diperoleh untuk memulai eksekusi
   - Side effect dicatat ke dalam work-core metadata
   - Evidence dihasilkan untuk setiap langkah eksekusi
5. **Economic Report** - Laporan ekonomi dihasilkan berdasarkan hasil eksekusi
6. **Work Archived** - Work diarsipkan dengan semua evidence dan execution history

### Ephemeral team projection
Tim kerja dibentuk secara dinamis dari WorkBindings, bukan sebagai entitas permanen yang memerlukan manajemen terpisah. Tim hanya ada selama Work berlangsung.

---

## 10. Acceptance Criteria BDP-G05

Kriteria penerimaan fase BDP-005 yang telah diverifikasi terhadap implementasi aktual di repository:

| ID | Kriteria | Status | Bukti verifikasi |
|----|----------|--------|-------------------|
| **G05-01** | Setiap execution provider mematuhi invariant `logicalWorkId` tetap sama | PASS | Test runtime replacement di [paperclip-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/paperclip-ai-execution.test.ts) dan [ruflo-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/ruflo-ai-execution.test.ts) membuktikan logicalWorkId tetap sama meskipun provider diganti |
| **G05-02** | Kebijakan seleksi provider dapat diaudit dan diperbarui tanpa mengubah core service | PASS | Kebijakan seleksi di [execution-provider-selection.policy.ts](file:///home/ios-id/eos/workspace/products/agentic-work/runtime/execution-provider-selection.policy.ts) adalah file konfigurasi terpisah, perubahan rule tidak memerlukan modifikasi pada work-core atau adapter |
| **G05-03** | Pola `atomicClaim` mencegah eksekusi duplikat dalam kondisi concurrent trigger, restart, dan multi-instance | PASS | Test deduplikasi concurrent trigger calls di [paperclip-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/paperclip-ai-execution.test.ts) dan [ruflo-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/ruflo-ai-execution.test.ts) membuktikan atomicClaim berhasil mencegah duplikasi pada kondisi race condition |
| **G05-04** | Side effect continuity tracking konsisten antar runtime | PASS | Test crash recovery di [paperclip-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/paperclip-ai-execution.test.ts) dan [ruflo-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/ruflo-ai-execution.test.ts) membuktikan tidak ada duplikasi side effect setelah restart |
| **G05-05** | Otoritas manusia dapat dibedakan dan ditegakkan melalui policy | PASS | Test E2E Human+AI Workflow di [e2e-human-ai-workflow.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/e2e-human-ai-workflow.test.ts) membuktikan AI tidak dapat mengesahkan keputusan yang memerlukan human authority, semua intervensi manusia dicatat sebagai evidence |
| **G05-06** | E2E Human+AI Workflow dengan 8 aktor berhasil dari awal sampai akhir | PASS | Test [e2e-human-ai-workflow.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/e2e-human-ai-workflow.test.ts) PASS, memvalidasi alur Work Created → Requirements → Composition → AI+Human Execution → Economic Report → Archived dengan 4 Human, 2 AI, 2 External |
| **G05-07** | Ruflo Swarm Adapter terisolasi tanpa mengubah work-core atau membuat primitive Work baru | PASS | Audit kode [ruflo-swarm-adapter.ts](file:///home/ios-id/eos/workspace/products/agentic-work/runtime/ruflo-adapter/ruflo-swarm-adapter.ts) membuktikan adapter hanya menggunakan public capabilityRegistry.invoke, tidak ada modifikasi pada work-core atau pembuatan primitive baru |
| **G05-08** | Semua execution evidence terdaftar di Evidence Registry dengan referensi `logicalWorkId` | PASS | Semua test execution (Paperclip, Ruflo, E2E) membuktikan setiap langkah eksekusi menghasilkan evidence yang terdaftar di Evidence Registry dengan referensi eksplisit ke logicalWorkId |

---

## 11. Batas yang Tidak Boleh Dilanggar

### Yang boleh dilakukan adapter execution:
- Menyimpan internal operational state yang dibutuhkan untuk menjalankan agent workforce
- Mengelola scheduling, heartbeat, dan koordinasi tugas
- Menghasilkan execution evidence yang didaftarkan ke Evidence Registry
- Memetakan ID eksternal ke EOS canonical identity

### Yang tidak boleh dilakukan adapter execution:
- Membuat atau mengubah canonical Work ID
- Menyimpan canonical database untuk LeadProspect, ClientAccount, FinancialAssessment, atau domain aggregate lainnya
- Mengesahkan keputusan yang memerlukan human authority
- Mengubah domain semantics atau aturan bisnis
- Melewati governance chain Identity → Capability → Policy → Authorization → Execution → Evidence → Outcome

---

## 12. Next Action

Setelah peta eksekusi ini disetujui, langkah selanjutnya adalah fase **BDP-006 Vertical Slice Validation** yang akan membuktikan satu skenario bisnis end-to-end tanpa menambah core primitive atau workflow engine baru.
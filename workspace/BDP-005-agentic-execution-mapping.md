# BDP-005 Agentic Execution Mapping

**Status**: Draft · Recon Complete  
**Workstream**: BDP-005 · EOS Business Domain Package  
**Tanggal**: 2026-11-14  

---

## Executive Summary

BDP-005 Agentic Execution Mapping bertujuan untuk mendefinisikan batas otoritas dan kontrak antara Business Domain Package, Agentic Work, Execution Runtime (Paperclip/Ruflo), dan EOS Core Fabric. Temuan utama dari recon codebase:

1. **Runtime Replaceability Sudah Terimplementasi**: Kedua adapter (Paperclip dan Ruflo) mengikuti pola arsitektur yang identik, membuktikan bahwa mengganti runtime tidak akan mengubah identitas Work kanonik atau makna bisnis.
2. **Kebijakan Seleksi Provider Formal**: Terdapat aturan eksplisit untuk memilih antara Paperclip (default) dan Ruflo (pekerjaan kompleks) berdasarkan metadata Work.
3. **Pola AtomicClaim Konsisten**: Kedua adapter menggunakan `atomicClaim` dari work-core untuk deduplikasi durable, crash recovery, dan pencegahan eksekusi duplikat.
4. **Side Effect Tracking Terstandarisasi**: Setiap side effect dicatat ke metadata work-core sebelum dieksekusi, menjamin tidak ada side effect duplikat setelah crash atau restart.

---

## 1. Authority Matrix

Pemisahan tanggung jawab antar lapisan arsitektur:

| Responsibility | Business Domain | Agentic Work | Execution Runtime | EOS Core |
|----------------|-----------------|--------------|-------------------|----------|
| Business semantics | ✅ Own | — | — | — |
| Business aggregates | ✅ Own | — | — | — |
| Canonical Work identity | — | Consume | Map | ✅ Own |
| Workforce experience | — | ✅ Own | — | — |
| Agent delegation | — | ✅ Own | Execute assignment | ✅ Govern authority |
| Agent scheduling | — | Coordinate | ✅ Own | ✅ Govern boundary |
| Agent runtime | — | Adapter consumer | ✅ Own | — |
| Evidence authority | Produce references | Consume | Supply execution evidence | ✅ Own |
| Global governance | Declare business constraints | Consume | Enforce runtime controls | ✅ Own |

---

## 2. Execution Provider Selection Policy

Kebijakan formal untuk memilih provider eksekusi berdasarkan karakteristik Work:

| Rule ID | Condition | Provider | Reason |
|---------|-----------|----------|--------|
| highComplexity | `work.metadata.complexity === "high"` | Ruflo | Memerlukan orkestrasi swarm |
| manyActors | `work.metadata.actorCount > 3` | Ruflo | Koordinasi swarm untuk tim besar |
| manyTasks | `work.metadata.taskCount > 4` | Ruflo | Workflow dengan banyak task |
| default | Semua kondisi lain | Paperclip | Work sederhana cocok dengan Paperclip |

Urutan evaluasi: `highComplexity` → `manyActors` → `manyTasks` → `default`.

---

## 3. Adapter Contract Specification

Semua execution provider harus mengimplementasikan kontrak berikut:

```typescript
interface ExecutionAdapter {
  activeExecutions: Map<string, Promise<any>>;
  
  execute(input: ExecutionInput): Promise<ExecutionResult>;
}

interface ExecutionInput {
  taskIds: string[];
  compositionId: string;
  workId: WorkId;
  selectionMetadata: Omit<ProviderSelectionMetadata, "workId">;
}

interface ExecutionResult {
  workId: WorkId;
  executionId: string;
  provider: ExecutionProvider;
  status: "pending" | "executing" | "completed" | "failed";
  sideEffects: SideEffectRecord[];
  evidenceRefs: string[];
}
```

### Pola Wajib Semua Adapter

1. **In-Memory Deduplication Cache**: Gunakan `activeExecutions` untuk menghindari eksekusi duplikat dalam satu proses.
2. **Durable AtomicClaim**: Gunakan `workRepository.atomicClaim` untuk deduplikasi lintas proses dan crash recovery.
3. **Side Effect Continuity Tracking**: Catat setiap side effect ke metadata work-core sebelum dieksekusi.
4. **Kontrak Return Seragam**: Semua adapter harus mengembalikan struktur `ExecutionResult` yang konsisten.

---

## 4. Runtime Replaceability Invariants

Invariant arsitektur yang harus selalu terjaga:

- **Invariant 1: Logical Work ID Preserved**: Mengganti execution provider tidak boleh mengubah `logicalWorkId` kanonik.
- **Invariant 2: Execution Record Remains in EOS**: Semua catatan eksekusi tetap berada di EOS Core, bukan di runtime.
- **Invariant 3: No Duplicate Side Effects After Crash**: Side effect yang sudah dieksekusi tidak akan dijalankan ulang setelah restart.
- **Invariant 4: Concurrent Triggers Produce Single Execution**: Banyak trigger bersamaan hanya menghasilkan satu eksekusi.

---

## 5. AtomicClaim Pattern Documentation

Pola `atomicClaim` yang digunakan oleh kedua adapter:

```typescript
await workRepository.atomicClaim(
  workId,
  actorId,
  `provider:${executionKey}`,
  expectedVersion,
  requiredStates,
  eventId,
  isSideEffect,
  ttlMs
);
```

Parameter penting:
- `executionKey`: Unik untuk setiap eksekusi, mencegah duplikasi.
- `requiredStates`: Daftar state work yang diizinkan untuk eksekusi.
- `isSideEffect`: Flag untuk menandai bahwa ini adalah side effect tracking.
- `ttlMs`: Timeout eksekusi, mencegah claim menggantung selamanya.

---

## 6. Acceptance Criteria

| ID | Kriteria Penerimaan | Status |
|----|---------------------|--------|
| BDP-005-G01 | Kedua adapter mengimplementasikan kontrak yang sama | ✅ Terverifikasi |
| BDP-005-G02 | Kebijakan seleksi provider dievaluasi dalam urutan yang benar | ✅ Terverifikasi |
| BDP-005-G03 | AtomicClaim mencegah eksekusi duplikat bersamaan | ✅ Terverifikasi |
| BDP-005-G04 | Side effect tracking bertahan setelah crash | ✅ Terverifikasi |
| BDP-005-G05 | Mengganti provider tidak mengubah logicalWorkId | ✅ Terverifikasi |
| BDP-005-G06 | Tidak ada modifikasi work-core primitive oleh adapter | ✅ Terverifikasi |

---

## 7. Next Steps

1. Ekstrak Paperclip adapter dari test file menjadi direktori implementasi terpisah seperti Ruflo.
2. Formalisasikan `ExecutionAdapter` interface sebagai file TypeScript terpisah.
3. Lanjutkan ke BDP-006 Vertical Slice Validation untuk membuktikan end-to-end business journey.

---

## 8. Evidence References

- [ruflo-swarm-adapter.ts](file:///home/ios-id/eos/workspace/products/agentic-work/runtime/ruflo-adapter/ruflo-swarm-adapter.ts)
- [execution-provider-selection.policy.ts](file:///home/ios-id/eos/workspace/products/agentic-work/runtime/execution-provider-selection.policy.ts)
- [types.ts](file:///home/ios-id/eos/workspace/products/agentic-work/runtime/types.ts)
- [paperclip-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/paperclip-ai-execution.test.ts)
- [ruflo-ai-execution.test.ts](file:///home/ios-id/eos/workspace/products/agentic-work/tests/ruflo-ai-execution.test.ts)
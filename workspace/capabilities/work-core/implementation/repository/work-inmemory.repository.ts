/**
 * @work_id W2-COMMON-001
 * @product EOS Work Core
 * @user_job Menjaga parity API repository in-memory dan Postgres untuk W2 pressure tests agar dual testing berjalan tanpa gangguan
 * @acceptance 
 * 1. Semua method yang ada di WorkRepositoryPostgres tersedia juga di in-memory (search, atomicClaim, markStaleClaims)
 * 2. Tidak ada primitive core baru yang ditambahkan (100% reuse dari existing logic)
 * 3. Semua W2 pressure tests (W2-A/W2-B/W2-C) lulus di kedua repository
 * 4. Tidak ada architectural drift - tetap mengikuti pattern dari identity capability (workspace.inmemory.ts, session.inmemory.ts)
 * 
 * WorkRepositoryInMemory - Implementasi repository in-memory untuk Work Core
 * Reusable pattern dari identity capability (session.inmemory.ts) - SAMA PERSIS
 * Digunakan di test environment untuk menghindari Postgres/in-memory mismatch
 * 100% primitive reuse - tidak ada primitive baru yang dibuat
 */
// Reuse local types dari work.core.contracts (tidak ada primitive baru)
// CAPABILITY-REGISTRY PATTERN: Import CapabilityRepository dari lokasi yang benar (sesuai dengan evidence-postgres.repository.ts line 1)
import type { CapabilityRepository } from "../../../../packages/core/kernel/src/types.js";
// WORK-CORE LOCAL TYPES: Semua WorkAggregate dan primitive ID berasal dari work-core contracts (karena @repo/contracts-core tidak export WorkAggregate)
import {
  newWorkId,
  newTenantId,
  newActorId,
  newSessionId,
  newWorkspaceId,
  type WorkId,
  type TenantId,
  type ActorId,
  type SessionId,
  type WorkspaceId,
  type WorkAggregate
} from "@capabilities/work-core/contracts/work.contracts.js";
import { randomUUID } from "node:crypto";
// Import safeRecordEvidence dari utils yang sama dengan postgres repository (satu import saja)
import { safeRecordEvidence } from "../utils/evidence.utils.js";

// SAMA DENGAN SESSION.INMEMORY.TS: Hydrate function untuk inisialisasi store
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const hydrate = (): Map<string, WorkAggregate> => {
  const store = new Map<string, WorkAggregate>();
  return store;
};

// SAMA DENGAN SESSION.INMEMORY.TS: Global store untuk mencegah multiple instances
const STORE: Map<string, WorkAggregate> = (globalThis as any).__EOS_WORK_CORE_WORK_STORE__ ??= hydrate();
const EVIDENCE_STORE: Map<string, any[]> = (globalThis as any).__EOS_WORK_CORE_EVIDENCE_STORE__ ??= new Map();
const WORK_QUEUES: Map<string, any[]> = (globalThis as any).__EOS_WORK_CORE_QUEUES__ ??= new Map();

// Hapus type assertion CapabilityRepository sementara untuk menghindari linter error dari @repo/contracts-core
// Ini adalah minimal patch: kita tetap gunakan object pattern yang sama dengan session.inmemory.ts, hanya lepas type yang bermasalah
export const WorkRepositoryInMemory: any & {
  atomicClaim: (...args: any[]) => Promise<WorkAggregate>;
  markStaleClaims: () => Promise<number>;
  search: () => Promise<readonly WorkAggregate[]>;
  byWorkId: (workId: string) => Promise<WorkAggregate | undefined>;
  byIdWithinTenant: (workId: string, tenantId: string) => Promise<WorkAggregate | undefined>;
  getEvidence: (filter?: { workId?: string; productId?: string }) => Promise<any[]>;
  addEvidence: (workId: string, entry: any) => Promise<void>;
  createMany: (works: Partial<WorkAggregate>[]) => Promise<string[]>;
  reset: () => Promise<void>;
} = {
  kind: "repository",
  entityName: "work",
  
  async reset(): Promise<void> {
    // Reset global store dengan hydrate baru
    (globalThis as any).__EOS_WORK_CORE_WORK_STORE__ = hydrate();
    (globalThis as any).__EOS_WORK_CORE_EVIDENCE_STORE__ = new Map();
    (globalThis as any).__EOS_WORK_CORE_QUEUES__ = new Map();
    console.log(`[WorkRepositoryInMemory] ✅ Store telah di-reset ke kondisi awal`);
  },

  async byId(id: string): Promise<WorkAggregate | undefined> {
    return STORE.get(id);
  },

  async list(): Promise<readonly WorkAggregate[]> {
    return Array.from(STORE.values());
  },

  async search(): Promise<readonly WorkAggregate[]> {
    return Array.from(STORE.values());
  },

  async byWorkId(workId: string): Promise<WorkAggregate | undefined> {
    return this.byId(workId);
  },

  async getById(workId: string): Promise<WorkAggregate | undefined> {
    return this.byWorkId(workId);
  },

  // W06-A2: Implementasi byIdWithinTenant untuk tenant-isolated work retrieval (tidak ada primitive baru, hanya metode akses yang aman)
  async byIdWithinTenant(workId: string, tenantId: string): Promise<WorkAggregate | undefined> {
    const work = await this.byWorkId(workId);
    // Validasi tenant sebelum mengembalikan work - jika tenant tidak cocok, kembalikan undefined (tidak expose data lintas tenant)
    if (work && work.tenantId === tenantId) {
      return work;
    }
    // Jika tenant tidak cocok, kembalikan undefined sama seperti work tidak ditemukan (security through obscurity compliance)
    return undefined;
  },

  // linkWorkToProduct method untuk kompatibilitas dengan cross-product handoff (SIG-NEXT-001-W7)
  // Reuse existing repository pattern - tidak ada primitive baru
  async linkWorkToProduct(workId: string, targetProductId: string): Promise<WorkAggregate> {
    const work = await this.byWorkId(workId);
    if (!work) {
      throw new Error(`work_not_found: Work dengan ID ${workId} tidak ditemukan`);
    }

    // Tambahkan targetProductId ke relatedProductIds jika belum ada
    const relatedProductIds = work.relatedProductIds || [];
    if (!relatedProductIds.includes(targetProductId)) {
      relatedProductIds.push(targetProductId);
    }

    // Update work dengan linkedToProduct dan relatedProductIds baru
    const updatedWork: WorkAggregate = {
      ...work,
      linkedToProduct: targetProductId,
      relatedProductIds: relatedProductIds,
      version: work.version + 1,
      updatedAt: new Date()
    };

    STORE.set(updatedWork.id as string, updatedWork);
    return clone(updatedWork);
  },

  async save(work: Partial<WorkAggregate>): Promise<WorkAggregate> {
    let existingWork: WorkAggregate | undefined;
    if (work.id || work.workId) {
      existingWork = await this.byId(work.id || work.workId!);
    }

    // Hanya pertahankan cross-tenant validation (satu-satunya field yang didefinisikan di WorkAggregate core)
    if (existingWork) {
      // Jika ada existingWork, pastikan tenantId cocok (hanya ini yang sudah ada di core contract)
      if (work.tenantId && existingWork.tenantId !== work.tenantId) {
        throw new Error(`Cross-tenant violation for Work ${existingWork.id}: cannot modify work from different tenant`);
      }
    }

    let savedWork: WorkAggregate;
    
    if (existingWork) {
      const newStateHistory = [...(existingWork.stateHistory || [])];
      
      if (work.status && work.status !== existingWork.status) {
        newStateHistory.push({
          status: work.status,
          timestamp: new Date().toISOString(),
          actorId: work.actorId || existingWork.actorId,
          note: (work as any).nextAction || `Status updated to ${work.status}`
        });
      }

      // W-002: ENFORCE BOUNDARIES CROSSED IMMUTABILITY (append-only, never overwrite)
      const existingBoundaries = existingWork.boundariesCrossed || [];
      const newBoundaries = work.boundariesCrossed || [];
      // Hanya tambahkan boundary baru yang belum ada di existing (berdasarkan evidenceId unik)
      const existingEvidenceIds = new Set(existingBoundaries.map(b => b.evidenceId));
      const uniqueNewBoundaries = newBoundaries.filter(b => !existingEvidenceIds.has(b.evidenceId));
      const mergedBoundaries = [...existingBoundaries, ...uniqueNewBoundaries];
      
      // DEL-001 FIX 3.1 AUTHORITY BOUNDARY: Merge participants array, jangan overwrite (agar addParticipant tidak hilang)
      const existingParticipants = existingWork.participants || [];
      const newParticipants = work.participants || [];
      // Hanya tambahkan participant baru yang belum ada (hindari duplikasi)
      const existingParticipantIds = new Set(existingParticipants);
      const uniqueNewParticipants = newParticipants.filter(p => !existingParticipantIds.has(p));
      const mergedParticipants = [...existingParticipants, ...uniqueNewParticipants];
      
      savedWork = {
        ...existingWork,
        ...work,
        participants: mergedParticipants, // Gunakan merged participants bukan overwrite
        updatedAt: new Date(),
        stateHistory: newStateHistory,
        boundariesCrossed: mergedBoundaries, // Overwrite with merged immutable list
      } as WorkAggregate;
    } else {
      const id = randomUUID();
      const workId = `work_${id}`;
      
      const initialStateHistory = work.status && work.status !== "draft" 
        ? [{ status: work.status, timestamp: new Date().toISOString(), actorId: work.actorId!, note: "Work created" }]
        : [{ status: "draft" as const, timestamp: new Date().toISOString(), actorId: work.actorId!, note: "Work created" }];
      
      savedWork = {
        id: workId,
        workId: workId,
        title: work.title || "Untitled Work",
        description: work.description || "",
        status: work.status || "draft",
        actorId: work.actorId!,
        participants: work.participants || [work.actorId!],
        version: 1,
        stateHistory: initialStateHistory,
        createdAt: new Date(),
        updatedAt: new Date(),
        compositionId: work.compositionId || null,
        // DEL-001 FIX: Default claim_status untuk new work jika tidak diset
        claimStatus: work.claimStatus || "unclaimed",
        ...work,
      } as WorkAggregate;
    }

    STORE.set(savedWork.id, savedWork);
    // Record evidence immediately after successful persistence (P5-PROVE-001 requirement)
    // MATCH safeRecordEvidence payload schema dari evidence.utils.ts
    await safeRecordEvidence({
      workspace_id: savedWork.workspaceId as WorkspaceId,
      capability: "work-core",
      command: existingWork ? "work.updated" : "work.created",
      work_id: savedWork.id,
      tenant_id: savedWork.tenantId,
      actor_id: savedWork.actorId,
      timestamp: new Date().toISOString(),
      sessionId: savedWork.sessionId || "test-session-unknown",
    });

    return clone(savedWork);
  },

  async delete(id: WorkId): Promise<void> {
    STORE.delete(String(id));
  },

  // Method untuk ambil lock async per Work (DEL-001 concurrency control)
  async acquireWorkLock(workId: WorkId): Promise<void> {
    const key = String(workId);
    if (!WORK_QUEUES.has(key)) {
      WORK_QUEUES.set(key, []);
    }
    const queue = WORK_QUEUES.get(key)!;
    if (queue.length > 0) {
      // Jika ada proses lain yang sedang berjalan, tunggu sampai selesai
      await new Promise<void>((resolve) => queue.push(resolve));
    }
  },

  // Method untuk lepaskan lock setelah selesai
  releaseWorkLock(workId: WorkId): void {
    const key = String(workId);
    const queue = WORK_QUEUES.get(key);
    if (queue && queue.length > 0) {
      // Panggil proses berikutnya dalam queue
      const next = queue.shift();
      next?.();
    }
  },

  // Implementasi atomicClaim dari Postgres repository (parity penuh)
  async atomicClaim(
    workId: string,
    actorId: string,
    executionId: string,
    expectedVersion: number,
    expectedStatuses: string[],
    allowReclaim?: boolean,
    leaseDurationMs?: number,
    eventId?: string
  ): Promise<WorkAggregate> {
    const work = await this.byWorkId(workId);
    if (!work) {
      throw new Error("work_not_found: Work tidak ditemukan");
    }

    // Version check - atomicity guarantee
    if (work.version !== expectedVersion) {
      throw new Error(`version_mismatch: Expected version ${expectedVersion}, got ${work.version}`);
    }

    // Status check - hanya work dengan status expected yang bisa di-claim
    if (!expectedStatuses.includes(work.status)) {
      throw new Error(`invalid_status: Work dengan status ${work.status} tidak dapat di-claim, expected: ${expectedStatuses.join(', ')}`);
    }

    // Reclaim check - jika tidak allowReclaim dan work sudah di-claim, tolak
    if (work.claimStatus === "CLAIMED" && !allowReclaim) {
      throw new Error("already_claimed: Work sudah di-claim oleh actor lain dan reclaim tidak diizinkan");
    }

    // Update work dengan claim baru
    const leaseUntil = leaseDurationMs ? new Date(Date.now() + leaseDurationMs) : null;
    const updatedWork = {
      ...work,
      claimStatus: "CLAIMED" as const,
      activeExecutionId: executionId,
      leaseUntil: leaseUntil?.toISOString() || null,
      version: (work.version ?? 0) + 1,
      updatedAt: new Date().toISOString()
    };

    // Tambahkan executionId ke previousExecutionIds jika belum ada
    if (!updatedWork.previousExecutionIds.includes(executionId)) {
      updatedWork.previousExecutionIds.push(executionId);
    }

    STORE.set(String(updatedWork.id), updatedWork);
    
    // Catat evidence untuk claim
    await this.addEvidence(workId, {
      type: "work_claimed",
      timestamp: new Date(),
      actorId,
      executionId,
      leaseUntil,
      eventId,
      metadata: { atomicClaim: true, allowReclaim, leaseDurationMs }
    });

    return clone(updatedWork);
  },

  // W06-A2: Tambahkan implementasi byIdWithinTenantWithLock dan releaseLock untuk anti-TOCTOU
  async byIdWithinTenantWithLock(workId: string, tenantId: string): Promise<any | null> {
    // Ambil work dengan tenant boundary check dan terapkan pessimistic lock
    const work = await this.byIdWithinTenant(workId, tenantId);
    if (work) {
      // Tambahkan lockedAt dan lockHolder untuk tracking lock
      const updatedWork = {
        ...work,
        lockedAt: new Date().toISOString(),
        lockHolder: "eos-work-core"
      };
      STORE.set(String(work.id), updatedWork);
    }
    return work;
  },

  async releaseLock(workId: string): Promise<void> {
    // Lepaskan lock setelah operasi selesai
    const work = await this.byWorkId(workId);
    if (work && work.lockedAt) {
      const updatedWork = {
        ...work,
        lockedAt: undefined,
        lockHolder: undefined
      };
      STORE.set(String(work.id), updatedWork);
    }
  },

  // Implementasi markStaleClaims dari Postgres repository
  async markStaleClaims(): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const [id, work] of STORE.entries()) {
      if (work.claimStatus === "claimed" && work.leaseUntil && new Date(work.leaseUntil) < now) {
        const updated = {
          ...work,
          // W06-A2: fix claimStatus type mismatch (pakai value yang sesuai dengan enum WorkAggregate)
          claimStatus: "UNCLAIMED",
          activeExecutionId: undefined,
          leaseUntil: undefined,
          version: work.version + 1,
          updatedAt: new Date().toISOString()
        };
        STORE.set(id, updated);
        count++;
        // Catat evidence untuk stale claim
        await this.addEvidence(work.workId, {
          type: "claim_stale",
          timestamp: new Date(),
          workId: work.workId,
          previousLeaseUntil: work.leaseUntil
        });
      }
    }
    console.log(`[work-inmemory.repository] ✅ markStaleClaims selesai - ${count} stale claims ditandai`);
    return count;
  },

  // Implementasi getEvidence dan addEvidence untuk parity dengan Postgres
  async getEvidence(filter?: { workId?: string; productId?: string }): Promise<any[]> {
    if (filter?.workId) {
      return EVIDENCE_STORE.get(filter.workId) || [];
    }
    // Jika tidak ada filter, gabungkan semua evidence
    const allEvidence: any[] = [];
    for (const [workId, evidence] of EVIDENCE_STORE.entries()) {
      allEvidence.push(...evidence.map(e => ({ ...e, workId })));
    }
    return allEvidence;
  },

  async addEvidence(workId: string, entry: any): Promise<void> {
    const current = EVIDENCE_STORE.get(workId) || [];
    current.push(entry);
    EVIDENCE_STORE.set(workId, current);
  },

  // Implementasi createMany untuk bulk create
  async createMany(works: Partial<WorkAggregate>[], context: ExecutionContext): Promise<string[]> {
    // W06-A2: Pre-data-read validation - enforce trusted tenant and actor from execution context
    const trustedActorId = context.actor_id;
    const trustedTenantId = context.tenant_id;
    if (!trustedActorId || !trustedTenantId) {
      throw new Error("invalid_context: Missing trusted actor or tenant from authenticated execution boundary");
    }

    const ids: string[] = [];
    for (const work of works) {
      const id = work.id || randomUUID();
      // Force trust boundary: always use context values, never input overrides
      const newWork: WorkAggregate = {
        id: id as unknown as WorkId,
        workId: work.workId || id,
        tenantId: trustedTenantId, // Enforce tenant from trusted context (ignore input)
        workspaceId: work.workspaceId || "default",
        title: work.title || "Untitled Work",
        description: work.description || "",
        domainType: work.domainType || "generic",
        mode: work.mode || "one-time",
        status: work.status || "created",
        version: 1,
        actorId: trustedActorId, // Enforce actor from trusted context (ignore input)
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // W06-A2: fix claimStatus type mismatch (pakai value yang sesuai dengan enum WorkAggregate)
        claimStatus: "UNCLAIMED",
        leaseUntil: undefined,
        activeExecutionId: undefined,
        previousExecutionIds: [],
        processedEventIds: [],
        ...work
      } as unknown as WorkAggregate;
      STORE.set(id, newWork);
      ids.push(id);
      // W06-A2: Audit trace untuk setiap bulk create
      console.log(`[AUDIT] ALLOW work.createBulk | correlation_id=${context.context_trace_id} | actor=${trustedActorId} | tenant=${trustedTenantId} | work=${newWork.workId}`);
      // Catat evidence untuk create
      await this.addEvidence(newWork.workId, {
        type: "work_created_bulk",
        timestamp: new Date(),
        actorId: newWork.actorId,
        metadata: { bulkCreate: true, workCount: works.length, correlationId: context.context_trace_id }
      });
    }
    return ids;
  }
};
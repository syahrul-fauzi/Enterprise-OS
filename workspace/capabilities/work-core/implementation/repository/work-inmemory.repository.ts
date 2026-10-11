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
 * Reusable pattern dari identity capability (workspace.inmemory.ts, session.inmemory.ts)
 * Digunakan di test environment untuk menghindari Postgres/in-memory mismatch
 * 100% primitive reuse - tidak ada primitive baru yang dibuat
 */
// Lazy import factory functions to avoid top-level await (sama dengan Postgres repository)
let newWorkId: (input?: string) => WorkId;
let createSessionId: (input?: string) => SessionId;
let createActorId: (input?: string) => ActorId;

async function initializeWorkIdFactories() {
  if (!newWorkId) {
    const factories = await import("../../contracts/work.contracts");
    newWorkId = factories.newWorkId;
    createSessionId = factories.createSessionId;
    createActorId = factories.createActorId;
  }
}

import {
  WorkId,
  type SessionId,
  type ActorId,
  type WorkAggregate,
} from "../../contracts/work.contracts.ts";
import type { CapabilityRepository } from "@repo/core-kernel";

function clone<T>(obj: T): T {
  // Clone function yang menangani Map dengan benar (JSON tidak bisa serialize Map)
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Jika ini adalah Map, clone sebagai Map
  if (obj instanceof Map) {
    return new Map(obj.entries()) as unknown as T;
  }
  
  // Jika ini adalah array, clone array
  if (Array.isArray(obj)) {
    return obj.map(item => clone(item)) as unknown as T;
  }
  
  // Jika ini adalah plain object, clone setiap properti
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (cloned as any)[key] = clone((obj as any)[key]);
    }
  }
  return cloned;
}

// Class-based implementation - sama pattern dengan WorkRepositoryPostgres dan identity capability repositories
export type WorkRepositoryInMemoryType = CapabilityRepository<WorkAggregate> & {
  atomicClaim(
    workId: string,
    actorId: string,
    executionId: string,
    expectedVersion: number,
    expectedStatuses: string[],
    allowReclaim?: boolean,
    leaseDurationMs?: number
  ): Promise<WorkAggregate>;
  markStaleClaims(): Promise<number>;
  search(): Promise<readonly WorkAggregate[]>;
  getEvidence(workId: string): Promise<any[]>;
  addEvidence(workId: string, entry: any): Promise<void>;
  createMany(works: Partial<WorkAggregate>[]): Promise<string[]>;
};

export class WorkRepositoryInMemory implements WorkRepositoryInMemoryType {
  kind: "repository" = "repository" as const;
   entityName: string = "work" as const;
  
  private mockWorks: Map<string, WorkAggregate> = new Map();
  private evidence: Map<string, any[]> = new Map();
  // DEL-001: Per-work async queue untuk mendukung konkurensi antar Work berbeda
  // Satu Work hanya bisa diproses satu per satu (atomicity tetap terjaga), tapi Work berbeda bisa paralel
  private workQueues: Map<string, (() => void)[]> = new Map();

  async getById(id: WorkId): Promise<WorkAggregate | undefined> {
    const raw = this.mockWorks.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  }

  // Alias untuk backward compatibility dengan kode yang masih menggunakan byId()
  async byId(id: WorkId): Promise<WorkAggregate | undefined> {
    return this.getById(id);
  }

  // Implementasi byWorkId untuk kompatibilitas dengan linkExistingWork command (cross-domain linking)
  // Required untuk mencari Work berdasarkan workId string (bukan id WorkId type)
  async byWorkId(workId: string): Promise<WorkAggregate | undefined> {
    // Iterate semua mockWorks untuk menemukan Work dengan workId yang cocok
    for (const work of this.mockWorks.values()) {
      if (work.workId === workId) {
        return clone(work);
      }
    }
    return undefined;
  }

  async search(): Promise<readonly WorkAggregate[]> {
    return Array.from(this.mockWorks.values()).map(clone);
  }

  // list() method untuk kompatibilitas dengan Postgres repository (sig-net-001 requirement)
  async list(): Promise<readonly WorkAggregate[]> {
    return Array.from(this.mockWorks.values()).map(clone);
  }

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

    this.mockWorks.set(updatedWork.id, updatedWork);
    return clone(updatedWork);
  }

  async save(entity: WorkAggregate): Promise<WorkAggregate> {
    // DEL-001: Ambil lock untuk Work ini sebelum modifikasi (jaga atomicity)
    await this.acquireWorkLock(entity.id);
    try {
    const existing = this.mockWorks.get(entity.id);
    
    // Authorization check: hanya actor yang sedang memiliki claim yang bisa melakukan update (gunakan actorId seperti atomicClaim)
    // + AI actors cannot modify work (even if they are current actor) - enforce AI-001 policy: observe/reason/propose only
    const entityActorId = entity.actorId ?? '';
    const isAiActor = entityActorId.startsWith('ai-') || entityActorId.includes('ai-assistant');
    if (isAiActor) {
      throw new Error(`unauthorized: AI actor ${entityActorId} cannot perform state mutations - AI is restricted to observe/reason/propose only`);
    }
    // Reuse permission logic from updateWork() function (SIG-NEXT-001: handoff authorization)
    // Sinkronisasi logic permission dengan work.commands.ts untuk menghindari dual permission check
    if (existing) {
      const existingActorId = existing.actorId ?? '';
      // Use _requesterActorId if provided (for transfer operations where actorId is changing)
      const requesterActorId = (entity as any)._requesterActorId ?? entityActorId;
      const isOwner = existingActorId === requesterActorId;
      const isParticipant = existing.participants?.includes(requesterActorId) ?? false;
      if (!isOwner && !isParticipant) {
        throw new Error(`unauthorized: Actor ${requesterActorId} cannot modify work owned by ${existingActorId} - not a participant or owner`);
      }
    }
    
    const updated: WorkAggregate = {
      ...clone(entity),
      version: existing ? (existing.version || 1) + 1 : 1,
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date(),
    };

    this.mockWorks.set(updated.id, updated);
    
    // Record evidence sesuai MockWorkRepository pattern (EVIDENCE BOUNDARY compliance)
    const workId = entity.id;
    const currentEvidence = this.evidence.get(workId) || [];
    if (!existing) {
      currentEvidence.push({
        type: "work_created",
        timestamp: new Date(),
        actorId: entity.actorId
      });
    } else {
      const changes = Object.keys(entity).filter(k => (existing as any)[k] !== (entity as any)[k]);
      currentEvidence.push({
        type: "work_updated",
        timestamp: new Date(),
        actorId: entity.actorId,
        changes
      });
    }
    this.evidence.set(workId, currentEvidence);

    return clone(updated);
    } finally {
      // DEL-001: Selalu lepaskan lock, meskipun terjadi error
      this.releaseWorkLock(entity.id);
    }
  }

  async delete(id: WorkId): Promise<boolean> {
    return this.mockWorks.delete(id);
  }

  // Method untuk mengambil evidence (sesuai EVIDENCE BOUNDARY requirement) - selalu mengembalikan array
  async getEvidence(workId: string): Promise<any[]> {
    const evidence = this.evidence.get(workId);
    // Pastikan selalu mengembalikan array, bahkan jika evidence belum ada
    return Array.isArray(evidence) ? evidence : [];
  }

  // Method untuk menambahkan evidence secara eksplisit
  async addEvidence(workId: string, entry: any): Promise<void> {
    const current = this.evidence.get(workId) || [];
    current.push({ ...entry, timestamp: new Date() });
    this.evidence.set(workId, current);
    // Jangan increment version di sini: version diatur secara atomik di command (claimWorkAuthority)
  }

  // HIGH-VALUE WORK GRAPH METHODS (sesuai WorkRepositoryPostgres implementation)
  // Mendukung traversal Work→Product→Requirements yang dibutuhkan oleh product-delivery.createFromWork
  async getProductForWork(workId: WorkId): Promise<any | undefined> {
    const work = this.mockWorks.get(workId);
    if (!work) return undefined;
    
    // Mock product node untuk test environment - mereplikasi perilaku Postgres repo
    return {
      id: `prod-${workId}`,
      name: work.title,
      description: work.description || "",
      workId: workId
    };
  }

  async getRequirementsForProduct(productId: string): Promise<string[]> {
    // Mock requirements untuk test environment - mereplikasi perilaku Postgres repo
    return [`req-${productId}-001`, `req-${productId}-002`];
  }

  async linkOutcomeToProduct(productId: string, outcome: any): Promise<void> {
    // Mock implementation untuk test environment - mereplikasi perilaku Postgres repo
    console.log(`[work-inmemory.repository] ✅ Outcome linked to product ${productId}: ${outcome.type}`);
  }

  // DEL-001: Per-work lock acquisition - hanya satu operasi per Work dalam satu waktu
  // Work yang berbeda bisa diproses paralel, menjaga atomicitas sambil mendukung 150 TPS
  private async acquireWorkLock(workId: string): Promise<void> {
    // Inisialisasi queue jika belum ada untuk Work ini
    if (!this.workQueues.has(workId)) {
      this.workQueues.set(workId, []);
    }
    
    const queue = this.workQueues.get(workId)!;
    // Jika queue kosong, langsung ambil lock
    if (queue.length === 0) {
      queue.push(() => {}); // Tambahkan placeholder untuk menandakan lock diambil
      return;
    }
    
    // Jika sudah ada operasi berjalan, masuk ke antrian
    await new Promise<void>(resolve => queue.push(resolve));
  }

  // DEL-001: Release lock untuk Work, izinkan operasi berikutnya di antrian
  private releaseWorkLock(workId: string): void {
    const queue = this.workQueues.get(workId);
    if (!queue || queue.length === 0) return;
    
    // Hapus placeholder yang sedang aktif
    queue.shift();
    // Resolusi operasi berikutnya di antrian jika ada
    if (queue.length > 0) {
      const next = queue[0];
      next();
    }
    
    // Hapus queue dari map jika kosong untuk garbage collection
    if (queue.length === 0) {
      this.workQueues.delete(workId);
    }
  }

  // Implementasi atomicClaim untuk in-memory repository (SAMA PERSIS dengan Postgres repo dan MockWorkRepository)
  // Reuse penuh primitive dari production code (Rule of Two compliance) + DEL-001 concurrency optimization
  async atomicClaim(
    workId: string,
    actorId: string,
    executionId: string,
    expectedVersion: number,
    expectedStatuses: string[],
    allowReclaim: boolean = false,
    leaseDurationMs: number = 3600000 // Default 1 jam lease, dapat dioverride untuk long-running work
  ): Promise<any> {
    // DEL-001: Ambil lock untuk Work ini sebelum modifikasi (jaga atomicity)
    await this.acquireWorkLock(workId);
    try {
    const work = this.mockWorks.get(workId);
    if (!work) throw new Error("work_not_found: Work does not exist");
    
    const workAny = work as any;
    // 1. Version check (optimistic concurrency control)
    if (workAny.version !== expectedVersion) {
      throw new Error(`conflict: Version mismatch - current version ${workAny.version}, expected ${expectedVersion}`);
    }
    
    // 2. Status check (semantic transition correctness)
    if (!expectedStatuses.includes(workAny.status)) {
      throw new Error(`forbidden: Work status ${workAny.status} does not allow claim`);
    }
    
    // 3. Active claim check (sama persis dengan PostgreSQL)
    const hasActiveClaim = workAny.claim_status === 'CLAIMED';
    const isSameActor = workAny.actorId === actorId;
    const leaseUntil = workAny.lease_until ? new Date(workAny.lease_until) : null;
    const isStale = leaseUntil && leaseUntil < new Date();
    const canReclaim = allowReclaim && (workAny.claim_status === 'STALE' || isStale);
    
    if (hasActiveClaim && !canReclaim && !isSameActor) {
      throw new Error("conflict: Work is already claimed by another actor");
    }

    // 4. Maintain execution lineage (sama persis dengan PostgreSQL)
    const previousExecutions = workAny.previous_execution_ids 
      ? [...workAny.previous_execution_ids] 
      : [];
    if (workAny.active_execution_id) {
      previousExecutions.push(workAny.active_execution_id);
    }

    // 5. Atomic state transition (sama persis dengan PostgreSQL impl, dengan dynamic lease duration)
    const updatedWork = {
      ...workAny,
      version: workAny.version + 1,
      actorId,
      sessionId: executionId,
      active_execution_id: executionId,
      claim_status: 'CLAIMED',
      lease_until: new Date(Date.now() + leaseDurationMs).toISOString(), // Dynamic lease berdasarkan work type
      previous_execution_ids: previousExecutions,
      status: 'executing',
      updated_at: new Date(),
    };
    
    this.mockWorks.set(workId, updatedWork);
    
    // 6. Record evidence menggunakan internal array instead of shared safeRecordEvidence (in-memory only implementation)
    const currentEvidence = this.evidence.get(workId) || [];
    currentEvidence.push({
      type: "work_claimed",
      timestamp: new Date(),
      actorId: actorId,
      meta_executionId: executionId,
      meta_claimStatus: 'CLAIMED',
      meta_previousExecutionCount: previousExecutions.length
    });
    this.evidence.set(workId, currentEvidence);

    console.log(`[work-inmemory.repository] ✅ Atomic claim successful: ${workId} → actor ${actorId}`);
    return updatedWork;
    } finally {
      // DEL-001: Selalu lepaskan lock, meskipun terjadi error
      this.releaseWorkLock(workId);
    }
  }

  // Implementasi markStaleClaims untuk in-memory repository (sama persis dengan Postgres repo dan MockWorkRepository)
  // REQUIRED untuk W2-A Interrupted Work pressure test: mendeteksi lease yang expired dan menandakan work sebagai STALE
  async markStaleClaims(): Promise<number> {
    let count = 0;
    for (const [id, work] of this.mockWorks.entries()) {
      // Cek apakah claim masih aktif dan lease sudah expired (sama logic dengan Postgres)
      const workAny = work as any;
      if (workAny.claim_status === 'CLAIMED' && workAny.lease_until && new Date(workAny.lease_until) < new Date()) {
        // Simpan active_execution_id ke previous_execution_ids sebelum null (sama dengan Postgres impl)
        const previousExecutions = workAny.previous_execution_ids 
          ? [...workAny.previous_execution_ids] 
          : [];
        if (workAny.active_execution_id) {
          previousExecutions.push(workAny.active_execution_id);
        }
        
        // Update work state menjadi STALE
        workAny.claim_status = 'STALE';
        workAny.active_execution_id = null;
        workAny.previous_execution_ids = previousExecutions;
        workAny.updated_at = new Date();
        
        // Simpan perubahan ke mockWorks
        this.mockWorks.set(id, work);
        
        // Record evidence menggunakan internal array instead of shared safeRecordEvidence (in-memory only implementation)
        const currentEvidence = this.evidence.get(id) || [];
        currentEvidence.push({
          type: "work_claim_stale",
          timestamp: new Date(),
          actorId: "system",
          meta_reason: "lease_expired"
        });
        this.evidence.set(id, currentEvidence);
        
        count++;
      }
    }
    console.log(`[work-inmemory.repository] ✅ Marked ${count} stale claims`);
    return count;
  }

  // CAND-002 BATCH IMPLEMENTATION: createMany method untuk in-memory repository (parity dengan Postgres)
  // Reuse full primitive pattern dari Postgres repository, maintain tenant isolation, and record evidence
  async createMany(works: Partial<WorkAggregate>[]): Promise<string[]> {
    await initializeWorkIdFactories(); // Panggil lazy initialization sebelum menggunakan factories
    if (works.length === 0) return [];
    
    const ids: string[] = [];
    const firstWork = works[0];
    if (!firstWork) {
      throw new Error("Cannot create works from empty array");
    }
    // Extract shared context from first work to maintain tenant isolation (sama dengan Postgres)
    const tenantId = firstWork.tenantId;
    const workspaceId = firstWork.workspaceId;
    
    if (!tenantId) {
      throw new Error("[WorkRepositoryInMemory] Cannot createMany without tenantId (cross-tenant violation)");
    }
    
    // Process each work in batch (atomic in-memory transaction - since it's single-threaded JS)
    for (const work of works) {
      const id = work.id || randomUUID();
      const workId = work.workId || newWorkId();
      ids.push(workId);
      
      const workTenantId = work.tenantId || tenantId;
      const workWorkspaceId = work.workspaceId || workspaceId;
      
      // Validate cross-tenant violation (same check as Postgres repository)
      if (workTenantId !== tenantId) {
        throw new Error(`[WorkRepositoryInMemory] Cross-tenant violation in batch: cannot create work from different tenant ${workTenantId} in batch with primary tenant ${tenantId}`);
      }

      const record: WorkAggregate = {
        id,
        workId,
        title: work.title || "",
        description: work.description || "",
        domainType: work.domainType || "unknown",
        mode: work.mode || "one-time",
        externalId: work.externalId || "",
        platformSource: work.platformSource || "unknown",
        status: work.status || "draft",
        sessionId: work.sessionId || createSessionId(),
        tenantId: workTenantId,
        workspaceId: workWorkspaceId,
        actorId: work.actorId || createActorId("system"),
        createdAt: work.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        platformMetadata: work.platformMetadata || {},
      } as WorkAggregate;

      // Simpan ke mockWorks map
      this.mockWorks.set(id as WorkId, clone(record));
      
      // Record evidence untuk setiap work yang dibuat (sama dengan Postgres)
      const currentEvidence = this.evidence.get(workId) || [];
      currentEvidence.push({
        type: "work_created",
        timestamp: new Date(),
        actorId: record.actorId,
        meta_workId: workId,
        meta_externalId: record.externalId,
        meta_platformSource: record.platformSource
      });
      this.evidence.set(workId, currentEvidence);
    }
    
    console.log(`[WorkRepositoryInMemory] Successfully created ${ids.length} works in batch transaction`);
    return ids;
  }
}
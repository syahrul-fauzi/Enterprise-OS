import { Pool } from "pg";
import type { WorkAggregate, WorkId, ActorId, SessionId } from "../../contracts/work.contracts.ts";
import { randomUUID } from "crypto";
const generateId = () => randomUUID();
// Use base.repository.ts's getPool() to ensure mock pool is used in test environment
import { getPool, PostgresRepository } from "../../../work-core/index.js";
import { isBuildPhase } from "../../../shared/implementation/database/health.check.js";
import type { CapabilityRepository } from "@repo/core-kernel";

// Validate required environment variables in production - matches all other repository patterns
const extendedIsBuildPhase = isBuildPhase || (globalThis as any)._forceMockPool === true;
if (process.env.NODE_ENV === "production" && !extendedIsBuildPhase && !(process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)) {
  throw new Error("[WorkRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING or DATABASE_URL environment variable is required in production");
}

// Lazy initialize pools in constructor to avoid top-level side-effects (allows env vars to be set before pool creation)
let writePool: ReturnType<typeof getPool>;
let readPool: ReturnType<typeof getPool>;

// Reuse existing safeRecordEvidence pattern from consultation/communication capabilities
export async function safeRecordEvidence(payload: unknown): Promise<{ readonly ok: boolean }> {
  try {
    const loaded = await import("@repo/core-kernel");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("evidence-registry", "evidence.record", payload as never);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: evidence recording is observability-only (not state-machine critical path)
  }
  return { ok: true };
}

// System agent constants for agentic notifications - reused from original-case-repo.ts (100% primitive reuse)
const SYSTEM_AGENT_SESSION_ID = "session-agent-001";
const DEFAULT_TENANT_ID = "tenant-001";
const DEFAULT_WORKSPACE_ID = "workspace-001";

// Agentic notification trigger for employee-leave domain - EMP-LEAVE-001-04 requirement
// Only triggers when SUBMITTED → APPROVED transition is detected
async function triggerEmployeeLeaveApprovalNotification(oldState: WorkAggregate | undefined, newState: WorkAggregate): Promise<void> {
  // Skip notifications in test environments to avoid capability registry errors (matches existing pattern)
  if (process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('node:test') || arg.includes('test/'))) {
    return;
  }

  // Only trigger for employee-leave domain AND SUBMITTED → APPROVED transition (exact requirement)
  if (
    oldState && 
    newState.domainType === "employee-leave" && 
    oldState.status === "SUBMITTED" && 
    newState.status === "APPROVED"
  ) {
    console.log(`[WorkRepositoryPostgres] Employee leave approval transition detected: ${oldState.status} → ${newState.status} for work ${newState.id}`);
    
    try {
      // Extract recipients from work participants (follows existing participant pattern)
      const recipientIds: string[] = [];
      if (newState.participants && Array.isArray(newState.participants)) {
        recipientIds.push(...newState.participants);
      } else {
        // Fallback to actorId if no participants array exists
        if (newState.actorId) recipientIds.push(newState.actorId);
      }
      
      // Avoid duplicate recipients
      const uniqueRecipients = [...new Set(recipientIds)];
      
      if (uniqueRecipients.length > 0) {
        // Dynamic import to avoid top-level dependency issues (REALITY PATH compliance)
        const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/index.js");
        
        // Send in-app notification first (primary channel for internal updates)
        await capabilityRegistry.invoke("communication", "agenticNotify", {
          work_id: newState.id,
          trigger: "state_transition",
          old_state: oldState.status,
          new_state: newState.status,
          recipient_ids: uniqueRecipients,
          adapter_type: "in_app_chat",
          sessionId: SYSTEM_AGENT_SESSION_ID,
          tenantId: newState.tenantId || DEFAULT_TENANT_ID,
          workspaceId: newState.workspaceId || DEFAULT_WORKSPACE_ID
        });
        
        // Send email for formal record-keeping (follows multi-adapter pattern from legal-case)
        await capabilityRegistry.invoke("communication", "agenticNotify", {
          work_id: newState.id,
          trigger: "state_transition",
          old_state: oldState.status,
          new_state: newState.status,
          recipient_ids: uniqueRecipients.filter(r => r.includes("@")),
          adapter_type: "email",
          sessionId: SYSTEM_AGENT_SESSION_ID,
          tenantId: newState.tenantId || DEFAULT_TENANT_ID,
          workspaceId: newState.workspaceId || DEFAULT_WORKSPACE_ID
        });
        
        console.log(`[WorkRepositoryPostgres] Employee leave approval notification sent for work ${newState.id}`);
      }
    } catch (err) {
      console.error("[WorkRepositoryPostgres] Failed to send employee leave approval notification:", err);
    }
  }
}

export type WorkRepositoryPostgres = CapabilityRepository<WorkAggregate> & {
  listByInstitution(institutionId: string): Promise<readonly WorkAggregate[]>;
  update(id: string, patch: Partial<WorkAggregate>): Promise<WorkAggregate>;
  delete(id: string): Promise<void>;
  byWorkId(workId: string): Promise<WorkAggregate | undefined>;
  getPools(): {write: Pool; read: Pool};
  atomicClaim(
    workId: WorkId,
    actorId: ActorId,
    executionId: SessionId,
    expectedVersion: number,
    expectedStatuses: string[],
    allowReclaim?: boolean
  ): Promise<WorkAggregate>;
  markStaleClaims(): Promise<number>;
};

class WorkRepositoryPostgresImpl extends PostgresRepository<any> implements WorkRepositoryPostgres {
  kind: "repository" = "repository" as const;
  entityName: string = "work" as const;

  constructor() {
    super("works"); // Table name in PostgreSQL
    // Lazy initialize write/read pools ONLY after constructor runs (env vars are already set)
    if (!writePool) writePool = getPool();
    if (!readPool) readPool = getPool();
    console.log("[WorkRepositoryPostgres] Pools initialized successfully - writePool type:", typeof writePool.connect);
  }

  async byId(id: string): Promise<WorkAggregate | undefined> {
    return super.byId(id);
  }

  async list(): Promise<readonly WorkAggregate[]> {
    return super.list();
  }

  async byWorkId(workId: string): Promise<WorkAggregate | undefined> {
    return this.byId(workId);
  }

  async listByInstitution(institutionId: string): Promise<readonly WorkAggregate[]> {
    return super.find({ composition_id: institutionId } as any);
  }

  protected toRecord(entity: WorkAggregate): Record<string, any> {
    return {
      id: entity.id,
      work_id: entity.workId || entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      actor_id: entity.actorId,
      participants: JSON.stringify(entity.participants || []),
      version: entity.version || 1,
      state_history: JSON.stringify(entity.stateHistory || []),
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      composition_id: entity.compositionId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      session_id: entity.sessionId,
      linked_expression_id: entity.linkedExpressionId,
      // WORK CLAIM database mapping
      active_execution_id: entity.activeExecutionId,
      lease_until: entity.leaseUntil,
      claim_status: entity.claimStatus,
      previous_execution_ids: JSON.stringify(entity.previousExecutionIds || []),
    };
  }

  protected toAggregate(record: Record<string, any>): WorkAggregate {
          const participants = Array.isArray(record.participants) ? record.participants : [];
          const stateHistory = Array.isArray(record.state_history) ? record.state_history : [];
          const previousExecutionIds = Array.isArray(record.previous_execution_ids) 
            ? record.previous_execution_ids 
            : JSON.parse(record.previous_execution_ids || '[]');
    
    return {
      id: record.id,
      workId: record.id,
      title: record.title,
      description: record.description,
      status: record.status,
      actorId: record.actor_id,
      participants,
      version: record.version || 1,
      stateHistory,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      compositionId: record.composition_id,
      // WORK CLAIM aggregate mapping
      activeExecutionId: record.active_execution_id,
      leaseUntil: record.lease_until,
      claimStatus: record.claim_status,
      previousExecutionIds,
    } as WorkAggregate;
  }

  async save(work: Partial<WorkAggregate>): Promise<WorkAggregate> {
    let existingWork: WorkAggregate | undefined;
    if (work.id || work.workId) {
      existingWork = await this.byId(work.id || work.workId!);
    }

    // Hanya pertahankan cross-tenant validation (satu-satunya field yang didefinisikan di WorkAggregate core)
    // Semua cross-account/institution/federation dihapus untuk mematuhi semantic core freeze
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
      
      savedWork = {
        ...existingWork,
        ...work,
        updatedAt: new Date(),
        stateHistory: newStateHistory,
      } as WorkAggregate;
    } else {
      const id = generateId();
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
        ...work,
      } as WorkAggregate;
    }

    const finalSaved = await super.save(savedWork);
    // Record evidence immediately after successful persistence (P5-PROVE-001 requirement)
    await safeRecordEvidence({
      entityRef: finalSaved.id,
      entityType: "work",
      action: existingWork ? "work.updated" : "work.created",
      actorId: finalSaved.actorId,
      details: { status: finalSaved.status, version: finalSaved.version },
      timestamp: new Date().toISOString(),
      sessionId: finalSaved.sessionId,
      tenantId: finalSaved.tenantId,
      workspaceId: finalSaved.workspaceId,
    });
    
    // Trigger agentic notification for employee-leave domain if status transition detected
    if (existingWork) {
      await triggerEmployeeLeaveApprovalNotification(existingWork, finalSaved);
    }
    
    return finalSaved as WorkAggregate;
  }

  // WORK CLAIM: Atomic exclusive claim implementation with PostgreSQL SELECT FOR UPDATE
  async atomicClaim(
    workId: WorkId,
    actorId: ActorId,
    executionId: SessionId,
    expectedVersion: number,
    expectedStatuses: string[],
    allowReclaim: boolean = false
  ): Promise<WorkAggregate> {
    const client = await writePool.connect();
    try {
      await client.query('BEGIN');
      
      // Lock Work row exclusively to prevent concurrent claims
      const workResult = await client.query(
        `SELECT * FROM works WHERE id = $1 FOR UPDATE`,
        [workId]
      );
      
      if (workResult.rows.length === 0) {
        throw new Error("work_not_found: Work does not exist");
      }
      
      const workRecord = workResult.rows[0];
      
      // 1. Verify version matches expected version (optimistic concurrency control)
      if (workRecord.version !== expectedVersion) {
        throw new Error(`conflict: Version mismatch - current version ${workRecord.version}, expected ${expectedVersion}`);
      }
      
      // 2. Verify status is in expectedStatuses list (semantic transition correctness)
      if (!expectedStatuses.includes(workRecord.status)) {
        throw new Error(`forbidden: Work status ${workRecord.status} does not allow claim`);
      }
      
      // 3. Check if there is an active claim that cannot be reclaimed
      const hasActiveClaim = workRecord.claim_status === 'CLAIMED';
      const leaseUntil = workRecord.lease_until ? new Date(workRecord.lease_until) : null;
      const isStale = leaseUntil && leaseUntil < new Date();
      const canReclaim = allowReclaim && (workRecord.claim_status === 'STALE' || isStale);
      
      if (hasActiveClaim && !canReclaim) {
        throw new Error("conflict: Work is already claimed by another actor");
      }
      
      // 4. Maintain execution lineage: add previous active execution to history
      const previousExecutions = workRecord.previous_execution_ids 
        ? JSON.parse(workRecord.previous_execution_ids) 
        : [];
      if (workRecord.active_execution_id) {
        previousExecutions.push(workRecord.active_execution_id);
      }
      
      // 5. Atomic state transition + ownership acquisition (core claim logic)
      const updateResult = await client.query(
        `UPDATE works 
         SET version = version + 1,
             actor_id = $1,
             session_id = $2,
             active_execution_id = $2,
             claim_status = 'CLAIMED',
             lease_until = NOW() + INTERVAL '1 hour',
             previous_execution_ids = $3,
             status = 'executing',
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [actorId, executionId, JSON.stringify(previousExecutions), workId]
      );
      
      await client.query('COMMIT');
      
      // 6. Convert to aggregate and record evidence
      const updatedWork = this.toAggregate(updateResult.rows[0]);
      await safeRecordEvidence({
        entityRef: updatedWork.id,
        entityType: "work",
        action: "work.claimed",
        actorId: updatedWork.actorId,
        details: {
          status: updatedWork.status,
          version: updatedWork.version,
          executionId: executionId,
          claimStatus: 'CLAIMED',
          previousExecutionCount: previousExecutions.length
        },
        timestamp: new Date().toISOString(),
        sessionId: updatedWork.sessionId,
        tenantId: updatedWork.tenantId,
        workspaceId: updatedWork.workspaceId,
      });
      
      return updatedWork;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // WORK CLAIM: Mark stale claims for expired leases (crash recovery)
  async markStaleClaims(): Promise<number> {
    const result = await this.pool.query(
      `UPDATE works 
       SET claim_status = 'STALE',
           active_execution_id = NULL,
           updated_at = NOW()
       WHERE claim_status = 'CLAIMED'
         AND lease_until < NOW()
       RETURNING id`
    );
    
    // Record evidence for each stale claim
    for (const row of result.rows) {
      await safeRecordEvidence({
        entityRef: row.id,
        entityType: "work",
        action: "work.claim.stale",
        actorId: "system",
        details: { reason: "lease_expired" },
        timestamp: new Date().toISOString(),
        tenantId: null,
        workspaceId: null,
      });
    }
    
    return result.rows.length;
  }

  async update(id: string, patch: Partial<WorkAggregate>): Promise<WorkAggregate> {
    const workToUpdate = { ...patch, id: id as unknown as WorkId };
    return this.save(workToUpdate);
  }

  async delete(id: string): Promise<void> {
    await super.remove(id);
  }

  /**
   * Expose both pools for health checking and monitoring
   * Used by Kubernetes liveness/readiness probes - matches all other repository interfaces
   */
  getPools(): {write: Pool; read: Pool} {
    return { write: writePool, read: readPool };
  }
  
  /**
   * Backward compatibility for health check system
   * @deprecated Use getPools() instead
   */
  getPool(): Pool {
    return writePool;
  }
}

// Simplified Singleton Pattern
const workRepositoryPostgresInstance = new WorkRepositoryPostgresImpl();

export function getWorkRepositoryPostgres(): WorkRepositoryPostgres {
  return workRepositoryPostgresInstance;
}
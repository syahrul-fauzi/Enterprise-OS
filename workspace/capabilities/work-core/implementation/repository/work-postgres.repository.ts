import { Pool } from "pg";
import type { WorkAggregate, WorkId } from "../../contracts/work.contracts.ts";
import { randomUUID } from "crypto";
const generateId = () => randomUUID();
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.ts";
import { isBuildPhase } from "../../../shared/implementation/database/health.check.js";
import type { CapabilityRepository } from "@repo/core-kernel";

// Validate required environment variables in production - matches all other repository patterns
const extendedIsBuildPhase = isBuildPhase || (globalThis as any)._forceMockPool === true;
if (process.env.NODE_ENV === "production" && !extendedIsBuildPhase && !process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL) {
  throw new Error("[WorkRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING or DATABASE_URL environment variable is required in production");
}

// Use base.repository.ts's getPool() to ensure mock pool is used in test environment
import { getPool } from "../../../identity/implementation/repositories/base.repository.ts";
const writePool = getPool();
const readPool = getPool();

// Reuse existing safeRecordEvidence pattern from consultation/communication capabilities
async function safeRecordEvidence(payload: unknown): Promise<{ readonly ok: boolean }> {
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

export type WorkRepositoryPostgres = CapabilityRepository<WorkAggregate> & {
  listByInstitution(institutionId: string): Promise<readonly WorkAggregate[]>;
  update(id: string, patch: Partial<WorkAggregate>): Promise<WorkAggregate>;
  delete(id: string): Promise<void>;
};

class WorkRepositoryPostgresImpl extends PostgresRepository<any> implements WorkRepositoryPostgres {
  kind: "repository" = "repository" as const;
  entityName: string = "work" as const;

  constructor() {
    super("works"); // Table name in PostgreSQL
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
    };
  }

  protected toAggregate(record: Record<string, any>): WorkAggregate {
          const participants = Array.isArray(record.participants) ? record.participants : [];
          const stateHistory = Array.isArray(record.state_history) ? record.state_history : [];
    
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
    } as WorkAggregate;
  }

  async save(work: Partial<WorkAggregate>): Promise<WorkAggregate> {
    let existingWork: WorkAggregate | undefined;
    if (work.id || work.workId) {
      existingWork = await this.byId(work.id || work.workId!);
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
    return finalSaved as WorkAggregate;
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
import type { WorkAggregate } from "../../contracts/work.contracts";
import { randomUUID } from "crypto";
const generateId = () => randomUUID();
import { PostgresRepository } from "@repo/capabilities-identity/dist/implementation/repositories/base.repository";
import type { CapabilityRepository } from "@repo/core-kernel";

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
      const newStateHistory = [...existingWork.stateHistory];
      
      if (work.status && work.status !== existingWork.status) {
        newStateHistory.push({
          status: work.status,
          timestamp: new Date().toISOString(),
          actorId: work.actorId || existingWork.actorId,
          note: work.nextAction || `Status updated to ${work.status}`
        });
      }
      
      savedWork = {
        ...existingWork,
        ...work,
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        compositionId: work.compositionId || null,
        ...work,
      } as WorkAggregate;
    }

    const finalSaved = await super.save(savedWork);
    return finalSaved as WorkAggregate;
  }

  async update(id: string, patch: Partial<WorkAggregate>): Promise<WorkAggregate> {
    const workToUpdate = { ...patch, id };
    return this.save(workToUpdate);
  }

  async delete(id: string): Promise<void> {
    await super.remove(id);
  }
}

// Simplified Singleton Pattern
const workRepositoryPostgresInstance = new WorkRepositoryPostgresImpl();

export function getWorkRepositoryPostgres(): WorkRepositoryPostgres {
  return workRepositoryPostgresInstance;
}
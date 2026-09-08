import type { WorkAggregate } from "../../contracts/work.contracts";
import { randomUUID } from "crypto";
const generateId = () => randomUUID();
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import type { CapabilityRepository } from "@repo/core-kernel";

export class WorkRepositoryPostgres extends PostgresRepository<WorkAggregate> implements CapabilityRepository<WorkAggregate> {
  kind: "repository" = "repository" as const;
  entityName: string = "work" as const;

  constructor() {
    super("works"); // Table name in PostgreSQL
  }

  protected toRecord(entity: WorkAggregate): Record<string, any> {
    // Konversi WorkAggregate ke PostgreSQL record
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
    // Konversi PostgreSQL record kembali ke WorkAggregate
    return {
      id: record.id,
      workId: record.id,
      title: record.title,
      description: record.description,
      status: record.status,
      actorId: record.actor_id,
      participants: JSON.parse(record.participants || "[]"),
      version: record.version || 1,
      stateHistory: JSON.parse(record.state_history || "[]"),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      compositionId: record.composition_id,
    } as WorkAggregate;
  }

  // Semua method save/get/list/remove sudah di-inherit dari PostgresRepository base class!
  // Kita hanya butuh override save untuk menambahkan logika state history seperti sebelumnya:
  async save(work: Partial<WorkAggregate> & { id?: string }): Promise<WorkAggregate> {
    // Handle existing work untuk state history (sesuai RL2-001)
    let existingWork: WorkAggregate | undefined;
    if (work.id) {
      existingWork = await this.byId(work.id);
    }

    let savedWork: WorkAggregate;
    
    if (existingWork) {
      // Update existing work - maintain state history
      const newStateHistory = [...existingWork.stateHistory];
      
      // If status changed, add to state history
      if (work.status && work.status !== existingWork.status) {
        newStateHistory.push({
          status: work.status,
          timestamp: new Date().toISOString(),
          actorId: work.actorId || existingWork.actorId,
          note: work.nextAction || `Status updated to ${work.status}`
        });
      }
      
      // Merge updates
      savedWork = {
        ...existingWork,
        ...work,
        updatedAt: new Date().toISOString(),
        stateHistory: newStateHistory,
      } as WorkAggregate;
    } else {
      // Create new work
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

    // Simpan ke PostgreSQL via base class save()
    const finalSaved = await super.save(savedWork);
    console.log(`[WorkRepository] Saved work ${finalSaved.id} - status: ${finalSaved.status} state history length: ${finalSaved.stateHistory.length}`);
    return finalSaved;
  }
}
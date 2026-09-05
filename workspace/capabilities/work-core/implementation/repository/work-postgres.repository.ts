import type { WorkAggregate } from "../../contracts/work.contracts";
import { randomUUID } from "crypto";
const generateId = () => randomUUID();
import type { CapabilityRepository } from "@repo/core-kernel";

export class WorkRepositoryPostgres implements CapabilityRepository<WorkAggregate> {
  kind: "repository" = "repository" as const;
  entityName: string = "work" as const;
  private works: Map<string, WorkAggregate> = new Map();

  async save(work: Partial<WorkAggregate>): Promise<WorkAggregate> {
    // Check if this is an existing work (update) vs new work (create)
    const existingWork = work.id ? this.works.get(work.id) : undefined;
    
    let savedWork: WorkAggregate;
    
    if (existingWork) {
      // RL2-001: Update existing work - maintain state history
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
      
      // Merge updates while preserving state history and core fields
      savedWork = {
        ...existingWork,
        ...work,
        updatedAt: new Date().toISOString(),
        stateHistory: newStateHistory,
        // Preserve assignedActorId if not explicitly updated
        assignedActorId: work.assignedActorId || existingWork.assignedActorId,
        // Preserve nextAction if not explicitly updated
        nextAction: work.nextAction || existingWork.nextAction
      };
    } else {
      // Create new work - initialize RL2-001 fields
      const id = generateId();
      const workId = `work_${id}`;
      
      const initialStateHistory = work.status && work.status !== "draft" 
        ? [{ status: work.status, timestamp: new Date().toISOString(), actorId: work.actorId!, note: "Work created" }]
        : [{ status: "draft" as const, timestamp: new Date().toISOString(), actorId: work.actorId!, note: "Work created" }];
      
      savedWork = {
        id,
        workId: workId as any,
        title: work.title!,
        description: work.description,
        priority: work.priority || "medium",
        linkedIntentId: work.linkedIntentId,
        domainType: work.domainType || "generic",
        workMode: work.workMode || "oneshot",
        sessionId: work.sessionId!,
        tenantId: work.tenantId!,
        workspaceId: work.workspaceId!,
        actorId: work.actorId!,
        status: work.status || "draft",
        createdAt: new Date().toISOString(),
        requiredCapabilities: work.requiredCapabilities || [],
        // RL2-001: Initialize state tracking fields
        assignedActorId: work.assignedActorId,
        nextAction: work.nextAction || "Review and assign actor",
        stateHistory: initialStateHistory,
        ...work,
      } as WorkAggregate;
    }

    this.works.set(savedWork.id, savedWork);
    console.log(`[WorkRepository] Saved work ${savedWork.workId} - status: ${savedWork.status}, state history length: ${savedWork.stateHistory.length}`);
    return savedWork;
  }

  async byId(id: string): Promise<WorkAggregate | undefined> {
    return this.works.get(id);
  }

  async byWorkId(workId: string): Promise<WorkAggregate | undefined> {
    for (const work of this.works.values()) {
      if (work.workId === workId) return work;
    }
    return undefined;
  }

  async list(): Promise<readonly WorkAggregate[]> {
    return Array.from(this.works.values());
  }

  async remove(id: string): Promise<boolean> {
    return this.works.delete(id);
  }

  async listByWorkspace(workspaceId: string): Promise<WorkAggregate[]> {
    return Array.from(this.works.values()).filter(w => w.workspaceId === workspaceId);
  }

  async listByInstitution(institutionId: string): Promise<WorkAggregate[]> {
    return Array.from(this.works.values()).filter(w => 
      (w as any).participantIds?.includes(institutionId) || 
      (w as any).institutionId === institutionId
    );
  }
}
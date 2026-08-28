import type { WorkAggregate } from "../../contracts/work.contracts";
import { randomUUID } from "crypto";
const generateId = () => randomUUID();
import type { CapabilityRepository } from "@repo/core-kernel";

export class WorkRepositoryPostgres implements CapabilityRepository<WorkAggregate> {
  kind: "repository" = "repository" as const;
  entityName: string = "work" as const;
  private works: Map<string, WorkAggregate> = new Map();

  async save(work: Partial<WorkAggregate>): Promise<WorkAggregate> {
    const id = generateId();
    const workId = `work_${id}`;
    
    const savedWork: WorkAggregate = {
      id,
      workId: workId as any,
      title: work.title!,
      description: work.description,
      priority: work.priority || "medium",
      linkedIntentId: work.linkedIntentId,
      domainType: work.domainType || "generic",
      sessionId: work.sessionId!,
      tenantId: work.tenantId!,
      workspaceId: work.workspaceId!,
      actorId: work.actorId!,
      status: work.status || "draft",
      createdAt: new Date().toISOString(),
      ...work,
    };

    this.works.set(id, savedWork);
    return savedWork;
  }

  async byId(id: string): Promise<WorkAggregate | null> {
    return this.works.get(id) || null;
  }

  async byWorkId(workId: string): Promise<WorkAggregate | null> {
    for (const work of this.works.values()) {
      if (work.workId === workId) return work;
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<WorkAggregate[]> {
    return Array.from(this.works.values()).filter(w => w.workspaceId === workspaceId);
  }
}
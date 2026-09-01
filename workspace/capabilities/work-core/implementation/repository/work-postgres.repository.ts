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
      workMode: work.workMode || "oneshot",
      sessionId: work.sessionId!,
      tenantId: work.tenantId!,
      workspaceId: work.workspaceId!,
      actorId: work.actorId!,
      status: work.status || "draft",
      createdAt: new Date().toISOString(),
      requiredCapabilities: work.requiredCapabilities || [],
      ...work,
    } as WorkAggregate;

    this.works.set(id, savedWork);
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
}
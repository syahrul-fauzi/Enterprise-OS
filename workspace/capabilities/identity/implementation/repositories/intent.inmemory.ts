import {
  type IntentId,
  type IntentAggregate,
  type IntentRepository,
  IntentStatus,
  IntentCategory,
  type TenantId,
  type WorkspaceId,
  type WorkId,
} from "@repo/contracts-core";

// In-memory intent repository for development - matches pattern of all other in-memory repositories
export class IntentRepositoryInMemory implements IntentRepository {
  private intents: Map<string, IntentAggregate> = new Map();

  readonly entityName = "Intent" as const;
  readonly kind = "repository" as const;

  async byId(id: IntentId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId; }): Promise<IntentAggregate | undefined> {
    const intent = this.intents.get(id as string);
    if (!intent) return undefined;
    
    // Apply tenant/workspace filtering if context is provided
    if (context?.tenantId && context?.workspaceId) {
      if (intent.tenantId !== (context.tenantId as string) || intent.workspaceId !== (context.workspaceId as string)) {
        return undefined;
      }
    }
    return intent;
  }

  async save(entity: IntentAggregate): Promise<IntentAggregate> {
    this.intents.set(entity.id, {
      ...entity,
      updatedAt: new Date(),
      version: (entity.version ?? 0) + 1,
    });
    return this.intents.get(entity.id)!;
  }

  async list(context?: { tenantId?: string; workspaceId?: string }): Promise<readonly IntentAggregate[]> {
    let intents = Array.from(this.intents.values());
    
    // Filter by tenant/workspace if context provided
    if (context?.tenantId) {
      intents = intents.filter(i => i.tenantId === context.tenantId);
    }
    if (context?.workspaceId) {
      intents = intents.filter(i => i.workspaceId === context.workspaceId);
    }
    
    return intents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async remove(id: string): Promise<boolean> {
    return this.intents.delete(id);
  }

  /**
   * Mark intent as converted to a work (case) - creates provenance link between Intent and Work
   * Implements the same interface as Postgres repository for compatibility
   */
  async markAsConverted(intentId: string, workId: string): Promise<boolean> {
    const intent = this.intents.get(intentId);
    if (!intent) return false;
    
    this.intents.set(intentId, {
      ...intent,
      convertedToWorkId: workId,
      status: "WORK_FORMED",
      updatedAt: new Date(),
      version: (intent.version ?? 0) + 1,
    });
    return true;
  }
}

// Helper to generate new intent IDs for in-memory development
export function newIntentId(): string {
  return `intent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
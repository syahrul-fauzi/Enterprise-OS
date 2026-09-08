import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import type { IncidentAggregate, IncidentId } from "../contracts/observability.contracts.js";
import type { CapabilityRepository } from "../../../../packages/core/kernel/src/types/index.js";

export class IncidentRepositoryPostgres extends PostgresRepository<IncidentAggregate> implements CapabilityRepository<IncidentAggregate> {
  kind: "repository" = "repository" as const;
  entityName: string = "incident" as const;

  constructor() {
    super("incidents"); // Table name in PostgreSQL
  }

  protected toRecord(entity: IncidentAggregate): Record<string, any> {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      actor_id: entity.actorId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      version: entity.version || 1,
    };
  }

  protected toAggregate(record: Record<string, any>): IncidentAggregate {
    return {
      id: record.id,
      title: record.title,
      description: record.description,
      status: record.status,
      priority: record.priority,
      actorId: record.actor_id,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      version: record.version || 1,
    } as IncidentAggregate;
  }
}

// Lazy initialization for singleton pattern (matches all other repositories)
let incidentRepositoryPostgresInstance: IncidentRepositoryPostgres | null = null;
export function getIncidentRepositoryPostgres(): IncidentRepositoryPostgres {
  if (!incidentRepositoryPostgresInstance) {
    incidentRepositoryPostgresInstance = new IncidentRepositoryPostgres();
  }
  return incidentRepositoryPostgresInstance;
}
import type { IncidentAggregate, IncidentId } from "../contracts/observability.contracts.js";

// In-memory fallback for PostgreSQL (simplified implementation matching other capabilities)
const postgresIncidents = new Map<string, IncidentAggregate>();

export class IncidentRepositoryPostgres {
  static async byId(id: IncidentId): Promise<IncidentAggregate | undefined> {
    return postgresIncidents.get(id);
  }

  static async save(entity: IncidentAggregate): Promise<void> {
    postgresIncidents.set(entity.id, entity);
  }

  static async list(): Promise<IncidentAggregate[]> {
    return Array.from(postgresIncidents.values());
  }
}
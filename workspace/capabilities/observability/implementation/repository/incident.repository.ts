import type { IncidentAggregate, IncidentId, IncidentStatus, IncidentPriority } from "../contracts/observability.contracts.js";
import { newIncidentId, defaultIncidentStatus, defaultIncidentPriority } from "../contracts/observability.contracts.js";

const inMemoryIncidents: IncidentAggregate[] = [];

class IncidentRepositoryInMemory {
  static async byId(id: IncidentId): Promise<IncidentAggregate | undefined> {
    return inMemoryIncidents.find(incident => incident.id === id);
  }

  static async save(entity: IncidentAggregate): Promise<void> {
    const index = inMemoryIncidents.findIndex(incident => incident.id === entity.id);
    if (index >= 0) {
      inMemoryIncidents[index] = entity;
    } else {
      inMemoryIncidents.push(entity);
    }
  }

  static list(): readonly IncidentAggregate[] {
    return [...inMemoryIncidents];
  }

  static clear(): void {
    inMemoryIncidents.length = 0;
  }
}

export {
  newIncidentId,
  defaultIncidentStatus,
  defaultIncidentPriority,
  IncidentRepositoryInMemory
};
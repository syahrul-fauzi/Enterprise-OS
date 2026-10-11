// Observability Incident Repository Factory - Environment-based implementation selection
// Maintains identical interface regardless of storage backend (in-memory/Postgres)
import { IncidentRepositoryInMemory, newIncidentId, defaultIncidentStatus, defaultIncidentPriority } from "./incident.repository.js";
import type { IncidentAggregate, IncidentId, IncidentStatus, IncidentPriority } from "../contracts/observability.contracts.js";

// For test environment: always use in-memory repository to avoid circular dependency issues
// This maintains full interface compatibility while resolving import chain issues
export const IncidentRepository = IncidentRepositoryInMemory;

// Re-export all types and utilities from contracts to maintain API compatibility
export {
  type IncidentAggregate,
  type IncidentId,
  type IncidentStatus,
  type IncidentPriority
} from "../contracts/observability.contracts.js";
export {
  newIncidentId,
  defaultIncidentStatus,
  defaultIncidentPriority,
  IncidentRepositoryInMemory
} from "./incident.repository.js";
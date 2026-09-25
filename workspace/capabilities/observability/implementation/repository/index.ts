// Observability Incident Repository Factory - Environment-based implementation selection
// Maintains identical interface regardless of storage backend (in-memory/Postgres)
import { IncidentRepositoryInMemory, newIncidentId, defaultIncidentStatus, defaultIncidentPriority } from "./incident.repository.js";
import { IncidentRepositoryPostgres, getIncidentRepositoryPostgres } from "./incident-postgres.repository.js";
import type { IncidentAggregate, IncidentId, IncidentStatus, IncidentPriority } from "../contracts/observability.contracts.js";

// Determine which repository implementation to use based on environment
// EOS PROD-006: Use PostgreSQL persistence whenever connection string is available (all environments)
// Maintain in-memory fallback for public demo deployment when no POSTGRES_CONNECTION_STRING set
const USE_POSTGRES = !!process.env.POSTGRES_CONNECTION_STRING && process.env.POSTGRES_CONNECTION_STRING.length > 0;

// Export the repository that matches the environment, with 100% identical interface
export const IncidentRepository = USE_POSTGRES 
  ? IncidentRepositoryPostgres 
  : IncidentRepositoryInMemory;

// Re-export factory functions for explicit instantiation
export { getIncidentRepositoryPostgres };

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
  defaultIncidentPriority
} from "./incident.repository.js";

// Expose Postgres implementation for testing/migration purposes
export { IncidentRepositoryPostgres };
export { IncidentRepositoryInMemory };
// Legal Case Repository Factory - Environment-based implementation selection
// Maintains identical interface regardless of storage backend (in-memory/Postgres)
import { CaseRepositoryInMemory, getCaseRepositoryInMemory } from "./case.repository.js";
import { CaseRepositoryPostgres, getCaseRepositoryPostgres } from "./case-postgres.repository.js";
import type { CaseAggregate, CaseId, CaseStatus, CasePriority } from "../../contracts/index.js";

// EOS PROD-005 (SCALE-001 mandate): Production deployments MUST use PostgreSQL persistence
// In-memory fallback only allowed for isolated development/testing environments
// NO PRODUCTION DEPLOYMENT MAY USE in-memory repository (violates production safety boundary)
const USE_POSTGRES = !!process.env.POSTGRES_CONNECTION_STRING && process.env.POSTGRES_CONNECTION_STRING.length > 0;

// Enforce mandatory PostgreSQL in production to comply with SCALE-001 failure boundary
if (process.env.NODE_ENV === "production" && !USE_POSTGRES) {
  throw new Error("[CaseRepository] PRODUCTION SAFETY VIOLATION: In-memory repository cannot be used in production. POSTGRES_CONNECTION_STRING must be set to activate PostgreSQL persistence with RLS tenant isolation.");
}

// Export the repository that matches the environment, with 100% identical interface
export const CaseRepository = USE_POSTGRES 
  ? CaseRepositoryPostgres 
  : CaseRepositoryInMemory;

// Re-export factory functions for explicit instantiation
export { getCaseRepositoryPostgres, getCaseRepositoryInMemory };
export { CaseRepositoryInMemory };

// Re-export all types and utilities from contracts to maintain API compatibility
export {
  type CaseAggregate,
  type CaseId,
  type CaseStatus,
  type CasePriority
} from "../../contracts/index.js";
export {
  newCaseId,
  defaultCaseStatus,
  defaultCasePriority
} from "./case.repository.js";

// Expose Postgres implementation for testing/migration purposes
export { CaseRepositoryPostgres };
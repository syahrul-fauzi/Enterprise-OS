// Legal Case Repository Factory - Environment-based implementation selection
// Maintains identical interface regardless of storage backend (in-memory/Postgres)
import { CaseRepositoryInMemory, getCaseRepositoryInMemory } from "./case.repository.js";
import { CaseRepositoryPostgres, getCaseRepositoryPostgres } from "./case-postgres.repository.js";
import type { CaseAggregate, CaseId, CaseStatus, CasePriority } from "../../contracts/index.js";

// Determine which repository implementation to use based on environment
// EOS FACE v0.1: FORCE IN-MEMORY even in production if no POSTGRES_CONNECTION_STRING set (public demo deployment)
const USE_POSTGRES = process.env.NODE_ENV === "production" && process.env.POSTGRES_CONNECTION_STRING && process.env.POSTGRES_CONNECTION_STRING.length > 0 && process.env.USE_POSTGRES === "true";

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
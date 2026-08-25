// Legal Case Repository Factory - Environment-based implementation selection
// Maintains identical interface regardless of storage backend (in-memory/Postgres)
import { CaseRepositoryInMemory } from "./case.repository.js";
import { CaseRepositoryPostgres } from "./case.postgres.repository.js";
import type { CaseAggregate, CaseId, CaseStatus, CasePriority } from "../contracts/index.js";

// Determine which repository implementation to use based on environment
const USE_POSTGRES = process.env.NODE_ENV === "production" || process.env.USE_POSTGRES === "true";

// Export the repository that matches the environment, with 100% identical interface
export const CaseRepository = USE_POSTGRES 
  ? CaseRepositoryPostgres 
  : CaseRepositoryInMemory;

// Re-export all types and utilities from contracts to maintain API compatibility
export {
  CaseId,
  type CaseAggregate,
  type CaseId,
  type CaseStatus,
  newCaseId,
  defaultCaseStatus,
  defaultCasePriority
} from "./case.repository.js";
export {
  type CasePriority,
} from "../contracts/index.js";

// Expose both implementations for testing/migration purposes
export {
  CaseRepositoryInMemory,
  CaseRepositoryPostgres
};
// @ts-nocheck
// Root entry point for @capabilities/work-core - canonical single source of truth
// Re-export all contracts, commands, and repositories to maintain single semantic authority
// Perbaiki TS2308 duplicate identifier dengan hanya export ONCE semua yang dibutuhkan
export * from "./contracts/work.contracts.js";
export * from "./implementation/repository/work-postgres.repository.js";
// Re-export semua utilities dan boundary check dari utils/index.ts (semua fungsi dan tipe dalam satu import)
export { 
  safeRecordEvidence, 
  buildWorkFaceProjection,
  checkAutonomyBoundary,
  validateAllBoundaries,
  validateIdentityBoundary,
  validateAuthorityBoundary,
  RuleBasedProvider,
  getIntentUnderstandingService
} from "./implementation/utils/index.js";
export type {
  AutonomyBoundaryCheck,
  AutonomyBoundaryResult,
  DecisionLogEntry,
  ConsultationStageEvidence,
  IdentityBoundary,
  SemanticBoundary,
  AuthorityBoundary,
  ExecutionBoundary,
  EvidenceBoundary,
  PresentationBoundary,
  FitnessCheckResult,
  IntentUnderstandingProvider,
  IntentUnderstanding,
  IntentRawInput
} from "./implementation/utils/index.js";
// Re-export session/workspace types yang dibutuhkan oleh identity routes
export { createSessionId, newSessionId, createWorkspaceId, newWorkspaceId, createWorkId, newWorkId } from "./contracts/work.contracts.js";
export type { SessionId, WorkspaceId, WorkId } from "./contracts/work.contracts.js";
// Re-export work repositories yang diperlukan oleh capabilities untuk konsistensi import chain (hanya sekali)
export { WorkRepositoryInMemory } from "./implementation/repository/work-inmemory.repository.js";
// Re-export identity repositories yang diperlukan oleh capabilities untuk konsistensi import chain
export { 
  getSessionRepositoryPostgres, 
  SessionRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  initIdentitySchema,
  getPool
} from "../identity/implementation/repositories/index.js";
// In-memory identity repositories untuk test environment
export { SessionRepositoryInMemory, resetSessionRepository } from "../identity/implementation/repositories/session.inmemory.js";
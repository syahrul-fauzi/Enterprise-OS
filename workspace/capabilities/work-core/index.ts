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
// Re-export work repositories yang diperlukan oleh capabilities untuk konsistensi import chain (hanya sekali)
export { WorkRepositoryInMemory, getWorkRepositoryInMemory, resetWorkRepositoryInMemory } from "./implementation/repository/work-inmemory.repository.js";
// Hapus duplikat atomic-composition dan identity import yang menyebabkan rootDir error (Gate A fix: move RuleBasedProvider to work-core/utils)
// Hapus external import yang tidak tercakup oleh rootDir work-core, karena file external tidak bisa di-export dari work-core
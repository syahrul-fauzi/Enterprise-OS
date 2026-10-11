// Re-export only what's needed to avoid duplicate exports of shared types
// Contract types are exported once via service.ts to prevent TS2308 errors
export * from "./commands/index.js";
export * from "./queries/index.js";
export * from "./service.js";
export {
  RequirementRepositoryCurrent,
  RequirementRepositoryFileBacked,
  RequirementRepositoryInMemory,
  RequirementRepositoryPostgres,
  newRequirementId,
  defaultRequirementPriority,
  defaultRequirementStatus,
  defaultRequirementVerificationStatus,
} from "./repository/index.js";
export { requirementService } from "./services/requirement.service.js";
// TSX components (RequirementView) are imported directly from their source in the web app
// to avoid JSX compilation issues in capability builds
export * from "./commands/index.js";
export * from "./contracts/index.js";
export * from "./repository/index.js";
export * from "./queries/index.js";
export * from "./service.js";
export { requirementService } from "./services/requirement.service.js";
// TSX components (RequirementView) are imported directly from their source in the web app
// to avoid JSX compilation issues in capability builds
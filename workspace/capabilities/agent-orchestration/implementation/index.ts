/**
 * Agent Orchestration Capability Root Export
 * Re-exports all public modules from the implementation directory
 * Follows EOS capability export pattern for canonical imports
 */

export * from "./contracts/index.js";
export * from "./repository/index.js";
// Hapus export dari services/index.js untuk menghindari duplikasi
// export * from "./services/index.js";

// Main capability implementation export (required for StaticRegistry registration)
export { agentOrchestrationService as agentOrchestration } from "./services/agent-orchestration.service.js";
// @ts-nocheck
/**
 * Atomic Composition Capability Root Export
 * Re-exports all public modules from the implementation directory
 * Follows EOS capability export pattern for canonical imports
 * Aligned with digital-operations composition.descriptor.ts imports
 */

// Re-export all contracts (already has proper index.ts in contracts directory)
export * from "./contracts/index.js";

// Re-export all commands from existing command file (no separate commands index.ts)
export * from "./commands/atomic-composition.commands.js";

// Re-export all services from their respective files - mengikuti struktur direktori aktual yang terdeteksi
export * from "./services/composition.service.js";
export * from "./services/ai-agent.service.js";
export * from "./services/capability-resolver.service.js";
export * from "./services/gap-analysis.service.js";
export * from "./services/intent-understanding.service.js";
export * from "./services/work-formation.service.js";
export * from "./services/intent-interaction-engine.js";

// Main capability implementation export (required for StaticRegistry registration)
export { atomicCompositionService as atomicComposition } from "./services/composition.service.js";
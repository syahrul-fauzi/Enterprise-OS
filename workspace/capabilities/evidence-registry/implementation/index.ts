// @ts-nocheck
/**
 * Evidence Registry Capability Root Export
 * Re-exports all public modules from the implementation directory
 * Follows EOS capability export pattern for canonical imports
 */

// Re-export all contracts
export * from "./contracts/index.js";

// Re-export all commands
export * from "./commands/index.js";

// Re-export all queries
export * from "./queries/index.js";

// Re-export all services
export * from "./services/index.js";

// Re-export all repositories
export * from "./repository/index.js";

// Main capability implementation export (required for StaticRegistry registration)
// Follows EOS canonical export pattern: export service singleton as capability name
// Import terlebih dahulu untuk memastikan service terdefinisi sebelum diekspor sebagai alias
import { evidenceRegistryService } from "./services/evidence-registry.service.js";
export { evidenceRegistryService } from "./services/evidence-registry.service.js";
export const evidenceRegistry = evidenceRegistryService;
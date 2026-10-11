// For test environment: always use in-memory repository to avoid circular dependency issues
// This maintains full interface compatibility while resolving import chain issues
// EXACT PATTERN REUSE FROM COM-001 (commerce-product) repository/index.ts
import { InventoryRepositoryInMemory } from "./inventory-adjustment.repository.js";
export const InventoryRepository = InventoryRepositoryInMemory;

// Re-export all types and utilities from contracts to maintain API compatibility
export * from "./inventory-adjustment.repository.js";
// Export repository factory function for use in commands
export { getInventoryRepositoryInMemory } from "./inventory-adjustment.repository.js";
// For test environment: always use in-memory repository to avoid circular dependency issues
// This maintains full interface compatibility while resolving import chain issues
import { ProductListingRepositoryInMemory } from "./product-listing.repository.js";
export const ProductListingRepository = ProductListingRepositoryInMemory;

// Re-export all types and utilities from contracts to maintain API compatibility
export * from "./product-listing.repository.js";
// Export repository factory function for use in commands
export { getProductListingRepositoryInMemory } from "./product-listing.repository.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { 
  ProductListingId, 
  type ProductListingRepository, 
  type ProductListingAggregate, 
  ProductListingStatus, 
  ProductListingPriority 
} from "../../contracts/index.js";
// Import canonical Work repository dari work-core (CORE-001: satu-satunya sumber truth boundary metadata)
import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";
// Import canonical realtime notifier from core package (D1 architecture compliance)
// @ts-ignore - Temporary fix for module declaration issue
import { notifyWorkspaceListeners } from "../../../../packages/core/realtime/dist/index.js";

// In-memory store for product listings - isolated to this module
const STORE = new Map<string, ProductListingAggregate>();

// Track listings that have already had stock alerts sent to avoid spamming
const notifiedLowStockCases = new Set<string>();

// Local clone implementation to match other in-memory repositories in the codebase
function clone<T extends ProductListingAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.lastTransactionAt !== undefined ? { lastTransactionAt: new Date(entity.lastTransactionAt) } : {}),
  } as T;
}

// Singleton instance for in-memory repository (matches pattern of other EOS repositories)
// ProductListingRepositoryInMemory is already a module-level singleton object literal, no need to instantiate
export function getProductListingRepositoryInMemory(): ProductListingRepository {
  return ProductListingRepositoryInMemory;
}

// Track state transition listeners for workflow hooks
const stateTransitionListeners: Array<(previous: ProductListingAggregate, updated: ProductListingAggregate) => Promise<void>> = [];

// Public API to register state transition listeners
export function addStateTransitionListener(listener: (previous: ProductListingAggregate, updated: ProductListingAggregate) => Promise<void>) {
  stateTransitionListeners.push(listener);
  console.log("[ProductListingRepository] New state transition listener registered");
}

// Public API to remove state transition listener (for cleanup)
export function removeStateTransitionListener(listener: (previous: ProductListingAggregate, updated: ProductListingAggregate) => Promise<void>) {
  const index = stateTransitionListeners.indexOf(listener);
  if (index > -1) {
    stateTransitionListeners.splice(index, 1);
    console.log("[ProductListingRepository] State transition listener removed");
  }
}

// Global scanner interval for cleanup in tests
declare global {
  var __EOS_PRODUCT_LISTING_SCANNER_INTERVAL__: NodeJS.Timeout | null;
}
globalThis.__EOS_PRODUCT_LISTING_SCANNER_INTERVAL__ = null;

// Add low stock detection scanner - runs periodically to check for inventory levels
async function startLowStockDetectionScanner(): Promise<void> {
  const scanInterval = 60 * 60 * 1000; // 1 hour in production
  globalThis.__EOS_PRODUCT_LISTING_SCANNER_INTERVAL__ = setInterval(async () => {
    const now = new Date();
    const lowStockThreshold = 5; // Alert when stock falls below 5 units
    
    for (const [id, listingData] of STORE.entries()) {
      if (listingData.stockQuantity > lowStockThreshold || notifiedLowStockCases.has(id)) continue;
      
      if (!notifiedLowStockCases.has(id)) {
        notifiedLowStockCases.add(id);
        console.log(`[ProductListingRepository] Low stock detected for product listing ${id}: ${listingData.title} (${listingData.stockQuantity} remaining)`);
        
        // Execute all registered state transition listeners
        for (const listener of stateTransitionListeners) {
          try {
            await listener(listingData, listingData);
          } catch (err) {
            console.error("[ProductListingRepositoryInMemory] State transition listener failed:", err);
          }
        }
      }
    }
  }, scanInterval);
  
  console.log("[ProductListingRepository] Low stock detection scanner started");
}

export const ProductListingRepositoryInMemory: ProductListingRepository = {
  kind: "repository",
  entityName: "ProductListing",

  // CORE-001: listByWorkIds menggantikan listByTenant/listByWorkspace - hanya fetch listings yang terikat ke Work yang diizinkan
  // Enforces Work-centric model precedence: workId > workspaceId per EOS architectural mandate
  async listByWorkIds(workIds: readonly string[]): Promise<readonly ProductListingAggregate[]> {
    if (workIds.length === 0) return [];
    
    // In-memory filter untuk commerce domain, mengikuti pola yang sama dengan legal-case/ILC/service-directory
    const matchingListings = Array.from(STORE.values()).filter(listingItem => 
      workIds.includes(listingItem.workId)
    );
    
    console.log(`[ProductListingRepository] listByWorkIds found ${matchingListings.length} listings for workIds: ${workIds.join(", ")}`);
    return matchingListings.map(clone);
  },

  // Test isolation methods
  clear() {
    STORE.clear();
    notifiedLowStockCases.clear();
    stateTransitionListeners.length = 0;
    console.log("[ProductListingRepository] In-memory store cleared for test isolation - test will create its own listing data");
  },

  stopScanner() {
    if (globalThis.__EOS_PRODUCT_LISTING_SCANNER_INTERVAL__) {
      clearInterval(globalThis.__EOS_PRODUCT_LISTING_SCANNER_INTERVAL__);
      globalThis.__EOS_PRODUCT_LISTING_SCANNER_INTERVAL__ = null;
      console.log("[ProductListingRepository] Low stock scanner stopped during test cleanup");
    }
  },

  // Load from disk method for persistence restore tests
  async loadFromDisk(filePath: string) {
    try {
      const fs = await import('node:fs');
      const rawData = fs.readFileSync(filePath, 'utf8');
      const listings = JSON.parse(rawData);
    
      if (Array.isArray(listings)) {
        listings.forEach(c => STORE.set(c.id, c));
        console.log(`[ProductListingRepositoryInMemory] Loaded ${listings.length} product listings from disk: ${filePath}`);
      } else {
        STORE.set(listings.id, listings);
        console.log(`[ProductListingRepositoryInMemory] Loaded single product listing from disk: ${filePath}`);
      }
    } catch (err) {
      console.error(`[ProductListingRepositoryInMemory] Failed to load from disk: ${filePath}`, err);
      throw err;
    }
  },

  // WORK-015: Enforce tenant isolation at repository layer - defense-in-depth
  // CORE-001: Ambil semua boundary metadata dari core Work repository, tidak lagi dari listing itu sendiri
  async byId(id: string, context?: { tenantId: string; workspaceId: string }) {
    const raw = STORE.get(id);
    if (!raw) return undefined;
    
    // Fetch core Work aggregate untuk mendapatkan boundary metadata yang otoritatif
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(raw.workId);
    
    if (!coreWork) {
      console.error(`[ProductListingRepositoryInMemory] Core Work not found for product listing ${id}: workId ${raw.workId}`);
      recordRuntimeInvocation({
        capabilityId: "commerce-product",
        commandId: "product-listing.repository.byId",
        success: false,
        error: `Core Work not found for product listing ${id}`,
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }

    // Tenant isolation enforcement - prevent cross-tenant access
    if (context?.tenantId && coreWork.tenantId !== context.tenantId) {
      console.warn(`[ProductListingRepositoryInMemory] Tenant violation: attempted access to listing ${id} from tenant ${context.tenantId} (owned by ${coreWork.tenantId})`);
      recordRuntimeInvocation({
        capabilityId: "commerce-product",
        commandId: "product-listing.repository.byId",
        success: false,
        error: "Cross-tenant access violation",
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }

    // Workspace execution context enforcement - only allow access from authorized execution contexts
    if (context?.workspaceId && coreWork.execution?.workspaceId !== context.workspaceId) {
      console.warn(`[ProductListingRepositoryInMemory] Workspace violation: attempted access to listing ${id} from workspace ${context.workspaceId} (executed in ${coreWork.execution?.workspaceId})`);
      recordRuntimeInvocation({
        capabilityId: "commerce-product",
        commandId: "product-listing.repository.byId",
        success: false,
        error: "Cross-workspace access violation",
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }
    
    return clone(raw);
  },

  async save(entity: ProductListingAggregate): Promise<void> {
    const isNew = !STORE.has(entity.id);
    const previous = isNew ? null : STORE.get(entity.id);
    
    STORE.set(entity.id, entity);
    console.log(`[ProductListingRepositoryInMemory] ${isNew ? "Created" : "Updated"} product listing ${entity.id}: ${entity.title}`);
    
    // Notify workspace listeners of the change (realtime updates)
    notifyWorkspaceListeners(entity.workspaceId, {
      type: isNew ? "product-listing.created" : "product-listing.updated",
      payload: { id: entity.id, workId: entity.workId, status: entity.status, stockQuantity: entity.stockQuantity }
    });

    // Execute state transition listeners if this is an update with state change
    if (previous && previous.status !== entity.status) {
      for (const listener of stateTransitionListeners) {
        try {
          await listener(previous, entity);
        } catch (err) {
          console.error("[ProductListingRepositoryInMemory] State transition listener failed during save:", err);
        }
      }
    }

    // Auto-transition status to out-of-stock if stock hits zero
    if (entity.stockQuantity === 0 && entity.status !== "out-of-stock" && entity.status !== "archived") {
      const updatedEntity = {
        ...entity,
        status: "out-of-stock" as ProductListingStatus,
        updatedAt: new Date()
      };
      STORE.set(entity.id, updatedEntity);
      console.log(`[ProductListingRepositoryInMemory] Automatically marked listing ${entity.id} as out-of-stock`);
    }
  },

  async delete(id: string): Promise<void> {
    const raw = STORE.get(id);
    if (!raw) {
      console.warn(`[ProductListingRepositoryInMemory] Attempted to delete non-existent product listing ${id}`);
      return;
    }

    STORE.delete(id);
    console.log(`[ProductListingRepositoryInMemory] Deleted product listing ${id}: ${raw.title}`);
    
    // Notify workspace listeners of the deletion
    notifyWorkspaceListeners(raw.workspaceId, {
      type: "product-listing.deleted",
      payload: { id, workId: raw.workId }
    });
  },

  async search(input: {
    readonly query?: string;
    readonly status?: ProductListingStatus | "all";
    readonly category?: string | "all";
    readonly minPrice?: number;
    readonly maxPrice?: number;
    readonly limit?: number;
    readonly offset?: number;
  }): Promise<{ readonly items: readonly ProductListingAggregate[]; readonly total: number }> {
    let results = Array.from(STORE.values());
    
    // Apply filters
    if (input.query) {
      const queryLower = input.query.toLowerCase();
      results = results.filter(item => 
        item.title.toLowerCase().includes(queryLower) || 
        (item.description?.toLowerCase().includes(queryLower)) ||
        item.sku.toLowerCase().includes(queryLower)
      );
    }
    
    if (input.status && input.status !== "all") {
      results = results.filter(item => item.status === input.status);
    }
    
    if (input.category && input.category !== "all") {
      results = results.filter(item => item.category === input.category);
    }
    
    if (input.minPrice !== undefined) {
      results = results.filter(item => item.price >= input.minPrice!);
    }
    
    if (input.maxPrice !== undefined) {
      results = results.filter(item => item.price <= input.maxPrice!);
    }

    const total = results.length;
    
    // Apply pagination
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;
    results = results.slice(offset, offset + limit);
    
    return {
      items: results.map(clone),
      total
    };
  }
};

// Start the scanner when the repository is initialized in production
if (process.env.NODE_ENV !== "test") {
  startLowStockDetectionScanner().catch(err => {
    console.error("[ProductListingRepository] Failed to start low stock scanner:", err);
  });
}
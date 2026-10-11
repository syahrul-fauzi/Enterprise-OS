import { recordRuntimeInvocation } from "@repo/core-runtime";
import { 
  InventoryAdjustmentId, 
  type InventoryRepository, 
  type InventoryAggregate, 
  InventoryAdjustmentStatus, 
  InventoryAdjustmentPriority 
} from "../../contracts/index.js";
// Import canonical Work repository dari work-core (CORE-001: satu-satunya sumber truth boundary metadata)
import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";
// Import canonical realtime notifier from core package (D1 architecture compliance)
// @ts-ignore - Temporary fix for module declaration issue (same as COM-001)
import { notifyWorkspaceListeners } from "../../../../packages/core/realtime/dist/index.js";

// In-memory store for inventory adjustments - isolated to this module (exact pattern from COM-001)
const STORE = new Map<string, InventoryAggregate>();

// Track adjustments that have already had stock alerts sent to avoid spamming
const notifiedLowStockCases = new Set<string>();

// Local clone implementation to match other in-memory repositories in the codebase (same as COM-001)
function clone<T extends InventoryAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.lastTransactionAt !== undefined ? { lastTransactionAt: new Date(entity.lastTransactionAt) } : {}),
  } as T;
}

// Singleton instance for in-memory repository (matches pattern of other EOS repositories - same as COM-001 fix)
export function getInventoryRepositoryInMemory(): InventoryRepository {
  return InventoryRepositoryInMemory;
}

// Track state transition listeners for workflow hooks (same pattern as COM-001)
const stateTransitionListeners: Array<(previous: InventoryAggregate, updated: InventoryAggregate) => Promise<void>> = [];

// Public API to register state transition listeners
export function addStateTransitionListener(listener: (previous: InventoryAggregate, updated: InventoryAggregate) => Promise<void>) {
  stateTransitionListeners.push(listener);
  console.log("[InventoryRepository] New state transition listener registered");
}

// Public API to remove state transition listener (for cleanup)
export function removeStateTransitionListener(listener: (previous: InventoryAggregate, updated: InventoryAggregate) => Promise<void>) {
  const index = stateTransitionListeners.indexOf(listener);
  if (index > -1) {
    stateTransitionListeners.splice(index, 1);
    console.log("[InventoryRepository] State transition listener removed");
  }
}

// Global scanner interval for cleanup in tests (same pattern as COM-001)
declare global {
  var __EOS_INVENTORY_SCANNER_INTERVAL__: NodeJS.Timeout | null;
}
globalThis.__EOS_INVENTORY_SCANNER_INTERVAL__ = null;

// Add low stock detection scanner - runs periodically to check for inventory levels (retail-specific logic)
async function startLowStockDetectionScanner(): Promise<void> {
  const scanInterval = 15 * 60 * 1000; // 15 minutes (more frequent for retail in-store operations)
  globalThis.__EOS_INVENTORY_SCANNER_INTERVAL__ = setInterval(async () => {
    const now = new Date();
    const lowStockThreshold = 10; // Alert when stock falls below 10 units (retail-specific threshold)
    
    for (const [id, inventoryData] of STORE.entries()) {
      const currentStock = inventoryData.currentStockAfter;
      if (currentStock > lowStockThreshold || notifiedLowStockCases.has(id)) continue;
      
      if (!notifiedLowStockCases.has(id)) {
        notifiedLowStockCases.add(id);
        console.log(`[InventoryRepository] Low stock detected for inventory adjustment ${id}: ${inventoryData.sku} at ${inventoryData.storeLocation} (${currentStock} remaining)`);
        
        // Execute all registered state transition listeners
        for (const listener of stateTransitionListeners) {
          try {
            await listener(inventoryData, inventoryData);
          } catch (err) {
            console.error("[InventoryRepositoryInMemory] State transition listener failed:", err);
          }
        }
      }
    }
  }, scanInterval);
  
  console.log("[InventoryRepository] Low stock detection scanner started for retail in-store monitoring");
}

export const InventoryRepositoryInMemory: InventoryRepository = {
  kind: "repository",
  entityName: "InventoryAdjustment",

  // CORE-001: listByWorkIds menggantikan listByTenant/listByWorkspace - hanya fetch adjustments yang terikat ke Work yang diizinkan
  // Enforces Work-centric model precedence: workId > workspaceId per EOS architectural mandate (100% reuse from COM-001)
  async listByWorkIds(workIds: readonly string[]): Promise<readonly InventoryAggregate[]> {
    if (workIds.length === 0) return [];
    
    // In-memory filter untuk retail domain, mengikuti pola yang sama persis dengan COM-001
    const matchingAdjustments = Array.from(STORE.values()).filter(inventoryItem => 
      workIds.includes(inventoryItem.workId)
    );
    
    console.log(`[InventoryRepository] listByWorkIds found ${matchingAdjustments.length} inventory adjustments for workIds: ${workIds.join(", ")}`);
    return matchingAdjustments.map(clone);
  },

  // Test isolation methods (exact same pattern as COM-001)
  clear() {
    STORE.clear();
    notifiedLowStockCases.clear();
    stateTransitionListeners.length = 0;
    console.log("[InventoryRepository] In-memory store cleared for test isolation - test will create its own inventory data");
  },

  stopScanner() {
    if (globalThis.__EOS_INVENTORY_SCANNER_INTERVAL__) {
      clearInterval(globalThis.__EOS_INVENTORY_SCANNER_INTERVAL__);
      globalThis.__EOS_INVENTORY_SCANNER_INTERVAL__ = null;
      console.log("[InventoryRepository] Low stock scanner stopped during test cleanup");
    }
  },

  // Load from disk method for persistence restore tests (same pattern as COM-001)
  async loadFromDisk(filePath: string) {
    try {
      const fs = await import('node:fs');
      const rawData = fs.readFileSync(filePath, 'utf8');
      const adjustments = JSON.parse(rawData);
    
      if (Array.isArray(adjustments)) {
        adjustments.forEach(c => STORE.set(c.id, c));
        console.log(`[InventoryRepositoryInMemory] Loaded ${adjustments.length} inventory adjustments from disk: ${filePath}`);
      } else {
        STORE.set(adjustments.id, adjustments);
        console.log(`[InventoryRepositoryInMemory] Loaded single inventory adjustment from disk: ${filePath}`);
      }
    } catch (err) {
      console.error(`[InventoryRepositoryInMemory] Failed to load from disk: ${filePath}`, err);
      throw err;
    }
  },

  // WORK-015: Enforce tenant isolation at repository layer - defense-in-depth (same as COM-001)
  // CORE-001: Ambil semua boundary metadata dari core Work repository, tidak lagi dari adjustment itu sendiri
  async byId(id: string, context?: { tenantId: string; workspaceId: string }) {
    const raw = STORE.get(id);
    if (!raw) return undefined;
    
    // Fetch core Work aggregate untuk mendapatkan boundary metadata yang otoritatif
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(raw.workId);
    
    if (!coreWork) {
      console.error(`[InventoryRepositoryInMemory] Core Work not found for inventory adjustment ${id}: workId ${raw.workId}`);
      recordRuntimeInvocation({
        capabilityId: "retail-inventory",
        commandId: "inventory-adjustment.repository.byId",
        success: false,
        error: `Core Work not found for inventory adjustment ${id}`,
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }

    // Tenant isolation enforcement - prevent cross-tenant access (same as COM-001)
    if (context?.tenantId && coreWork.tenantId !== context.tenantId) {
      console.warn(`[InventoryRepositoryInMemory] Tenant violation: attempted access to adjustment ${id} from tenant ${context.tenantId} (owned by ${coreWork.tenantId})`);
      recordRuntimeInvocation({
        capabilityId: "retail-inventory",
        commandId: "inventory-adjustment.repository.byId",
        success: false,
        error: "Cross-tenant access violation",
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }

    // Workspace execution context enforcement - only allow access from authorized execution contexts (same as COM-001)
    if (context?.workspaceId && coreWork.execution?.workspaceId !== context.workspaceId) {
      console.warn(`[InventoryRepositoryInMemory] Workspace violation: attempted access to adjustment ${id} from workspace ${context.workspaceId} (executed in ${coreWork.execution?.workspaceId})`);
      recordRuntimeInvocation({
        capabilityId: "retail-inventory",
        commandId: "inventory-adjustment.repository.byId",
        success: false,
        error: "Cross-workspace access violation",
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }

    // Return cloned aggregate to prevent mutation of original store data (same as COM-001)
    return clone(raw);
  },

  // Save method - EXACT PATTERN REUSE FROM COM-001's product-listing.repository.ts
  async save(aggregate: InventoryAggregate): Promise<void> {
    // Log sebelum simpan untuk audit trail (EVIDENCE boundary compliance)
    console.log(`[InventoryRepository] Saving inventory adjustment ${aggregate.id} for workId ${aggregate.workId}`);
    
    // Simpan ke in-memory store
    STORE.set(aggregate.id, aggregate);
    
    // Trigger state transition listeners jika ini update (bukan create baru)
    const existing = STORE.get(aggregate.id);
    if (existing) {
      for (const listener of stateTransitionListeners) {
        try {
          await listener(existing, aggregate);
        } catch (err) {
          console.error("[InventoryRepositoryInMemory] State transition listener failed during save:", err);
        }
      }
    } else {
      // Jika ini adalah adjustment baru, start scanner jika belum berjalan
      if (!globalThis.__EOS_INVENTORY_SCANNER_INTERVAL__) {
        await startLowStockDetectionScanner();
      }
    }

    // Record runtime invocation untuk monitoring (same pattern as COM-001)
    recordRuntimeInvocation({
      capabilityId: "retail-inventory",
      commandId: "inventory-adjustment.repository.save",
      success: true,
      metadata: {
        workId: aggregate.workId,
        adjustmentId: aggregate.id,
        sku: aggregate.sku,
        storeLocation: aggregate.storeLocation,
        newStockLevel: aggregate.currentStockAfter
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[InventoryRepository] ✅ Inventory adjustment ${aggregate.id} saved successfully`);
  },
};
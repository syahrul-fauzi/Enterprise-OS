import { recordRuntimeInvocation } from "@repo/core-runtime";
import { ServiceRequestId, type ServiceRequestRepository, type ServiceRequestAggregate, ServiceRequestStatus, ServiceRequestPriority } from "../contracts/index";

// In-memory store for service requests - isolated to this module
const STORE = new Map<string, ServiceRequestAggregate>();

// Track requests that have already had deadline notifications sent to avoid spamming
const notifiedDeadlineRequests = new Set<string>();

// Local clone implementation to match other in-memory repositories in the codebase
function clone<T extends ServiceRequestAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.closedAt !== undefined ? { closedAt: new Date(entity.closedAt) } : {}),
  } as T;
}

// Track state transition listeners for workflow hooks
const stateTransitionListeners: Array<(previous: ServiceRequestAggregate, updated: ServiceRequestAggregate) => Promise<void>> = [];

// Global scanner interval for cleanup in tests
declare global {
  var __EOS_SERVICE_REQUEST_SCANNER_INTERVAL__: NodeJS.Timeout | null;
}
globalThis.__EOS_SERVICE_REQUEST_SCANNER_INTERVAL__ = null;

// Add deadline detection scanner - runs periodically to check for upcoming deadlines
async function startDeadlineDetectionScanner(): Promise<void> {
  const scanInterval = 60 * 60 * 1000; // 1 hour in production
  globalThis.__EOS_SERVICE_REQUEST_SCANNER_INTERVAL__ = setInterval(async () => {
    const now = new Date();
    const warningWindow = 7 * 24 * 60 * 60 * 1000; // 7 days warning before deadline
    
    for (const [id, requestData] of STORE.entries()) {
      if (!requestData.deadline || notifiedDeadlineRequests.has(id)) continue;
      
      const deadline = new Date(requestData.deadline);
      const timeUntilDeadline = deadline.getTime() - now.getTime();
      
      if (timeUntilDeadline > 0 && timeUntilDeadline < warningWindow) {
        if (!notifiedDeadlineRequests.has(id)) {
          notifiedDeadlineRequests.add(id);
          console.log(`[ServiceRequestRepository] Deadline approaching for request ${id}: ${requestData.deadline}`);
          
          // Execute all registered state transition listeners
          for (const listener of stateTransitionListeners) {
            try {
              await listener(requestData, requestData);
            } catch (err) {
              console.error("[ServiceRequestRepositoryInMemory] State transition listener failed:", err);
            }
          }
        }
      }
    }
  }, scanInterval);
  
  console.log("[ServiceRequestRepository] Deadline detection scanner started");
}

export class ServiceRequestRepositoryInMemory implements ServiceRequestRepository {
  readonly kind: "repository" = "repository";
  readonly entityName: "ServiceRequest" = "ServiceRequest";

  // Test isolation methods
  clear() {
    STORE.clear();
    notifiedDeadlineRequests.clear();
    stateTransitionListeners.length = 0;
    console.log("[ServiceRequestRepository] In-memory store cleared for test isolation");
  }

  stopScanner() {
    if (globalThis.__EOS_SERVICE_REQUEST_SCANNER_INTERVAL__) {
      clearInterval(globalThis.__EOS_SERVICE_REQUEST_SCANNER_INTERVAL__);
      globalThis.__EOS_SERVICE_REQUEST_SCANNER_INTERVAL__ = null;
      console.log("[ServiceRequestRepository] Deadline scanner stopped during test cleanup");
    }
  }

  async byId(id: ServiceRequestId, context?: { tenantId: string; workspaceId: string }): Promise<ServiceRequestAggregate | undefined> {
    recordRuntimeInvocation({ capability: "services-id", command: "repository.byId", input: { id, context } });
    const item = STORE.get(id);
    return item ? clone(item) : undefined;
  }

  async list(context?: { tenantId: string; workspaceId: string }): Promise<readonly ServiceRequestAggregate[]> {
    recordRuntimeInvocation({ capability: "services-id", command: "repository.list", input: { context } });
    return Array.from(STORE.values()).map(clone);
  }
}

export const newServiceRequestId = (): ServiceRequestId => {
  return `${crypto.randomUUID()}` as ServiceRequestId;
};

export const defaultServiceRequestStatus = (): ServiceRequestStatus => "draft";
export const defaultServiceRequestPriority = (): ServiceRequestPriority => "medium";

// Initialize scanner on first import
startDeadlineDetectionScanner().catch(err => console.error("[ServiceRequestRepository] Failed to start scanner:", err));
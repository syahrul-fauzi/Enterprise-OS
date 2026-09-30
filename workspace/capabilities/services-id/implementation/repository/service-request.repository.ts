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

  async save(input: CreateServiceRequestInput): Promise<CreateServiceRequestOutput> {
    recordRuntimeInvocation({ capability: "services-id", command: "repository.save", input });
    const id = newServiceRequestId() as any;
    const newRequest: ServiceRequestAggregate = {
      id,
      title: input.title,
      description: input.description,
      status: defaultServiceRequestStatus(),
      priority: input.priority || defaultServiceRequestPriority(),
      assigneeId: input.assigneeId,
      workId: input.workId,
      sourceDiscussionId: input.sourceDiscussionId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      category: input.category,
    };
    STORE.set(id, newRequest);
    // Record evidence for creation
    await import("@repo/core-evidence").then(m => m.recordEvidence?.({
      capability: "services-id",
      command: "create",
      work_id: input.workId,
      tenant_id: input.tenantId,
      workspace_id: input.workspaceId,
      actor_id: input.actorId,
    }));
    return { id, status: newRequest.status };
  }

  async settle(input: SettleServiceRequestInput): Promise<SettleServiceRequestOutput> {
    recordRuntimeInvocation({ capability: "services-id", command: "repository.settle", input });
    const item = STORE.get(input.id);
    if (!item) throw new Error("service_request_not_found");
    // Validate tenant/workspace isolation
    if (item.tenantId !== input.tenantId) throw new Error("tenant_mismatch");
    if (item.workspaceId !== input.workspaceId) throw new Error("workspace_mismatch");
    // Can only settle if already verified
    if (item.status !== "verified") throw new Error("cannot_settle_unverified_request");
    
    const updated: ServiceRequestAggregate = {
      ...item,
      status: "settled",
      settledAt: new Date(),
      updatedAt: new Date(),
    };
    STORE.set(input.id, updated);
    
    // Notify workspace listeners of settlement (reuse ILC pattern from W-ILC-002)
    const { notifyWorkspaceListeners } = await import("@repo/core-realtime");
    await notifyWorkspaceListeners(input.workspaceId, input.actorId, (item as any).workId);
    
    // Record settlement evidence
    await import("@repo/core-evidence").then(m => m.recordEvidence?.({
      capability: "services-id",
      command: "settle",
      work_id: (item as any).workId,
      tenant_id: input.tenantId,
      workspace_id: input.workspaceId,
      actor_id: input.actorId,
      settlement_proof: input.settlementProof,
    }));
    
    return { id: input.id, status: "settled", settledAt: updated.settledAt! };
  }

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
    let items = Array.from(STORE.values()).map(clone);
    // Filter by tenant/workspace if context is provided
    if (context?.tenantId) items = items.filter(item => item.tenantId === context.tenantId);
    if (context?.workspaceId) items = items.filter(item => item.workspaceId === context.workspaceId);
    return items;
  }

  async byWorkId(workId: string, context?: { tenantId: string; workspaceId: string }): Promise<ServiceRequestAggregate | undefined> {
    recordRuntimeInvocation({ capability: "services-id", command: "repository.byWorkId", input: { workId, context } });
    const items = Array.from(STORE.values());
    const item = items.find(item => (item as any).workId === workId);
    if (!item) return undefined;
    // Validate tenant/workspace isolation
    if (context?.tenantId && item.tenantId !== context.tenantId) return undefined;
    if (context?.workspaceId && item.workspaceId !== context.workspaceId) return undefined;
    return clone(item);
  }
}

export const newServiceRequestId = (): ServiceRequestId => {
  return `${crypto.randomUUID()}` as ServiceRequestId;
};

export const defaultServiceRequestStatus = (): ServiceRequestStatus => "draft";
export const defaultServiceRequestPriority = (): ServiceRequestPriority => "medium";

// Initialize scanner on first import
startDeadlineDetectionScanner().catch(err => console.error("[ServiceRequestRepository] Failed to start scanner:", err));
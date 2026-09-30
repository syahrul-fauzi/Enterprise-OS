/**
 * Canonical Realtime Workspace Notifier
 * Shared across all API routes and repositories to trigger realtime updates
 * D1 Architecture Compliance: Single source of truth for realtime event publishing
 */

interface WorkspaceListener {
  workspaceId: string;
  controller: ReadableStreamDefaultController;
  lastSentWorks: string;
  workId?: string; // W-ILC-002-02: Support work-specific listeners for targeted updates
  lastSentModel?: string; // Store serialized model for work-specific listeners
}

// Global listener registry - same as in SSE route
const GLOBAL_WORK_LISTENERS_KEY = Symbol.for('eos.realtime.workspace.listeners.v1');

function getGlobalWorkListeners(): Map<string, WorkspaceListener> {
  const g = globalThis as unknown as { 
    [GLOBAL_WORK_LISTENERS_KEY]?: Map<string, WorkspaceListener> 
  };
  if (!g[GLOBAL_WORK_LISTENERS_KEY]) {
    g[GLOBAL_WORK_LISTENERS_KEY] = new Map<string, WorkspaceListener>();
  }
  return g[GLOBAL_WORK_LISTENERS_KEY];
}

// Global work store accessor (reuses same pattern from work create route)
const GLOBAL_WORK_STORE_KEY = Symbol.for('eos.face.canonical.work.store.v1');
function getGlobalWorkStore(): Map<string, any> {
  const g = globalThis as unknown as { [GLOBAL_WORK_STORE_KEY]?: Map<string, any> };
  if (!g[GLOBAL_WORK_STORE_KEY]) {
    g[GLOBAL_WORK_STORE_KEY] = new Map<string, any>();
  }
  return g[GLOBAL_WORK_STORE_KEY];
}

// Export canonical function to notify all workspace listeners - W-ILC-002-04: Added workId support
export async function notifyWorkspaceListeners(workspaceId: string, actorId?: string, workId?: string) {
  const listeners = getGlobalWorkListeners();
  const workStore = getGlobalWorkStore();
  
  // Split listeners into generic (workspace-wide) and work-specific (targeted updates)
  const genericListeners = Array.from(listeners.values()).filter(l => 
    l.workspaceId === workspaceId && !l.workId
  );
  const workSpecificListeners = workId 
    ? Array.from(listeners.values()).filter(l => 
        l.workspaceId === workspaceId && l.workId === workId
      ) 
    : [];
  
  console.log(`[notifyWorkspaceListeners] Notifying ${genericListeners.length} generic and ${workSpecificListeners.length} work-specific listeners for workspace: ${workspaceId}, work: ${workId || 'all'}`);
  
  // Process generic listeners (preserve existing behavior for backward compatibility)
  for (const listener of genericListeners) {
    try {
      const updateEvent = {
        type: "workspace.updated",
        timestamp: Date.now(),
        workspaceId,
        actorId: actorId || "system",
        workId
      };
      
      listener.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(updateEvent)}\n\n`));
      console.log(`[notifyWorkspaceListeners] ✅ Sent generic workspace update event for workspace: ${workspaceId}`);
    } catch (err) {
      console.error('[notifyWorkspaceListeners] Failed to send generic workspace update:', err);
    }
  }
  
  // Process work-specific listeners - W-ILC-002-04: Targeted model updates
  if (workId && workSpecificListeners.length > 0) {
    try {
      // Dynamically import to avoid circular dependencies (same pattern as other modules)
      const { getWorkById } = await import("@repo/web-app/api/work/create/route");
      const { CommunicationRepositoryInMemory } = await import("@capabilities/communication/repository/index");
      const { buildWorkRealityModel } = await import("@repo/presentation-features/src/work/getWorkRealityModel");
      
      // Fetch canonical work record
      const work = await getWorkById(workId);
      if (work) {
        // Fetch all communications for this specific work
        const communications = await CommunicationRepositoryInMemory.byWorkId(workId, {
          tenantId: work.tenantId,
          workspaceId: workspaceId
        });
        
        // Build canonical model with latest communications
        const session = {
          workspaceId: workspaceId,
          actorId: actorId || "system",
          tenantId: work.tenantId,
          actorLabel: "System"
        };
        const canonicalModel = await buildWorkRealityModel(work, communications, session);
        const modelJson = JSON.stringify(canonicalModel);
        
        // Send model.updated event only to work-specific listeners
        for (const listener of workSpecificListeners) {
          try {
            // Only send if model changed to reduce bandwidth (optimization)
            if (listener.lastSentModel !== modelJson) {
              const modelUpdateEvent = {
                type: "model.updated",
                timestamp: Date.now(),
                workspaceId,
                workId: workId,
                model: canonicalModel
              };
              listener.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(modelUpdateEvent)}\n\n`));
              listener.lastSentModel = modelJson;
              console.log(`[notifyWorkspaceListeners] ✅ Sent work-specific model update for work: ${workId}`);
            }
          } catch (err) {
            console.error(`[notifyWorkspaceListeners] Failed to send work-specific update for listener:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[notifyWorkspaceListeners] Failed to process work-specific updates:', err);
    }
  }
}

// Export function to register listener (used by SSE route)
export function registerWorkspaceListener(id: string, listener: WorkspaceListener) {
  const listeners = getGlobalWorkListeners();
  listeners.set(id, listener);
  console.log(`[registerWorkspaceListener] New listener registered for workspace: ${listener.workspaceId}, total: ${listeners.size}`);
}

// Export function to remove listener (used by SSE route when connection closes)
export function unregisterWorkspaceListener(id: string) {
  const listeners = getGlobalWorkListeners();
  const listener = listeners.get(id);
  if (listener) {
    listeners.delete(id);
    console.log(`[unregisterWorkspaceListener] Listener removed, total: ${listeners.size}`);
  }
}

export type { WorkspaceListener };
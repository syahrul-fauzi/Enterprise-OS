/**
 * Canonical Realtime Workspace Notifier
 * Shared across all API routes and repositories to trigger realtime updates
 * D1 Architecture Compliance: Single source of truth for realtime event publishing
 */

interface WorkspaceListener {
  workspaceId: string;
  controller: ReadableStreamDefaultController;
  lastSentWorks: string;
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

// Export canonical function to notify all workspace listeners
export async function notifyWorkspaceListeners(workspaceId: string, actorId?: string) {
  const listeners = getGlobalWorkListeners();
  const workspaceListeners = Array.from(listeners.values()).filter(l => l.workspaceId === workspaceId);
  
  console.log(`[notifyWorkspaceListeners] Notifying ${workspaceListeners.length} listeners for workspace: ${workspaceId}`);
  
  try {
    // Import both getAllWorksForWorkspace and buildMyRealityModel dynamically to avoid circular dependencies
    const [{ getAllWorksForWorkspace }, { buildMyRealityModel }] = await Promise.all([
      import("../../../../apps/web/app/api/work/create/route"),
      import("../../../../apps/web/app/(eos)/my-reality/getMyRealityModel")
    ]);
    
    for (const listener of workspaceListeners) {
      try {
        const works = getAllWorksForWorkspace(workspaceId);
        const currentWorksJson = JSON.stringify(works);
        
        if (currentWorksJson !== listener.lastSentWorks) {
          listener.lastSentWorks = currentWorksJson;
          
          // Build canonical MyRealityModel once, send to all listeners
          // For multi-actor support, this can be expanded to build per-actor models
          const session = {
            workspaceId,
            actorId: actorId || "default-actor",
            tenantId: "default-tenant",
            actorLabel: "Pengguna"
          };
          const canonicalModel = await buildMyRealityModel(session as any);
          
          // Send canonical model.updated event (only active contract - legacy removed)
          const modelEventData = {
            type: "model.updated",
            timestamp: Date.now(),
            workspaceId,
            payload: { 
              model: canonicalModel,
              source: "canonical-builder" 
            }
          };
          listener.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(modelEventData)}\n\n`));
          
          console.log(`[notifyWorkspaceListeners] ✅ Sent canonical model.updated event`);
        }
      } catch (err) {
        console.error('[notifyWorkspaceListeners] Failed to send update:', err);
      }
    }
  } catch (err) {
    console.error('[notifyWorkspaceListeners] Failed to import dependencies:', err);
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
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
  suspended?: boolean; // W-BETTER-005: Support FACE detach/reattach (suspend listener without removing)
}

// Global listener registry - same as in SSE route
const GLOBAL_WORK_LISTENERS_KEY = Symbol.for('eos.realtime.workspace.listeners.v1');

function getGlobalWorkListeners(): Map<string, WorkspaceListener> {
  const globalContext = globalThis as unknown as { 
    [GLOBAL_WORK_LISTENERS_KEY]?: Map<string, WorkspaceListener> 
  };
  if (!globalContext[GLOBAL_WORK_LISTENERS_KEY]) {
    globalContext[GLOBAL_WORK_LISTENERS_KEY] = new Map<string, WorkspaceListener>();
  }
  return globalContext[GLOBAL_WORK_LISTENERS_KEY];
}

// Global work store accessor (reuses same pattern from work create route)
const GLOBAL_WORK_STORE_KEY = Symbol.for('eos.face.canonical.work.store.v1');
function getGlobalWorkStore(): Map<string, any> {
  const globalContext = globalThis as unknown as { [GLOBAL_WORK_STORE_KEY]?: Map<string, any> };
  if (!globalContext[GLOBAL_WORK_STORE_KEY]) {
    globalContext[GLOBAL_WORK_STORE_KEY] = new Map<string, any>();
  }
  return globalContext[GLOBAL_WORK_STORE_KEY];
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
    // Skip suspended listeners (FACE detached - W-BETTER-005)
    if (listener.suspended) continue;
    
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
  
  // Process work-specific listeners - TEMPORARILY DISABLED (missing dependencies)
  // W-ILC-002-04: Will re-enable once communication and presentation dependencies are resolved
  if (workId && workSpecificListeners.length > 0) {
    try {
      console.log(`[notifyWorkspaceListeners] ⚠️ Work-specific updates temporarily disabled for work: ${workId}`);
      // Only send basic update without model enrichment
      for (const listener of workSpecificListeners) {
        // Skip suspended listeners (FACE detached - W-BETTER-005)
        if (listener.suspended) continue;
        
        const updateEvent = {
          type: "workspace.updated",
          timestamp: Date.now(),
          workspaceId,
          actorId: actorId || "system",
          workId
        };
        listener.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(updateEvent)}\n\n`));
        console.log(`[notifyWorkspaceListeners] ✅ Sent basic work-specific update for work: ${workId}`);
      }
    } catch (err) {
      console.error('[notifyWorkspaceListeners] Failed to send work-specific update:', err);
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

// W-BETTER-005: Suspend listener (FACE detach - keep in registry but stop sending updates)
export function suspendWorkspaceListener(id: string) {
  const listeners = getGlobalWorkListeners();
  const listener = listeners.get(id);
  if (listener && !listener.suspended) {
    listener.suspended = true;
    console.log(`[suspendWorkspaceListener] Listener suspended for workspace: ${listener.workspaceId}, total active: ${Array.from(listeners.values()).filter(l => !l.suspended).length}`);
  }
}

// W-BETTER-005: Resume listener (FACE reattach - re-enable updates + trigger catch-up)
export function resumeWorkspaceListener(id: string, workId?: string) {
  const listeners = getGlobalWorkListeners();
  const listener = listeners.get(id);
  if (listener && listener.suspended) {
    listener.suspended = false;
    console.log(`[resumeWorkspaceListener] Listener resumed for workspace: ${listener.workspaceId}, work: ${workId || 'all'}`);
    
    // Trigger immediate catch-up update to sync state after reattachment
    try {
      const catchupEvent = {
        type: "workspace.catchup",
        timestamp: Date.now(),
        workspaceId: listener.workspaceId,
        actorId: "system",
        workId: workId || null,
        catchup: true
      };
      listener.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(catchupEvent)}\n\n`));
      console.log(`[resumeWorkspaceListener] ✅ Sent catch-up event to resumed listener`);
    } catch (err) {
      console.error('[resumeWorkspaceListener] Failed to send catch-up event:', err);
    }
  }
}

export type { WorkspaceListener };
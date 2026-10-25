import type { ActorId, WorkspaceId } from "@capabilities/work-core/contracts/work.contracts";

// Canonical safeNotifyWorkspaceListeners utility - shared across all vertical slices
// Only sends notifications if workspaceId exists (execution boundary is optional per 5-boundary model)
export async function safeNotifyWorkspaceListeners(
  workspaceId: WorkspaceId | undefined,
  actorId: ActorId,
  workId: string,
  eventName: string = "work.updated"
): Promise<{ readonly ok: boolean }> {
  try {
    // Only notify if workspaceId is present (execution boundary exists)
    if (!workspaceId) return { ok: true };
    
    const loaded = await import("../../../../packages/core/kernel/src/index.js");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("core-realtime", "workspace.broadcast", {
        workspaceId,
        actorId,
        workId,
        event: eventName,
        timestamp: new Date().toISOString()
      });
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: realtime notifications are non-critical for state persistence
    console.warn(`[safeNotifyWorkspaceListeners] Failed to send notification: ${_e}`);
  }
  return { ok: true };
}
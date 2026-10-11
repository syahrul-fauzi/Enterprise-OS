"use client";

import { useState, useCallback, useEffect } from "react";
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";
import { useRealtimeWorkUpdates, type WorkUpdateEvent } from "@repo/presentation-hooks";

interface UseWorkRealityControllerProps {
  initialModel: WorkRealityModel;
  perspective?: WorkRealityPerspective;
}

export function useWorkRealityController({
  initialModel,
  perspective = 'operator',
}: UseWorkRealityControllerProps) {
  const [model, setModel] = useState<WorkRealityModel>(initialModel);
  const [currentPerspective, setCurrentPerspective] = useState<WorkRealityPerspective>(perspective);
  const [pendingOfflineActions, setPendingOfflineActions] = useState<Array<{actionId: string; payload: any; timestamp: number}>>([]);
  
  // Extract workspace context from model's identity
  const workId = model.identity.workId;
  const workspaceId = model.identity.workspaceId || "";

  // Load pending offline actions from localStorage on initialization (RET-001 offline sync support)
  useEffect(() => {
    const saved = localStorage.getItem(`offline-queue-${workId}`);
    if (saved) {
      try {
        setPendingOfflineActions(JSON.parse(saved));
      } catch (e) {
        console.error('[WorkRealityController] Failed to load offline queue:', e);
      }
    }
  }, [workId]);

  // Save pending actions to localStorage whenever queue changes
  useEffect(() => {
    if (pendingOfflineActions.length > 0) {
      localStorage.setItem(`offline-queue-${workId}`, JSON.stringify(pendingOfflineActions));
    } else {
      localStorage.removeItem(`offline-queue-${workId}`);
    }
  }, [pendingOfflineActions, workId]);

  // Handle canonical model updates from server - NO client-side ontology reconstruction
  const handleCanonicalModelUpdate = useCallback((canonicalModel: WorkRealityModel) => {
    setModel(canonicalModel);
  }, []);

  // Initialize realtime connection - only consumes canonical server events
  const { isConnected, lastEvent, pendingEvents } = useRealtimeWorkUpdates({
    actorId: model.actor?.id || "",
    workspaceId,
    enabled: !!workspaceId,
    pollIntervalMs: 30000,
    eventSourceUrl: workspaceId ? `/api/work/updates/${workspaceId}` : "",
    
    // Handle realtime events - ONLY accept canonical model updates from server
    // Client NEVER reconstructs reality - SERVER OWNS THE SINGLE SOURCE OF TRUTH
    onEvent: useCallback((event: WorkUpdateEvent) => {
      console.log('[WorkRealityController] Realtime event received:', event.type);
      
      // Canonical realtime contract: ONLY model.updated is processed
      if (event.type === "model.updated" && event.payload?.model) {
        const canonicalModel = event.payload.model as WorkRealityModel;
        // Verify it's the same work before updating
        if (canonicalModel.identity.workId === workId) {
          setModel(canonicalModel);
          console.log('[WorkRealityController] ✅ Canonical model updated from server - pure client, NO semantic interpretation');
        }
        return;
      }
    }, [workId])
  });

  // When connection is restored, process offline queue (RET-001 offline sync trigger)
  useEffect(() => {
    if (isConnected && pendingOfflineActions.length > 0) {
      console.log('[WorkRealityController] Connection restored - processing offline queue:', pendingOfflineActions.length);
      void processOfflineQueue();
    }
  }, [isConnected, pendingOfflineActions.length, processOfflineQueue]);

  // Function to process offline queue - replays pending actions in order when connection is restored (RET-001 offline sync)
  const processOfflineQueue = useCallback(async () => {
    if (pendingOfflineActions.length === 0 || !navigator.onLine) return;
    
    // Sort actions by timestamp to maintain execution order
    const sorted = [...pendingOfflineActions].sort((a,b) => a.timestamp - b.timestamp);
    const successful: number[] = [];

    for (const [index, action] of sorted.entries()) {
      try {
        // Re-invoke the action with saved payload
        await dispatchActionInternal(action.actionId, action.payload, true);
        successful.push(index);
      } catch (e) {
        console.error('[WorkRealityController] Failed to replay offline action:', action.actionId, e);
        // Keep failed actions in queue to retry next reconnection
        break;
      }
    }

    // Remove successfully processed actions from queue
    setPendingOfflineActions(prev => prev.filter((_, idx) => !successful.includes(idx)));
  }, [pendingOfflineActions, workId]);

  // Internal dispatch implementation that supports offline queueing
  const dispatchActionInternal = useCallback(async (
    actionId: string,
    payload?: FormData | string | { name: string; role: string; type?: string; title?: string; content?: string; outcomeDescription?: string },
    isReplay: boolean = false
  ) => {
    try {
      // Map client action names to server capabilities (MyReality pattern - generic capability executor)
      // Updated for canonical work store: use /api/work/[id] PUT endpoint directly instead of capability registry
      // This maintains core architecture freeze - no new capabilities added, reuse existing canonical work API
      
      if (actionId === "addEvidence") {
        // Handle add evidence action - uses canonical work PUT API to append evidence (Wave 3 requirement #8)
        if (!payload || typeof payload !== 'object' || !('type' in payload) || !('title' in payload)) {
          throw new Error("[addEvidence] Invalid payload: requires type, title, and optional content");
        }
        const evidenceEntry = {
          evidence: [{
            type: payload.type,
            title: payload.title,
            content: payload.content || ""
          }]
        };
        const response = await fetch(`/api/work/${workId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(evidenceEntry)
        });
        if (!response.ok) throw new Error(`Failed to add evidence: ${actionId}`);
        console.log('[WorkRealityController] ✅ Evidence added to canonical work:', actionId);
        window.location.reload();
        return;
      }
      
      if (actionId === "markCompleted") {
        // Handle mark work as completed - uses canonical work PUT API to set status to closed (Wave 3 requirement #9)
        if (!payload || typeof payload !== 'object' || !('outcomeDescription' in payload)) {
          throw new Error("[markCompleted] Invalid payload: requires outcomeDescription");
        }
        const completionPayload = {
          status: "closed",
          outcomeDescription: payload.outcomeDescription
        };
        const response = await fetch(`/api/work/${workId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completionPayload)
        });
        if (!response.ok) throw new Error(`Failed to mark work as completed: ${actionId}`);
        console.log('[WorkRealityController] ✅ Work marked as completed in canonical store:', actionId);
        window.location.reload();
        return;
      }
      
      if (actionId === "addParticipant") {
        // Handle add participant to work - uses canonical work PUT API (Wave 3 requirement #5)
        if (!payload || typeof payload !== 'object' || !('name' in payload) || !('role' in payload)) {
          throw new Error("[addParticipant] Invalid payload: requires name and role");
        }
        const participantPayload = {
          participants: [{
            id: `actor-${Date.now()}`,
            name: payload.name,
            role: payload.role,
            actorType: "human"
          }]
        };
        const response = await fetch(`/api/work/${workId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(participantPayload)
        });
        if (!response.ok) throw new Error(`Failed to add participant: ${actionId}`);
        console.log('[WorkRealityController] ✅ Participant added to canonical work:', actionId);
        window.location.reload();
        return;
      }
      // Legacy capability map for remaining actions - maintains backward compatibility with existing code
      const capabilityMap: Record<string, string> = {
        assignLawyer: "assign-professional",
        approve: "approve-work",
        review: "review-work", 
        changes: "request-changes",
        "execute-action": "execute-agent-action",
        "send-message": "send-work-message"
      };

      // Validate that we don't call any non-existent capabilities - architecture lock enforcement
      const validLegacyIds = Object.keys(capabilityMap);
      if (!["addEvidence", "markCompleted", "addParticipant", ...validLegacyIds].includes(actionId)) {
        throw new Error(`[dispatchAction] Attempted to invoke non-existent capability: ${actionId} - architecture freeze prohibits new capabilities`);
      }
      
      const capability = capabilityMap[actionId];
      if (!capability) {
        throw new Error(`Unknown action: ${actionId}`);
      }
      
      // Handle all remaining payload types
      let body: BodyInit;
      let headers: Record<string, string> = {};
      
      if (payload instanceof FormData) {
        body = payload;
      } else if (typeof payload === 'string') {
        // Handle message sending
        const response = await fetch("/api/communication/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_id: workId, content: payload, recipient_ids: [] })
        });
        if (!response.ok) throw new Error(`Failed to send message: ${payload}`);
        window.location.reload();
        return;
      } else if (typeof payload === 'object') {
        // Handle object payloads
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ workId, ...payload });
      } else {
        // Fallback for undefined payload
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ workId });
      }
      
      const response = await fetch(`/api/capabilities/${capability}/${workId}`, {
        method: 'POST',
        headers,
        body
      });
      
      if (!response.ok) throw new Error(`Action execution failed: ${actionId}`);
      
      console.log('[WorkRealityController] Action executed successfully:', actionId);
      if (!isReplay) window.location.reload();
    } catch (error) {
      // If offline and this is not a replay, add to offline queue (RET-001 offline queueing)
      if (!navigator.onLine && !isReplay) {
        console.log('[WorkRealityController] Device offline - adding action to queue:', actionId);
        setPendingOfflineActions(prev => [...prev, {
          actionId,
          payload,
          timestamp: Date.now()
        }]);
        return; // Don't throw error when offline - action queued
      }
      console.error('[WorkRealityController] Action execution error:', error);
      throw error;
    }
  }, [workId]);

  // Public dispatchAction that adds offline queue support
  const dispatchAction = useCallback(async (
    actionId: string,
    payload?: FormData | string | { name: string; role: string; type?: string; title?: string; content?: string; outcomeDescription?: string }
  ) => {
    await dispatchActionInternal(actionId, payload);
  }, [dispatchActionInternal]);

  // Manual refresh - requests canonical model from server
  const refreshModel = useCallback(async () => {
    try {
      const response = await fetch(`/api/work/${workId}`);
      if (!response.ok) throw new Error('Failed to refresh model');
      
      const canonicalModel = await response.json() as WorkRealityModel;
      setModel(canonicalModel);
    } catch (error) {
      console.error('[WorkRealityController] Model refresh failed:', error);
      throw error;
    }
  }, [workId]);

  // Perspective switcher - pure presentation state, no logic
  const switchPerspective = useCallback((newPerspective: WorkRealityPerspective) => {
    setCurrentPerspective(newPerspective);
  }, []);

  return {
    // Canonical model (never modified client-side)
    model,
    // Client state
    currentPerspective,
    isConnected,
    // Actions
    switchPerspective,
    dispatchAction,
    refreshModel,
    // Simple projections from canonical model (NO reconstruction)
    hasPendingEvents: pendingEvents.length > 0,
  };
}
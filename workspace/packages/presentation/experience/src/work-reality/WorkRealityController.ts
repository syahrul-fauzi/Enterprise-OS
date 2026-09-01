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
  
  // Extract workspace context from model's identity
  const workId = model.identity.workId;
  const workspaceId = model.identity.workspaceId || "";

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

  // Generic action dispatcher - handles ALL work-related actions (assign, evidence, complete, coordination)
  const dispatchAction = useCallback(async (
    actionId: string,
    payload?: FormData | string | { name: string; role: string }
  ) => {
    try {
      // Map client action names to server capabilities (MyReality pattern - generic capability executor)
      const capabilityMap: Record<string, string> = {
        assignLawyer: "assign-professional",
        addEvidence: "add-evidence",
        markCompleted: "mark-work-completed",
        approve: "approve-work",
        review: "review-work", 
        changes: "request-changes",
        "execute-action": "execute-agent-action",
        addParticipant: "add-work-participant",
        "send-message": "send-work-message"
      };
      
      const capability = capabilityMap[actionId];
      if (!capability) {
        throw new Error(`Unknown action: ${actionId}`);
      }
      
      // Handle all payload types (FormData, string, object)
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
        // Handle object payloads (like addParticipant)
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
      
      if (!response.ok) {
        throw new Error(`Action execution failed: ${actionId}`);
      }
      
      console.log('[WorkRealityController] Action executed successfully:', actionId);
      window.location.reload();
    } catch (error) {
      console.error('[WorkRealityController] Action execution error:', error);
      throw error;
    }
  }, [workId]);

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
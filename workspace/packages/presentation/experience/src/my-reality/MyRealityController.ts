"use client";

import { useState, useCallback, useEffect } from "react";
import type { MyRealityModel, RealityWorkItem } from "./contracts/my-reality.contracts";
import { useRealtimeWorkUpdates, type WorkUpdateEvent } from "@repo/presentation-hooks";

interface UseMyRealityControllerProps {
  initialModel: MyRealityModel;
}

export function useMyRealityController({ initialModel }: UseMyRealityControllerProps) {
  const [model, setModel] = useState<MyRealityModel>(initialModel);
  
  // Extract workspace context from model
  const firstWork = model.priority.now[0] || model.priority.next[0] || model.priority.watching[0];
  const workspaceId = firstWork?.workspaceId || "";

  // Handle canonical model updates from server - NO client-side ontology reconstruction
  const handleCanonicalModelUpdate = useCallback((canonicalModel: MyRealityModel) => {
    setModel(canonicalModel);
  }, []);

  // Initialize realtime connection - only consumes canonical server events
  const { isConnected, lastEvent, pendingEvents } = useRealtimeWorkUpdates({
    actorId: model.actor.id,
    workspaceId,
    enabled: true,
    pollIntervalMs: 30000,
    eventSourceUrl: workspaceId ? `/api/work/updates/${workspaceId}` : "",
    
    // Handle realtime events - ONLY accept canonical model updates from server
    // Client NEVER reconstructs reality - SERVER OWNS THE SINGLE SOURCE OF TRUTH
    onEvent: useCallback((event: WorkUpdateEvent) => {
      console.log('[MyRealityController] Realtime event received:', event.type);
      
      // Canonical realtime contract: ONLY model.updated is processed (GATE C COMPLETED)
      if (event.type === "model.updated" && event.payload?.model) {
        const canonicalModel = event.payload.model as MyRealityModel;
        setModel(canonicalModel);
        console.log('[MyRealityController] ✅ Canonical model updated from server - pure client, NO semantic interpretation');
        return;
      }
    }, [model.actor.id])
  });

  // Generic action dispatcher - NEVER hardcodes domain capabilities
  const dispatchAction = useCallback(async (actionId: string, workId?: string, capability?: string) => {
    if (!capability) {
      console.warn('[MyRealityController] No capability specified for action:', actionId);
      return;
    }
    
    // Generic capability execution - works for ALL domains: legal-case, service-request, etc.
    // MyReality NEVER knows about specific domain APIs
    try {
      const response = await fetch(`/api/capabilities/${capability}/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId })
      });
      
      if (!response.ok) {
        throw new Error(`Action execution failed: ${actionId}`);
      }
      
      console.log('[MyRealityController] Action executed successfully:', actionId);
    } catch (error) {
      console.error('[MyRealityController] Action execution error:', error);
      throw error;
    }
  }, []);

  // Manual refresh - requests canonical model from server
  const refreshModel = useCallback(async () => {
    try {
      const response = await fetch('/api/my-reality/refresh');
      if (!response.ok) throw new Error('Failed to refresh model');
      
      const canonicalModel = await response.json() as MyRealityModel;
      setModel(canonicalModel);
    } catch (error) {
      console.error('[MyRealityController] Model refresh failed:', error);
    }
  }, []);

  // Derived human-centric work collections - simple projections ONLY, no transformation
  const needAttention = model.priority.now.filter(work => work.bottleneck);
  const activeWorks = model.priority.next.filter(work => work.state === "in_progress");
  const waitingWorks = model.priority.watching;
  const allWorks = [...model.priority.now, ...model.priority.next, ...model.priority.watching];
  const completedWorks = allWorks.filter(work => work.state === 'completed');
  
  // Simple summary - calculated from canonical model, no reconstruction
  const simpleSummary = `${model.summary.totalWork} pekerjaan · ${model.summary.inProgress} sedang berjalan · ${needAttention.length} menunggu Anda`;
  
  // Check if companion has any insights to display
  const hasCompanionInsights = model.companion.insights.length > 0;

  return {
    model,
    isConnected,
    pendingEvents,
    workspaceId,
    needAttention,
    activeWorks,
    waitingWorks,
    completedWorks,
    simpleSummary,
    hasCompanionInsights,
    dispatchAction,
    refreshModel,
    handleCanonicalModelUpdate,
  };
}
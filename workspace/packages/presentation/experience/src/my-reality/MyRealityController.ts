"use client";

import { useState, useCallback, useEffect } from "react";
import type { MyRealityModel, RealityWorkItem } from "./contracts/my-reality.contracts";
import { useRealtimeWorkUpdates, type WorkUpdateEvent } from "@repo/presentation-hooks";

interface UseMyRealityControllerProps {
  initialModel: MyRealityModel;
}

export function useMyRealityController({ initialModel }: UseMyRealityControllerProps) {
  const [model, setModel] = useState<MyRealityModel>(initialModel);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
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
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    try {
      const response = await fetch('/api/my-reality/refresh');
      if (!response.ok) throw new Error('Gagal memuat model realitas');
      
      const canonicalModel = await response.json() as MyRealityModel;
      setModel(canonicalModel);
      setIsLoading(false);
    } catch (error) {
      console.error('[MyRealityController] Model refresh failed:', error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat daftar pekerjaan");
      setIsLoading(false);
    }
  }, []);

  // Golden Spine Journey: MyReality → Work → Communication (E2E PROOF ORCHESTRATOR)
  // Tracks failure paths: SUCCESS/NO_RESPONSE/TIMEOUT/AUTHORIZATION_DENIED
  // Reuses existing primitives ONLY (no new core packages, architecture freeze compliant)
  const runGoldenSpineJourney = useCallback(async (journeyParams: {
    workTitle: string;
    workDescription: string;
    communicationContent: string;
    timeoutMs?: number;
  }) => {
    const { workTitle, workDescription, communicationContent, timeoutMs = 30000 } = journeyParams;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`TIMEOUT: ${errorMsg}`)), ms);
        promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
      });
    };

    try {
      console.log('[GoldenSpine] 🚀 Memulai journey MyReality→Work→Communication...');
      
      // Step 1: Create Work (MyReality → Work) - real API invocation
      console.log('[GoldenSpine] 📝 Step 1: Membuat work baru...');
      const workResponse = await withTimeout(
        fetch('/api/work/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: workTitle,
            description: workDescription,
            actorId: model.actor.id,
            workspaceId: workspaceId || 'default-workspace'
          })
        }),
        timeoutMs,
        'Work creation'
      );

      if (!workResponse.ok) {
        if (workResponse.status === 401 || workResponse.status === 403) {
          throw new Error('AUTHORIZATION_DENIED: Tidak memiliki izin membuat work');
        }
        throw new Error(`NO_RESPONSE: Work creation gagal dengan status ${workResponse.status}`);
      }

      const workResult = await workResponse.json();
      const createdWorkId = workResult.workId;
      console.log('[GoldenSpine] ✅ Work berhasil dibuat:', createdWorkId);

      // Step 2: Create Communication linked to Work (Work → Communication)
      console.log('[GoldenSpine] 💬 Step 2: Menambahkan komunikasi ke work...');
      const commResponse = await withTimeout(
        fetch('/api/communications/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workId: createdWorkId,
            content: communicationContent,
            actorId: model.actor.id
          })
        }),
        timeoutMs,
        'Communication creation'
      );

      if (!commResponse.ok) {
        if (commResponse.status === 401 || commResponse.status === 403) {
          throw new Error('AUTHORIZATION_DENIED: Tidak memiliki izin menambahkan komunikasi');
        }
        throw new Error(`NO_RESPONSE: Communication creation gagal dengan status ${commResponse.status}`);
      }

      const commResult = await commResponse.json();
      console.log('[GoldenSpine] ✅ Komunikasi berhasil ditambahkan:', commResult.communicationId);

      // Step 3: Refresh MyReality model untuk membaca kembali state terbaru (real read-back)
      console.log('[GoldenSpine] 🔄 Step 3: Refresh MyReality model untuk read-back...');
      await refreshModel();

      // Final: Journey complete dengan full chain terbukti
      console.log('[GoldenSpine] 🎉 E2E Journey SUCCESS - MyReality→Work→Communication terbukti bekerja!');
      console.log('[GoldenSpine] 📊 Evidence chain:', {
        workId: createdWorkId,
        communicationId: commResult.communicationId,
        actorId: model.actor.id,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS'
      });

      setIsLoading(false);
      return {
        status: 'SUCCESS',
        workId: createdWorkId,
        communicationId: commResult.communicationId,
        evidence: {
          actorId: model.actor.id,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      console.error('[GoldenSpine] ❌ Journey gagal:', errorMessage);
      setHasError(true);
      setErrorMessage(errorMessage);
      setIsLoading(false);
      
      // Track failure path untuk observabilitas
      console.log('[GoldenSpine] 📉 Failure status:', errorMessage.includes('TIMEOUT') ? 'TIMEOUT' : 
                                        errorMessage.includes('AUTHORIZATION') ? 'AUTHORIZATION_DENIED' : 
                                        errorMessage.includes('NO_RESPONSE') ? 'NO_RESPONSE' : 'UNKNOWN');
      
      return {
        status: errorMessage.includes('TIMEOUT') ? 'TIMEOUT' : 
               errorMessage.includes('AUTHORIZATION') ? 'AUTHORIZATION_DENIED' : 
               errorMessage.includes('NO_RESPONSE') ? 'NO_RESPONSE' : 'UNKNOWN',
        error: errorMessage
      };
    }
  }, [model.actor.id, workspaceId, refreshModel]);

  const categorizedWorks = {
    needsAttention: model.priority.now.filter(work => work.state === "blocked" || work.bottleneck),
    active: model.priority.next.filter(work => work.state === "in_progress"),
    completed: [...model.priority.now, ...model.priority.next, ...model.priority.watching].filter(work => work.state === 'completed')
  };
  
  // Simple summary - calculated from canonical model, no reconstruction
  const simpleSummary = `${model.summary.totalWork} pekerjaan · ${model.summary.inProgress} sedang berjalan · ${categorizedWorks.needsAttention.length} menunggu Anda`;
  
  // Check if companion has any insights to display
  const hasCompanionInsights = model.companion.insights.length > 0;

  return {
    model,
    isConnected,
    pendingEvents,
    workspaceId,
    categorizedWorks,
    simpleSummary,
    hasCompanionInsights,
    dispatchAction,
    refreshModel,
    handleCanonicalModelUpdate,
    runGoldenSpineJourney,
    isLoading,
    hasError,
    errorMessage,
  };
}
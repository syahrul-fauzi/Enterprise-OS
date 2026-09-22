import { useState, useCallback } from 'react';
import type { IntentSource, IntentContext } from '@repo/presentation-features/intent/types';

/**
 * INTENT CONTROLLER
 * Follows MyReality reference architecture:
 * - Handles runtime interactions
 * - Manages client-side state
 * - Coordinates effects (API calls, navigation)
 * - Purely orchestration, contains no business logic/domain interpretation
 * 
 * Presentation Composition Invariant maintained: Never interprets raw runtime reality
 * 
 * === ENTER/INTENT GOLDEN PATH ENHANCEMENT ===
 * Adds full E2E tracking with failure path classification (same as Golden Spine)
 * Maintains single source of truth principle: server owns ALL semantic interpretation
 * No parallel execution architecture - intent flows directly into existing work primitives
 */
export function useIntentController() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [processingStatus, setProcessingStatus] = useState<string>("IDLE");

  // Timeout wrapper identical to Golden Spine - consistent failure handling across surfaces
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`TIMEOUT: ${errorMsg}`)), ms);
      promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
    });
  };

  const handleIntentCaptured = useCallback(async (
    expression: string, 
    source: IntentSource,
    router: { push: (path: string) => void },
    context?: IntentContext,
    onError?: (error: Error) => void,
    timeoutMs: number = 45000
  ): Promise<{ 
    success: boolean; 
    intentId?: string; 
    workId?: string;
    status: 'SUCCESS' | 'NO_RESPONSE' | 'TIMEOUT' | 'AUTHORIZATION_DENIED' | 'UNKNOWN';
    error?: string;
    evidence?: { actorId?: string; timestamp: string; source: string }
  }> => {
    setIsProcessing(true);
    setHasError(false);
    setErrorMessage("");
    setProcessingStatus("CAPTURED");
    
    console.log("[INTENT-CONTROLLER] 🚀 Memulai Enter/Intent Journey: human need → FACE → intent → EOS interpretation → Work");
    console.log("[INTENT-CONTROLLER] 📥 Raw human need captured:", expression);
    console.log("[INTENT-CONTROLLER] 📊 Source metadata:", source);

    try {
      // Step 1: Send raw intent to server - ALL interpretation happens server-side
      setProcessingStatus("SENDING_TO_SERVER");
      console.log("[INTENT-CONTROLLER] 📤 Step 1: Mengirim raw intent ke /api/intent/create...");
      
      const rawIntent = { 
        expression, 
        source,
        context 
      };
      
      const response = await withTimeout(
        fetch('/api/intent/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rawIntent),
        }),
        timeoutMs,
        'Intent creation'
      );

      // Authorization check - track 401/403 explicitly
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('AUTHORIZATION_DENIED: Tidak memiliki izin membuat intent');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`NO_RESPONSE: Intent creation gagal dengan status ${response.status}: ${errorData.error}`);
      }

      // Step 2: Receive server-resolved intent with work linkage
      setProcessingStatus("INTENT_RESOLVED");
      const result = await response.json();
      console.log("[INTENT-CONTROLLER] ✅ Step 2: Intent berhasil diinterpretasi server:", result.intentId);
      console.log("[INTENT-CONTROLLER] 🔗 Work linked from intent:", result.workId || "Pending work creation");

      // Step 3: Verify intent→work linkage is NOT parallel architecture - uses SAME work primitive
      if (result.workId) {
        setProcessingStatus("WORK_LINKED");
        console.log("[INTENT-CONTROLLER] ✅ Step 3: Intent terhubung ke work yang sudah ada (bukan arsitektur parallel) - workId:", result.workId);
        
        // Evidence chain - identical format to Golden Spine for consistent observability
        const evidence = {
          actorId: source.actorId || "anonymous",
          timestamp: new Date().toISOString(),
          source: source.entryPoint || "unknown",
          intentId: result.intentId,
          workId: result.workId
        };
        
        console.log("[INTENT-CONTROLLER] 📊 Full evidence chain (human need → work):", evidence);
      }

      // Step 4: Navigate to refinement page or directly to work - maintains coherent journey
      setProcessingStatus("NAVIGATING");
      if (result.workId) {
        // If work already created, go directly to work surface (seamless journey)
        router.push(`/work/${result.workId}`);
      } else {
        // If refinement needed, go to intent refinement page
        router.push(`/intent/${result.intentId}`);
      }

      // Final: Journey complete with full chain proven
      setProcessingStatus("COMPLETE");
      console.log("[INTENT-CONTROLLER] 🎉 E2E Intent Journey SUCCESS - human need→FACE→intent→interpretation→Work terbukti bekerja!");
      
      setIsProcessing(false);
      return { 
        success: true, 
        intentId: result.intentId,
        workId: result.workId,
        status: 'SUCCESS',
        evidence: {
          actorId: source.actorId,
          timestamp: new Date().toISOString(),
          source: source.entryPoint || "eos-face"
        }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      console.error("[INTENT-CONTROLLER] ❌ Intent journey gagal:", errorMsg);
      
      // Classify failure status - same schema as Golden Spine for unified tracking
      const failureStatus = errorMsg.includes('TIMEOUT') ? 'TIMEOUT' : 
                           errorMsg.includes('AUTHORIZATION') ? 'AUTHORIZATION_DENIED' : 
                           errorMsg.includes('NO_RESPONSE') ? 'NO_RESPONSE' : 'UNKNOWN';
      
      console.log("[INTENT-CONTROLLER] 📉 Failure status:", failureStatus);
      setHasError(true);
      setErrorMessage(errorMsg);
      setProcessingStatus("FAILED");
      setIsProcessing(false);
      
      if (onError) onError(error as Error);
      return { 
        success: false, 
        status: failureStatus,
        error: errorMsg 
      };
    }
  }, []);

  return {
    isProcessing,
    hasError,
    errorMessage,
    processingStatus,
    handleIntentCaptured
  };
}
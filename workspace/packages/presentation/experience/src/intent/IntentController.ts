import { useState, useCallback } from 'react';
import type { IntentSource, IntentContext } from '@repo/presentation-features';

/**
 * INTENT CONTROLLER
 * Follows MyReality reference architecture:
 * - Handles runtime interactions
 * - Manages client-side state
 * - Coordinates effects (API calls, navigation)
 * - Purely orchestration, contains no business logic/domain interpretation
 * 
 * Presentation Composition Invariant maintained: Never interprets raw runtime reality
 */
export function useIntentController() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleIntentCaptured = useCallback(async (
    expression: string, 
    source: IntentSource,
    router: { push: (path: string) => void },
    onError?: (error: Error) => void
  ) => {
    setIsProcessing(true);
    console.log("[INTENT-CONTROLLER] 📥 Raw intent captured, sending to server for resolution:", expression);
    
    try {
      // Send ONLY raw data to server - server performs ALL semantic interpretation
      const rawIntent = { expression, source };
      
      const response = await fetch('/api/intent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawIntent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save intent: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log("[INTENT-CONTROLLER] 💾 Intent resolved by server:", result.intentId);
      
      router.push(`/intent/${result.intentId}`);
    } catch (error) {
      console.error("[INTENT-CONTROLLER] ❌ Error handling intent:", error);
      setIsProcessing(false);
      if (onError) onError(error as Error);
    } finally {
      if (isProcessing === false) return;
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    handleIntentCaptured
  };
}